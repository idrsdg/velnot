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
  const [licenseStatus, setLicenseStatus] = useState<{ type: string; sessionsUsed?: number; sessionsLimit?: number; daysLeft?: number } | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const refreshLicense = async () => {
    const status = await window.api.getLicenseStatus();
    setLicenseStatus(status);
    if (status.type === 'expired') setActiveView('license');
    return status;
  };

  useEffect(() => {
    window.api.getSetting('onboarding_done').then(done => {
      if (!done) setShowTour(true);
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

  useEffect(() => {
    const unsub = window.api.onAuthLogin?.(() => {
      refreshLicense().then((status: any) => {
        if (status && status.type !== 'expired') setActiveView('recording');
      });
    });
    return () => { unsub?.(); };
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0b08', color: '#fafafa' }}>
      {showTour && <OnboardingModal onDone={handleTourDone} />}

      {/* Custom Title Bar */}
      <div style={{
        display: 'flex', height: '38px', flexShrink: 0,
        WebkitAppRegion: 'drag',
      } as React.CSSProperties & { WebkitAppRegion: string }}>
        {/* Logo section — aligns with sidebar width */}
        <div style={{
          width: '60px', background: '#120f0b', borderRight: '1px solid #2a2218',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <div style={{
            width: '26px', height: '26px', borderRadius: '7px',
            background: 'linear-gradient(135deg, #f59e0b, #fb923c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="8" y="1" width="8" height="13" rx="4" fill="white"/>
              <path d="M5 12C5 15.866 8.134 19 12 19C15.866 19 19 15.866 19 12" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        {/* App name + draggable area */}
        <div style={{
          flex: 1, background: '#0d0b08',
          display: 'flex', alignItems: 'center', paddingLeft: '12px',
        }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#52525b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Velnot
          </span>
        </div>
      </div>

      {/* Sidebar + Main */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: '60px', background: '#120f0b', borderRight: '1px solid #2a2218',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '16px 0', gap: '6px', flexShrink: 0,
      }}>
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
              background: showLangMenu ? '#f59e0b' : 'transparent',
              color: showLangMenu ? '#fff' : '#71717a',
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
                background: '#120f0b', border: '1px solid #2a2218', borderRadius: '10px',
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
                    background: lang === l.code ? 'rgba(245,158,11,0.2)' : 'transparent',
                    color: lang === l.code ? '#fde68a' : '#a1a1aa',
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
        {activeView === 'recording' && (
          <RecordingView licenseStatus={licenseStatus} onSessionSaved={refreshLicense} onGetLicense={() => setActiveView('license')} />
        )}
        {activeView === 'history' && <HistoryView />}
        {activeView === 'settings' && <SettingsView onSaved={() => {}} licenseStatus={licenseStatus} onGetLicense={() => setActiveView('license')} />}
        {activeView === 'license' && (
          <LicenseView onActivated={() => { refreshLicense(); setActiveView('recording'); }} />
        )}
      </main>
      </div>
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
        background: active ? 'linear-gradient(135deg, #f59e0b, #fb923c)' : 'transparent',
        color: active ? '#fff' : '#71717a',
        fontSize: '20px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
    >
      {icon}
    </button>
  );
}
