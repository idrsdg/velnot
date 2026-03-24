import OpenAI from 'openai';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getSetting } from './settings';

// ── AssemblyAI diarization ──────────────────────────────────────────────────

interface AssemblyUtterance { speaker: string; text: string; }
interface AssemblyPollResult {
  status: string;
  utterances?: AssemblyUtterance[];
  text?: string;
  error?: string;
}

export async function transcribeWithDiarization(audioData: Buffer, language?: string): Promise<string> {
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
  // Dil auto ise language_code göndermiyoruz — AssemblyAI varsayılan olarak algılar
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
        return data.utterances
          .map(u => `Konuşmacı ${u.speaker}: ${u.text}`)
          .join('\n');
      }
      return data.text ?? '';
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

export async function transcribeBuffer(audioData: Buffer, language?: string): Promise<string> {
  const client = getClient();
  const tmpPath = path.join(os.tmpdir(), `sna_${Date.now()}.webm`);
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
  summary: `Sen bir toplantı asistanısın. Verilen transkriptten şunları üret:
1. Toplantı için uygun kısa bir başlık
2. 3-5 maddelik özet (Türkçe)
3. Boş action_items listesi

JSON formatında yanıt ver:
{
  "title": "...",
  "summary": ["madde1", "madde2", ...],
  "action_items": []
}`,

  action_plan: `Sen bir toplantı asistanısın. Verilen transkriptten şunları üret:
1. Toplantı için uygun kısa bir başlık
2. Boş summary listesi
3. Tüm aksiyon maddelerini çıkar (kimin ne yapacağı, ne zaman)

JSON formatında yanıt ver:
{
  "title": "...",
  "summary": [],
  "action_items": [
    { "task": "...", "owner": "...", "deadline": "..." }
  ]
}`,

  meeting_notes: `Sen bir toplantı asistanısın. Verilen transkriptten profesyonel bir toplantı notu üret.
Şunları içersin: katılımcılar (varsa), ana gündem maddeleri, kararlar, sonraki adımlar.

JSON formatında yanıt ver:
{
  "title": "...",
  "summary": ["## Gündem\\n madde...", "## Kararlar\\n madde...", "## Sonraki Adımlar\\n madde..."],
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
