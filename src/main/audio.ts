import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

function getSessionsDir(): string {
  return path.join(app.getPath('userData'), 'sessions');
}

/**
 * Saves session audio to userData/sessions/{id}.webm
 * Returns the full file path.
 */
export function saveSessionAudio(id: string, buffer: Buffer): string {
  const dir = getSessionsDir();
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${id}.webm`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

/**
 * Returns the full path for a session audio file.
 */
export function getSessionAudioPath(id: string): string {
  return path.join(getSessionsDir(), `${id}.webm`);
}

/**
 * Checks whether audio file exists for a given session id.
 */
export function sessionAudioExists(id: string): boolean {
  return fs.existsSync(getSessionAudioPath(id));
}
