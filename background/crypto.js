// crypto.js
// Web Crypto helpers for APIKeyVault.
// - Derive symmetric key from master password with PBKDF2
// - Encrypt/decrypt API keys with AES-GCM
//
// IMPORTANT:
// - Derived key is never stored, only held in memory (background.js)
// - API keys are encrypted before they touch IndexedDB

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

// PBKDF2 parameters
const PBKDF2_ITERATIONS = 150000;
const PBKDF2_HASH = "SHA-256";
const KEY_LENGTH_BITS = 256;

// AES-GCM parameters
const IV_LENGTH_BYTES = 12; // recommended for GCM

function getSubtle() {
  const g = typeof globalThis !== "undefined" ? globalThis : self;
  const cryptoObj = g.crypto || g.msCrypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error("Web Crypto API not available");
  }
  return cryptoObj.subtle;
}

function utf8Encode(str) {
  return TEXT_ENCODER.encode(str);
}

function utf8Decode(bytes) {
  return TEXT_DECODER.decode(bytes);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive a deterministic salt from password hash
// In production, you might want to store a random salt in IndexedDB meta
async function deriveSaltFromPassword(password) {
  const subtle = getSubtle();
  const hash = await subtle.digest(PBKDF2_HASH, utf8Encode(password));
  return new Uint8Array(hash).slice(0, 16); // first 16 bytes as salt
}

// Derive encryption key from master password
export async function deriveKeyFromPassword(password) {
  const subtle = getSubtle();
  const salt = await deriveSaltFromPassword(password);

  const keyMaterial = await subtle.importKey(
    "raw",
    utf8Encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: KEY_LENGTH_BITS,
    },
    false,
    ["encrypt", "decrypt"]
  );

  return key;
}

// Generate random IV
function generateIv() {
  const iv = new Uint8Array(IV_LENGTH_BYTES);
  const g = typeof globalThis !== "undefined" ? globalThis : self;
  (g.crypto || g.msCrypto).getRandomValues(iv);
  return iv;
}

// Encrypt an API key with AES-GCM
export async function encryptKey(key, apiKeyData) {
  const subtle = getSubtle();

  const id =
    apiKeyData.id ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + "-" + Math.random().toString(16).slice(2));

  const iv = generateIv();
  const encoded = utf8Encode(apiKeyData.apiKey);

  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    id,
    name: apiKeyData.name,
    encryptedKey: ciphertext, // ArrayBuffer
    iv: iv, // Uint8Array
    createdAt: apiKeyData.createdAt || Date.now(),
  };
}

// Decrypt an encrypted API key from IndexedDB
export async function decryptKey(key, encryptedKey) {
  const subtle = getSubtle();

  // encryptedKey.iv is Uint8Array, encryptedKey.encryptedKey is ArrayBuffer
  const iv = encryptedKey.iv;
  const ciphertext = encryptedKey.encryptedKey;

  const decryptedBuf = await subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  const decryptedText = utf8Decode(new Uint8Array(decryptedBuf));

  return {
    id: encryptedKey.id,
    name: encryptedKey.name,
    apiKey: decryptedText,
    createdAt: encryptedKey.createdAt,
  };
}
