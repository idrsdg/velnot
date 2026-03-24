import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // ── Database ──────────────────────────────────────────────
  getSessions:    (limit?: number, offset?: number) =>
    ipcRenderer.invoke('db:getSessions', limit, offset),

  getSession:     (id: string) =>
    ipcRenderer.invoke('db:getSession', id),

  searchSessions: (query: string) =>
    ipcRenderer.invoke('db:search', query),

  deleteSession:  (id: string) =>
    ipcRenderer.invoke('db:delete', id),

  saveSession:    (session: object) =>
    ipcRenderer.invoke('db:saveSession', session),

  // ── Settings ──────────────────────────────────────────────
  getSetting: (key: string) =>
    ipcRenderer.invoke('settings:get', key),

  setSetting: (key: string, value: string) =>
    ipcRenderer.invoke('settings:set', key, value),

  // ── AI ────────────────────────────────────────────────────
  generateSummary: (transcript: string) =>
    ipcRenderer.invoke('ai:generateSummary', transcript),

  transcribeAudio: (audioData: ArrayBuffer, language: string) =>
    ipcRenderer.invoke('audio:transcribe', audioData, language),

  saveNote: (data: object) =>
    ipcRenderer.invoke('file:saveNote', data),

  // ── License ───────────────────────────────────────────────
  getLicenseStatus: () =>
    ipcRenderer.invoke('license:getStatus'),

  activateLicense: (key: string) =>
    ipcRenderer.invoke('license:activate', key),

  // ── Shell ─────────────────────────────────────────────────
  openExternal: (url: string) =>
    ipcRenderer.invoke('shell:openExternal', url),

  // ── Recording events (main → renderer) ───────────────────
  onTranscriptChunk: (cb: (chunk: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, chunk: string) => cb(chunk);
    ipcRenderer.on('transcript:chunk', handler);
    return () => ipcRenderer.removeListener('transcript:chunk', handler);
  },
});
