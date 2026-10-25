// cryptoVault.js – Zero-Knowledge Ende-zu-Ende-Verschlüsselung mit der Web Crypto API.
// Der Schlüssel wird nur im Browser aus Passwort + uid abgeleitet und verlässt ihn nie.

const subtle = window.crypto.subtle;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const PBKDF2_ITERATIONS = 100000;
const IV_LENGTH = 12;

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Leitet aus Passwort und uid (als Salt) einen AES-GCM-256-Schlüssel ab.
 * @param {string} password
 * @param {string} uid
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(password, uid) {
  if (!password || !uid) throw new Error('deriveKey: password und uid sind erforderlich.');

  const baseKey = await subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: encoder.encode(uid),
      iterations: PBKDF2_ITERATIONS,
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Verschlüsselt ein JS-Objekt. Rückgabe: Base64(IV || Ciphertext inkl. Auth-Tag).
 * @param {any} dataObj
 * @param {CryptoKey} key
 * @returns {Promise<string>}
 */
export async function encryptVault(dataObj, key) {
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = encoder.encode(JSON.stringify(dataObj));

  const ciphertext = new Uint8Array(
    await subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  );

  const payload = new Uint8Array(IV_LENGTH + ciphertext.length);
  payload.set(iv, 0);
  payload.set(ciphertext, IV_LENGTH);
  return bytesToBase64(payload);
}

/**
 * Entschlüsselt einen Base64-Payload (IV || Ciphertext) zurück zum JS-Objekt.
 * Wirft bei falschem Schlüssel oder manipulierten Daten einen Fehler.
 * @param {string} base64Payload
 * @param {CryptoKey} key
 * @returns {Promise<any>}
 */
export async function decryptVault(base64Payload, key) {
  const payload = base64ToBytes(base64Payload);
  if (payload.length <= IV_LENGTH) throw new Error('decryptVault: Payload ist ungültig.');

  const iv = payload.subarray(0, IV_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH);

  let plaintext;
  try {
    plaintext = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  } catch {
    throw new Error('decryptVault: Entschlüsselung fehlgeschlagen (falsches Passwort oder beschädigte Daten).');
  }
  return JSON.parse(decoder.decode(plaintext));
}
