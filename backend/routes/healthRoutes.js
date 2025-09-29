const express = require("express");
const router = express.Router();
const { ApiKey } = require("../models");
const fetch = globalThis.fetch || require("node-fetch");


router.get("/", (req, res) => {
  res.json({ message: "Health check GET working!" });
});
// Health check functions for different services
const testOpenAI = async (apiKey) => {

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return { success: response.ok, status: response.status, service: 'OpenAI' };
  } catch (error) {
    return { success: false, error: error.message, service: 'OpenAI' };
  }
};

const testGroq = async (apiKey) => {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,  // ✅ fixed backticks
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5
      })
    }); 
    return { success: response.ok, status: response.status, service: 'Groq' };
  } catch (error) {
    return { success: false, error: error.message, service: 'Groq' };
  }
};





const testGemini = async (apiKey) => {
  console.log('Testing Gemini with API key:', apiKey);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    return { success: response.ok, status: response.status, service: 'Gemini' };
  } catch (error) {
    return { success: false, error: error.message, service: 'Gemini' };
  }
};

const testApiKey = async (key) => {
  const service = key.service.toLowerCase();
  let result;
  
  switch (service) {
    case 'openai':
      result = await testOpenAI(key.apiKey);
      break;
    case 'groq':
      result = await testGroq(key.apiKey);
      break;
    case 'gemini':
    case 'google':
      result = await testGemini(key.apiKey);
      break;
    default:
      result = { success: false, error: 'Unsupported service', service: key.service };
  }
  
  return {
    keyId: key.id,
    keyName: key.keyName,
    service: key.service,
    ...result
  };
};

// POST bulk health test all API keys
router.post("/bulk-test", async (req, res) => {
  try {
    const keys = await ApiKey.findAll();
    
    if (keys.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: "No API keys found to test",
        results: [] 
      });
    }

    // Test all keys in parallel
    const testPromises = keys.map(key => testApiKey(key));
    const results = await Promise.all(testPromises);
    
    const summary = {
      total: results.length,
      healthy: results.filter(r => r.success).length,
      unhealthy: results.filter(r => !r.success).length
    };

    res.status(200).json({ 
      success: true, 
      results,
      summary
    });
  } catch (err) {
    console.error("Error testing API keys:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST test individual API key
router.post("/test/:keyId", async (req, res) => {
  console.log('Received request to test key:', req.params.keyId);
  try {
    const { keyId } = req.params;
    const id = parseInt(keyId, 10);
    console.log('Parsed keyId as integer:', id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "keyId must be an integer",
      });
    }

    const key = await ApiKey.findByPk(id);
    
    if (!key) {
      return res.status(404).json({ 
        success: false, 
        error: "API key not found" 
      });
    }

    const result = await testApiKey(key);
    
    res.status(200).json({ 
      success: true, 
      result
    });
  } catch (err) {
    console.error("Error testing API key:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
