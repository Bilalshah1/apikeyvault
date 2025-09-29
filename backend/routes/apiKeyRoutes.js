const express = require("express");
const router = express.Router();
const { ApiKey } = require("../models");

// GET all API keys
router.get("/", async (req, res) => {
  try {
    const keys = await ApiKey.findAll({
      order: [['created_at', 'DESC']]
    });
    res.status(200).json({ success: true, data: keys });
  } catch (err) {
    console.error("Error fetching API keys:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST create new API key
router.post("/", async (req, res) => {
  try {
    const { keyName, service, apiKey, rateLimit, expiresAt, ipWhitelist } = req.body;
    const newKey = await ApiKey.create({
      keyName,
      service,
      apiKey,
      rateLimit,
      expiresAt,
      ipWhitelist,
    });

    res.status(201).json({ success: true, data: newKey });
  } catch (err) 
  {
    console.error("Error creating API key:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE an API key by id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const key = await ApiKey.findByPk(id);
    if (!key) {
      return res.status(404).json({ success: false, error: "API key not found" });
    }

    await key.destroy();
    return res.status(200).json({ success: true, message: "API key deleted" });
  } catch (err) {
    console.error("Error deleting API key:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
