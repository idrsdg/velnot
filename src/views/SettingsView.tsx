import React, { useState, useEffect } from 'react';

export default function SettingsView({ onSaved }: { onSaved?: () => void } = {}) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [assemblyKey, setAssemblyKey] = useState('');
  const [showAssemblyKey, setShowAssemblyKey] = useState(false);
  const [language, setLanguage] = useState('tr');
  const [autoDelete, setAutoDelete] = useState(true);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    window.api.getSetting('api_key').then(val => { if (val) setApiKey(val); });
    window.api.getSetting('assemblyai_key').then(val => { if (val) setAssemblyKey(val); });
    window.api.getSetting('language').then(val => { if (val) setLanguage(val); });
    window.api.getSetting('auto_delete').then(val => { if (val !== null) setAutoDelete(val === 'true'); });
  }, []);

  const save = async () => {
    setStatus('saving');
    setErrorMsg('');
    try {
      await Promise.all([
        window.api.setSetting('api_key', apiKey),
        window.api.setSetting('assemblyai_key', assemblyKey),
        window.api.setSetting('language', language),
        window.api.setSetting('auto_delete', String(autoDelete)),
      ]);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
      onSaved?.();
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Kaydetme başarısız');
      setStatus('error');
    }
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: '560px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Ayarlar</h1>
        <p style={{ color: '#555', fontSize: '13px', marginTop: '2px' }}>Uygulama yapılandırması</p>
      </div>

      {/* API Key */}
      <SettingCard title="OpenAI API Key" desc="Whisper transkripsiyon ve GPT özet için gerekli">
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..."
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              background: '#0f0f0f', border: '1px solid #2a2a2a',
              color: '#f0f0f0', fontSize: '13px', outline: 'none',
            }}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#888', cursor: 'pointer', fontSize: '13px' }}
          >
            {showKey ? '🙈' : '👁'}
          </button>
        </div>
        <div style={{ marginTop: '10px', padding: '12px 14px', borderRadius: '8px', background: '#0d0d18', border: '1px solid #2a2a4a', fontSize: '12px', lineHeight: '1.8' }}>
          <div style={{ fontWeight: 600, color: '#818cf8', marginBottom: '6px' }}>API key nasıl alınır?</div>
          <ol style={{ paddingLeft: '16px', color: '#666' }}>
            <li><span style={{ color: '#999' }}>platform.openai.com</span>'a git ve giriş yap</li>
            <li>Sol menüden <strong style={{ color: '#999' }}>API Keys</strong> sekmesine tıkla</li>
            <li><strong style={{ color: '#999' }}>Create new secret key</strong> butonuna bas</li>
            <li>Oluşan key'i kopyala ve yukarıdaki kutuya yapıştır</li>
          </ol>
          <button
            onClick={() => window.api.openExternal('https://platform.openai.com/api-keys')}
            style={{ marginTop: '8px', padding: '5px 12px', borderRadius: '6px', border: '1px solid #3a3a6a', background: 'transparent', color: '#818cf8', fontSize: '11px', cursor: 'pointer' }}
          >
            platform.openai.com'u aç →
          </button>
        </div>
      </SettingCard>

      {/* AssemblyAI Key */}
      <SettingCard title="AssemblyAI API Key (İsteğe Bağlı)" desc="Konuşmacı ayrıştırma (diarization) için gerekli. assemblyai.com'dan ücretsiz alabilirsin.">
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type={showAssemblyKey ? 'text' : 'password'}
            value={assemblyKey}
            onChange={e => setAssemblyKey(e.target.value)}
            placeholder="Key'ini buraya gir..."
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              background: '#0f0f0f', border: '1px solid #2a2a2a',
              color: '#f0f0f0', fontSize: '13px', outline: 'none',
            }}
          />
          <button
            onClick={() => setShowAssemblyKey(!showAssemblyKey)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#888', cursor: 'pointer', fontSize: '13px' }}
          >
            {showAssemblyKey ? '🙈' : '👁'}
          </button>
        </div>
        <p style={{ fontSize: '11px', color: '#444', marginTop: '6px' }}>
          Girilirse transkripte "Konuşmacı A:", "Konuşmacı B:" etiketleri eklenir. Girilmezse Whisper kullanılır.
        </p>
      </SettingCard>

      {/* Language */}
      <SettingCard title="Transkripsiyon Dili" desc="Toplantılarda konuşulan dil">
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: '8px',
            background: '#0f0f0f', border: '1px solid #2a2a2a',
            color: '#f0f0f0', fontSize: '13px', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="tr">Türkçe</option>
          <option value="en">English</option>
          <option value="auto">Otomatik Algıla</option>
        </select>
      </SettingCard>

      {/* Auto delete */}
      <SettingCard title="Ses Dosyalarını Otomatik Sil" desc="Transkripsiyon biter bitmez ses dosyası silinir. Gizlilik için önerilir.">
        <div
          onClick={() => setAutoDelete(!autoDelete)}
          style={{
            width: '44px', height: '24px', borderRadius: '12px',
            background: autoDelete ? '#6366f1' : '#333',
            cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
          }}
        >
          <div style={{
            position: 'absolute', top: '3px',
            left: autoDelete ? '23px' : '3px',
            width: '18px', height: '18px', borderRadius: '9px',
            background: '#fff', transition: 'left 0.2s',
          }} />
        </div>
      </SettingCard>

      {/* Error */}
      {status === 'error' && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#1a0a0a', border: '1px solid #3a1a1a', color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>
          {errorMsg}
        </div>
      )}

      {/* Save */}
      <button
        onClick={save}
        disabled={status === 'saving'}
        style={{
          marginTop: '8px', padding: '10px 24px', borderRadius: '9px', border: 'none',
          background: status === 'saved' ? '#059669' : '#6366f1', color: '#fff',
          fontSize: '14px', fontWeight: 600,
          cursor: status === 'saving' ? 'not-allowed' : 'pointer',
          opacity: status === 'saving' ? 0.6 : 1,
          transition: 'background 0.3s',
        }}
      >
        {status === 'saving' ? 'Kaydediliyor...' : status === 'saved' ? '✅ Kaydedildi' : 'Kaydet'}
      </button>

      {/* Info box */}
      <div style={{
        marginTop: '32px', padding: '16px', borderRadius: '10px',
        background: '#0d1117', border: '1px solid #1e2a1e',
        fontSize: '12px', color: '#4a7c59', lineHeight: '1.6',
      }}>
        <div style={{ fontWeight: 600, marginBottom: '4px', color: '#6ee77a' }}>🔒 Gizlilik</div>
        Ses verileri Whisper API'ye gönderilir ve hemen silinir. Transkriptler yalnızca bu bilgisayarda saklanır. Hiçbir veri üçüncü taraflarla paylaşılmaz.
      </div>
    </div>
  );
}

function SettingCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px', padding: '18px 20px', background: '#141414', borderRadius: '12px', border: '1px solid #222' }}>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#e5e5e5', marginBottom: '2px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#555' }}>{desc}</div>
      </div>
      {children}
    </div>
  );
}
