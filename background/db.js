// db.js
// IndexedDB wrapper for APIKeyVault.
// Stores ONLY encrypted API keys and a small meta record.
//
// DB schema:
//  - Name: "apiKeyVault"
//  - Store "meta"    (keyPath: "id") -> { id: "meta", isInitialized: boolean, ... }
//  - Store "apikeys" (keyPath: "id") -> { id, name, encryptedKey (ArrayBuffer), iv (Uint8Array), createdAt }

const DB_NAME = "apiKeyVault";
const DB_VERSION = 1;
const META_STORE = "meta";
const APIKEYS_STORE = "apikeys";

function getIndexedDB() {
  const g = typeof globalThis !== "undefined" ? globalThis : self;
  const idb =
    g.indexedDB ||
    g.webkitIndexedDB ||
    g.mozIndexedDB ||
    g.msIndexedDB;
  if (!idb) {
    throw new Error("IndexedDB not available");
  }
  return idb;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const idb = getIndexedDB();
    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(APIKEYS_STORE)) {
        const store = db.createObjectStore(APIKEYS_STORE, { keyPath: "id" });
        store.createIndex("name", "name", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(db, storeName, mode = "readonly") {
  return db.transaction(storeName, mode).objectStore(storeName);
}

// Meta operations
export async function getVaultMeta() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, META_STORE, "readonly");
    const req = store.get("meta");
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function setVaultMeta(meta) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, META_STORE, "readwrite");
    const value = { id: "meta", ...(meta || {}) };
    const req = store.put(value);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// API Key operations
export async function listEncryptedKeys() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, APIKEYS_STORE, "readonly");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getEncryptedKeyById(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, APIKEYS_STORE, "readonly");
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveEncryptedKey(encryptedKey) {
  const db = await openDb();
  const id =
    encryptedKey.id ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + "-" + Math.random().toString(16).slice(2));

  const record = {
    id,
    name: encryptedKey.name,
    encryptedKey: encryptedKey.encryptedKey, // ArrayBuffer
    iv: encryptedKey.iv, // Uint8Array
    createdAt: encryptedKey.createdAt || Date.now(),
  };

  return new Promise((resolve, reject) => {
    const store = tx(db, APIKEYS_STORE, "readwrite");
    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteEncryptedKey(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, APIKEYS_STORE, "readwrite");
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}
