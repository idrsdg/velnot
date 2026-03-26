import React, { useState, useEffect } from 'react';
import RecordingView from './views/RecordingView';
import HistoryView from './views/HistoryView';
import SettingsView from './views/SettingsView';
import LicenseView from './views/LicenseView';
import OnboardingModal from './views/OnboardingModal';
import { LanguageProvider, useT } from './LanguageContext';
import { LANGUAGES, Lang } from './i18n';

type View = 'recording' | 'history' | 'settings' | 'license';

function AppInner() {
  const { t, lang, setLang } = useT();
  const [activeView, setActiveView] = useState<View>('recording');
  const [onboarding, setOnboarding] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<{ type: string; sessionsUsed?: number; sessionsLimit?: number; daysLeft?: number } | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const refreshLicense = async () => {
    const status = await window.api.getLicenseStatus();
    setLicenseStatus(status);
    if (status.type === 'expired') setActiveView('license');
  };

  useEffect(() => {
    window.api.getSetting('onboarding_done').then(done => {
      if (!done) setShowTour(true);
    });
    window.api.getSetting('api_key').then(key => {
      if (!key) { setActiveView('settings'); setOnboarding(true); }
    });
    refreshLicense();
  }, []);

  useEffect(() => {
    return window.api.onMenuNavigate((view: string) => {
      if (view === 'recording' || view === 'history' || view === 'settings' || view === 'license') {
        setActiveView(view as View);
      }
    });
  }, []);

  // close lang menu on outside click
  useEffect(() => {
    if (!showLangMenu) return;
    const handler = () => setShowLangMenu(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [showLangMenu]);

  const isTrial = licenseStatus?.type === 'trial';

  const handleTourDone = () => {
    window.api.setSetting('onboarding_done', '1');
    setShowTour(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0e0a07', color: '#f5f0eb' }}>
      {showTour && <OnboardingModal onDone={handleTourDone} />}
      {/* Sidebar */}
      <aside style={{
        width: '60px', background: '#150f09', borderRight: '1px solid #2a1e14',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '16px 0', gap: '6px', flexShrink: 0,
      }}>
        {/* Logo + Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', gap: '4px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #f97316, #ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', flexShrink: 0,
          }}>
            🎙
          </div>
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#6a5040', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Velnot</span>
        </div>

        <NavBtn icon="🎙️" label={t.nav.record} active={activeView === 'recording'} onClick={() => setActiveView('recording')} />
        <NavBtn icon="📑" label={t.nav.history} active={activeView === 'history'} onClick={() => setActiveView('history')} />

        <div style={{ flex: 1 }} />

        {/* Language selector */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={e => { e.stopPropagation(); setShowLangMenu(v => !v); }}
            title={t.nav.language}
            style={{
              width: '44px', height: '44px', borderRadius: '10px', border: 'none',
              background: showLangMenu ? '#f97316' : 'transparent',
              color: showLangMenu ? '#fff' : '#6a5040',
              fontSize: '18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            🌐
          </button>

          {showLangMenu && (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', bottom: '0', left: '52px',
                background: '#1e1509', border: '1px solid #2a1e14', borderRadius: '10px',
                padding: '6px', minWidth: '148px', zIndex: 100,
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              }}
            >
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code as Lang); setShowLangMenu(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    width: '100%', padding: '7px 10px', borderRadius: '7px', border: 'none',
                    background: lang === l.code ? 'rgba(249,115,22,0.2)' : 'transparent',
                    color: lang === l.code ? '#fdba74' : '#c4b09a',
                    fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <NavBtn icon="⚙️" label={t.nav.settings} active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {onboarding && activeView === 'settings' && (
          <div style={{ padding: '20px 32px 0', background: '#0e0a07', borderBottom: '1px solid #2a1e14' }}>
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#0d1a0d', border: '1px solid #1e3a1e', color: '#6ee77a', fontSize: '13px' }}>
              {t.onboarding.welcome}
            </div>
          </div>
        )}
        {activeView === 'recording' && (
          <RecordingView licenseStatus={licenseStatus} onSessionSaved={refreshLicense} onGetLicense={() => setActiveView('license')} />
        )}
        {activeView === 'history' && <HistoryView />}
        {activeView === 'settings' && <SettingsView onSaved={() => setOnboarding(false)} licenseStatus={licenseStatus} onGetLicense={() => setActiveView('license')} />}
        {activeView === 'license' && (
          <LicenseView onActivated={() => { refreshLicense(); setActiveView('recording'); }} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
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
        width: '44px', height: '44px', borderRadius: '10px', border: 'none',
        background: active ? '#f97316' : 'transparent',
        color: active ? '#fff' : '#6a5040',
        fontSize: '20px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
    >
      {icon}
    </button>
  );
}
