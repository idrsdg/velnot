import { ipcMain, shell, BrowserWindow } from 'electron';
import { buildAppMenu } from './menu';
import { getSessions, getSession, searchSessions, deleteSession, insertSession, updateSession, NewSession, Session } from './db';
import { getSetting, setSetting } from './settings';
import { generateSummary, transcribeBuffer, transcribeWithDiarization, transcribeChunk, getUsage, ProcessMode } from './ai';
import { saveNoteAsText, saveNoteAsMarkdown, saveNoteAsDocx, saveNoteAsPdf, NoteData } from './files';
import { saveSessionAudio } from './audio';
import { getLicenseStatus, activateLicense } from './license';

export function registerIpcHandlers() {
  // ── Database ──────────────────────────────────────────────
  ipcMain.handle('db:getSessions', (_e, limit?: number, offset?: number) => {
    return getSessions(limit, offset);
  });

  ipcMain.handle('db:getSession', (_e, id: string) => {
    return getSession(id);
  });

  ipcMain.handle('db:search', (_e, query: string) => {
    return searchSessions(query);
  });

  ipcMain.handle('db:delete', (_e, id: string) => {
    deleteSession(id);
  });

  ipcMain.handle('db:saveSession', (_e, session: NewSession) => {
    return insertSession(session);
  });

  ipcMain.handle('db:updateSession', (_e, session: Session) => {
    return updateSession(session);
  });

  // ── Settings ──────────────────────────────────────────────
  ipcMain.handle('settings:get', (_e, key: string) => {
    return getSetting(key);
  });

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    setSetting(key, value);
  });

  // ── AI ────────────────────────────────────────────────────
  ipcMain.handle('ai:generateSummary', async (_e, transcript: string, mode: ProcessMode = 'summary') => {
    return generateSummary(transcript, mode);
  });

  ipcMain.handle('audio:transcribe', async (_e, audioData: ArrayBuffer, language: string) => {
    // Check quota before processing
    const usage = await getUsage();
    if (usage.limit !== -1 && usage.remaining <= 0) {
      throw new Error('QUOTA_EXCEEDED');
    }
    return transcribeWithDiarization(Buffer.from(audioData), language || 'tr');
  });

  // Real-time chunk transcription (always Whisper, no diarization overhead)
  ipcMain.handle('audio:transcribeChunk', async (_e, audioData: ArrayBuffer, language: string) => {
    return transcribeChunk(Buffer.from(audioData), language || 'tr');
  });

  // ── Audio Storage ─────────────────────────────────────────
  ipcMain.handle('audio:save', (_e, sessionId: string, audioData: ArrayBuffer) => {
    return saveSessionAudio(sessionId, Buffer.from(audioData));
  });

  // ── Files ─────────────────────────────────────────────────
  ipcMain.handle('file:saveNote', (_e, data: NoteData) => {
    return saveNoteAsText(data);
  });

  ipcMain.handle('file:exportSession', async (_e, data: NoteData, format: 'txt' | 'md' | 'pdf' | 'docx') => {
    if (format === 'md') return saveNoteAsMarkdown(data);
    if (format === 'docx') return saveNoteAsDocx(data);
    if (format === 'pdf') {
      const win = BrowserWindow.getFocusedWindow();
      if (!win) throw new Error('No focused window for PDF export');
      return saveNoteAsPdf(data, win);
    }
    return saveNoteAsText(data);
  });

  // ── License ───────────────────────────────────────────────
  ipcMain.handle('license:getStatus', () => {
    return getLicenseStatus();
  });

  ipcMain.handle('license:activate', async (_e, key: string) => {
    return activateLicense(key);
  });

  ipcMain.handle('license:getUsage', async () => {
    return getUsage();
  });

  // ── Shell ─────────────────────────────────────────────────
  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    shell.openExternal(url);
  });

  // ── Auth (Magic Link) ─────────────────────────────────────
  const BACKEND_URL = 'https://velnot-backend.onrender.com/api';

  ipcMain.handle('auth:requestMagicLink', async (_e, email: string) => {
    const res = await fetch(`${BACKEND_URL}/auth/request-magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.json();
  });

  ipcMain.handle('auth:getEmail', () => {
    return getSetting('account_email') ?? '';
  });

  ipcMain.handle('auth:getPlan', () => {
    return getSetting('account_plan') ?? '';
  });

  ipcMain.handle('auth:getExpires', () => {
    return getSetting('account_expires') ?? '';
  });

  ipcMain.handle('auth:logout', () => {
    setSetting('account_email', '');
    setSetting('account_plan', '');
    setSetting('account_expires', '');
  });

  // ── Menu language rebuild ─────────────────────────────────
  ipcMain.on('menu:setLanguage', (_e, lang: string) => {
    buildAppMenu(lang);
  });
}
