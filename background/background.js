// background.js
// Service worker for APIKeyVault.
// Handles vault lock/unlock, encryption/decryption, IndexedDB operations,
// and health testing via message passing from popup.

import {
  deriveKeyFromPassword,
  encryptKey,
  decryptKey,
} from "./crypto.js";
import {
  getVaultMeta,
  setVaultMeta,
  listEncryptedKeys,
  getEncryptedKeyById,
  saveEncryptedKey,
  deleteEncryptedKey,
} from "./db.js";
import {
  testApiKey,
  testAllApiKeys,
} from "./healthCheck.js";

// ---- In-memory state (never persisted) ----

// Holds the current symmetric key derived from the master password.
// This MUST never be written to storage.
let currentKey = null;

// Simple meta flags mirrored from IndexedDB "meta" store.
let isInitialized = false;
let isLocked = true;

// Auto-lock after inactivity (5 hours)
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 60 * 1000;
let inactivityTimerId = null;

// Touch activity to reset inactivity timer and update last activity timestamp
async function touchActivity() {
  if (inactivityTimerId) {
    clearTimeout(inactivityTimerId);
  }
  if (!isLocked) {
    // Update last activity timestamp in IndexedDB
    try {
      const meta = await getVaultMeta();
      await setVaultMeta({
        ...meta,
        isInitialized: meta?.isInitialized || false,
        lastActivityTimestamp: Date.now(),
      });
    } catch (err) {
      console.error("[vault] Failed to update last activity:", err);
    }
    
    inactivityTimerId = setTimeout(() => {
      hardLock("inactivity");
    }, INACTIVITY_TIMEOUT_MS);
  }
}

// Hard lock: clear key and lock state
function hardLock(reason = "manual") {
  console.log("[vault] Locking vault:", reason);
  currentKey = null;
  isLocked = true;
  if (inactivityTimerId) {
    clearTimeout(inactivityTimerId);
    inactivityTimerId = null;
  }
}

// Ensure meta is loaded from IndexedDB
// Check if vault should auto-unlock based on last activity (< 5 hours)
async function ensureMetaLoaded() {
  try {
    const meta = await getVaultMeta();
    if (meta && typeof meta.isInitialized === "boolean") {
      isInitialized = meta.isInitialized;
    } else {
      isInitialized = false;
    }
    
    // Check if we should auto-unlock (last activity < 5 hours ago)
    // Note: We can only auto-unlock if we have the key in memory (service worker still alive)
    // If service worker was restarted, key is lost and we need password
    if (isInitialized && meta?.lastActivityTimestamp) {
      const timeSinceLastActivity = Date.now() - meta.lastActivityTimestamp;
      if (timeSinceLastActivity < INACTIVITY_TIMEOUT_MS && currentKey) {
        // Still within 5 hours AND key is in memory: auto-unlock
        isLocked = false;
        touchActivity(); // Reset timer
        return; // Don't clear key
      }
    }
  } catch (err) {
    console.error("[vault] Failed to load meta:", err);
    isInitialized = false;
  }
  
  // Lock vault (either first time, or > 5 hours, or service worker restarted)
  isLocked = true;
  currentKey = null;
  if (inactivityTimerId) {
    clearTimeout(inactivityTimerId);
    inactivityTimerId = null;
  }
}

// ---- Message Handlers ----

async function handleGetStatus() {
  await ensureMetaLoaded();
  
  // Check if we can auto-unlock (last activity < 5 hours AND key in memory)
  let shouldAutoUnlock = false;
  if (isInitialized && !isLocked && currentKey) {
    try {
      const meta = await getVaultMeta();
      if (meta?.lastActivityTimestamp) {
        const timeSinceLastActivity = Date.now() - meta.lastActivityTimestamp;
        if (timeSinceLastActivity < INACTIVITY_TIMEOUT_MS) {
          shouldAutoUnlock = true;
          // Update activity timestamp
          const meta = await getVaultMeta();
          await setVaultMeta({
            ...meta,
            isInitialized: meta?.isInitialized || false,
            lastActivityTimestamp: Date.now(),
          });
          // Reset inactivity timer
          if (inactivityTimerId) {
            clearTimeout(inactivityTimerId);
          }
          inactivityTimerId = setTimeout(() => {
            hardLock("inactivity");
          }, INACTIVITY_TIMEOUT_MS);
        }
      }
    } catch (err) {
      console.error("[vault] Failed to check last activity:", err);
    }
  }
  
  return { 
    isInitialized, 
    isLocked: !shouldAutoUnlock,
    shouldAutoUnlock 
  };
}

async function handleUnlock({ masterPassword }) {
  await ensureMetaLoaded();

  if (!masterPassword || typeof masterPassword !== "string") {
    return { error: "Master password required" };
  }

  try {
    const key = await deriveKeyFromPassword(masterPassword);

    if (!isInitialized) {
      // First-time setup: create meta record with current timestamp
      await setVaultMeta({ 
        isInitialized: true,
        lastActivityTimestamp: Date.now()
      });
      isInitialized = true;
    } else {
      // Existing vault: verify master password by attempting to decrypt a stored key
      // Master password cannot be changed after initial setup
      const encryptedKeys = await listEncryptedKeys();
      if (encryptedKeys.length > 0) {
        // Try to decrypt the first key to verify password
        try {
          await decryptKey(key, encryptedKeys[0]);
        } catch (decryptErr) {
          // Decryption failed = wrong master password
          return { error: "Invalid master password" };
        }
      }
    }

    currentKey = key;
    isLocked = false;
    await touchActivity(); // Update last activity timestamp

    return { success: true };
  } catch (err) {
    console.error("[vault] Unlock failed:", err);
    currentKey = null;
    isLocked = true;
    return { error: "Invalid master password or vault error" };
  }
}

async function handleLock() {
  hardLock("popup-request");
  return { success: true };
}

async function handleListKeys() {
  if (isLocked || !currentKey) {
    return { error: "Vault is locked" };
  }
  await touchActivity();

  try {
    const encryptedKeys = await listEncryptedKeys();
    const keys = encryptedKeys.map((item) => ({
      id: item.id,
      name: item.name,
      createdAt: item.createdAt,
    }));
    return { keys };
  } catch (err) {
    console.error("[vault] Failed to list keys:", err);
    return { error: "Failed to list API keys" };
  }
}

async function handleGetKey({ id }) {
  if (!id) {
    return { error: "Missing key id" };
  }
  if (isLocked || !currentKey) {
    return { error: "Vault is locked" };
  }
  await touchActivity();

  try {
    const encrypted = await getEncryptedKeyById(id);
    if (!encrypted) {
      return { error: "API key not found" };
    }

    const decrypted = await decryptKey(currentKey, encrypted);
    return { key: decrypted };
  } catch (err) {
    console.error("[vault] Failed to get key:", err);
    return { error: "Failed to decrypt API key" };
  }
}

async function handleSaveKey({ key }) {
  if (!key) {
    return { error: "Missing key data" };
  }
  if (isLocked || !currentKey) {
    return { error: "Vault is locked" };
  }
  await touchActivity();

  try {
    const encrypted = await encryptKey(currentKey, key);
    const saved = await saveEncryptedKey(encrypted);

    const decrypted = {
      id: saved.id,
      name: saved.name,
      apiKey: key.apiKey, // Return plaintext for UI convenience
      createdAt: saved.createdAt,
    };

    return { key: decrypted };
  } catch (err) {
    console.error("[vault] Failed to save key:", err);
    return { error: "Failed to save API key" };
  }
}

async function handleDeleteKey({ id }) {
  if (!id) {
    return { error: "Missing key id" };
  }
  if (isLocked || !currentKey) {
    return { error: "Vault is locked" };
  }
  await touchActivity();

  try {
    await deleteEncryptedKey(id);
    return { success: true };
  } catch (err) {
    console.error("[vault] Failed to delete key:", err);
    return { error: "Failed to delete API key" };
  }
}

async function handleTestKey({ id }) {
  if (!id) {
    return { error: "Missing key id" };
  }
  if (isLocked || !currentKey) {
    return { error: "Vault is locked" };
  }
  await touchActivity();

  try {
    const encrypted = await getEncryptedKeyById(id);
    if (!encrypted) {
      return { error: "API key not found" };
    }

    const decrypted = await decryptKey(currentKey, encrypted);
    const result = await testApiKey(decrypted.name, decrypted.apiKey);

    return result;
  } catch (err) {
    console.error("[vault] Failed to test key:", err);
    return { error: "Failed to test API key", success: false };
  }
}

async function handleTestAllKeys() {
  if (isLocked || !currentKey) {
    return { error: "Vault is locked" };
  }
  await touchActivity();

  try {
    const encryptedKeys = await listEncryptedKeys();
    const results = [];

    // Test sequentially (not parallel)
    for (const encrypted of encryptedKeys) {
      try {
        const decrypted = await decryptKey(currentKey, encrypted);
        const result = await testApiKey(decrypted.name, decrypted.apiKey);
        results.push({
          id: encrypted.id,
          name: decrypted.name,
          ...result,
        });
      } catch (err) {
        console.error(`[vault] Failed to test key ${encrypted.id}:`, err);
        results.push({
          id: encrypted.id,
          name: encrypted.name,
          success: false,
          statusCode: 0,
          message: "Test failed: " + err.message,
        });
      }
    }

    return { results };
  } catch (err) {
    console.error("[vault] Failed to test all keys:", err);
    return { error: "Failed to test API keys" };
  }
}

// ---- Message Listener ----

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, payload } = message || {};

  const run = async () => {
    try {
      switch (action) {
        case "vault:getStatus":
          sendResponse(await handleGetStatus());
          break;
        case "vault:unlock":
          sendResponse(await handleUnlock(payload || {}));
          break;
        case "vault:lock":
          sendResponse(await handleLock());
          break;
        case "keys:list":
          sendResponse(await handleListKeys());
          break;
        case "keys:get":
          sendResponse(await handleGetKey(payload || {}));
          break;
        case "keys:save":
          sendResponse(await handleSaveKey(payload || {}));
          break;
        case "keys:delete":
          sendResponse(await handleDeleteKey(payload || {}));
          break;
        case "keys:test":
          sendResponse(await handleTestKey(payload || {}));
          break;
        case "keys:testAll":
          sendResponse(await handleTestAllKeys());
          break;
        default:
          sendResponse({ error: "Unknown action" });
      }
    } catch (err) {
      console.error("[vault] Unhandled error in background:", err);
      sendResponse({ error: "Internal error" });
    }
  };

  run();
  return true; // Keep message channel open for async response
});
