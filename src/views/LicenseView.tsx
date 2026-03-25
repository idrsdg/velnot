import React, { useState } from 'react';
import { useT, localizeError } from '../LanguageContext';

// TODO: Replace MONTHLY_URL and YEARLY_URL after creating subscription products on Lemon Squeezy
const CHECKOUT_URLS = {
  monthly:  'MONTHLY_CHECKOUT_URL',
  yearly:   'YEARLY_CHECKOUT_URL',
  lifetime: 'https://silentnoteai.lemonsqueezy.com/checkout/buy/3c35056c-2075-4429-8193-e4cab81cd49a',
};

export default function LicenseView({ onActivated }: { onActivated: () => void }) {
  const { t } = useT();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activate = async () => {
    if (!key.trim()) return;
    setLoading(true);
    setError('');
    const result = await window.api.activateLicense(key.trim());
    setLoading(false);
    if (result.success) {
      onActivated();
    } else {
      setError(localizeError(result.error ?? '', t) || result.error ?? t.license.activate.btn);
    }
  };

  const plans = [
    { id: 'monthly' as const,  popular: false, url: CHECKOUT_URLS.monthly,  ...t.license.plans.monthly  },
    { id: 'yearly' as const,   popular: true,  url: CHECKOUT_URLS.yearly,   ...t.license.plans.yearly   },
    { id: 'lifetime' as const, popular: false, url: CHECKOUT_URLS.lifetime, ...t.license.plans.lifetime },
  ];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: '40px',
    }}>
      <div style={{ maxWidth: '680px', width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '14px' }}>🔒</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>
            {t.license.expired}
          </h1>
          <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
            {t.license.desc}
          </p>
        </div>

        {/* Pricing cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '28px' }}>
          {plans.map(plan => (
            <div
              key={plan.id}
              style={{
                padding: '22px 16px 18px', borderRadius: '14px', textAlign: 'center',
                background: plan.popular ? 'rgba(99,102,241,.1)' : '#111',
                border: plan.popular ? '1.5px solid #6366f1' : '1px solid #222',
                position: 'relative',
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
                  background: '#6366f1', color: '#fff', fontSize: '10px', fontWeight: 700,
                  padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap',
                }}>
                  {t.license.popular}
                </div>
              )}
              <div style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '10px',
                color: plan.popular ? '#818cf8' : '#555',
              }}>
                {plan.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2px', marginBottom: '4px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#f0f0f0' }}>{plan.price}</span>
                {plan.period && <span style={{ fontSize: '12px', color: '#555' }}>{plan.period}</span>}
              </div>
              <div style={{ fontSize: '11px', color: '#444', marginBottom: '14px', minHeight: '16px', lineHeight: '1.5' }}>
                {plan.note}
              </div>
              <button
                onClick={() => window.api.openExternal(plan.url)}
                style={{
                  width: '100%', padding: '8px', borderRadius: '8px',
                  background: plan.popular ? '#6366f1' : '#1e1e1e',
                  color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  border: plan.popular ? 'none' : '1px solid #2a2a2a',
                }}
              >
                {t.license.buy}
              </button>
            </div>
          ))}
        </div>

        {/* Activation */}
        <div style={{
          background: '#141414', borderRadius: '14px', padding: '24px', border: '1px solid #222',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#888', marginBottom: '12px' }}>
            {t.license.activate.hint}
          </div>
          <input
            type="text"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && activate()}
            placeholder={t.license.activate.placeholder}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '8px',
              background: '#0f0f0f', border: '1px solid #2a2a2a',
              color: '#f0f0f0', fontSize: '13px', outline: 'none',
              marginBottom: '10px', boxSizing: 'border-box',
            }}
          />
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', marginBottom: '10px',
              background: '#1a0a0a', border: '1px solid #3a1a1a', color: '#f87171', fontSize: '13px',
            }}>
              {error}
            </div>
          )}
          <button
            onClick={activate}
            disabled={loading || !key.trim()}
            style={{
              width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
              background: '#374151', color: '#fff', fontSize: '13px', fontWeight: 600,
              cursor: loading || !key.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !key.trim() ? 0.5 : 1,
            }}
          >
            {loading ? t.license.activate.activating : t.license.activate.btn}
          </button>
        </div>

      </div>
    </div>
  );
}
