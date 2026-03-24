import React, { useState, useEffect, useRef } from 'react';

type State = 'idle' | 'recording' | 'transcribing' | 'transcribed' | 'analyzing' | 'done';
type ProcessMode = 'summary' | 'action_plan' | 'meeting_notes';

const STATUS_TEXT: Record<State, string> = {
  idle:         'Başlatmak için butona bas',
  recording:    '⏺  Kayıt yapılıyor...',
  transcribing: '🎙  Transkribe ediliyor...',
  transcribed:  '📝  Transkript hazır — bir işlem seç',
  analyzing:    '✨  Yapay zeka işliyor...',
  done:         '✅  Tamamlandı',
};

const MODES: { key: ProcessMode; label: string; icon: string; desc: string }[] = [
  { key: 'summary',       label: 'Özetle',            icon: '📄', desc: '3-5 maddelik özet' },
  { key: 'action_plan',   label: 'Aksiyon Planı',      icon: '✅', desc: 'Kim ne yapacak?' },
  { key: 'meeting_notes', label: 'Toplantı Notu',      icon: '📋', desc: 'Profesyonel belge formatı' },
];

interface Props {
  licenseStatus?: { type: string; sessionsUsed?: number; sessionsLimit?: number; daysLeft?: number } | null;
  onSessionSaved?: () => void;
}

export default function RecordingView({ licenseStatus, onSessionSaved }: Props = {}) {
  const [state, setState] = useState<State>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState<string[]>([]);
  const [actions, setActions] = useState<{ task: string; owner: string; deadline: string }[]>([]);
  const [bars, setBars] = useState<number[]>(Array(20).fill(4));
  const [error, setError] = useState('');
  const [hasSysAudio, setHasSysAudio] = useState(false);
  const [activeMode, setActiveMode] = useState<ProcessMode | null>(null);

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef      = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startedAtRef = useRef<number>(0);
  const endedAtRef   = useRef<number>(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const sysStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      rafRef.current && cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close();
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      sysStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startRecording = async () => {
    setError('');
    setHasSysAudio(false);
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      let sysStream: MediaStream | null = null;
      try {
        sysStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1, height: 1 } as MediaTrackConstraints,
          audio: true,
        });
        sysStream.getVideoTracks().forEach(t => t.stop());
        if (sysStream.getAudioTracks().length > 0) {
          sysStreamRef.current = sysStream;
          setHasSysAudio(true);
        }
      } catch { /* sessiz devam */ }

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
      const recorder = new MediaRecorder(dest.stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(100);

      startedAtRef.current = Date.now();
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      setState('recording');
    } catch (e: any) {
      setError(e?.message ?? 'Kayıt başlatılamadı');
    }
  };

  const stopRecording = async () => {
    timerRef.current && clearInterval(timerRef.current);
    rafRef.current && cancelAnimationFrame(rafRef.current);
    setBars(Array(20).fill(4));
    endedAtRef.current = Date.now();
    setState('transcribing');

    const audioBlob = await new Promise<Blob>(resolve => {
      recorderRef.current!.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: 'audio/webm' }));
      recorderRef.current!.stop();
    });

    micStreamRef.current?.getTracks().forEach(t => t.stop());
    sysStreamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();

    try {
      const lang = (await window.api.getSetting('language')) ?? 'tr';
      const arrayBuffer = await audioBlob.arrayBuffer();
      const text = await window.api.transcribeAudio(arrayBuffer, lang);
      setTranscript(text);
      setState('transcribed');
    } catch (e: any) {
      setError(e?.message ?? 'Transkripsiyon başarısız');
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

      // Otomatik kaydet
      await window.api.saveSession({
        title: result.title || 'Başlıksız Toplantı',
        started_at: startedAtRef.current,
        ended_at: endedAtRef.current,
        duration_sec: elapsed,
        transcript,
        summary: JSON.stringify(result.summary),
        action_items: JSON.stringify(result.action_items),
        tags: JSON.stringify([mode]),
      });
      onSessionSaved?.();
    } catch (e: any) {
      setError(e?.message ?? 'İşlem başarısız');
      setState('transcribed');
    }
  };

  const reset = () => {
    setState('idle');
    setElapsed(0);
    setTranscript('');
    setTitle('');
    setSummary([]);
    setActions([]);
    setError('');
    setActiveMode(null);
    setBars(Array(20).fill(4));
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const isProcessing = state === 'transcribing' || state === 'analyzing';
  const isExpired = licenseStatus?.type === 'expired';
  const isTrial = licenseStatus?.type === 'trial';

  return (
    <div style={{ padding: '28px 32px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Transkripsiyon</h1>
          <p style={{ color: '#555', fontSize: '13px', marginTop: '2px' }}>Toplantını sessizce yazıya dök</p>
        </div>
        {isTrial && (
          <div style={{
            fontSize: '12px', padding: '4px 10px', borderRadius: '7px',
            background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)',
            color: '#f59e0b', fontWeight: 600,
          }}>
            Trial: {licenseStatus.sessionsUsed}/{licenseStatus.sessionsLimit} toplantı · {licenseStatus.daysLeft} gün kaldı
          </div>
        )}
      </div>

      {isExpired && (
        <div style={{ padding: '24px', borderRadius: '14px', textAlign: 'center', background: '#141414', border: '1px solid #3a2a00' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔒</div>
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Trial süresi doldu</div>
          <button
            onClick={() => window.api.openExternal('https://silent-note-landing.vercel.app/#pricing')}
            style={{ padding: '9px 22px', borderRadius: '9px', border: 'none', background: '#6366f1', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            Lisans Al →
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
          background: '#141414', borderRadius: '14px', padding: '28px',
          border: `1px solid ${state === 'recording' ? '#6366f1' : '#222'}`,
          transition: 'border-color 0.3s',
        }}>
          {state === 'recording' && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center' }}>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#1a1a2e', border: '1px solid #6366f1', color: '#a5b4fc' }}>🎙 Mikrofon</span>
              {hasSysAudio
                ? <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#0d1a0d', border: '1px solid #059669', color: '#6ee77a' }}>🔊 Sistem sesi</span>
                : <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#1a1a1a', border: '1px solid #333', color: '#555' }}>🔇 Sistem sesi yok</span>
              }
            </div>
          )}

          {/* Waveform */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '44px', marginBottom: '20px' }}>
            {bars.map((h, i) => (
              <div key={i} style={{
                width: '3px', height: `${h}px`, borderRadius: '2px',
                background: state === 'recording' ? '#6366f1' : '#2a2a2a',
              }} />
            ))}
          </div>

          {/* Timer */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div style={{ fontSize: '38px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: state === 'recording' ? '#a5b4fc' : '#333', letterSpacing: '-1px' }}>
              {fmt(elapsed)}
            </div>
            <div style={{ fontSize: '12px', color: '#444', marginTop: '6px' }}>
              {STATUS_TEXT[state]}
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {state === 'idle' && (
              <Btn color="#6366f1" onClick={startRecording}>⏺  Kaydı Başlat</Btn>
            )}
            {state === 'recording' && (
              <Btn color="#ef4444" onClick={stopRecording}>⏹  Durdur & Transkribe Et</Btn>
            )}
            {isProcessing && (
              <Btn color="#333" onClick={() => {}} disabled>⏳  İşleniyor...</Btn>
            )}
            {(state === 'done' || (state === 'transcribed' && error)) && (
              <Btn color="#374151" onClick={reset}>↩  Yeni Kayıt</Btn>
            )}
          </div>
        </div>
      )}

      {/* İşlem seçimi — transkript hazır */}
      {state === 'transcribed' && !error && (
        <div style={{ background: '#141414', borderRadius: '14px', padding: '20px', border: '1px solid #2a2a4a' }}>
          <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: 600, marginBottom: '14px', letterSpacing: '0.06em' }}>
            TRANSKRIPT HAZIR — NE YAPALIM?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {MODES.map(m => (
              <button
                key={m.key}
                onClick={() => processTranscript(m.key)}
                style={{
                  padding: '14px 10px', borderRadius: '10px', border: '1px solid #2a2a2a',
                  background: '#0f0f0f', color: '#e5e5e5', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLButtonElement).style.background = '#111'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a2a'; (e.currentTarget as HTMLButtonElement).style.background = '#0f0f0f'; }}
              >
                <span style={{ fontSize: '22px' }}>{m.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{m.label}</span>
                <span style={{ fontSize: '11px', color: '#555' }}>{m.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sonuçlar */}
      {transcript && (state === 'done' || state === 'analyzing') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
          <Card title="Transkript">
            <div style={{ fontSize: '13px', lineHeight: '1.75', color: '#bbb', overflowY: 'auto', maxHeight: '320px', whiteSpace: 'pre-wrap' }}>
              {transcript}
            </div>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {title && (
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#e5e5e5', padding: '0 2px' }}>{title}</div>
            )}
            {summary.length > 0 && (
              <Card title={activeMode === 'meeting_notes' ? 'Toplantı Notu' : activeMode === 'action_plan' ? 'Aksiyon Planı' : 'Özet'}>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {summary.map((item, i) => (
                    <li key={i} style={{ fontSize: '13px', color: '#ccc', display: 'flex', gap: '8px', lineHeight: '1.5' }}>
                      <span style={{ color: '#6366f1', flexShrink: 0, marginTop: '2px' }}>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {actions.length > 0 && (
              <Card title="Aksiyonlar">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {actions.map((a, i) => (
                    <div key={i} style={{ background: '#0f0f0f', borderRadius: '8px', padding: '10px 12px', border: '1px solid #1e1e1e', fontSize: '12px' }}>
                      <div style={{ color: '#e5e5e5', marginBottom: '4px', fontWeight: 500 }}>{a.task}</div>
                      <span style={{ color: '#8b5cf6' }}>{a.owner}</span>
                      <span style={{ color: '#444' }}> · </span>
                      <span style={{ color: '#555' }}>{a.deadline}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {state === 'done' && (
              <div style={{ fontSize: '12px', color: '#4a7c59', padding: '8px 12px', background: '#0d1a0d', borderRadius: '8px', border: '1px solid #1e3a1e' }}>
                ✅ Geçmişe kaydedildi
              </div>
            )}
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
    <div style={{ background: '#141414', borderRadius: '12px', padding: '18px 20px', border: '1px solid #222' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}
