import React, { useState } from 'react';
import { useT, localizeError } from '../LanguageContext';

const CHECKOUT_URLS = {
  monthly:  'https://velnot.lemonsqueezy.com/checkout/buy/86f794c7-9a13-46b2-93a3-3082f0fc25a3',
  yearly:   'https://velnot.lemonsqueezy.com/checkout/buy/bdbef23a-5149-479e-89dc-050cf7b5635e',
  lifetime: 'https://velnot.lemonsqueezy.com/checkout/buy/ccf62ba2-72b4-413f-919a-03dd1a2c1991',
};

export default function LicenseView({ onActivated }: { onActivated: () => void }) {
  const { t } = useT();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  const activate = async () => {
    if (!key.trim()) return;
    setLoading(true);
    setError('');
    const result = await window.api.activateLicense(key.trim());
    setLoading(false);
    if (result.success) {
      onActivated();
    } else {
      setError(localizeError(result.error ?? '', t) || (result.error ?? t.license.activate.btn));
    }
  };

  const openCheckout = (planId: 'monthly' | 'yearly' | 'lifetime') => {
    const params = new URLSearchParams();
    if (email.trim()) params.set('checkout[email]', email.trim());
    params.set('checkout[redirect_url]', 'https://velnot.com');
    window.api.openExternal(`${CHECKOUT_URLS[planId]}?${params.toString()}`);
  };

  const plans: Array<{ id: 'monthly' | 'yearly' | 'lifetime'; popular: boolean }> = [
    { id: 'monthly',  popular: false },
    { id: 'yearly',   popular: true  },
    { id: 'lifetime', popular: false },
  ];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: '40px',
    }}>
      <div style={{ maxWidth: '720px', width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '48px', marginBottom: '14px' }}>🔒</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>
            {t.license.expired}
          </h1>
          <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
            {t.license.desc}
          </p>
        </div>

        {/* Email pre-fill for checkout */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t.settings.account.emailPlaceholder}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '8px',
              background: '#0e0a07', border: '1px solid #2a1e14',
              color: '#f0f0f0', fontSize: '13px', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Pricing cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {plans.map(({ id, popular }) => {
            const plan = t.license.plans[id];
            return (
              <div
                key={id}
                style={{
                  padding: '22px 16px 18px', borderRadius: '14px', textAlign: 'center',
                  background: popular ? 'rgba(249,115,22,.12)' : '#111',
                  border: popular ? '1.5px solid #f97316' : '1px solid #222',
                  position: 'relative',
                }}
              >
                {popular && (
                  <div style={{
                    position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
                    background: '#f97316', color: '#fff', fontSize: '10px', fontWeight: 700,
                    padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap',
                  }}>
                    {t.license.popular}
                  </div>
                )}
                <div style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '10px',
                  color: popular ? '#fdba74' : '#555',
                }}>
                  {plan.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: '#f0f0f0' }}>{plan.price}</span>
                  {plan.period && <span style={{ fontSize: '12px', color: '#555' }}>{plan.period}</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#f97316', fontWeight: 600, marginBottom: '4px' }}>
                  {plan.minutes}
                </div>
                <div style={{ fontSize: '11px', color: '#444', marginBottom: '14px', minHeight: '16px', lineHeight: '1.5' }}>
                  {plan.note}
                </div>
                <button
                  onClick={() => openCheckout(id)}
                  style={{
                    width: '100%', padding: '8px', borderRadius: '8px',
                    background: popular ? '#f97316' : '#1e1e1e',
                    color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    border: popular ? 'none' : '1px solid #2a2a2a',
                  }}
                >
                  {t.license.buy}
                </button>
              </div>
            );
          })}
        </div>

        {/* Activation */}
        <div style={{
          background: '#150f09', borderRadius: '14px', padding: '24px', border: '1px solid #222',
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
              background: '#0e0a07', border: '1px solid #2a1e14',
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
