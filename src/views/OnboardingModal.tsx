import React, { useState } from 'react';
import { useT } from '../LanguageContext';

const FEATURE_STEPS = [
  { icon: '🎙', accentColor: '#f97316', bgColor: 'rgba(249,115,22,0.12)' },
  { icon: '✨', accentColor: '#a855f7', bgColor: 'rgba(168,85,247,0.12)' },
  { icon: '📑', accentColor: '#22c55e', bgColor: 'rgba(34,197,94,0.12)' },
];

const TOTAL_STEPS = 5; // welcome + 3 features + finish

export default function OnboardingModal({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const ob = t.onboarding;
  const [step, setStep] = useState(0);
  const [fading, setFading] = useState(false);

  const isLast = step === TOTAL_STEPS - 1;

  const navigate = (next: number) => {
    setFading(true);
    setTimeout(() => { setStep(next); setFading(false); }, 160);
  };

  const titles = [
    ob.tourWelcomeTitle,
    ob.tourStep1Title, ob.tourStep2Title, ob.tourStep3Title,
    ob.tourFinishTitle,
  ];
  const descs = [
    ob.tourWelcomeDesc,
    ob.tourStep1Desc, ob.tourStep2Desc, ob.tourStep3Desc,
    ob.tourFinishDesc,
  ];

  const isWelcome = step === 0;
  const isFinish = step === TOTAL_STEPS - 1;
  const featureData = (step >= 1 && step <= 3) ? FEATURE_STEPS[step - 1] : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        position: 'relative',
        width: '460px',
        background: '#1a1109',
        borderRadius: '20px',
        border: '1px solid #2a1e14',
        boxShadow: '0 32px 80px rgba(0,0,0,0.85)',
        padding: '44px 44px 36px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0',
        opacity: fading ? 0 : 1,
        transform: fading ? 'translateY(10px) scale(0.98)' : 'translateY(0) scale(1)',
        transition: 'opacity 0.16s ease, transform 0.16s ease',
      }}>

        {/* Skip button */}
        {!isLast && (
          <button
            onClick={onDone}
            style={{
              position: 'absolute', top: '16px', right: '18px',
              background: 'transparent', border: 'none',
              color: '#3a2a1c', fontSize: '12px', cursor: 'pointer',
              padding: '5px 10px', borderRadius: '6px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#7a5a40')}
            onMouseLeave={e => (e.currentTarget.style.color = '#3a2a1c')}
          >
            {ob.skip}
          </button>
        )}

        {/* Icon / Visual */}
        {isWelcome && (
          <div style={{
            width: '68px', height: '68px', borderRadius: '18px',
            background: 'linear-gradient(135deg, #f97316, #ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '30px', marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(249,115,22,0.35)',
          }}>
            🎙
          </div>
        )}

        {featureData && (
          <div style={{
            width: '88px', height: '88px', borderRadius: '22px',
            background: featureData.bgColor,
            border: `1px solid ${featureData.accentColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '40px', marginBottom: '24px',
          }}>
            {featureData.icon}
          </div>
        )}

        {isFinish && (
          <div style={{ fontSize: '56px', marginBottom: '20px', lineHeight: 1 }}>
            🚀
          </div>
        )}

        {/* Title */}
        <h2 style={{
          margin: '0 0 12px',
          fontSize: isWelcome || isFinish ? '22px' : '20px',
          fontWeight: 700,
          color: '#f5f0eb',
          textAlign: 'center',
          lineHeight: 1.3,
        }}>
          {titles[step]}
        </h2>

        {/* Description */}
        <p style={{
          margin: '0 0 32px',
          fontSize: '14px',
          color: '#8a7060',
          lineHeight: '1.65',
          textAlign: 'center',
          maxWidth: '340px',
        }}>
          {descs[step]}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '6px',
                width: i === step ? '22px' : '6px',
                borderRadius: '3px',
                background: i === step ? '#f97316' : '#2e1f12',
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={isLast ? onDone : () => navigate(step + 1)}
          style={{
            padding: '13px 48px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(249,115,22,0.35)',
            transition: 'opacity 0.15s, transform 0.12s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          {isLast ? ob.getStarted : ob.next}
        </button>
      </div>
    </div>
  );
}
