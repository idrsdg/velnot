import React, { useState, useEffect, useRef } from 'react';
import { useT } from '../LanguageContext';

interface LicenseStatus {
  type: string;
  sessionsUsed?: number;
  sessionsLimit?: number;
  daysLeft?: number;
}

interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
}

export default function SettingsView({ onSaved, licenseStatus, onGetLicense }: { onSaved?: () => void; licenseStatus?: LicenseStatus | null; onGetLicense?: () => void } = {}) {
  const { t } = useT();
  const [language, setLanguage] = useState('tr');
  const [autoDelete, setAutoDelete] = useState(true);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  useEffect(() => {
    window.api.getSetting('language').then(val => { if (val) setLanguage(val); });
    window.api.getSetting('auto_delete').then(val => { if (val !== null) setAutoDelete(val === 'true'); });
    // Fetch usage info
    window.api.getLicenseUsage?.().then((u: UsageInfo) => setUsage(u)).catch(() => {});
  }, []);

  const save = async () => {
    setStatus('saving');
    setErrorMsg('');
    try {
      await Promise.all([
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

      {/* Usage Card */}
      {usage && <UsageCard usage={usage} t={t} onGetLicense={onGetLicense} licenseStatus={licenseStatus} />}

      {/* Transcription Language */}
      <SettingCard title={t.settings.transcribeLang.title} desc={t.settings.transcribeLang.desc}>
        <LangDropdown value={language} onChange={setLanguage} />
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

      {/* Privacy & Legal */}
      <div style={{
        marginTop: '32px', padding: '16px', borderRadius: '10px',
        background: '#0d1117', border: '1px solid #1e2a1e',
        fontSize: '12px', color: '#4a7c59', lineHeight: '1.6',
      }}>
        <div style={{ fontWeight: 600, marginBottom: '6px', color: '#6ee77a' }}>{t.settings.privacy.title}</div>
        <div style={{ marginBottom: '8px' }}>{t.settings.privacy.text}</div>
        <div style={{ color: '#3a5c3a', marginBottom: '10px' }}>
          {t.settings.privacy.processors}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.api.openExternal('https://velnot.com/privacy')}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #1e3a1e', background: 'transparent', color: '#6ee77a', fontSize: '11px', cursor: 'pointer' }}
          >
            {t.settings.privacy.policyLink}
          </button>
          <button
            onClick={() => window.api.openExternal('https://velnot.com/terms')}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #1e3a1e', background: 'transparent', color: '#6ee77a', fontSize: '11px', cursor: 'pointer' }}
          >
            {t.settings.privacy.termsLink}
          </button>
        </div>
      </div>
    </div>
  );
}

const CHECKOUT_URL_PRO = 'PLACEHOLDER_PRO_URL';

function UsageCard({ usage, t, onGetLicense, licenseStatus }: { usage: UsageInfo; t: any; onGetLicense?: () => void; licenseStatus?: LicenseStatus | null }) {
  const isUnlimited = usage.limit === -1;
  const pct = isUnlimited ? 100 : Math.min(100, Math.round((usage.used / Math.max(usage.limit, 1)) * 100));
  const isWarning = !isUnlimited && pct >= 80;
  const isDanger  = !isUnlimited && pct >= 100;

  const barColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#f97316';
  const tier = licenseStatus?.type ?? '';
  const showUpgrade = tier === 'starter' || tier === 'monthly';

  return (
    <div style={{ marginBottom: '20px', padding: '18px 20px', background: '#150f09', borderRadius: '12px', border: '1px solid #222' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#e5e5e5' }}>{t.settings.usage?.title ?? 'Kullanım'}</div>
        {isUnlimited
          ? <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>∞ Sınırsız</span>
          : <span style={{ fontSize: '12px', color: isDanger ? '#f87171' : '#888' }}>
              {usage.remaining} / {usage.limit} kayıt kaldı
            </span>
        }
      </div>

      {!isUnlimited && (
        <>
          <div style={{ height: '6px', borderRadius: '3px', background: '#1e1e1e', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '3px', transition: 'width 0.4s' }} />
          </div>
          <div style={{ fontSize: '12px', color: '#555', marginBottom: showUpgrade ? '12px' : '0' }}>
            {usage.used} kayıt kullanıldı
          </div>
        </>
      )}

      {showUpgrade && (
        <button
          onClick={() => window.api.openExternal(CHECKOUT_URL_PRO)}
          style={{
            padding: '7px 16px', borderRadius: '8px', border: 'none',
            background: '#f97316', color: '#fff', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t.settings.usage?.upgradeBtn ?? 'Pro\'ya Geç →'}
        </button>
      )}
    </div>
  );
}

function PlanCard({ status, t, onGetLicense }: { status: { type: string; sessionsUsed?: number; sessionsLimit?: number; daysLeft?: number }; t: any; onGetLicense?: () => void }) {
  const isTrial = status.type === 'trial';
  const isExpired = status.type === 'expired';
  const isActive = !isTrial && !isExpired;

  const planLabel = isTrial
    ? t.settings.plan.trial
    : isExpired
    ? t.settings.plan.expired
    : status.type === 'starter' || status.type === 'monthly'
    ? t.settings.plan.starter ?? t.settings.plan.monthly
    : status.type === 'pro' || status.type === 'yearly'
    ? t.settings.plan.pro ?? t.settings.plan.yearly
    : status.type === 'unlimited' || status.type === 'lifetime'
    ? t.settings.plan.unlimited ?? t.settings.plan.lifetime
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
          onClick={() => window.api.openExternal(CHECKOUT_URL_PRO)}
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

const LANG_OPTIONS = [
  { value: 'tr', label: 'Türkçe',    flag: '🇹🇷' },
  { value: 'en', label: 'English',   flag: '🇬🇧' },
  { value: 'es', label: 'Español',   flag: '🇪🇸' },
  { value: 'fr', label: 'Français',  flag: '🇫🇷' },
  { value: 'de', label: 'Deutsch',   flag: '🇩🇪' },
  { value: 'pt', label: 'Português', flag: '🇵🇹' },
  { value: 'zh', label: '中文',      flag: '🇨🇳' },
  { value: 'ar', label: 'العربية',  flag: '🇸🇦' },
  { value: 'hi', label: 'हिन्दी',   flag: '🇮🇳' },
  { value: 'auto', label: 'Auto',    flag: '🌐' },
];

function LangDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = LANG_OPTIONS.find(o => o.value === value) ?? LANG_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px', borderRadius: '8px',
          background: '#0e0a07', border: `1px solid ${open ? '#f97316' : '#2a2a2a'}`,
          color: '#f0f0f0', fontSize: '13px', cursor: 'pointer',
          minWidth: '160px', justifyContent: 'space-between',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>{selected.flag}</span>
          <span>{selected.label}</span>
        </span>
        <span style={{ color: '#555', fontSize: '10px', marginLeft: '4px' }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          background: '#1a1109', border: '1px solid #2a1e14', borderRadius: '10px',
          padding: '4px', minWidth: '160px', zIndex: 200,
          boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
        }}>
          {LANG_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', padding: '7px 10px', borderRadius: '7px', border: 'none',
                background: opt.value === value ? 'rgba(249,115,22,0.18)' : 'transparent',
                color: opt.value === value ? '#fdba74' : '#c4b09a',
                fontSize: '13px', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '15px' }}>{opt.flag}</span>
              <span>{opt.label}</span>
              {opt.value === value && <span style={{ marginLeft: 'auto', color: '#f97316', fontSize: '11px' }}>✓</span>}
            </button>
          ))}
        </div>
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
