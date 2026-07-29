// popup.js
// UI-only logic for APIKeyVault popup.
// Communicates with background.js via chrome.runtime messaging.
// NEVER accesses IndexedDB or crypto directly.

const $ = (id) => document.getElementById(id);

const EL = {
  root: document.documentElement,
  views: {
    lock: $("view-lock"),
    list: $("view-list"),
    editor: $("view-editor"),
  },

  // lock
  unlockForm: $("unlock-form"),
  masterPassword: $("master-password-input"),
  masterLabel: $("master-label"),
  masterReveal: $("master-reveal"),
  lockTagline: $("lock-tagline"),
  unlockError: $("unlock-error"),
  unlockButton: $("unlock-button"),
  strength: $("strength"),
  strengthFill: document.querySelector(".strength-fill"),
  strengthLabel: document.querySelector(".strength-label"),

  // list
  themeButton: $("theme-button"),
  bulkTestButton: $("bulk-test-button"),
  lockButton: $("lock-button"),
  searchInput: $("search-input"),
  searchClear: $("search-clear"),
  keyCount: $("key-count"),
  healthSummary: $("health-summary"),
  keyList: $("key-list"),
  emptyState: $("empty-state"),
  noResults: $("no-results"),
  addKeyButton: $("add-key-button"),
  vaultStatusText: $("vault-status-text"),

  // editor
  backButton: $("back-button"),
  editorTitle: $("editor-title"),
  editorSub: $("editor-sub"),
  keyForm: $("key-form"),
  keyId: $("key-id"),
  keyName: $("key-name"),
  keyValue: $("key-value"),
  providerAvatar: $("provider-avatar"),
  providerTitle: $("provider-title"),
  providerNote: $("provider-note"),
  copyKeyButton: $("copy-key-button"),
  toggleVisibilityButton: $("toggle-visibility-button"),
  testKeyButton: $("test-key-button"),
  saveKeyButton: $("save-key-button"),
  deleteKeyButton: $("delete-key-button"),
  healthResult: $("health-result"),
  keyError: $("key-error"),

  // shared
  confirmSheet: $("confirm-sheet"),
  confirmBody: $("confirm-body"),
  confirmCancel: $("confirm-cancel"),
  confirmDelete: $("confirm-delete"),
  toast: $("toast"),
};

// Mirrors normalizeProviderName() in background/healthCheck.js so the badge in
// the editor tells the truth about whether a health check can run.
const PROVIDERS = [
  { id: "openai", label: "OpenAI", initial: "O", match: ["openai"] },
  { id: "gemini", label: "Google Gemini", initial: "G", match: ["gemini", "google"] },
  { id: "grok", label: "Grok", initial: "X", match: ["grok", "x.ai"] },
  { id: "anthropic", label: "Anthropic", initial: "A", match: ["anthropic", "claude"] },
  { id: "huggingface", label: "HuggingFace", initial: "H", match: ["huggingface", "hugging"] },
];

const UNKNOWN_PROVIDER = { id: "unknown", label: "Unrecognized provider", initial: "?" };

function detectProvider(name) {
  const lower = (name || "").toLowerCase();
  return PROVIDERS.find((p) => p.match.some((m) => lower.includes(m))) || UNKNOWN_PROVIDER;
}

let currentKeys = [];
let selectedKeyId = null;
let isInitialized = false;
let activeView = "lock";
let health = {}; // id -> { success, statusCode, at }
let formDirty = false;
let toastTimer = null;

// ── Messaging ──────────────────────────────────────────────────────────────

async function sendMessage(action, payload = {}) {
  try {
    const response = await chrome.runtime.sendMessage({ action, payload });
    return response || {};
  } catch (err) {
    console.error("[popup] Message error:", err);
    return { error: "Failed to communicate with background" };
  }
}

// ── Chrome-local UI state (no secrets: theme + last health results) ─────────

async function loadLocal(keys) {
  try {
    return await chrome.storage.local.get(keys);
  } catch {
    return {};
  }
}

async function saveLocal(items) {
  try {
    await chrome.storage.local.set(items);
  } catch {
    /* non-fatal: UI preferences only */
  }
}

// ── Views ──────────────────────────────────────────────────────────────────

function showView(name) {
  activeView = name;
  for (const [key, el] of Object.entries(EL.views)) {
    el.classList.toggle("is-active", key === name);
  }
}

// ── Toast ──────────────────────────────────────────────────────────────────

function showToast(message, variant = "", duration = 2600) {
  clearTimeout(toastTimer);
  EL.toast.textContent = message;
  EL.toast.className = `toast show ${variant}`;
  toastTimer = setTimeout(() => EL.toast.classList.remove("show"), duration);
}

// ── Formatting ─────────────────────────────────────────────────────────────

function formatDate(timestamp) {
  if (!timestamp) return "Added recently";
  const days = Math.floor((Date.now() - timestamp) / 86400000);
  if (days <= 0) return "Added today";
  if (days === 1) return "Added yesterday";
  if (days < 30) return `Added ${days} days ago`;
  return `Added ${new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function formatAge(timestamp) {
  const mins = Math.floor((Date.now() - timestamp) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Vault status ───────────────────────────────────────────────────────────

async function checkVaultStatus() {
  const status = await sendMessage("vault:getStatus");
  isInitialized = status.isInitialized || false;

  if (status.shouldAutoUnlock && !status.isLocked) {
    showView("list");
    await loadKeys();
    EL.searchInput.focus();
    return;
  }

  renderLockScreen();
  showView("lock");
  EL.masterPassword.focus();
}

function renderLockScreen() {
  const setup = !isInitialized;
  EL.masterLabel.textContent = setup ? "Create master password" : "Master password";
  EL.unlockButton.textContent = setup ? "Create vault" : "Unlock vault";
  EL.masterPassword.autocomplete = setup ? "new-password" : "current-password";
  EL.lockTagline.textContent = setup
    ? "Pick a master password. It derives your encryption key and is never stored."
    : "Encrypted. Offline. Yours.";
  EL.strength.classList.toggle("hidden", !setup);
  EL.unlockError.classList.add("hidden");
}

// ── Unlock / lock ──────────────────────────────────────────────────────────

async function unlockVault(event) {
  event.preventDefault();

  const masterPassword = EL.masterPassword.value;
  if (!masterPassword) return;

  if (!isInitialized && masterPassword.length < 8) {
    EL.unlockError.textContent = "Master password must be at least 8 characters.";
    EL.unlockError.classList.remove("hidden");
    return;
  }

  EL.unlockError.classList.add("hidden");
  EL.unlockButton.disabled = true;
  EL.unlockButton.textContent = isInitialized ? "Unlocking…" : "Creating…";

  const result = await sendMessage("vault:unlock", { masterPassword });

  EL.unlockButton.disabled = false;
  EL.unlockButton.textContent = isInitialized ? "Unlock vault" : "Create vault";

  if (result.error) {
    EL.unlockError.textContent = result.error;
    EL.unlockError.classList.remove("hidden");
    EL.masterPassword.select();
    return;
  }

  isInitialized = true;
  EL.masterPassword.value = "";
  updateStrength();

  showView("list");
  await loadKeys();
  EL.searchInput.focus();
}

async function lockVault() {
  await sendMessage("vault:lock");
  currentKeys = [];
  selectedKeyId = null;
  clearForm();
  renderLockScreen();
  showView("lock");
  EL.masterPassword.focus();
}

// Rough visual feedback only — length and character variety, no dictionary.
function updateStrength() {
  const value = EL.masterPassword.value;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 14) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  if (value.length < 8) score = Math.min(score, 1);

  const steps = [
    { pct: 8, label: "", color: "var(--bad)" },
    { pct: 25, label: "Too short", color: "var(--bad)" },
    { pct: 45, label: "Weak", color: "var(--bad)" },
    { pct: 65, label: "Fair", color: "var(--warn)" },
    { pct: 85, label: "Good", color: "var(--ok)" },
    { pct: 100, label: "Strong", color: "var(--ok)" },
  ];
  const step = steps[score];
  EL.strengthFill.style.width = value ? `${step.pct}%` : "0";
  EL.strengthFill.style.background = step.color;
  EL.strengthLabel.textContent = value ? step.label : "";
}

// ── Key list ───────────────────────────────────────────────────────────────

async function loadKeys() {
  const result = await sendMessage("keys:list");
  if (result.error) {
    showToast(result.error, "bad");
    return;
  }

  currentKeys = result.keys || [];

  // Drop cached health for keys that no longer exist.
  const stored = (await loadLocal("health")).health || {};
  const live = {};
  for (const key of currentKeys) {
    if (stored[key.id]) live[key.id] = stored[key.id];
  }
  health = live;
  saveLocal({ health: live });

  renderKeyList();
}

function renderKeyList() {
  const filter = EL.searchInput.value.trim().toLowerCase();
  const filtered = filter
    ? currentKeys.filter((k) => k.name.toLowerCase().includes(filter))
    : currentKeys;

  EL.keyList.replaceChildren();

  for (const key of filtered) {
    EL.keyList.appendChild(renderKeyItem(key));
  }

  const total = currentKeys.length;
  EL.emptyState.classList.toggle("hidden", total > 0);
  EL.noResults.classList.toggle("hidden", total === 0 || filtered.length > 0);
  EL.searchClear.classList.toggle("hidden", !EL.searchInput.value);
  EL.bulkTestButton.disabled = total === 0;

  EL.keyCount.textContent = total === 0 ? "" : `${total} key${total === 1 ? "" : "s"}`;

  const tested = currentKeys.filter((k) => health[k.id]);
  const valid = tested.filter((k) => health[k.id].success).length;
  EL.healthSummary.textContent = tested.length ? `${valid}/${tested.length} valid` : "";

  EL.vaultStatusText.textContent = total
    ? `${total} key${total === 1 ? "" : "s"} encrypted`
    : "Unlocked";
}

function renderKeyItem(key) {
  const provider = detectProvider(key.name);
  const state = health[key.id];

  const li = document.createElement("li");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "key-item";

  const avatar = document.createElement("span");
  avatar.className = "avatar";
  avatar.dataset.provider = provider.id;
  avatar.textContent = provider.initial;

  const body = document.createElement("div");
  body.className = "key-body";

  const name = document.createElement("div");
  name.className = "key-name";
  name.textContent = key.name;

  const sub = document.createElement("div");
  sub.className = "key-sub";

  if (state === "pending") {
    const pill = document.createElement("span");
    pill.className = "pill pending";
    pill.textContent = "Testing";
    sub.appendChild(pill);
  } else if (state) {
    const pill = document.createElement("span");
    pill.className = `pill ${state.success ? "ok" : "bad"}`;
    pill.textContent = state.success ? "Valid" : "Failing";
    sub.appendChild(pill);
    sub.appendChild(document.createTextNode(formatAge(state.at)));
  } else {
    sub.appendChild(document.createTextNode(formatDate(key.createdAt)));
  }

  body.append(name, sub);
  button.append(avatar, body);
  button.addEventListener("click", () => openKey(key.id));
  li.appendChild(button);
  return li;
}

// ── Editor ─────────────────────────────────────────────────────────────────

function setProviderPreview(name) {
  const provider = detectProvider(name);
  EL.providerAvatar.dataset.provider = provider.id;
  EL.providerAvatar.textContent = provider.initial;
  EL.providerTitle.textContent = provider.label;
  EL.providerNote.textContent =
    provider.id === "unknown"
      ? "Health checks need a known provider name."
      : "Health checks supported.";
}

function clearForm() {
  EL.keyId.value = "";
  EL.keyName.value = "";
  EL.keyValue.value = "";
  EL.keyValue.type = "password";
  setReveal(false);
  selectedKeyId = null;
  formDirty = false;
  EL.testKeyButton.disabled = true;
  EL.deleteKeyButton.disabled = true;
  EL.keyError.classList.add("hidden");
  hideHealthResult();
  setProviderPreview("");
}

function openNewKey() {
  clearForm();
  EL.editorTitle.textContent = "New API key";
  EL.editorSub.textContent = "Encrypted with AES-GCM";
  showView("editor");
  EL.keyName.focus();
}

async function openKey(id) {
  const result = await sendMessage("keys:get", { id });
  if (result.error) {
    showToast(result.error, "bad");
    return;
  }

  const key = result.key;
  clearForm();
  selectedKeyId = key.id;
  EL.keyId.value = key.id;
  EL.keyName.value = key.name;
  EL.keyValue.value = key.apiKey;
  EL.editorTitle.textContent = key.name;
  EL.editorSub.textContent = formatDate(key.createdAt);
  EL.testKeyButton.disabled = false;
  EL.deleteKeyButton.disabled = false;
  setProviderPreview(key.name);

  const state = health[key.id];
  if (state && state !== "pending") {
    showHealthResult(
      state.success ? "success" : "failure",
      state.success ? "API key is valid" : "API key is not working",
      `${state.statusCode ? `Status ${state.statusCode} · ` : ""}Checked ${formatAge(state.at)}`
    );
  }

  showView("editor");
}

async function saveKey(event) {
  event.preventDefault();

  const name = EL.keyName.value.trim();
  const apiKey = EL.keyValue.value.trim();

  if (!name || !apiKey) {
    EL.keyError.textContent = "Provider and API key are both required.";
    EL.keyError.classList.remove("hidden");
    (name ? EL.keyValue : EL.keyName).focus();
    return;
  }

  EL.saveKeyButton.disabled = true;
  EL.saveKeyButton.textContent = "Saving…";

  const result = await sendMessage("keys:save", {
    key: { id: EL.keyId.value || null, name, apiKey },
  });

  EL.saveKeyButton.disabled = false;
  EL.saveKeyButton.textContent = "Save";

  if (result.error) {
    EL.keyError.textContent = result.error;
    EL.keyError.classList.remove("hidden");
    return;
  }

  // The stored key changed, so any cached health verdict is stale.
  if (result.key && health[result.key.id]) {
    delete health[result.key.id];
    saveLocal({ health });
  }

  formDirty = false;
  await loadKeys();
  showView("list");
  showToast(`${name} saved`, "ok");
}

function requestDelete() {
  if (!selectedKeyId) return;
  const key = currentKeys.find((k) => k.id === selectedKeyId);
  EL.confirmBody.textContent = key
    ? `“${key.name}” will be permanently removed from this vault. This cannot be undone.`
    : "This cannot be undone.";
  EL.confirmSheet.classList.remove("hidden");
  EL.confirmDelete.focus();
}

function closeConfirm() {
  EL.confirmSheet.classList.add("hidden");
}

async function deleteKey() {
  const id = selectedKeyId;
  closeConfirm();
  if (!id) return;

  const result = await sendMessage("keys:delete", { id });
  if (result.error) {
    showToast(result.error, "bad");
    return;
  }

  delete health[id];
  saveLocal({ health });

  clearForm();
  await loadKeys();
  showView("list");
  showToast("API key deleted");
}

// ── Health checks ──────────────────────────────────────────────────────────

function showHealthResult(status, message, details) {
  EL.healthResult.className = `health ${status}`;
  EL.healthResult.querySelector(".health-message").textContent = message;
  EL.healthResult.querySelector(".health-details").textContent = details;
}

function hideHealthResult() {
  EL.healthResult.className = "health hidden";
}

async function testKey() {
  if (!selectedKeyId) return;

  if (formDirty) {
    showToast("Testing the saved key — save to test your edits", "");
  }

  EL.testKeyButton.disabled = true;
  showHealthResult("pending", "Testing…", "Contacting the provider.");

  const result = await sendMessage("keys:test", { id: selectedKeyId });
  EL.testKeyButton.disabled = false;

  if (result.error && result.success === undefined) {
    showHealthResult("failure", "Test failed", result.error);
    return;
  }

  recordHealth(selectedKeyId, result);

  const detail = `${result.statusCode ? `Status ${result.statusCode}` : "No response"}${
    result.message ? ` · ${result.message}` : ""
  }`;
  showHealthResult(
    result.success ? "success" : "failure",
    result.success ? "API key is valid" : "API key is not working",
    detail
  );
  renderKeyList();
}

async function bulkTestKeys() {
  if (currentKeys.length === 0) return;

  EL.bulkTestButton.disabled = true;
  EL.bulkTestButton.classList.add("busy");
  for (const key of currentKeys) health[key.id] = "pending";
  renderKeyList();

  const result = await sendMessage("keys:testAll");

  EL.bulkTestButton.classList.remove("busy");
  EL.bulkTestButton.disabled = false;

  if (result.error) {
    for (const key of currentKeys) {
      if (health[key.id] === "pending") delete health[key.id];
    }
    renderKeyList();
    showToast(result.error, "bad");
    return;
  }

  const results = result.results || [];
  for (const item of results) recordHealth(item.id, item, false);
  saveLocal({ health });

  // Anything the backend didn't report on has no verdict to show.
  for (const key of currentKeys) {
    if (health[key.id] === "pending") delete health[key.id];
  }
  renderKeyList();

  const valid = results.filter((r) => r.success).length;
  showToast(
    `${valid} of ${results.length} key${results.length === 1 ? "" : "s"} valid`,
    valid === results.length ? "ok" : "bad"
  );
}

function recordHealth(id, result, persist = true) {
  health[id] = {
    success: Boolean(result.success),
    statusCode: result.statusCode || 0,
    at: Date.now(),
  };
  if (persist) saveLocal({ health });
}

// ── Reveal / copy ──────────────────────────────────────────────────────────

function setIcon(button, icon) {
  button.querySelector("use").setAttribute("href", icon);
}

function setReveal(shown) {
  EL.keyValue.type = shown ? "text" : "password";
  setIcon(EL.toggleVisibilityButton, shown ? "#i-eye-off" : "#i-eye");
  EL.toggleVisibilityButton.setAttribute("aria-label", shown ? "Hide key" : "Reveal key");
}

async function copyKey() {
  const value = EL.keyValue.value;
  if (!value) return;

  try {
    await navigator.clipboard.writeText(value);
  } catch {
    showToast("Clipboard unavailable", "bad");
    return;
  }

  setIcon(EL.copyKeyButton, "#i-check");
  EL.copyKeyButton.classList.add("ok");
  showToast("Key copied to clipboard", "ok", 1800);
  setTimeout(() => {
    setIcon(EL.copyKeyButton, "#i-copy");
    EL.copyKeyButton.classList.remove("ok");
  }, 1600);
}

// ── Theme ──────────────────────────────────────────────────────────────────

function applyTheme(theme) {
  EL.root.dataset.theme = theme;
  setIcon(EL.themeButton, theme === "dark" ? "#i-sun" : "#i-moon");
  EL.themeButton.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
  );
}

async function initTheme() {
  const stored = (await loadLocal("theme")).theme;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(stored || (systemDark ? "dark" : "light"));
}

function toggleTheme() {
  const next = EL.root.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  saveLocal({ theme: next });
}

// ── Events ─────────────────────────────────────────────────────────────────

EL.unlockForm.addEventListener("submit", unlockVault);
EL.masterPassword.addEventListener("input", () => {
  updateStrength();
  EL.unlockError.classList.add("hidden");
});
EL.masterReveal.addEventListener("click", () => {
  const shown = EL.masterPassword.type === "password";
  EL.masterPassword.type = shown ? "text" : "password";
  setIcon(EL.masterReveal, shown ? "#i-eye-off" : "#i-eye");
  EL.masterReveal.setAttribute("aria-label", shown ? "Hide password" : "Show password");
  EL.masterPassword.focus();
});

EL.lockButton.addEventListener("click", lockVault);
EL.themeButton.addEventListener("click", toggleTheme);
EL.bulkTestButton.addEventListener("click", bulkTestKeys);
EL.addKeyButton.addEventListener("click", openNewKey);
EL.searchInput.addEventListener("input", renderKeyList);
EL.searchClear.addEventListener("click", () => {
  EL.searchInput.value = "";
  renderKeyList();
  EL.searchInput.focus();
});

EL.backButton.addEventListener("click", () => showView("list"));
EL.keyForm.addEventListener("submit", saveKey);
EL.keyName.addEventListener("input", () => {
  formDirty = true;
  setProviderPreview(EL.keyName.value);
  EL.keyError.classList.add("hidden");
});
EL.keyValue.addEventListener("input", () => {
  formDirty = true;
  EL.keyError.classList.add("hidden");
});
EL.toggleVisibilityButton.addEventListener("click", () =>
  setReveal(EL.keyValue.type === "password")
);
EL.copyKeyButton.addEventListener("click", copyKey);
EL.testKeyButton.addEventListener("click", testKey);
EL.deleteKeyButton.addEventListener("click", requestDelete);
EL.confirmCancel.addEventListener("click", closeConfirm);
EL.confirmDelete.addEventListener("click", deleteKey);
EL.confirmSheet.addEventListener("click", (e) => {
  if (e.target === EL.confirmSheet) closeConfirm();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!EL.confirmSheet.classList.contains("hidden")) {
      closeConfirm();
    } else if (activeView === "editor") {
      showView("list");
    }
    return;
  }

  // "/" jumps to search, unless the user is already typing somewhere.
  const typing = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
  if (e.key === "/" && activeView === "list" && !typing) {
    e.preventDefault();
    EL.searchInput.focus();
  }
});

// ── Init ───────────────────────────────────────────────────────────────────

initTheme();
checkVaultStatus();
