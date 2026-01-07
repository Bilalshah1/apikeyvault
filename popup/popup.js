// popup.js
// UI-only logic for APIKeyVault popup.
// Communicates with background.js via chrome.runtime messaging.
// NEVER accesses IndexedDB or crypto directly.

const LOCK_SCREEN = document.getElementById("lock-screen");
const VAULT_SCREEN = document.getElementById("vault-screen");
const UNLOCK_FORM = document.getElementById("unlock-form");
const MASTER_PASSWORD_INPUT = document.getElementById("master-password-input");
const SETUP_INFO = document.getElementById("setup-info");
const UNLOCK_ERROR = document.getElementById("unlock-error");
const UNLOCK_BUTTON = document.getElementById("unlock-button");
const LOCK_BUTTON = document.getElementById("lock-button");
const SEARCH_INPUT = document.getElementById("search-input");
const ADD_KEY_BUTTON = document.getElementById("add-key-button");
const KEY_LIST = document.getElementById("key-list");
const EMPTY_STATE = document.getElementById("empty-state");
const KEY_FORM = document.getElementById("key-form");
const KEY_ID = document.getElementById("key-id");
const KEY_NAME = document.getElementById("key-name");
const KEY_VALUE = document.getElementById("key-value");
const TOGGLE_VISIBILITY_BUTTON = document.getElementById("toggle-visibility-button");
const SAVE_KEY_BUTTON = document.getElementById("save-key-button");
const TEST_KEY_BUTTON = document.getElementById("test-key-button");
const DELETE_KEY_BUTTON = document.getElementById("delete-key-button");
const HEALTH_RESULT = document.getElementById("health-result");
const KEY_ERROR = document.getElementById("key-error");
const KEY_SUCCESS = document.getElementById("key-success");
const BULK_TEST_BUTTON = document.getElementById("bulk-test-button");
const TOAST = document.getElementById("toast");

let currentKeys = [];
let selectedKeyId = null;
let isUnlocked = false;
let isInitialized = false;

// Message helper
async function sendMessage(action, payload = {}) {
  try {
    const response = await chrome.runtime.sendMessage({ action, payload });
    return response || {};
  } catch (err) {
    console.error("[popup] Message error:", err);
    return { error: "Failed to communicate with background" };
  }
}

// Toast helper
function showToast(message, duration = 3000) {
  TOAST.textContent = message;
  TOAST.classList.remove("hidden");
  setTimeout(() => {
    TOAST.classList.add("hidden");
  }, duration);
}

// Check vault status on load
// Auto-unlock if < 5 hours since last activity, otherwise show unlock screen
async function checkVaultStatus() {
  const status = await sendMessage("vault:getStatus");
  isInitialized = status.isInitialized || false;
  const { isLocked, shouldAutoUnlock } = status;
  
  if (shouldAutoUnlock && !isLocked) {
    // Auto-unlock: < 5 hours since last activity AND key still in memory
    isUnlocked = true;
    LOCK_SCREEN.classList.add("hidden");
    VAULT_SCREEN.classList.remove("hidden");
    await loadKeys();
    return;
  }
  
  // Show lock screen (either first time, or > 5 hours, or service worker restarted)
  LOCK_SCREEN.classList.remove("hidden");
  VAULT_SCREEN.classList.add("hidden");
  isUnlocked = false;
  
  if (isInitialized) {
    // Existing vault: show unlock form
    SETUP_INFO.classList.add("hidden");
    document.getElementById("master-label").textContent = "Master password";
    UNLOCK_BUTTON.textContent = "Unlock vault";
  } else {
    // First-time setup: show create form
    SETUP_INFO.classList.remove("hidden");
    document.getElementById("master-label").textContent = "Create master password";
    UNLOCK_BUTTON.textContent = "Create vault";
  }
}

// Unlock vault
async function unlockVault() {
  const masterPassword = MASTER_PASSWORD_INPUT.value;
  if (!masterPassword) return;

  UNLOCK_ERROR.classList.add("hidden");
  UNLOCK_BUTTON.disabled = true;
  UNLOCK_BUTTON.textContent = "Unlocking...";

  const result = await sendMessage("vault:unlock", { masterPassword });

  if (result.error) {
    UNLOCK_ERROR.textContent = result.error;
    UNLOCK_ERROR.classList.remove("hidden");
    UNLOCK_BUTTON.disabled = false;
    UNLOCK_BUTTON.textContent = isInitialized ? "Unlock vault" : "Create vault";
    return;
  }

  isUnlocked = true;
  isInitialized = true; // Mark as initialized after successful unlock
  LOCK_SCREEN.classList.add("hidden");
  VAULT_SCREEN.classList.remove("hidden");
  MASTER_PASSWORD_INPUT.value = "";

  await loadKeys();
}

// Lock vault
async function lockVault() {
  await sendMessage("vault:lock");
  isUnlocked = false;
  currentKeys = [];
  selectedKeyId = null;
  LOCK_SCREEN.classList.remove("hidden");
  VAULT_SCREEN.classList.add("hidden");
  clearForm();
}

// Load API keys list
async function loadKeys() {
  const result = await sendMessage("keys:list");
  if (result.error) {
    showToast("Failed to load keys: " + result.error);
    return;
  }

  currentKeys = result.keys || [];
  renderKeyList();
}

// Render key list
function renderKeyList(filter = "") {
  KEY_LIST.innerHTML = "";

  const filtered = filter
    ? currentKeys.filter((k) =>
        k.name.toLowerCase().includes(filter.toLowerCase())
      )
    : currentKeys;

  if (filtered.length === 0) {
    EMPTY_STATE.classList.remove("hidden");
  } else {
    EMPTY_STATE.classList.add("hidden");
  }

  filtered.forEach((key) => {
    const li = document.createElement("li");
    li.className = "key-item";
    if (key.id === selectedKeyId) {
      li.classList.add("selected");
    }

    li.innerHTML = `
      <div class="key-item-name">${escapeHtml(key.name)}</div>
      <div class="key-item-meta">Created ${formatDate(key.createdAt)}</div>
    `;

    li.addEventListener("click", () => selectKey(key.id));
    KEY_LIST.appendChild(li);
  });
}

// Select a key
async function selectKey(id) {
  selectedKeyId = id;
  renderKeyList(SEARCH_INPUT.value);

  const result = await sendMessage("keys:get", { id });
  if (result.error) {
    showToast("Failed to load key: " + result.error);
    return;
  }

  const key = result.key;
  KEY_ID.value = key.id;
  KEY_NAME.value = key.name;
  KEY_VALUE.value = key.apiKey;
  KEY_VALUE.type = "password";

  SAVE_KEY_BUTTON.disabled = false;
  TEST_KEY_BUTTON.disabled = false;
  DELETE_KEY_BUTTON.disabled = false;

  hideHealthResult();
}

// Clear form
function clearForm() {
  KEY_ID.value = "";
  KEY_NAME.value = "";
  KEY_VALUE.value = "";
  selectedKeyId = null;
  SAVE_KEY_BUTTON.disabled = false;
  TEST_KEY_BUTTON.disabled = true;
  DELETE_KEY_BUTTON.disabled = true;
  hideHealthResult();
  hideMessages();
}

// Save key
async function saveKey() {
  const name = KEY_NAME.value.trim();
  const apiKey = KEY_VALUE.value.trim();

  if (!name || !apiKey) {
    KEY_ERROR.textContent = "Name and API key are required";
    KEY_ERROR.classList.remove("hidden");
    return;
  }

  const id = KEY_ID.value || null;
  const result = await sendMessage("keys:save", {
    key: { id, name, apiKey },
  });

  if (result.error) {
    KEY_ERROR.textContent = result.error;
    KEY_ERROR.classList.remove("hidden");
    return;
  }

  KEY_SUCCESS.textContent = "API key saved";
  KEY_SUCCESS.classList.remove("hidden");
  hideMessages();

  await loadKeys();
  if (result.key) {
    selectKey(result.key.id);
  }
}

// Delete key
async function deleteKey() {
  if (!selectedKeyId) return;

  if (!confirm("Are you sure you want to delete this API key?")) {
    return;
  }

  const result = await sendMessage("keys:delete", { id: selectedKeyId });
  if (result.error) {
    showToast("Failed to delete: " + result.error);
    return;
  }

  showToast("API key deleted");
  clearForm();
  await loadKeys();
}

// Test single key
async function testKey() {
  if (!selectedKeyId) return;

  TEST_KEY_BUTTON.disabled = true;
  TEST_KEY_BUTTON.textContent = "Testing...";
  showHealthResult("pending", "Testing API key...", "");

  const result = await sendMessage("keys:test", { id: selectedKeyId });

  TEST_KEY_BUTTON.disabled = false;
  TEST_KEY_BUTTON.textContent = "Health Check";

  if (result.error) {
    showHealthResult("failure", "Test failed", result.error);
    return;
  }

  const { success, statusCode, message } = result;
  if (success) {
    showHealthResult(
      "success",
      "API key is valid",
      `Status: ${statusCode}${message ? ` - ${message}` : ""}`
    );
  } else {
    showHealthResult(
      "failure",
      "API key is invalid",
      `Status: ${statusCode}${message ? ` - ${message}` : ""}`
    );
  }
}

// Bulk test all keys
async function bulkTestKeys() {
  if (currentKeys.length === 0) {
    showToast("No API keys to test");
    return;
  }

  BULK_TEST_BUTTON.disabled = true;
  BULK_TEST_BUTTON.textContent = "Testing...";

  const result = await sendMessage("keys:testAll");

  BULK_TEST_BUTTON.disabled = false;
  BULK_TEST_BUTTON.textContent = "Test All";

  if (result.error) {
    showToast("Bulk test failed: " + result.error);
    return;
  }

  const { results } = result;
  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  showToast(
    `Bulk test complete: ${successCount}/${totalCount} keys valid`
  );

  // Update UI with results
  results.forEach((testResult) => {
    const key = currentKeys.find((k) => k.id === testResult.id);
    if (key) {
      key.lastTestResult = testResult;
    }
  });

  renderKeyList(SEARCH_INPUT.value);
}

// Show health result
function showHealthResult(status, message, details) {
  HEALTH_RESULT.classList.remove("hidden");
  const indicator = HEALTH_RESULT.querySelector(".health-indicator");
  const messageEl = HEALTH_RESULT.querySelector(".health-message");
  const detailsEl = HEALTH_RESULT.querySelector(".health-details");

  indicator.className = `health-indicator ${status}`;
  messageEl.textContent = message;
  detailsEl.textContent = details;
}

// Hide health result
function hideHealthResult() {
  HEALTH_RESULT.classList.add("hidden");
}

// Hide messages
function hideMessages() {
  setTimeout(() => {
    KEY_ERROR.classList.add("hidden");
    KEY_SUCCESS.classList.add("hidden");
  }, 3000);
}

// Toggle password visibility
function toggleVisibility() {
  if (KEY_VALUE.type === "password") {
    KEY_VALUE.type = "text";
    TOGGLE_VISIBILITY_BUTTON.textContent = "🙈";
  } else {
    KEY_VALUE.type = "password";
    TOGGLE_VISIBILITY_BUTTON.textContent = "👁️";
  }
}

// Helpers
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(timestamp) {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

// Event listeners
UNLOCK_FORM.addEventListener("submit", async (e) => {
  e.preventDefault();
  await unlockVault();
});

LOCK_BUTTON.addEventListener("click", lockVault);

ADD_KEY_BUTTON.addEventListener("click", () => {
  clearForm();
  KEY_NAME.focus();
});

KEY_FORM.addEventListener("submit", async (e) => {
  e.preventDefault();
  await saveKey();
});

DELETE_KEY_BUTTON.addEventListener("click", deleteKey);
TEST_KEY_BUTTON.addEventListener("click", testKey);
BULK_TEST_BUTTON.addEventListener("click", bulkTestKeys);
TOGGLE_VISIBILITY_BUTTON.addEventListener("click", toggleVisibility);

SEARCH_INPUT.addEventListener("input", (e) => {
  renderKeyList(e.target.value);
});

// Initialize
checkVaultStatus();
