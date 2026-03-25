import OpenAI from 'openai';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getSetting } from './settings';

// ── AssemblyAI diarization ──────────────────────────────────────────────────

export interface Utterance { speaker: string; text: string; start: number; end: number; }

export interface DiarizationResult {
  transcript: string;
  utterances: Utterance[];
}

interface AssemblyUtterance { speaker: string; text: string; start: number; end: number; }
interface AssemblyPollResult {
  status: string;
  utterances?: AssemblyUtterance[];
  text?: string;
  error?: string;
}

export async function transcribeWithDiarization(audioData: Buffer, language?: string): Promise<DiarizationResult> {
  const apiKey = getSetting('assemblyai_key');
  if (!apiKey) throw new Error('AssemblyAI API key ayarlanmamış. Lütfen Ayarlar\'dan ekleyin.');

  // 1. Upload audio
  const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: { authorization: apiKey, 'content-type': 'application/octet-stream' },
    body: audioData,
  });
  if (!uploadRes.ok) {
    const errBody = await uploadRes.text().catch(() => '');
    throw new Error(`AssemblyAI upload hatası: ${uploadRes.status} — ${errBody}`);
  }
  const { upload_url } = await uploadRes.json() as { upload_url: string };

  // 2. Request transcript with speaker diarization
  // Not: speaker_labels ile language_detection birlikte kullanılamaz (AssemblyAI 400 döner)
  const lang = language && language !== 'auto' ? language : undefined;
  const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: { authorization: apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      audio_url: upload_url,
      speaker_labels: true,
      speech_models: ['universal-2'],
      ...(lang ? { language_code: lang } : {}),
    }),
  });
  if (!transcriptRes.ok) {
    const errBody = await transcriptRes.text().catch(() => '');
    throw new Error(`AssemblyAI transcript isteği hatası: ${transcriptRes.status} — ${errBody}`);
  }
  const { id } = await transcriptRes.json() as { id: string };

  // 3. Poll until complete
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: apiKey },
    });
    const data = await poll.json() as AssemblyPollResult;

    if (data.status === 'completed') {
      if (data.utterances?.length) {
        const utterances: Utterance[] = data.utterances.map(u => ({
          speaker: u.speaker,
          text: u.text,
          start: u.start,
          end: u.end,
        }));
        const transcript = utterances.map(u => `Konuşmacı ${u.speaker}: ${u.text}`).join('\n');
        return { transcript, utterances };
      }
      return { transcript: data.text ?? '', utterances: [] };
    }
    if (data.status === 'error') throw new Error(`AssemblyAI hatası: ${data.error}`);
  }
  throw new Error('AssemblyAI zaman aşımı.');
}

export interface AISummary {
  title: string;
  summary: string[];
  action_items: { task: string; owner: string; deadline: string }[];
}

function getClient(): OpenAI {
  const apiKey = getSetting('api_key');
  if (!apiKey) throw new Error('OpenAI API key ayarlanmamış. Lütfen Ayarlar\'dan ekleyin.');
  return new OpenAI({ apiKey });
}

export async function transcribeBuffer(audioData: Buffer, language?: string): Promise<DiarizationResult> {
  const client = getClient();
  const tmpPath = path.join(os.tmpdir(), `sna_${Date.now()}.webm`);
  fs.writeFileSync(tmpPath, audioData);
  try {
    const response = await client.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: 'whisper-1',
      ...(language && language !== 'auto' ? { language } : {}),
    });
    return { transcript: response.text, utterances: [] };
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}

// Chunk transcription for real-time preview (always Whisper, no diarization)
export async function transcribeChunk(audioData: Buffer, language?: string): Promise<string> {
  const client = getClient();
  const tmpPath = path.join(os.tmpdir(), `sna_chunk_${Date.now()}.webm`);
  fs.writeFileSync(tmpPath, audioData);
  try {
    const response = await client.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: 'whisper-1',
      ...(language && language !== 'auto' ? { language } : {}),
    });
    return response.text;
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}

export type ProcessMode = 'summary' | 'action_plan' | 'meeting_notes';

const PROMPTS: Record<ProcessMode, string> = {
  summary: `You are a meeting assistant. From the given transcript, produce:
1. A short appropriate title for the meeting
2. A 3-5 bullet point summary
3. An empty action_items list

Respond in the SAME LANGUAGE as the transcript. Reply in JSON:
{
  "title": "...",
  "summary": ["point1", "point2", ...],
  "action_items": []
}`,

  action_plan: `You are a meeting assistant. From the given transcript, produce:
1. A short appropriate title for the meeting
2. An empty summary list
3. All action items (who does what, by when)

Respond in the SAME LANGUAGE as the transcript. Reply in JSON:
{
  "title": "...",
  "summary": [],
  "action_items": [
    { "task": "...", "owner": "...", "deadline": "..." }
  ]
}`,

  meeting_notes: `You are a meeting assistant. Produce professional meeting notes from the transcript.
Include: participants (if mentioned), main agenda items, decisions, next steps.

Respond in the SAME LANGUAGE as the transcript. Reply in JSON:
{
  "title": "...",
  "summary": ["## Agenda\\n item...", "## Decisions\\n item...", "## Next Steps\\n item..."],
  "action_items": []
}`,
};

export async function generateSummary(transcript: string, mode: ProcessMode = 'summary'): Promise<AISummary> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: PROMPTS[mode] },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('GPT boş yanıt döndürdü');

  return JSON.parse(content) as AISummary;
}
