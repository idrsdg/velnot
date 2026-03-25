/**
 * Sıfır bağımlılık JSON dosya tabanlı depolama.
 * Her session ayrı bir .json dosyası olarak userData/sessions/ dizininde saklanır.
 */
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

function getSessionsDir(): string {
  const dir = path.join(app.getPath('userData'), 'sessions');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export interface Session {
  id: string;
  title: string;
  started_at: number;
  ended_at: number;
  duration_sec: number;
  transcript: string;
  summary: string;       // JSON string: string[]
  action_items: string;  // JSON string: {task,owner,deadline}[]
  tags: string;          // JSON string: string[]
  created_at: number;
  audio_path?: string;   // path to {id}.webm
  utterances?: string;   // JSON: {speaker,text,start,end}[]
  speaker_map?: string;  // JSON: Record<string,string> e.g. {"A":"Ahmet"}
}

export type NewSession = Omit<Session, 'id' | 'created_at'>;

// No-op: JSON storage needs no init
export async function initDb(): Promise<void> {
  getSessionsDir();
}

export function insertSession(session: NewSession): Session {
  const id = crypto.randomUUID();
  const created_at = Date.now();
  const s: Session = { ...session, id, created_at };
  fs.writeFileSync(
    path.join(getSessionsDir(), `${id}.json`),
    JSON.stringify(s),
  );
  return s;
}

export function getSessions(limit = 50, offset = 0): Session[] {
  const dir = getSessionsDir();
  const sessions = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Session; }
      catch { return null; }
    })
    .filter(Boolean) as Session[];

  return sessions
    .sort((a, b) => b.created_at - a.created_at)
    .slice(offset, offset + limit);
}

export function getSession(id: string): Session | undefined {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(getSessionsDir(), `${id}.json`), 'utf8'),
    ) as Session;
  } catch {
    return undefined;
  }
}

export function searchSessions(query: string): Session[] {
  if (!query.trim()) return getSessions();
  const q = query.toLowerCase();
  return getSessions(10000).filter(s =>
    s.title?.toLowerCase().includes(q) ||
    s.transcript?.toLowerCase().includes(q) ||
    s.summary?.toLowerCase().includes(q) ||
    s.action_items?.toLowerCase().includes(q),
  );
}

export function updateSession(session: Session): Session {
  fs.writeFileSync(
    path.join(getSessionsDir(), `${session.id}.json`),
    JSON.stringify(session),
  );
  return session;
}

export function deleteSession(id: string): void {
  try {
    fs.unlinkSync(path.join(getSessionsDir(), `${id}.json`));
  } catch { /* zaten silinmiş */ }
  try {
    fs.unlinkSync(path.join(getSessionsDir(), `${id}.webm`));
  } catch { /* ses dosyası yoksa sessiz geç */ }
}
