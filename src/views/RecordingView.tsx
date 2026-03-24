import React, { useState, useEffect, useRef } from 'react';

type State = 'idle' | 'recording' | 'transcribing' | 'processing' | 'done' | 'saving';

const STATUS_TEXT: Record<State, string> = {
  idle:         'Başlatmak için butona bas',
  recording:    '⏺  Kayıt yapılıyor...',
  transcribing: '🎙  Transkribe ediliyor...',
  processing:   '✨  GPT ile özet hazırlanıyor...',
  done:         '✅  Tamamlandı',
  saving:       '💾  Kaydediliyor...',
};

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
  const [savedFile, setSavedFile] = useState('');
  const [hasSysAudio, setHasSysAudio] = useState(false);

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef      = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startedAtRef = useRef<number>(0);
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
      // 1. Mikrofon
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      // 2. Sistem sesi (karşı tarafın sesi) — kullanıcı ekran seçecek
      let sysStream: MediaStream | null = null;
      try {
        sysStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1, height: 1 } as MediaTrackConstraints,
          audio: true,
        });
        // Video track'e ihtiyaç yok, hemen durdur
        sysStream.getVideoTracks().forEach(t => t.stop());
        if (sysStream.getAudioTracks().length > 0) {
          sysStreamRef.current = sysStream;
          setHasSysAudio(true);
        }
      } catch {
        // Reddedildi veya desteklenmiyor — sadece mikrofon ile devam et
      }

      // 3. AudioContext — iki akışı karıştır
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const micSource = ctx.createMediaStreamSource(micStream);
      micSource.connect(analyser);
      micSource.connect(dest);

      if (sysStream && sysStream.getAudioTracks().length > 0) {
        ctx.createMediaStreamSource(sysStream).connect(dest);
      }

      // Waveform animasyonu (mikrofondan)
      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const animate = () => {
        analyser.getByteFrequencyData(dataArr);
        setBars(Array.from({ length: 20 }, (_, i) => {
          const idx = Math.floor(i * dataArr.length / 20);
          return Math.max(4, Math.floor(dataArr[idx] / 5));
        }));
        rafRef.current = requestAnimationFrame(animate);
      };
      animate();

      // 4. Karışık akışı kaydet
      const recorder = new MediaRecorder(dest.stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorderRef.current = recorder;
      recorder.start();

      startedAtRef.current = Date.now();
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      setState('recording');
    } catch (e: any) {
      setError(e?.name === 'NotAllowedError'
        ? 'Mikrofon izni reddedildi. Lütfen Electron\'a mikrofon izni verin.'
        : (e?.message ?? 'Mikrofon erişimi sağlanamadı'));
    }
  };

  const stopRecording = async () => {
    timerRef.current && clearInterval(timerRef.current);
    rafRef.current && cancelAnimationFrame(rafRef.current);
    setBars(Array(20).fill(4));

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

      setState('processing');
      const result = await window.api.generateSummary(text);
      setTitle(result.title);
      setSummary(result.summary);
      setActions(result.action_items);
      setState('done');

      // Otomatik txt kaydet
      const duration = Math.floor((Date.now() - startedAtRef.current) / 1000);
      window.api.saveNote({
        title: result.title,
        date: startedAtRef.current,
        duration_sec: duration,
        summary: result.summary,
        action_items: result.action_items,
        transcript: text,
      }).then(filePath => setSavedFile(filePath)).catch(() => {});
    } catch (e: any) {
      setError(e?.message ?? 'İşlem başarısız');
      setState('done');
    }
  };

  const saveSession = async () => {
    setState('saving');
    try {
      await window.api.saveSession({
        title: title || 'Başlıksız Toplantı',
        started_at: startedAtRef.current,
        ended_at: Date.now(),
        duration_sec: elapsed,
        transcript,
        summary: JSON.stringify(summary),
        action_items: JSON.stringify(actions),
        tags: JSON.stringify([]),
      });
      reset();
      onSessionSaved?.();
    } catch (e: any) {
      setError(e?.message ?? 'Kaydetme başarısız');
      setState('done');
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
    setSavedFile('');
    setBars(Array(20).fill(4));
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const isProcessing = state === 'transcribing' || state === 'processing' || state === 'saving';
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

      {/* Expired paywall */}
      {isExpired && (
        <div style={{
          padding: '24px', borderRadius: '14px', textAlign: 'center',
          background: '#141414', border: '1px solid #3a2a00',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔒</div>
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Trial süresi doldu</div>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
            Kayıt yapmaya devam etmek için lisans satın al.
          </div>
          <button
            onClick={() => window.api.openExternal('https://silent-note-landing.vercel.app/#pricing')}
            style={{
              padding: '9px 22px', borderRadius: '9px', border: 'none',
              background: '#6366f1', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Lisans Al →
          </button>
        </div>
      )}

      {/* Saved file notification */}
      {savedFile && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#0d1a0d', border: '1px solid #1e3a1e', color: '#6ee77a', fontSize: '12px' }}>
          📄 Dosya kaydedildi: <span style={{ opacity: 0.7 }}>{savedFile}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#1a0a0a', border: '1px solid #3a1a1a', color: '#f87171', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Recording Card — sadece trial/licensed durumda göster */}
      {!isExpired && <div style={{
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
            {state === 'done' && error ? '⚠️  Hata oluştu' : STATUS_TEXT[state]}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          {state === 'idle' && (
            <Btn color="#6366f1" onClick={startRecording}>⏺  Kaydı Başlat</Btn>
          )}
          {state === 'recording' && (
            <Btn color="#ef4444" onClick={stopRecording}>⏹  Durdur & Özetle</Btn>
          )}
          {isProcessing && (
            <Btn color="#333" onClick={() => {}} disabled>⏳  İşleniyor...</Btn>
          )}
          {state === 'done' && (
            <>
              <Btn color="#374151" onClick={reset}>↩  Yeni Kayıt</Btn>
              {!error && <Btn color="#059669" onClick={saveSession}>💾  Kaydet</Btn>}
            </>
          )}
        </div>
      </div>}

      {/* Results */}
      {transcript && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
          <Card title="Transkript">
            <div style={{ fontSize: '13px', lineHeight: '1.75', color: '#bbb', overflowY: 'auto', maxHeight: '320px', whiteSpace: 'pre-wrap' }}>
              {transcript}
            </div>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {title && (
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#e5e5e5', padding: '0 2px' }}>
                {title}
              </div>
            )}

            {summary.length > 0 && (
              <Card title="Özet">
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
