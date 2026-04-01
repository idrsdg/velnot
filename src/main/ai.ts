import { getSetting } from './settings';
import { getDeviceId } from './device';

const BACKEND_URL = 'https://velnot-backend.onrender.com/api';

// ── Auth helpers ──────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'x-device-id': getDeviceId(),
  };
  const licenseKey = getSetting('license_key');
  if (licenseKey) headers['x-license-key'] = licenseKey;
  return headers;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Utterance { speaker: string; text: string; start: number; end: number; }

export interface DiarizationResult {
  transcript: string;
  utterances: Utterance[];
}

export interface AISummary {
  title: string;
  summary: string[];
  action_items: { task: string; owner: string; deadline: string }[];
}

export type ProcessMode = 'summary' | 'action_plan' | 'meeting_notes';

// ── Transcription ─────────────────────────────────────────────────────────────

export async function transcribeWithDiarization(audioData: Buffer, language?: string): Promise<DiarizationResult> {
  const res = await fetch(`${BACKEND_URL}/transcribe`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'content-type': 'application/octet-stream',
      'x-language': language || 'tr',
    },
    body: audioData,
  });

  if (res.status === 402) throw new Error('QUOTA_EXCEEDED');

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Bilinmeyen hata.' })) as { error?: string };
    throw new Error(body.error ?? `Transkripsiyon başarısız: ${res.status}`);
  }

  return await res.json() as DiarizationResult;
}

export async function transcribeBuffer(audioData: Buffer, language?: string): Promise<DiarizationResult> {
  return transcribeWithDiarization(audioData, language);
}

export async function transcribeChunk(audioData: Buffer, language?: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/transcribe/chunk`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'content-type': 'application/octet-stream',
      'x-language': language || 'tr',
    },
    body: audioData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: '' })) as { error?: string };
    throw new Error(body.error || `Chunk transkripsiyon başarısız: ${res.status}`);
  }
  const data = await res.json() as { transcript: string };
  return data.transcript;
}

export async function transcribeFast(audioData: Buffer, language?: string): Promise<string> {
  return transcribeChunk(audioData, language);
}

// ── Summary ───────────────────────────────────────────────────────────────────

export async function generateSummary(transcript: string, mode: ProcessMode = 'summary'): Promise<AISummary> {
  const res = await fetch(`${BACKEND_URL}/summarize`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ transcript, mode }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Bilinmeyen hata.' })) as { error?: string };
    throw new Error(body.error ?? `Özet oluşturulamadı: ${res.status}`);
  }

  return await res.json() as AISummary;
}

// ── Usage ─────────────────────────────────────────────────────────────────────

export async function getUsage(): Promise<{ used: number; limit: number; remaining: number }> {
  try {
    const params = new URLSearchParams({ device_id: getDeviceId() });
    const licenseKey = getSetting('license_key');
    if (licenseKey) params.set('license_key', licenseKey);

    const res = await fetch(`${BACKEND_URL}/usage?${params}`);
    if (!res.ok) return { used: 0, limit: 0, remaining: 0 };
    return await res.json() as { used: number; limit: number; remaining: number };
  } catch {
    return { used: 0, limit: 0, remaining: 0 };
  }
}

/** No-op: usage is now tracked server-side. */
export async function reportUsage(_minutes: number): Promise<{ ok: boolean; remaining: number }> {
  return { ok: true, remaining: -1 };
}
