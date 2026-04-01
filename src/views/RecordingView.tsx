import React, { useState, useEffect, useRef } from 'react';
import { useT, localizeError } from '../LanguageContext';
import { DiarizationResult, Utterance } from '../types/api';
import { LANGUAGES } from '../i18n';

type State = 'idle' | 'recording' | 'transcribing' | 'transcribed' | 'analyzing' | 'done';
type ProcessMode = 'summary' | 'action_plan' | 'meeting_notes';
type ExportFormat = 'txt' | 'md' | 'pdf' | 'docx';

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
  const [recordingLang, setRecordingLang] = useState('auto');
  const [processingElapsed, setProcessingElapsed] = useState(0);
  const [isSessionFinalized, setIsSessionFinalized] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [exportPath, setExportPath] = useState('');
  const [copyMenu, setCopyMenu] = useState<{ x: number; y: number; source: 'preview' | 'editor'; allText: string } | null>(null);

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
  const transcriptRef = useRef('');
  const stateRef = useRef<State>('idle');
  const savedSessionIdRef = useRef<string | null>(null);
  const diarizationTokenRef = useRef(0);
  const latestDiarizationRef = useRef<DiarizationResult | null>(null);
  const draftPromiseRef = useRef<Promise<string | null> | null>(null);
  const audioSavedForSessionRef = useRef<string | null>(null);
  const isSessionFinalizedRef = useRef(false);
  const previewTranscriptRef = useRef<HTMLTextAreaElement | null>(null);
  const editorTranscriptRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    window.api.getSetting('recording_consent_given').then(val => {
      if (val === 'true') setConsentGiven(true);
    });
    window.api.getSetting('language').then(val => {
      if (val) setRecordingLang(val);
    });
  }, []);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    savedSessionIdRef.current = savedSessionId;
  }, [savedSessionId]);

  useEffect(() => {
    isSessionFinalizedRef.current = isSessionFinalized;
  }, [isSessionFinalized]);

  useEffect(() => {
    if (state === 'transcribing' || state === 'analyzing') {
      setProcessingElapsed(0);
      processingTimerRef.current = setInterval(() => setProcessingElapsed(s => s + 1), 1000);
    } else {
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
        processingTimerRef.current = null;
      }
    }
  }, [state]);

  useEffect(() => {
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      liveTimerRef.current && clearInterval(liveTimerRef.current);
      processingTimerRef.current && clearInterval(processingTimerRef.current);
      rafRef.current && cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close();
      micStreamRef.current?.getTracks().forEach(tr => tr.stop());
      sysStreamRef.current?.getTracks().forEach(tr => tr.stop());
    };
  }, []);

  useEffect(() => {
    if (!copyMenu) return;
    const close = () => setCopyMenu(null);
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCopyMenu(null);
    };
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [copyMenu]);

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

  const deriveDraftTitle = (value: string) => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) return 'Untitled';
    return normalized.slice(0, 72);
  };

  const buildExportPayload = () => ({
    title: title || deriveDraftTitle(editTranscript || transcriptRef.current),
    date: startedAtRef.current || Date.now(),
    duration_sec: elapsed,
    summary,
    action_items: actions,
    transcript: editTranscript || transcriptRef.current,
  });

  const ensureDraftSession = async (baseTranscript: string) => {
    if (savedSessionIdRef.current) {
      const existing = await window.api.getSession(savedSessionIdRef.current);
      if (existing) {
        await window.api.updateSession({
          ...existing,
          title: existing.title || deriveDraftTitle(baseTranscript),
          started_at: startedAtRef.current,
          ended_at: endedAtRef.current,
          duration_sec: elapsed,
          transcript: baseTranscript,
          summary: existing.summary || '[]',
          action_items: existing.action_items || '[]',
          tags: existing.tags || JSON.stringify(['draft']),
          utterances: latestDiarizationRef.current?.utterances?.length
            ? JSON.stringify(latestDiarizationRef.current.utterances)
            : existing.utterances,
        });
      }
      if (audioBlobRef.current && audioSavedForSessionRef.current !== savedSessionIdRef.current) {
        const audioBuf = await audioBlobRef.current.arrayBuffer();
        await window.api.saveAudio(savedSessionIdRef.current, audioBuf);
        audioSavedForSessionRef.current = savedSessionIdRef.current;
      }
      return savedSessionIdRef.current;
    }

    if (!draftPromiseRef.current) {
      draftPromiseRef.current = (async () => {
        const saved = await window.api.saveSession({
          title: deriveDraftTitle(baseTranscript),
          started_at: startedAtRef.current,
          ended_at: endedAtRef.current,
          duration_sec: elapsed,
          transcript: baseTranscript,
          summary: '[]',
          action_items: '[]',
          tags: JSON.stringify(['draft']),
          utterances: latestDiarizationRef.current?.utterances?.length
            ? JSON.stringify(latestDiarizationRef.current.utterances)
            : undefined,
        } as any);

        savedSessionIdRef.current = saved.id;
        setSavedSessionId(saved.id);

        if (audioBlobRef.current && audioSavedForSessionRef.current !== saved.id) {
          const audioBuf = await audioBlobRef.current.arrayBuffer();
          await window.api.saveAudio(saved.id, audioBuf);
          audioSavedForSessionRef.current = saved.id;
        }

        return saved.id;
      })().finally(() => {
        draftPromiseRef.current = null;
      });
    }

    return draftPromiseRef.current;
  };

  const transcribePendingTail = async (lang: string) => {
    const newChunks = chunksRef.current.slice(lastLiveChunkRef.current);
    if (newChunks.length === 0) return '';
    lastLiveChunkRef.current = chunksRef.current.length;
    const snapshot = new Blob(newChunks, { type: 'audio/webm' });
    const buf = await snapshot.arrayBuffer();
    return window.api.transcribeChunk(buf, lang);
  };

  const copyToClipboard = async (value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
  };

  const startRecording = async () => {
    setError('');
    setHasSysAudio(false);
    setLiveTranscript('');
    setUtterances([]);
    setIsSessionFinalized(false);
    setExportPath('');
    latestDiarizationRef.current = null;
    isSessionFinalizedRef.current = false;
    audioSavedForSessionRef.current = null;
    diarizationTokenRef.current += 1;
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

      // Real-time transcription every 10 seconds so shorter recordings get a preview sooner.
      const lang = recordingLang || 'auto';
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
      }, 10000);
    } catch (e: any) {
      setError(localizeError(e?.message ?? '', t));
    }
  };

  const applyDiarizationResult = async (requestId: number, result: DiarizationResult) => {
    if (diarizationTokenRef.current !== requestId) return;

    latestDiarizationRef.current = result;
    setUtterances(result.utterances ?? []);

    const sessionId = savedSessionIdRef.current;
    if (!sessionId || !result.utterances?.length) return;

    try {
      const session = await window.api.getSession(sessionId);
      if (!session) return;
      await window.api.updateSession({
        ...session,
        utterances: JSON.stringify(result.utterances),
      });
    } catch {
      // Speaker timing enrichment is best-effort.
    }
  };

  const stopRecording = async () => {
    // Capture live transcript before any async ops (accumulated from 10s chunks during recording)
    const capturedLive = liveTranscript;

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
      const lang = recordingLang || 'auto';
      const arrayBuffer = await audioBlob.arrayBuffer();
      const requestId = ++diarizationTokenRef.current;
      const pendingTailPromise = transcribePendingTail(lang).catch(() => '');

      // AssemblyAI diarization always runs fully in background
      const diarizationPromise = window.api.transcribeAudio(arrayBuffer, lang)
        .then(async result => {
          await applyDiarizationResult(requestId, result);
          return result;
        })
        .catch(() => null);

      if (capturedLive) {
        // Live transcript ready → show immediately, refine with full Whisper in background
        setTranscript(capturedLive);
        setEditTranscript(capturedLive);
        setLiveTranscript('');
        setState('transcribed');
        void ensureDraftSession(capturedLive);
        pendingTailPromise.then(tail => {
          if (!tail || stateRef.current === 'done') return;
          const merged = `${capturedLive} ${tail}`.trim();
          setTranscript(merged);
          if (stateRef.current === 'transcribed') setEditTranscript(merged);
          void ensureDraftSession(merged);
        });
        window.api.transcribeFast(arrayBuffer, lang)
          .then(result => {
            if (result && stateRef.current !== 'done') {
              setTranscript(result);
              if (stateRef.current === 'transcribed') setEditTranscript(result);
              void ensureDraftSession(result);
            }
          })
          .catch(async () => {
            const fallback = await diarizationPromise;
            if (fallback?.transcript && stateRef.current !== 'done') {
              setTranscript(fallback.transcript);
              if (stateRef.current === 'transcribed') setEditTranscript(fallback.transcript);
              void ensureDraftSession(fallback.transcript);
            }
          });
      } else {
        // Short recording: try the final unsent chunk first, then refine in background if needed.
        const immediateTranscript = await pendingTailPromise;
        let initialTranscript = immediateTranscript;

        if (!initialTranscript) {
          try {
            initialTranscript = await window.api.transcribeFast(arrayBuffer, lang);
          } catch {
            const fallback = await diarizationPromise;
            initialTranscript = fallback?.transcript ?? '';
          }
        }

        if (!initialTranscript) {
          throw new Error('Transkripsiyon başarısız: hızlı ve fallback transcript alınamadı.');
        }

        setTranscript(initialTranscript);
        setEditTranscript(initialTranscript);
        setLiveTranscript('');
        setState('transcribed');
        void ensureDraftSession(initialTranscript);
        if (immediateTranscript) {
          window.api.transcribeFast(arrayBuffer, lang)
            .then(result => {
              if (result && result !== initialTranscript && stateRef.current !== 'done') {
                setTranscript(result);
                if (stateRef.current === 'transcribed') setEditTranscript(result);
                void ensureDraftSession(result);
              }
            })
            .catch(async () => {
              const fallback = await diarizationPromise;
              if (fallback?.transcript && fallback.transcript !== initialTranscript && stateRef.current !== 'done') {
                setTranscript(fallback.transcript);
                if (stateRef.current === 'transcribed') setEditTranscript(fallback.transcript);
                void ensureDraftSession(fallback.transcript);
              }
            });
        }
      }
    } catch (e: any) {
      setError(localizeError(e?.message ?? '', t));
      setState('done');
    }
  };

  const processTranscript = async (mode: ProcessMode) => {
    setActiveMode(mode);
    setState('analyzing');
    try {
      const baseTranscript = transcriptRef.current;
      const [draftId, result] = await Promise.all([
        ensureDraftSession(baseTranscript),
        window.api.generateSummary(baseTranscript, mode),
      ]);
      const diarization = latestDiarizationRef.current;
      setTitle(result.title);
      setSummary(result.summary);
      setActions(result.action_items);
      setState('done');
      setEditTranscript(baseTranscript);
      setExportPath('');

      if (draftId) {
        const draft = await window.api.getSession(draftId);
        if (draft) {
          await window.api.updateSession({
            ...draft,
            title: result.title || deriveDraftTitle(baseTranscript),
            started_at: startedAtRef.current,
            ended_at: endedAtRef.current,
            duration_sec: elapsed,
            transcript: baseTranscript,
            summary: JSON.stringify(result.summary),
            action_items: JSON.stringify(result.action_items),
            tags: JSON.stringify(['draft', mode]),
            utterances: diarization?.utterances?.length ? JSON.stringify(diarization.utterances) : draft.utterances,
          });
          setSavedSessionId(draftId);
        }
      }
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

  const finalizeSession = async () => {
    try {
      const sessionId = await ensureDraftSession(editTranscript || transcriptRef.current);
      if (!sessionId) return false;

      setSaveBusy(true);
      const session = await window.api.getSession(sessionId);
      if (!session) return false;
      await window.api.updateSession({
        ...session,
        title: title || deriveDraftTitle(editTranscript || transcriptRef.current),
        started_at: startedAtRef.current,
        ended_at: endedAtRef.current,
        duration_sec: elapsed,
        transcript: editTranscript || transcriptRef.current,
        summary: JSON.stringify(summary),
        action_items: JSON.stringify(actions),
        tags: JSON.stringify(activeMode ? [activeMode] : ['transcript']),
        utterances: latestDiarizationRef.current?.utterances?.length
          ? JSON.stringify(latestDiarizationRef.current.utterances)
          : session.utterances,
      });
      setIsSessionFinalized(true);
      isSessionFinalizedRef.current = true;
      onSessionSaved?.();
      return true;
    } catch (e: any) {
      setError(localizeError(e?.message ?? '', t));
      return false;
    } finally {
      setSaveBusy(false);
    }
  };

  const handleDiscard = async () => {
    if (!window.confirm((t.record as any).discardConfirm)) return;
    if (savedSessionIdRef.current) {
      await window.api.deleteSession(savedSessionIdRef.current);
    }
    reset(true);
  };

  const handleExport = async (format: ExportFormat) => {
    setExportingFormat(format);
    setExportPath('');
    try {
      const filePath = await window.api.exportSession(buildExportPayload(), format);
      setExportPath(filePath);
    } finally {
      setExportingFormat(null);
    }
  };

  const openCopyMenu = (
    e: React.MouseEvent<HTMLTextAreaElement>,
    source: 'preview' | 'editor',
    allText: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setCopyMenu({ x: e.clientX, y: e.clientY, source, allText });
  };

  const handleCopySelection = async () => {
    const el = copyMenu?.source === 'preview' ? previewTranscriptRef.current : editorTranscriptRef.current;
    const selected = el ? el.value.slice(el.selectionStart, el.selectionEnd) : '';
    await copyToClipboard(selected || copyMenu?.allText || '');
    setCopyMenu(null);
  };

  const handleSelectAll = () => {
    const el = copyMenu?.source === 'preview' ? previewTranscriptRef.current : editorTranscriptRef.current;
    el?.focus();
    el?.select();
    setCopyMenu(null);
  };

  const reset = (skipDraftCleanup = false) => {
    if (!skipDraftCleanup && savedSessionIdRef.current && !isSessionFinalizedRef.current) {
      void window.api.deleteSession(savedSessionIdRef.current);
    }
    draftPromiseRef.current = null;
    audioSavedForSessionRef.current = null;
    isSessionFinalizedRef.current = false;
    latestDiarizationRef.current = null;
    setIsSessionFinalized(false);
    setSaveBusy(false);
    setExportingFormat(null);
    setExportPath('');
    setCopyMenu(null);
    diarizationTokenRef.current += 1;
    setState('idle');
    setElapsed(0);
    setProcessingElapsed(0);
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
    savedSessionIdRef.current = null;
  };

  const handleRecordingLangChange = async (value: string) => {
    setRecordingLang(value);
    await window.api.setSetting('language', value);
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
  const saveLabel = t.history.save ?? 'Save';
  const copySelectionLabel = (t.record as any).copySelection ?? 'Seçileni kopyala';
  const copyAllLabel = (t.record as any).copyAll ?? 'Tümünü kopyala';
  const selectAllLabel = (t.record as any).selectAll ?? 'Tümünü seç';
  const copyHint = (t.record as any).copyHint ?? 'Ctrl/Cmd yanında sağ tık ile de kopyalayabilirsin.';
  const exportTitle = (t.record as any).downloadsTitle ?? 'Dosya Olarak İndir';
  const exportHint = (t.record as any).downloadsHint ?? 'TXT, MD, PDF veya DOCX olarak dışa aktar.';
  const exportReadyLabel = (t.record as any).downloadsReady ?? 'Dosya oluşturuldu:';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#888' }}>
            <span>{t.settings.transcribeLang.title}</span>
            <select
              value={recordingLang}
              onChange={e => void handleRecordingLangChange(e.target.value)}
              disabled={state === 'recording' || isProcessing}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                background: '#120d09',
                border: '1px solid #2a2a2a',
                color: '#e5e5e5',
                fontSize: '12px',
                outline: 'none',
                cursor: state === 'recording' || isProcessing ? 'not-allowed' : 'pointer',
                opacity: state === 'recording' || isProcessing ? 0.6 : 1,
              }}
            >
              <option value="auto">🌐 Auto</option>
              {LANGUAGES.map(opt => (
                <option key={opt.code} value={opt.code}>
                  {opt.flag} {opt.label}
                </option>
              ))}
            </select>
          </label>
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
              {(state === 'transcribing' || state === 'analyzing') && processingElapsed > 0 && (
                <span style={{ marginLeft: '6px', color: '#555' }}>({processingElapsed}s)</span>
              )}
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
              <Btn color="#374151" onClick={() => reset()}>{t.record.newRecord}</Btn>
            )}
          </div>
        </div>
      )}

      {/* Transcript + mode selection */}
      {state === 'transcribed' && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0 }}>
          <Card title={t.record.results.transcript}>
            <textarea
              ref={previewTranscriptRef}
              readOnly
              value={transcript}
              onContextMenu={e => openCopyMenu(e, 'preview', transcript)}
              style={{
                width: '100%', minHeight: '220px', fontSize: '13px', lineHeight: '1.75',
                color: '#bbb', background: 'transparent', border: 'none', outline: 'none',
                resize: 'vertical', fontFamily: 'inherit', whiteSpace: 'pre-wrap',
              }}
            />
            <div style={{ fontSize: '11px', color: '#555', marginTop: '6px' }}>{copyHint}</div>
          </Card>

          <div style={{ background: '#150f09', borderRadius: '14px', padding: '20px', border: '1px solid #2a1a0a' }}>
            <div style={{ fontSize: '12px', color: '#fb923c', fontWeight: 600, marginBottom: '14px', letterSpacing: '0.06em' }}>
              {t.record.transcriptReady}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {MODES.map(m => (
                <button
                  key={m.key}
                  onClick={() => void processTranscript(m.key)}
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
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px', flexWrap: 'wrap' }}>
              <Btn
                color="#f97316"
                onClick={() => {
                  void (async () => {
                    const saved = await finalizeSession();
                    if (saved) setState('done');
                  })();
                }}
                disabled={saveBusy || isSessionFinalized}
              >
                {saveBusy ? '...' : saveLabel}
              </Btn>
              <Btn color="#374151" onClick={() => void handleDiscard()} disabled={saveBusy}>
                {(t.record as any).discard}
              </Btn>
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
                ref={editorTranscriptRef}
                value={editTranscript}
                onChange={e => setEditTranscript(e.target.value)}
                onBlur={handleTranscriptBlur}
                onContextMenu={e => openCopyMenu(e, 'editor', editTranscript)}
                style={{
                  width: '100%', minHeight: '200px', fontSize: '13px', lineHeight: '1.75',
                  color: '#bbb', background: 'transparent', border: 'none',
                  outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                }}
              />
              {editSaving && <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>Kaydediliyor...</div>}
              <div style={{ fontSize: '11px', color: '#555', marginTop: '6px' }}>{copyHint}</div>
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
              <Card title={exportTitle}>
                <div style={{ fontSize: '12px', color: '#777', marginBottom: '12px', lineHeight: '1.6' }}>{exportHint}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(['txt', 'md', 'pdf', 'docx'] as ExportFormat[]).map(format => (
                    <button
                      key={format}
                      onClick={() => void handleExport(format)}
                      disabled={exportingFormat !== null}
                      style={{
                        padding: '8px 12px', borderRadius: '8px', border: '1px solid #2a2a2a',
                        background: '#0e0a07', color: '#ddd', fontSize: '12px', cursor: exportingFormat ? 'not-allowed' : 'pointer',
                        opacity: exportingFormat && exportingFormat !== format ? 0.5 : 1,
                      }}
                    >
                      {exportingFormat === format ? '...' : format.toUpperCase()}
                    </button>
                  ))}
                </div>
                {exportPath && (
                  <div style={{ fontSize: '11px', color: '#4a7c59', marginTop: '12px', lineHeight: '1.6', wordBreak: 'break-all' }}>
                    {exportReadyLabel} {exportPath}
                  </div>
                )}
              </Card>
            )}
            {state === 'done' && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Btn color="#f97316" onClick={() => void finalizeSession()} disabled={saveBusy || isSessionFinalized}>
                  {isSessionFinalized ? t.record.savedToHistory : saveLabel}
                </Btn>
                <Btn color="#374151" onClick={() => void handleDiscard()} disabled={saveBusy}>
                  {(t.record as any).discard}
                </Btn>
              </div>
            )}
            {state === 'done' && isSessionFinalized && (
              <div style={{ fontSize: '12px', color: '#4a7c59', padding: '8px 12px', background: '#0d1a0d', borderRadius: '8px', border: '1px solid #1e3a1e' }}>
                {t.record.savedToHistory}
              </div>
            )}
          </div>
        </div>
      )}

      {copyMenu && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            zIndex: 1000,
            top: copyMenu.y,
            left: copyMenu.x,
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            padding: '4px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            minWidth: '170px',
          }}
        >
          <button onClick={() => void handleCopySelection()} style={ctxMenuItemStyle}>{copySelectionLabel}</button>
          <button onClick={() => void copyToClipboard(copyMenu.allText).then(() => setCopyMenu(null))} style={ctxMenuItemStyle}>{copyAllLabel}</button>
          <button onClick={handleSelectAll} style={ctxMenuItemStyle}>{selectAllLabel}</button>
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

const ctxMenuItemStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: 'none',
  background: 'transparent',
  color: '#e5e5e5',
  textAlign: 'left',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
};
