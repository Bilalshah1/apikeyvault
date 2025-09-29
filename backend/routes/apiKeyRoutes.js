const express = require("express");
const router = express.Router();
const { ApiKey } = require("../models");
const auth = require('../middleware/auth');

// GET all API keys (scoped to the authenticated user)
router.get("/", auth, async (req, res) => {
  try {
    const keys = await ApiKey.findAll({
      where: { userId: req.user.uid },
      order: [["created_at", "DESC"]],
    });
    res.status(200).json({ success: true, data: keys });
  } catch (err) {
    console.error("Error fetching API keys:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST create new API key (owned by the authenticated user)
router.post("/", auth, async (req, res) => {
  try {
    const { keyName, service, apiKey, rateLimit, expiresAt, ipWhitelist } = req.body;
    const newKey = await ApiKey.create({
      userId: req.user.uid,
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

// DELETE an API key by id (only if owned by the authenticated user)
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const key = await ApiKey.findOne({ where: { id, userId: req.user.uid } });
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
