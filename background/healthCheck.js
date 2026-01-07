// healthCheck.js
// Health testing for API keys.
// Sends real HTTP requests to provider-specific endpoints.
// Supports: OpenAI, Gemini, Grok, Anthropic, HuggingFace

// Provider endpoint mapping
const PROVIDER_ENDPOINTS = {
  openai: {
    url: "https://api.openai.com/v1/models",
    method: "GET",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1/models",
    method: "GET",
    headerKey: "x-goog-api-key",
    headerPrefix: "",
  },
  grok: {
    url: "https://api.x.ai/v1/models",
    method: "GET",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    method: "POST",
    headerKey: "x-api-key",
    headerPrefix: "",
    headerAnthroVersion: "anthropic-2023-06-01",
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 10,
      messages: [{ role: "user", content: "test" }],
    }),
  },
  huggingface: {
    url: "https://api-inference.huggingface.co/models/meta-llama/Llama-2-7b-chat-hf",
    method: "POST",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    body: JSON.stringify({ inputs: "test" }),
  },
};

// Normalize provider name to key
function normalizeProviderName(name) {
  if (!name || typeof name !== "string") {
    return null;
  }
  const lower = name.toLowerCase();
  if (lower.includes("openai")) return "openai";
  if (lower.includes("gemini") || lower.includes("google")) return "gemini";
  if (lower.includes("grok") || lower.includes("x.ai")) return "grok";
  if (lower.includes("anthropic") || lower.includes("claude")) return "anthropic";
  if (lower.includes("huggingface") || lower.includes("hugging")) return "huggingface";
  return null;
}

// Test a single API key
export async function testApiKey(providerName, apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    return {
      success: false,
      statusCode: 0,
      message: "Invalid API key",
    };
  }

  const providerKey = normalizeProviderName(providerName);
  if (!providerKey) {
    return {
      success: false,
      statusCode: 0,
      message: `Unknown provider: ${providerName}. Supported: OpenAI, Gemini, Grok, Anthropic, HuggingFace`,
    };
  }

  const config = PROVIDER_ENDPOINTS[providerKey];
  if (!config) {
    return {
      success: false,
      statusCode: 0,
      message: "Provider configuration not found",
    };
  }

  try {
    const headers = {
      [config.headerKey]: config.headerPrefix + apiKey,
    };

    if (config.headerAnthroVersion) {
      headers["anthropic-version"] = config.headerAnthroVersion;
    }

    const fetchOptions = {
      method: config.method,
      headers,
    };

    if (config.body) {
      fetchOptions.body = config.body;
    }

    const response = await fetch(config.url, fetchOptions);

    // Consider 200-299 as success, 401/403 as auth failure, others as errors
    const success = response.status >= 200 && response.status < 300;
    let message = "";

    if (success) {
      message = "API key is valid";
    } else if (response.status === 401 || response.status === 403) {
      message = "Invalid API key or unauthorized";
    } else {
      message = `HTTP ${response.status}`;
    }

    return {
      success,
      statusCode: response.status,
      message,
    };
  } catch (err) {
    console.error(`[health] Test failed for ${providerName}:`, err);
    return {
      success: false,
      statusCode: 0,
      message: err.message || "Network error",
    };
  }
}

// Test all API keys (called from background.js, not used here directly)
export async function testAllApiKeys(keys) {
  const results = [];
  for (const key of keys) {
    const result = await testApiKey(key.name, key.apiKey);
    results.push({
      id: key.id,
      name: key.name,
      ...result,
    });
  }
  return results;
}

