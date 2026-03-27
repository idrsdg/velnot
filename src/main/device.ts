import { randomUUID } from 'node:crypto';
import { getSetting, setSetting } from './settings';

/**
 * Returns a stable device UUID stored in Electron safeStorage.
 * Generated once on first launch.
 */
export function getDeviceId(): string {
  let id = getSetting('device_id');
  if (!id) {
    id = randomUUID();
    setSetting('device_id', id);
  }
  return id;
}
