/**
 * CareOne RFC 6238 Time-Based One-Time Password (TOTP)
 * Implemented natively using WebCrypto HMAC-SHA1 (< 0.5ms CPU)
 */

import { timingSafeEqual } from './crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodes a standard Base32 encoded string into bytes.
 */
export function base32Decode(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/[\s=-]/g, '');
  let bits = '';

  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }

  return new Uint8Array(bytes);
}

/**
 * Generates an RFC 6238 TOTP code (6 digits, 30s step).
 */
export async function generateTotp(
  secretBase32: string,
  timeSec: number = Math.floor(Date.now() / 1000),
  stepSec: number = 30,
  digits: number = 6
): Promise<string> {
  const secretBytes = base32Decode(secretBase32);
  const counter = Math.floor(timeSec / stepSec);

  // 8-byte big-endian counter
  const counterBytes = new Uint8Array(8);
  let tmp = BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = Number(tmp & 0xffn);
    tmp >>= 8n;
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    secretBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBytes);
  const hmac = new Uint8Array(signature);

  // Dynamic truncation
  const lastByte = hmac[hmac.length - 1] ?? 0;
  const offset = lastByte & 0x0f;
  const b0 = hmac[offset] ?? 0;
  const b1 = hmac[offset + 1] ?? 0;
  const b2 = hmac[offset + 2] ?? 0;
  const b3 = hmac[offset + 3] ?? 0;

  const binary =
    ((b0 & 0x7f) << 24) |
    ((b1 & 0xff) << 16) |
    ((b2 & 0xff) << 8) |
    (b3 & 0xff);

  const otp = binary % (10 ** digits);
  return otp.toString().padStart(digits, '0');
}

/**
 * Verifies a TOTP code against a Base32 secret.
 * Allows a drift window of +/- windowSteps (default 1 = +/- 30 seconds).
 */
export async function verifyTotp(
  secretBase32: string,
  inputCode: string,
  windowSteps: number = 1,
  stepSec: number = 30
): Promise<boolean> {
  const cleanInput = inputCode.trim();
  if (cleanInput.length !== 6 || !/^\d{6}$/.test(cleanInput)) {
    return false;
  }

  const currentSec = Math.floor(Date.now() / 1000);

  for (let w = -windowSteps; w <= windowSteps; w++) {
    const checkSec = currentSec + w * stepSec;
    try {
      const expected = await generateTotp(secretBase32, checkSec, stepSec, 6);
      if (timingSafeEqual(expected, cleanInput)) {
        return true;
      }
    } catch {
      // In case of invalid secret formatting
      return false;
    }
  }

  return false;
}
