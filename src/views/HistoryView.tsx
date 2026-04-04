import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useT } from '../LanguageContext';
import { SessionData, ActionItem, Utterance } from '../types/api';

function formatDate(ts: number, lang: string): string {
  const locale = lang === 'zh' ? 'zh-CN' : lang === 'ar' ? 'ar-SA' : lang === 'hi' ? 'hi-IN' : lang === 'es' ? 'es-ES' : lang === 'tr' ? 'tr-TR' : lang === 'fr' ? 'fr-FR' : lang === 'pt' ? 'pt-PT' : lang === 'de' ? 'de-DE' : 'en-US';
  return new Date(ts).toLocaleString(locale, {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function extractSpeakers(utterances: Utterance[]): string[] {
  const seen = new Set<string>();
  utterances.forEach(u => seen.add(u.speaker));
  return Array.from(seen).sort();
}

function applyMap(text: string, map: Record<string, string>): string {
  let result = text;
  Object.entries(map).forEach(([code, name]) => {
    if (name.trim()) {
      result = result.replace(new RegExp(`Konuşmacı ${code}:`, 'g'), `${name}:`);
      result = result.replace(new RegExp(`Speaker ${code}:`, 'g'), `${name}:`);
    }
  });
  return result;
}

export type ExportFormat = 'txt' | 'md' | 'pdf' | 'docx';

export default function HistoryView() {
  const { t, lang } = useT();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; session: SessionData } | null>(null);

  // Edit state
  const [editTitle, setEditTitle] = useState('');
  const [editTranscript, setEditTranscript] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Speaker naming
  const [speakerMap, setSpeakerMap] = useState<Record<string, string>>({});

  // Export
  const [exportFormat, setExportFormat] = useState<ExportFormat>('txt');
  const [exporting, setExporting] = useState(false);
  const [exportPath, setExportPath] = useState('');

  // Audio ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Debounce ref for auto-save on blur (Bug Fix 5)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const data = q.trim()
        ? await window.api.searchSessions(q)
        : await window.api.getSessions();
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => load(search), 300);
    return () => clearTimeout(timer);
  }, [search, load]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
    };
  }, [contextMenu]);

  const selectedSession = sessions.find(s => s.id === selected);

  // Sync edit fields when selection changes
  useEffect(() => {
    if (selectedSession) {
      setEditTitle(selectedSession.title || '');
      setEditTranscript(selectedSession.transcript || '');
      setSaved(false);
      setExportPath('');

      // Load speaker map
      try {
        const map = selectedSession.speaker_map ? JSON.parse(selectedSession.speaker_map) : {};
        setSpeakerMap(map);
      } catch {
        setSpeakerMap({});
      }
    }
  }, [selected, selectedSession?.id]);

  const handleDelete = async (id: string) => {
    await window.api.deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (selected === id) setSelected(null);
  };

  const doSave = async (overrides?: Partial<SessionData>) => {
    if (!selectedSession) return;
    setSaving(true);
    try {
      const updated: SessionData = {
        ...selectedSession,
        title: editTitle,
        transcript: editTranscript,
        ...overrides,
      };
      await window.api.updateSession(updated);
      setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => doSave();

  // Auto-save on blur — debounced to prevent double-save when tabbing (Bug Fix 5)
  const handleTitleBlur = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(), 150);
  };
  const handleTranscriptBlur = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(), 150);
  };

  // Speaker map change
  const handleSpeakerNameChange = (code: string, name: string) => {
    setSpeakerMap(prev => ({ ...prev, [code]: name }));
  };

  const handleSpeakerNameBlur = async () => {
    if (!selectedSession) return;

    // Rebuild transcript from utterances with renamed speaker labels
    let newTranscript = editTranscript;
    if (utterances.length > 0) {
      newTranscript = utterances.map(u => {
        const name = speakerMap[u.speaker]?.trim() || `Speaker ${u.speaker}`;
        return `${name}: ${u.text}`;
      }).join('\n');
      setEditTranscript(newTranscript);
    }

    const updatedSession: SessionData = {
      ...selectedSession,
      title: editTitle,
      transcript: newTranscript,
      speaker_map: JSON.stringify(speakerMap),
    };
    await window.api.updateSession(updatedSession);
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  const handleExport = async () => {
    if (!selectedSession) return;
    setExporting(true);
    setExportPath('');
    try {
      const summaryArr: string[] = (() => { try { return JSON.parse(selectedSession.summary || '[]'); } catch { return []; } })();
      const actionsArr: ActionItem[] = (() => { try { return JSON.parse(selectedSession.action_items || '[]'); } catch { return []; } })();
      const filePath = await window.api.exportSession({
        title: editTitle,
        date: selectedSession.created_at,
        duration_sec: selectedSession.duration_sec,
        summary: summaryArr,
        action_items: actionsArr,
        transcript: editTranscript,
      }, exportFormat);
      setExportPath(filePath);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {contextMenu && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', zIndex: 1000,
            top: contextMenu.y, left: contextMenu.x,
            background: '#18181b', border: '1px solid #27272a',
            borderRadius: '8px', padding: '4px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            minWidth: '140px',
          }}
        >
          <button
            onClick={() => { setSelected(contextMenu.session.id); setContextMenu(null); }}
            style={ctxMenuItemStyle}
          >
            Aç
          </button>
          <div style={{ height: '1px', background: '#27272a', margin: '2px 0' }} />
          <button
            onClick={() => { handleDelete(contextMenu.session.id); setContextMenu(null); }}
            style={{ ...ctxMenuItemStyle, color: '#ef4444' }}
          >
            {t.history.delete}
          </button>
        </div>
      )}
      {/* List */}
      <div style={{
        width: selectedSession ? '300px' : '100%',
        borderRight: selectedSession ? '1px solid #222' : 'none',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '28px 24px 16px', borderBottom: '1px solid #27272a' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>{t.history.title}</h1>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.history.search}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '8px',
              background: '#18181b', border: '1px solid #27272a',
              color: '#f0f0f0', fontSize: '13px', outline: 'none',
            }}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: '#444', fontSize: '14px' }}>
              {t.history.loading}
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: '#444', fontSize: '14px' }}>
              {search ? t.history.noResults : t.history.empty}
            </div>
          ) : sessions.map(s => {
            const summaryArr: string[] = (() => { try { return JSON.parse(s.summary || '[]'); } catch { return []; } })();
            return (
              <div
                key={s.id}
                onClick={() => setSelected(s.id === selected ? null : s.id)}
                onContextMenu={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({ x: e.clientX, y: e.clientY, session: s });
                }}
                style={{
                  padding: '16px 24px', borderBottom: '1px solid #27272a',
                  cursor: 'pointer',
                  background: selected === s.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                  borderLeft: selected === s.id ? '3px solid #6366f1' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: selected === s.id ? '#a5b4fc' : '#e5e5e5' }}>
                  {s.title || t.history.untitled}
                </div>
                <div style={{ fontSize: '12px', color: '#444', display: 'flex', gap: '8px' }}>
                  <span>{formatDate(s.created_at, lang)}</span>
                  <span>·</span>
                  <span>{formatDuration(s.duration_sec)}</span>
                </div>
                {summaryArr[0] && (
                  <div style={{ fontSize: '12px', color: '#555', marginTop: '6px', lineHeight: '1.5' }}>
                    {summaryArr[0]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      {selectedSession && (() => {
        const summaryArr: string[] = (() => { try { return JSON.parse(selectedSession.summary || '[]'); } catch { return []; } })();
        const actionsArr: ActionItem[] = (() => { try { return JSON.parse(selectedSession.action_items || '[]'); } catch { return []; } })();
        const utterances: Utterance[] = (() => {
          try { return selectedSession.utterances ? JSON.parse(selectedSession.utterances) : []; }
          catch { return []; }
        })();
        const speakers = extractSpeakers(utterances);
        const audioSrc = `velnot://${selectedSession.id}`;

        return (
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column' }}>
            {/* Editable title */}
            <div style={{ marginBottom: '6px' }}>
              <input
                value={editTitle}
                onChange={e => { setEditTitle(e.target.value); setSaved(false); }}
                onBlur={handleTitleBlur}
                style={{
                  width: '100%', fontSize: '18px', fontWeight: 700,
                  background: 'transparent', border: 'none', borderBottom: '1px solid #27272a',
                  color: '#f0f0f0', outline: 'none', padding: '4px 0',
                }}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#555', marginBottom: '24px' }}>
              {formatDate(selectedSession.created_at, lang)} · {formatDuration(selectedSession.duration_sec)}
            </div>

            {/* Audio player */}
            <Section title={t.history.audioRecording}>
              <audio
                ref={audioRef}
                src={audioSrc}
                controls
                style={{ width: '100%', height: '32px', accentColor: '#6366f1' }}
                onError={() => {/* silently hide if no audio */}}
              />
            </Section>

            {/* Utterances for timestamp seek */}
            {utterances.length > 0 && (
              <Section title={t.history.speakerTimeline}>
                <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  {utterances.map((u, i) => {
                    const displayName = speakerMap[u.speaker]?.trim() || u.speaker;
                    return (
                      <div
                        key={i}
                        onClick={() => { if (audioRef.current) audioRef.current.currentTime = u.start / 1000; }}
                        style={{ fontSize: '12px', color: '#aaa', padding: '5px 0', cursor: 'pointer', lineHeight: '1.5', borderBottom: '1px solid #27272a', display: 'flex', gap: '8px' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#a5b4fc')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}
                      >
                        <span style={{ color: '#6366f1', fontWeight: 600, flexShrink: 0 }}>{displayName}:</span>
                        <span>{u.text}</span>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Speaker naming (only if diarization utterances exist) */}
            {speakers.length > 0 && (
              <Section title={t.history.speakerNames ?? 'Speaker Names'}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {speakers.map(code => (
                    <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: 600, minWidth: '80px' }}>
                        {(t.history.speakerLabel ?? ((c: string) => `Speaker ${c}`))(code)}
                      </span>
                      <input
                        value={speakerMap[code] ?? ''}
                        placeholder={t.history.namePlaceholder ?? 'Enter name...'}
                        onChange={e => handleSpeakerNameChange(code, e.target.value)}
                        onBlur={handleSpeakerNameBlur}
                        style={{
                          flex: 1, padding: '5px 10px', borderRadius: '6px',
                          background: '#18181b', border: '1px solid #27272a',
                          color: '#f0f0f0', fontSize: '12px', outline: 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {summaryArr.length > 0 && (
              <Section title={t.history.summary}>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {summaryArr.map((item, i) => (
                    <li key={i} style={{ fontSize: '13px', color: '#ccc', display: 'flex', gap: '8px', lineHeight: '1.5' }}>
                      <span style={{ color: '#6366f1', flexShrink: 0 }}>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {actionsArr.length > 0 && (
              <Section title={t.history.actions}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {actionsArr.map((a, i) => (
                    <div key={i} style={{ background: '#09090b', borderRadius: '8px', padding: '10px 12px', border: '1px solid #1e1e1e', fontSize: '12px' }}>
                      <div style={{ color: '#e5e5e5', fontWeight: 500, marginBottom: '3px' }}>{a.task}</div>
                      <span style={{ color: '#8b5cf6' }}>{a.owner}</span>
                      <span style={{ color: '#444' }}> · </span>
                      <span style={{ color: '#555' }}>{a.deadline}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Editable transcript */}
            <Section title={t.history.transcript}>
              <textarea
                value={editTranscript}
                onChange={e => { setEditTranscript(e.target.value); setSaved(false); }}
                onBlur={handleTranscriptBlur}
                placeholder="Transkript burada görünecek..."
                style={{
                  width: '100%', minHeight: '200px', fontSize: '13px', lineHeight: '1.75',
                  color: '#aaa', background: 'transparent', border: 'none',
                  outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                }}
              />
            </Section>

            {/* Export section */}
            <Section title="Dışa Aktar">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {(['txt', 'md', 'pdf', 'docx'] as ExportFormat[]).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    style={{
                      padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                      border: `1px solid ${exportFormat === fmt ? '#6366f1' : '#27272a'}`,
                      background: exportFormat === fmt ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: exportFormat === fmt ? '#a5b4fc' : '#666',
                      cursor: 'pointer', textTransform: 'uppercase',
                    }}
                  >
                    {fmt}
                  </button>
                ))}
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  style={{
                    padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                    border: 'none', background: '#6366f1', color: '#fff',
                    cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.6 : 1,
                  }}
                >
                  {exporting ? '...' : 'İndir'}
                </button>
              </div>
              {exportPath && (
                <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '8px', wordBreak: 'break-all' }}>
                  ✅ {exportPath}
                </div>
              )}
            </Section>

            {/* Action buttons — bottom */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #27272a' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 20px', borderRadius: '8px', border: 'none',
                  background: saved ? '#059669' : '#6366f1', color: '#fff',
                  fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1, transition: 'background 0.3s',
                }}
              >
                {saving ? '...' : saved ? '✅ Saved' : t.history.save}
              </button>

              <button
                onClick={() => setSelected(null)}
                style={{
                  padding: '8px 16px', borderRadius: '8px',
                  background: 'none', border: '1px solid #27272a', color: '#a1a1aa',
                  cursor: 'pointer', fontSize: '13px',
                }}
              >
                ✕
              </button>

              <button
                onClick={() => handleDelete(selectedSession.id)}
                style={{
                  padding: '8px 16px', borderRadius: '8px',
                  background: 'none', border: '1px solid #2a1a1a', color: '#ef4444',
                  cursor: 'pointer', fontSize: '13px',
                }}
              >
                {t.history.delete}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const ctxMenuItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '7px 12px',
  background: 'none', border: 'none', borderRadius: '5px',
  color: '#e5e5e5', fontSize: '13px', textAlign: 'left',
  cursor: 'pointer',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
        {title}
      </div>
      <div style={{ background: '#111113', borderRadius: '10px', padding: '16px', border: '1px solid #222' }}>
        {children}
      </div>
    </div>
  );
}
