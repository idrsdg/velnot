import React, { useState, useEffect, useRef } from 'react';
import { useT, localizeError } from '../LanguageContext';
import { Utterance } from '../types/api';

type State = 'idle' | 'recording' | 'transcribing' | 'transcribed' | 'analyzing' | 'done';
type ProcessMode = 'summary' | 'action_plan' | 'meeting_notes';

interface Props {
  licenseStatus?: { type: string; sessionsUsed?: number; sessionsLimit?: number; daysLeft?: number } | null;
  onSessionSaved?: () => void;
  onGetLicense?: () => void;
}

export default function RecordingView({ licenseStatus, onSessionSaved, onGetLicense }: Props = {}) {
  const { t } = useT();
  const [state, setState] = useState<State>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState<string[]>([]);
  const [actions, setActions] = useState<{ task: string; owner: string; deadline: string }[]>([]);
  const [bars, setBars] = useState<number[]>(Array(20).fill(4));
  const [error, setError] = useState('');
  const [hasSysAudio, setHasSysAudio] = useState(false);
  const [activeMode, setActiveMode] = useState<ProcessMode | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [editTranscript, setEditTranscript] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef      = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startedAtRef = useRef<number>(0);
  const endedAtRef   = useRef<number>(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const sysStreamRef = useRef<MediaStream | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const lastLiveChunkRef = useRef<number>(0);

  useEffect(() => {
    window.api.getSetting('recording_consent_given').then(val => {
      if (val === 'true') setConsentGiven(true);
    });
  }, []);

  useEffect(() => {
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      liveTimerRef.current && clearInterval(liveTimerRef.current);
      rafRef.current && cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close();
      micStreamRef.current?.getTracks().forEach(tr => tr.stop());
      sysStreamRef.current?.getTracks().forEach(tr => tr.stop());
    };
  }, []);

  const handleStartClick = () => {
    if (!consentGiven) {
      setConsentChecked(false);
      setShowConsent(true);
    } else {
      startRecording();
    }
  };

  const handleConsentAccept = async () => {
    await window.api.setSetting('recording_consent_given', 'true');
    setConsentGiven(true);
    setShowConsent(false);
    startRecording();
  };

  const startRecording = async () => {
    setError('');
    setHasSysAudio(false);
    setLiveTranscript('');
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      let sysStream: MediaStream | null = null;
      try {
        sysStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1, height: 1 } as MediaTrackConstraints,
          audio: true,
        });
        sysStream.getVideoTracks().forEach(tr => tr.stop());
        if (sysStream.getAudioTracks().length > 0) {
          sysStreamRef.current = sysStream;
          setHasSysAudio(true);
        }
      } catch { /* silent */ }

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const micSrc = ctx.createMediaStreamSource(micStream);
      micSrc.connect(analyser);
      micSrc.connect(dest);

      if (sysStream && sysStream.getAudioTracks().length > 0) {
        const sysSrc = ctx.createMediaStreamSource(sysStream);
        sysSrc.connect(analyser);
        sysSrc.connect(dest);
      }

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const animate = () => {
        analyser.getByteFrequencyData(dataArray);
        const newBars = Array.from({ length: 20 }, (_, i) => {
          const v = dataArray[Math.floor(i * dataArray.length / 20)] / 255;
          return Math.max(4, Math.round(v * 40));
        });
        setBars(newBars);
        rafRef.current = requestAnimationFrame(animate);
      };
      animate();

      chunksRef.current = [];
      lastLiveChunkRef.current = 0;
      const recorder = new MediaRecorder(dest.stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(100);

      startedAtRef.current = Date.now();
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      setState('recording');

      // Real-time transcription every 30 seconds (cumulative chunks)
      const lang = (await window.api.getSetting('language')) ?? 'tr';
      liveTimerRef.current = setInterval(async () => {
        const from = lastLiveChunkRef.current;
        const newChunks = chunksRef.current.slice(from);
        if (newChunks.length === 0) return;
        lastLiveChunkRef.current = chunksRef.current.length;
        try {
          const snapshot = new Blob(newChunks, { type: 'audio/webm' });
          const buf = await snapshot.arrayBuffer();
          const partial = await window.api.transcribeChunk(buf, lang);
          if (partial) setLiveTranscript(prev => prev ? `${prev} ${partial}` : partial);
        } catch { /* silent — live transcript is best-effort */ }
      }, 30000);
    } catch (e: any) {
      setError(localizeError(e?.message ?? '', t));
    }
  };

  const stopRecording = async () => {
    timerRef.current && clearInterval(timerRef.current);
    liveTimerRef.current && clearInterval(liveTimerRef.current);
    rafRef.current && cancelAnimationFrame(rafRef.current);
    setBars(Array(20).fill(4));
    endedAtRef.current = Date.now();
    setState('transcribing');

    const audioBlob = await new Promise<Blob>(resolve => {
      recorderRef.current!.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: 'audio/webm' }));
      recorderRef.current!.stop();
    });
    audioBlobRef.current = audioBlob;

    micStreamRef.current?.getTracks().forEach(tr => tr.stop());
    sysStreamRef.current?.getTracks().forEach(tr => tr.stop());
    audioCtxRef.current?.close();

    try {
      const lang = (await window.api.getSetting('language')) ?? 'tr';
      const arrayBuffer = await audioBlob.arrayBuffer();
      const result = await window.api.transcribeAudio(arrayBuffer, lang);
      setTranscript(result.transcript);
      setUtterances(result.utterances ?? []);
      setLiveTranscript('');
      setState('transcribed');
    } catch (e: any) {
      setError(localizeError(e?.message ?? '', t));
      setState('done');
    }
  };

  const processTranscript = async (mode: ProcessMode) => {
    setActiveMode(mode);
    setState('analyzing');
    try {
      const result = await window.api.generateSummary(transcript, mode);
      setTitle(result.title);
      setSummary(result.summary);
      setActions(result.action_items);
      setState('done');

      const saved = await window.api.saveSession({
        title: result.title || 'Untitled',
        started_at: startedAtRef.current,
        ended_at: endedAtRef.current,
        duration_sec: elapsed,
        transcript,
        summary: JSON.stringify(result.summary),
        action_items: JSON.stringify(result.action_items),
        tags: JSON.stringify([mode]),
        utterances: utterances.length > 0 ? JSON.stringify(utterances) : undefined,
      } as any);

      setSavedSessionId(saved.id);
      setEditTranscript(transcript);

      // Save audio file linked to session
      if (audioBlobRef.current) {
        try {
          const audioBuf = await audioBlobRef.current.arrayBuffer();
          await window.api.saveAudio(saved.id, audioBuf);
        } catch { /* audio save failure is non-fatal */ }
      }

      onSessionSaved?.();
    } catch (e: any) {
      setError(localizeError(e?.message ?? '', t));
      setState('transcribed');
    }
  };

  const handleTranscriptBlur = async () => {
    if (!savedSessionId || editTranscript === transcript) return;
    setEditSaving(true);
    try {
      const session = await window.api.getSession(savedSessionId);
      if (session) {
        await window.api.updateSession({ ...session, transcript: editTranscript });
        setTranscript(editTranscript);
      }
    } finally {
      setEditSaving(false);
    }
  };

  const reset = () => {
    setState('idle');
    setElapsed(0);
    setTranscript('');
    setLiveTranscript('');
    setUtterances([]);
    setTitle('');
    setSummary([]);
    setActions([]);
    setError('');
    setActiveMode(null);
    setBars(Array(20).fill(4));
    setSavedSessionId(null);
    setEditTranscript('');
    audioBlobRef.current = null;
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const isProcessing = state === 'transcribing' || state === 'analyzing';
  const isExpired = licenseStatus?.type === 'expired';
  const isTrial   = licenseStatus?.type === 'trial';

  const MODES: { key: ProcessMode; icon: string }[] = [
    { key: 'summary',       icon: '📄' },
    { key: 'action_plan',   icon: '✅' },
    { key: 'meeting_notes', icon: '📋' },
  ];

  const resultTitle = activeMode === 'meeting_notes'
    ? t.record.results.meetingNotes
    : activeMode === 'action_plan'
      ? t.record.results.actionPlan
      : t.record.results.summary;

  // Audio src for saved session
  const audioSrc = savedSessionId ? `velnot://${savedSessionId}` : null;

  return (
    <div style={{ padding: '28px 32px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>{t.record.title}</h1>
          <p style={{ color: '#555', fontSize: '13px', marginTop: '2px' }}>{t.record.subtitle}</p>
        </div>
        {isTrial && (
          <div style={{
            fontSize: '12px', padding: '4px 10px', borderRadius: '7px',
            background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)',
            color: '#f59e0b', fontWeight: 600,
          }}>
            {t.record.trialBadge(licenseStatus!.sessionsUsed!, licenseStatus!.sessionsLimit!, licenseStatus!.daysLeft!)}
          </div>
        )}
      </div>

      {isExpired && (
        <div style={{ padding: '24px', borderRadius: '14px', textAlign: 'center', background: '#150f09', border: '1px solid #3a2a00' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔒</div>
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{t.record.trialEnded}</div>
          <button
            onClick={() => onGetLicense?.()}
            style={{ padding: '9px 22px', borderRadius: '9px', border: 'none', background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            {t.record.getLicense}
          </button>
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#1a0a0a', border: '1px solid #3a1a1a', color: '#f87171', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {!isExpired && (
        <div style={{
          background: '#150f09', borderRadius: '14px', padding: '28px',
          border: `1px solid ${state === 'recording' ? '#f97316' : '#222'}`,
          transition: 'border-color 0.3s',
        }}>
          {state === 'recording' && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center' }}>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#1a0e05', border: '1px solid #f97316', color: '#fdba74' }}>{t.record.mic}</span>
              {hasSysAudio
                ? <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#0d1a0d', border: '1px solid #059669', color: '#6ee77a' }}>{t.record.sysAudio}</span>
                : <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#1a1a1a', border: '1px solid #333', color: '#555' }}>{t.record.noSysAudio}</span>
              }
            </div>
          )}

          {/* Waveform */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '44px', marginBottom: '20px' }}>
            {bars.map((h, i) => (
              <div key={i} style={{ width: '3px', height: `${h}px`, borderRadius: '2px', background: state === 'recording' ? '#f97316' : '#2a2a2a' }} />
            ))}
          </div>

          {/* Timer */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div style={{ fontSize: '38px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: state === 'recording' ? '#fdba74' : '#333', letterSpacing: '-1px' }}>
              {fmt(elapsed)}
            </div>
            <div style={{ fontSize: '12px', color: '#444', marginTop: '6px' }}>
              {t.record.status[state]}
            </div>
          </div>

          {/* Live transcript preview during recording */}
          {state === 'recording' && liveTranscript && (
            <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '8px', background: '#120a04', border: '1px solid #2a1a0a', fontSize: '12px', color: '#fb923c', lineHeight: '1.6', maxHeight: '80px', overflowY: 'auto' }}>
              {liveTranscript}
              <span style={{ display: 'inline-block', width: '2px', height: '13px', background: '#fb923c', marginLeft: '2px', animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {state === 'idle' && <Btn color="#f97316" onClick={handleStartClick}>{t.record.start}</Btn>}
            {state === 'recording' && <Btn color="#ef4444" onClick={stopRecording}>{t.record.stop}</Btn>}
            {isProcessing && <Btn color="#333" onClick={() => {}} disabled>{t.record.processing}</Btn>}
            {(state === 'done' || (state === 'transcribed' && error)) && (
              <Btn color="#374151" onClick={reset}>{t.record.newRecord}</Btn>
            )}
          </div>
        </div>
      )}

      {/* Transcript + mode selection */}
      {state === 'transcribed' && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0 }}>
          <Card title={t.record.results.transcript}>
            <div style={{ fontSize: '13px', lineHeight: '1.75', color: '#bbb', overflowY: 'auto', maxHeight: '240px', whiteSpace: 'pre-wrap' }}>
              {transcript}
            </div>
          </Card>

          <div style={{ background: '#150f09', borderRadius: '14px', padding: '20px', border: '1px solid #2a1a0a' }}>
            <div style={{ fontSize: '12px', color: '#fb923c', fontWeight: 600, marginBottom: '14px', letterSpacing: '0.06em' }}>
              {t.record.transcriptReady}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {MODES.map(m => (
                <button
                  key={m.key}
                  onClick={() => processTranscript(m.key)}
                  style={{
                    padding: '14px 10px', borderRadius: '10px', border: '1px solid #2a2a2a',
                    background: '#0e0a07', color: '#e5e5e5', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#f97316'; (e.currentTarget as HTMLButtonElement).style.background = '#111'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a2a'; (e.currentTarget as HTMLButtonElement).style.background = '#0e0a07'; }}
                >
                  <span style={{ fontSize: '22px' }}>{m.icon}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{t.record.modes[m.key].label}</span>
                  <span style={{ fontSize: '11px', color: '#555' }}>{t.record.modes[m.key].desc}</span>
                </button>
              ))}
              <button
                onClick={() => { if (window.confirm((t.record as any).discardConfirm)) reset(); }}
                style={{
                  padding: '14px 10px', borderRadius: '10px', border: '1px solid #2a2a2a',
                  background: '#0e0a07', color: '#666', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = '#1a0a0a'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a2a'; (e.currentTarget as HTMLButtonElement).style.background = '#0e0a07'; (e.currentTarget as HTMLButtonElement).style.color = '#666'; }}
              >
                <span style={{ fontSize: '22px' }}>🗑</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{(t.record as any).discard}</span>
                <span style={{ fontSize: '11px', color: '#555' }}> </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {transcript && (state === 'done' || state === 'analyzing') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Card title={t.record.results.transcript}>
              <textarea
                value={editTranscript}
                onChange={e => setEditTranscript(e.target.value)}
                onBlur={handleTranscriptBlur}
                style={{
                  width: '100%', minHeight: '200px', fontSize: '13px', lineHeight: '1.75',
                  color: '#bbb', background: 'transparent', border: 'none',
                  outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                }}
              />
              {editSaving && <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>Kaydediliyor...</div>}
            </Card>

            {/* Audio player */}
            {audioSrc && (
              <div style={{ background: '#150f09', borderRadius: '10px', padding: '12px 14px', border: '1px solid #222' }}>
                <div style={{ fontSize: '11px', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Ses Kaydı
                </div>
                <audio
                  ref={audioRef}
                  src={audioSrc}
                  controls
                  style={{ width: '100%', height: '32px', accentColor: '#f97316' }}
                />
              </div>
            )}

            {/* Utterances for seeking */}
            {utterances.length > 0 && audioRef.current && (
              <div style={{ background: '#150f09', borderRadius: '10px', padding: '12px 14px', border: '1px solid #222', maxHeight: '160px', overflowY: 'auto' }}>
                <div style={{ fontSize: '11px', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Konuşmacılar
                </div>
                {utterances.map((u, i) => (
                  <div
                    key={i}
                    onClick={() => { if (audioRef.current) audioRef.current.currentTime = u.start / 1000; }}
                    style={{ fontSize: '12px', color: '#aaa', padding: '4px 0', cursor: 'pointer', lineHeight: '1.5', borderBottom: '1px solid #1a1a1a' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fdba74')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}
                  >
                    <span style={{ color: '#f97316', fontWeight: 600 }}>{u.speaker}:</span> {u.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {title && (
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#e5e5e5', padding: '0 2px' }}>{title}</div>
            )}
            {summary.length > 0 && (
              <Card title={resultTitle}>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {summary.map((item, i) => (
                    <li key={i} style={{ fontSize: '13px', color: '#ccc', display: 'flex', gap: '8px', lineHeight: '1.5' }}>
                      <span style={{ color: '#f97316', flexShrink: 0, marginTop: '2px' }}>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {actions.length > 0 && (
              <Card title={t.record.results.actions}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {actions.map((a, i) => (
                    <div key={i} style={{ background: '#0e0a07', borderRadius: '8px', padding: '10px 12px', border: '1px solid #1e1e1e', fontSize: '12px' }}>
                      <div style={{ color: '#e5e5e5', marginBottom: '4px', fontWeight: 500 }}>{a.task}</div>
                      <span style={{ color: '#ec4899' }}>{a.owner}</span>
                      <span style={{ color: '#444' }}> · </span>
                      <span style={{ color: '#555' }}>{a.deadline}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {state === 'done' && (
              <div style={{ fontSize: '12px', color: '#4a7c59', padding: '8px 12px', background: '#0d1a0d', borderRadius: '8px', border: '1px solid #1e3a1e' }}>
                {t.record.savedToHistory}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>

      {/* Consent Modal */}
      {showConsent && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div style={{
            background: '#1a1108', border: '1px solid #3a2a14', borderRadius: '16px',
            padding: '28px 32px', maxWidth: '480px', width: '90%',
          }}>
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', color: '#f5f0eb' }}>
              ⚠️ {(t as any).consent.title}
            </div>
            <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.75', marginBottom: '20px' }}>
              {(t as any).consent.body}
            </p>
            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '24px' }}>
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={e => setConsentChecked(e.target.checked)}
                style={{ marginTop: '2px', accentColor: '#f97316', width: '16px', height: '16px', flexShrink: 0 }}
              />
              <span style={{ fontSize: '13px', color: '#e5e5e5', lineHeight: '1.6' }}>
                {(t as any).consent.checkbox}
              </span>
            </label>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConsent(false)}
                style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #333', background: 'transparent', color: '#888', fontSize: '13px', cursor: 'pointer' }}
              >
                {(t as any).consent.decline}
              </button>
              <button
                onClick={handleConsentAccept}
                disabled={!consentChecked}
                style={{
                  padding: '8px 18px', borderRadius: '8px', border: 'none',
                  background: consentChecked ? '#f97316' : '#444', color: '#fff',
                  fontSize: '13px', fontWeight: 600,
                  cursor: consentChecked ? 'pointer' : 'not-allowed',
                  opacity: consentChecked ? 1 : 0.5,
                }}
              >
                {(t as any).consent.accept}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Btn({ children, color, onClick, disabled }: {
  children: React.ReactNode; color: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '9px 22px', borderRadius: '9px', border: 'none',
      background: color, color: '#fff', fontSize: '13px', fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    }}>
      {children}
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#150f09', borderRadius: '12px', padding: '18px 20px', border: '1px solid #222' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}
