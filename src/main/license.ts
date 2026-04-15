import { getSetting, setSetting } from './settings';
import { getSessions } from './db';
import { getDeviceId } from './device';

export const TRIAL_SESSION_LIMIT = 3;
export const TRIAL_DAY_LIMIT = 7;

const UNLIMITED_EMAILS = ['kubra.bozkurt96@gmail.com'];

export interface LicenseStatus {
  type: 'trial' | 'licensed' | 'expired';
  sessionsUsed?: number;
  sessionsLimit?: number;
  daysLeft?: number;
}

export function getLicenseStatus(): LicenseStatus {
  const licenseKey = getSetting('license_key');
  if (licenseKey) return { type: 'licensed' };

  const accountEmail = getSetting('account_email');
  if (accountEmail && UNLIMITED_EMAILS.includes(accountEmail.toLowerCase())) {
    return { type: 'licensed' };
  }

  let trialStart = parseInt(getSetting('trial_start') ?? '0');
  if (!trialStart) {
    trialStart = Date.now();
    setSetting('trial_start', String(trialStart));
  }

  const daysElapsed = (Date.now() - trialStart) / (1000 * 60 * 60 * 24);
  const daysLeft = Math.max(0, Math.ceil(TRIAL_DAY_LIMIT - daysElapsed));
  const sessionsUsed = getSessions(TRIAL_SESSION_LIMIT + 1, 0).length;

  if (sessionsUsed >= TRIAL_SESSION_LIMIT || daysLeft <= 0) {
    return { type: 'expired' };
  }

  return {
    type: 'trial',
    sessionsUsed,
    sessionsLimit: TRIAL_SESSION_LIMIT,
    daysLeft,
  };
}

export async function activateLicense(key: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = key.trim().toLowerCase();
  if (UNLIMITED_EMAILS.includes(trimmed)) {
    setSetting('account_email', trimmed);
    return { success: true };
  }

  try {
    const deviceId = getDeviceId();
    const res = await fetch('https://velnot-backend.onrender.com/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: key, device_id: deviceId }),
    });

    const data = await res.json() as {
      success?: boolean;
      error?: string;
      plan?: string;
      expires_at?: number | null;
    };

    if (data.success) {
      setSetting('license_key', key);
      if (data.plan) setSetting('license_plan', data.plan);
      return { success: true };
    }

    return { success: false, error: data.error ?? 'Geçersiz lisans anahtarı.' };
  } catch (e: any) {
    return { success: false, error: 'Bağlantı hatası: ' + (e?.message ?? '') };
  }
}
