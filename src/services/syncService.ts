import QRCode from 'qrcode';
import { RoomSyncPayload, SyncApiResponse } from '../types';

// Unambiguous alphanumeric charset (excludes 0, O, 1, I to avoid visual typos on mobile)
const ROOM_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates a clean, readable 6-character room code.
 * Example: "K9X2P7"
 */
export function generateRoomCode(): string {
  let result = '';
  const bytes = new Uint8Array(6);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
    for (let i = 0; i < 6; i++) {
      result += ROOM_CHARSET[bytes[i] % ROOM_CHARSET.length];
    }
  } else {
    for (let i = 0; i < 6; i++) {
      result += ROOM_CHARSET[Math.floor(Math.random() * ROOM_CHARSET.length)];
    }
  }
  return result;
}

/**
 * Validates whether a room code is valid (6 alphanumeric characters).
 */
export function isValidRoomCode(code: string): boolean {
  if (!code) return false;
  const clean = code.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(clean);
}

/**
 * Extracts room code from current window URL query or hash if present.
 */
export function getRoomCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const fromSearch = url.searchParams.get('room');
    if (fromSearch && isValidRoomCode(fromSearch)) {
      return fromSearch.toUpperCase();
    }

    // Check hash format (e.g. #room=ABC123)
    const hash = window.location.hash;
    const match = hash.match(/room=([A-Za-z0-9]{6})/i);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Builds a direct shareable URL for this room.
 */
export function buildRoomUrl(code: string): string {
  if (typeof window === 'undefined') return `?room=${code}`;
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?room=${code.toUpperCase()}`;
}

/**
 * Generates an SVG or PNG data URL for scanning via mobile camera.
 */
export async function generateRoomQRCode(urlOrCode: string): Promise<string> {
  try {
    return await QRCode.toDataURL(urlOrCode, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    return '';
  }
}

/**
 * Saves current room snapshot to the cloud sync API.
 */
export async function pushRoomData(
  code: string,
  payload: Omit<RoomSyncPayload, 'code'>
): Promise<SyncApiResponse> {
  const cleanCode = code.trim().toUpperCase();
  if (!isValidRoomCode(cleanCode)) {
    throw new Error('Invalid 6-character room code format');
  }

  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: cleanCode,
      data: {
        ...payload,
        code: cleanCode,
        updatedAt: new Date().toISOString(),
        version: 2,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sync upload failed (${response.status}): ${errorText || response.statusText}`);
  }

  const data: SyncApiResponse = await response.json();
  return data;
}

/**
 * Fetches the latest room snapshot from the cloud sync API.
 */
export async function pullRoomData(code: string): Promise<SyncApiResponse> {
  const cleanCode = code.trim().toUpperCase();
  if (!isValidRoomCode(cleanCode)) {
    throw new Error('Invalid 6-character room code format');
  }

  const response = await fetch(`/api/sync?code=${encodeURIComponent(cleanCode)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Room code "${cleanCode}" was not found or has no saved data yet.`);
    }
    const errorText = await response.text();
    throw new Error(`Sync download failed (${response.status}): ${errorText || response.statusText}`);
  }

  const data: SyncApiResponse = await response.json();
  return data;
}
