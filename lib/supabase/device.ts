import { supabase } from './client';
import type { DbDevice } from './types';

const DEVICE_ID_KEY = 'ninjo-device-id';

export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

export async function registerDevice(): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  const deviceFingerprint = getDeviceId();
  if (!deviceFingerprint) {
    return null;
  }

  try {
    // Try to get existing device
    const { data: existingDevice } = await supabase
      .from('devices')
      .select('id')
      .eq('device_fingerprint', deviceFingerprint)
      .single();

    if (existingDevice) {
      // Update last_seen_at
      await supabase
        .from('devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', (existingDevice as DbDevice).id);

      return (existingDevice as DbDevice).id;
    }

    // Create new device
    const { data: newDevice, error } = await supabase
      .from('devices')
      .insert({ device_fingerprint: deviceFingerprint })
      .select('id')
      .single();

    if (error) {
      console.error('Error registering device:', error);
      return null;
    }

    return (newDevice as DbDevice)?.id || null;
  } catch (error) {
    console.error('Error in registerDevice:', error);
    return null;
  }
}

// Store the device ID from Supabase for use in other operations
let supabaseDeviceId: string | null = null;

export function setSupabaseDeviceId(id: string | null) {
  supabaseDeviceId = id;
}

export function getSupabaseDeviceId(): string | null {
  return supabaseDeviceId;
}
