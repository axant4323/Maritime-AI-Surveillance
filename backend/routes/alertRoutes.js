const express = require("express");
const router = express.Router();
const Alert = require("../models/Alert");

const SEVERITY_ORDER = {
  "Critical": 0,
  "High Risk": 1,
  "Vessel of Interest": 2,
  "Monitor": 3,
  "Normal": 4
};

// GET /api/alerts - fetch recent alerts sorted by severity
router.get("/", async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(100);
    
    // Sort by severity first, then by timestamp
    const sortedAlerts = alerts.sort((a, b) => {
      const orderA = SEVERITY_ORDER[a.severity] ?? 5;
      const orderB = SEVERITY_ORDER[b.severity] ?? 5;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    res.json(sortedAlerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alerts/clear - clear all alerts for debugging / reset
router.post("/clear", async (req, res) => {
  try {
    await Alert.deleteMany({});
    res.json({ message: "Alerts cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
