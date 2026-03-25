import { ipcMain, shell, BrowserWindow } from 'electron';
import { getSessions, getSession, searchSessions, deleteSession, insertSession, updateSession, NewSession, Session } from './db';
import { getSetting, setSetting } from './settings';
import { generateSummary, transcribeBuffer, transcribeWithDiarization, transcribeChunk, ProcessMode } from './ai';
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
    const assemblyKey = getSetting('assemblyai_key');
    if (assemblyKey) {
      return transcribeWithDiarization(Buffer.from(audioData), language || 'tr');
    }
    return transcribeBuffer(Buffer.from(audioData), language || 'tr');
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

  // ── Shell ─────────────────────────────────────────────────
  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    shell.openExternal(url);
  });
}
