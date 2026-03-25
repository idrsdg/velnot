import React, { useState, useEffect } from 'react';
import { useT } from '../LanguageContext';

interface LicenseStatus {
  type: string;
  sessionsUsed?: number;
  sessionsLimit?: number;
  daysLeft?: number;
}

export default function SettingsView({ onSaved, licenseStatus, onGetLicense }: { onSaved?: () => void; licenseStatus?: LicenseStatus | null; onGetLicense?: () => void } = {}) {
  const { t } = useT();
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
      setErrorMsg(e?.message ?? t.settings.saveFailed);
      setStatus('error');
    }
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: '560px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>{t.settings.title}</h1>
        <p style={{ color: '#555', fontSize: '13px', marginTop: '2px' }}>{t.settings.subtitle}</p>
      </div>

      {/* Plan Status */}
      {licenseStatus && <PlanCard status={licenseStatus} t={t} onGetLicense={onGetLicense} />}

      {/* OpenAI API Key */}
      <SettingCard title={t.settings.openaiKey.title} desc={t.settings.openaiKey.desc}>
        <div style={{ marginBottom: '10px', padding: '12px 14px', borderRadius: '8px', background: '#0e0a07', border: '1px solid #2a1a0a', fontSize: '12px', lineHeight: '1.8' }}>
          <div style={{ fontWeight: 600, color: '#fb923c', marginBottom: '6px' }}>{t.settings.openaiKey.howTo}</div>
          <ol style={{ paddingLeft: '16px', color: '#666' }}>
            {t.settings.openaiKey.steps.map((step, i) => (
              <li key={i}><span style={{ color: '#999' }}>{step}</span></li>
            ))}
          </ol>
          <button
            onClick={() => window.api.openExternal('https://platform.openai.com/api-keys')}
            style={{ marginTop: '8px', padding: '5px 12px', borderRadius: '6px', border: '1px solid #3a2010', background: 'transparent', color: '#fb923c', fontSize: '11px', cursor: 'pointer' }}
          >
            {t.settings.openaiKey.open}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..."
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              background: '#0e0a07', border: '1px solid #2a2a2a',
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
      </SettingCard>

      {/* AssemblyAI Key */}
      <SettingCard title={t.settings.assemblyKey.title} desc={t.settings.assemblyKey.desc}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type={showAssemblyKey ? 'text' : 'password'}
            value={assemblyKey}
            onChange={e => setAssemblyKey(e.target.value)}
            placeholder={t.settings.assemblyKey.placeholder}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              background: '#0e0a07', border: '1px solid #2a2a2a',
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
          {t.settings.assemblyKey.note}
        </p>
      </SettingCard>

      {/* Transcription Language */}
      <SettingCard title={t.settings.transcribeLang.title} desc={t.settings.transcribeLang.desc}>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: '8px',
            background: '#0e0a07', border: '1px solid #2a2a2a',
            color: '#f0f0f0', fontSize: '13px', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="tr">Türkçe</option>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="pt">Português</option>
          <option value="zh">中文</option>
          <option value="ar">العربية</option>
          <option value="hi">हिन्दी</option>
          <option value="auto">Auto</option>
        </select>
      </SettingCard>

      {/* Auto delete */}
      <SettingCard title={t.settings.autoDelete.title} desc={t.settings.autoDelete.desc}>
        <div
          onClick={() => setAutoDelete(!autoDelete)}
          style={{
            width: '44px', height: '24px', borderRadius: '12px',
            background: autoDelete ? '#f97316' : '#333',
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
          background: status === 'saved' ? '#059669' : '#f97316', color: '#fff',
          fontSize: '14px', fontWeight: 600,
          cursor: status === 'saving' ? 'not-allowed' : 'pointer',
          opacity: status === 'saving' ? 0.6 : 1,
          transition: 'background 0.3s',
        }}
      >
        {status === 'saving' ? t.settings.saving : status === 'saved' ? t.settings.saved : t.settings.save}
      </button>

      {/* Privacy */}
      <div style={{
        marginTop: '32px', padding: '16px', borderRadius: '10px',
        background: '#0d1117', border: '1px solid #1e2a1e',
        fontSize: '12px', color: '#4a7c59', lineHeight: '1.6',
      }}>
        <div style={{ fontWeight: 600, marginBottom: '4px', color: '#6ee77a' }}>{t.settings.privacy.title}</div>
        {t.settings.privacy.text}
      </div>
    </div>
  );
}

const CHECKOUT_URL_YEARLY = 'https://velnot.lemonsqueezy.com/checkout/buy/bdbef23a-5149-479e-89dc-050cf7b5635e';

function PlanCard({ status, t, onGetLicense }: { status: { type: string; sessionsUsed?: number; sessionsLimit?: number; daysLeft?: number }; t: any; onGetLicense?: () => void }) {
  const isTrial = status.type === 'trial';
  const isExpired = status.type === 'expired';
  const isActive = !isTrial && !isExpired;

  const planLabel = isTrial
    ? t.settings.plan.trial
    : isExpired
    ? t.settings.plan.expired
    : status.type === 'monthly'
    ? t.settings.plan.monthly
    : status.type === 'yearly'
    ? t.settings.plan.yearly
    : status.type === 'lifetime'
    ? t.settings.plan.lifetime
    : t.settings.plan.active;

  const badgeColor = isExpired ? '#ef4444' : isTrial ? '#f97316' : '#22c55e';
  const bgColor = isExpired ? 'rgba(239,68,68,0.08)' : isTrial ? 'rgba(249,115,22,0.08)' : 'rgba(34,197,94,0.08)';
  const borderColor = isExpired ? '#3a1a1a' : isTrial ? '#3a2010' : '#1a3a1a';

  return (
    <div style={{ marginBottom: '20px', padding: '18px 20px', background: bgColor, borderRadius: '12px', border: `1px solid ${borderColor}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#e5e5e5' }}>{t.settings.plan.title}</div>
        <span style={{ padding: '3px 10px', borderRadius: '20px', background: badgeColor, color: '#fff', fontSize: '11px', fontWeight: 700 }}>
          {planLabel}
        </span>
      </div>

      {isTrial && (
        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '12px', lineHeight: '1.6' }}>
          {status.sessionsUsed !== undefined && status.sessionsLimit !== undefined && (
            <div>{t.settings.plan.sessionsUsed(status.sessionsUsed, status.sessionsLimit)}</div>
          )}
          {status.daysLeft !== undefined && (
            <div>{t.settings.plan.daysLeft(status.daysLeft)}</div>
          )}
        </div>
      )}

      {isExpired && (
        <div style={{ fontSize: '12px', color: '#f87171', marginBottom: '12px' }}>
          {t.license.expired}
        </div>
      )}

      {isActive && (
        <div style={{ fontSize: '12px', color: '#86efac', marginBottom: '12px' }}>
          ✓ {t.settings.plan.active}
        </div>
      )}

      {(isTrial || isExpired) && (
        <button
          onClick={onGetLicense}
          style={{
            padding: '7px 16px', borderRadius: '8px', border: 'none',
            background: '#f97316', color: '#fff', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t.settings.plan.upgrade}
        </button>
      )}

      {isActive && (
        <button
          onClick={() => window.api.openExternal(CHECKOUT_URL_YEARLY)}
          style={{
            padding: '7px 16px', borderRadius: '8px', border: '1px solid #1a3a1a',
            background: 'transparent', color: '#86efac', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t.settings.plan.manage}
        </button>
      )}
    </div>
  );
}

function SettingCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px', padding: '18px 20px', background: '#150f09', borderRadius: '12px', border: '1px solid #222' }}>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#e5e5e5', marginBottom: '2px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#555' }}>{desc}</div>
      </div>
      {children}
    </div>
  );
}
