import React, { useState, useEffect } from 'react';
import RecordingView from './views/RecordingView';
import HistoryView from './views/HistoryView';
import SettingsView from './views/SettingsView';
import LicenseView from './views/LicenseView';

type View = 'recording' | 'history' | 'settings' | 'license';

export default function App() {
  const [activeView, setActiveView] = useState<View>('recording');
  const [onboarding, setOnboarding] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<{ type: string; sessionsUsed?: number; sessionsLimit?: number; daysLeft?: number } | null>(null);

  const refreshLicense = async () => {
    const status = await window.api.getLicenseStatus();
    setLicenseStatus(status);
    if (status.type === 'expired') setActiveView('license');
  };

  useEffect(() => {
    window.api.getSetting('api_key').then(key => {
      if (!key) { setActiveView('settings'); setOnboarding(true); }
    });
    refreshLicense();
  }, []);

  const trialBadge = licenseStatus?.type === 'trial'
    ? `${licenseStatus.sessionsUsed}/${licenseStatus.sessionsLimit}`
    : null;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f0f0f', color: '#f0f0f0' }}>
      {/* Sidebar */}
      <aside style={{
        width: '60px',
        background: '#141414',
        borderRight: '1px solid #222',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        gap: '6px',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px', fontSize: '18px', flexShrink: 0,
        }}>
          🎙
        </div>

        <NavBtn icon="⏺" label="Kayıt" active={activeView === 'recording'} onClick={() => setActiveView('recording')} />
        <NavBtn icon="📋" label="Geçmiş" active={activeView === 'history'} onClick={() => setActiveView('history')} />

        <div style={{ flex: 1 }} />

        {/* Trial badge */}
        {trialBadge && (
          <div
            title={`${licenseStatus?.daysLeft} gün kaldı`}
            onClick={() => setActiveView('license')}
            style={{
              fontSize: '10px', fontWeight: 700, color: '#f59e0b',
              background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)',
              borderRadius: '6px', padding: '3px 5px', cursor: 'pointer',
              marginBottom: '4px',
            }}
          >
            {trialBadge}
          </div>
        )}

        {licenseStatus?.type === 'expired' && (
          <NavBtn icon="🔑" label="Lisans" active={activeView === 'license'} onClick={() => setActiveView('license')} />
        )}

        <NavBtn icon="⚙️" label="Ayarlar" active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {onboarding && activeView === 'settings' && (
          <div style={{ padding: '20px 32px 0', background: '#0d1117', borderBottom: '1px solid #1e2a1e' }}>
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#0d1a0d', border: '1px solid #1e3a1e', color: '#6ee77a', fontSize: '13px' }}>
              👋 Hoş geldin! Başlamak için OpenAI API key'ini gir ve Kaydet'e bas.
            </div>
          </div>
        )}
        {activeView === 'recording' && (
          <RecordingView
            licenseStatus={licenseStatus}
            onSessionSaved={refreshLicense}
          />
        )}
        {activeView === 'history' && <HistoryView />}
        {activeView === 'settings' && <SettingsView onSaved={() => setOnboarding(false)} />}
        {activeView === 'license' && (
          <LicenseView onActivated={() => {
            refreshLicense();
            setActiveView('recording');
          }} />
        )}
      </main>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }: {
  icon: string; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: '40px', height: '40px', borderRadius: '10px', border: 'none',
        background: active ? '#6366f1' : 'transparent',
        color: active ? '#fff' : '#555',
        fontSize: '16px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
    >
      {icon}
    </button>
  );
}
