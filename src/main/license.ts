import os from 'node:os';
import { getSetting, setSetting } from './settings';
import { getSessions } from './db';

export const TRIAL_SESSION_LIMIT = 10;
export const TRIAL_DAY_LIMIT = 7;

export interface LicenseStatus {
  type: 'trial' | 'licensed' | 'expired';
  sessionsUsed?: number;
  sessionsLimit?: number;
  daysLeft?: number;
}

export function getLicenseStatus(): LicenseStatus {
  // Aktif lisans var mı?
  const licenseKey = getSetting('license_key');
  if (licenseKey) return { type: 'licensed' };

  // Trial başlangıcı — ilk çalışmada kaydet
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
  try {
    const instanceName = `sna-${os.hostname()}-${Date.now()}`;
    const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ license_key: key, instance_name: instanceName }).toString(),
    });

    const data = await res.json() as {
      activated?: boolean;
      error?: string;
      instance?: { id: string };
    };

    if (data.activated) {
      setSetting('license_key', key);
      if (data.instance?.id) setSetting('license_instance_id', data.instance.id);
      return { success: true };
    }

    return { success: false, error: data.error ?? 'Geçersiz lisans key.' };
  } catch (e: any) {
    return { success: false, error: 'Bağlantı hatası: ' + (e?.message ?? '') };
  }
}
