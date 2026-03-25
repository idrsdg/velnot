import React, { useState } from 'react';

export default function LicenseView({ onActivated }: { onActivated: () => void }) {
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
      setError(result.error ?? 'Aktivasyon başarısız.');
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: '40px',
    }}>
      <div style={{ maxWidth: '440px', width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '14px' }}>🔒</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>
            Trial süren doldu
          </h1>
          <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.7' }}>
            10 ücretsiz toplantını kullandın.<br />
            Devam etmek için lisans satın al.
          </p>
        </div>

        {/* Pricing pill */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            padding: '20px', borderRadius: '12px',
            background: 'rgba(99,102,241,.08)', border: '1px solid #6366f1', textAlign: 'center',
          }}>
            <div style={{ fontSize: '11px', color: '#6366f1', marginBottom: '6px', fontWeight: 700 }}>LİFETIME LİSANS</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#f0f0f0' }}>$29</div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>tek seferlik ödeme · 3 cihaz</div>
          </div>
        </div>

        {/* Buy button */}
        <button
          onClick={() => window.api.openExternal('https://silentnoteai.lemonsqueezy.com/checkout/buy/3c35056c-2075-4429-8193-e4cab81cd49a')}
          style={{
            display: 'block', width: '100%', padding: '12px', borderRadius: '10px',
            background: '#6366f1', color: '#fff', fontSize: '14px', fontWeight: 700,
            border: 'none', cursor: 'pointer', marginBottom: '24px',
          }}
        >
          Lisans Satın Al →
        </button>

        {/* Activation */}
        <div style={{
          background: '#141414', borderRadius: '14px', padding: '24px', border: '1px solid #222',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#888', marginBottom: '12px' }}>
            Lisans key'in var mı? Buraya gir:
          </div>
          <input
            type="text"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && activate()}
            placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
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
            {loading ? 'Doğrulanıyor...' : 'Aktive Et'}
          </button>
        </div>

      </div>
    </div>
  );
}
