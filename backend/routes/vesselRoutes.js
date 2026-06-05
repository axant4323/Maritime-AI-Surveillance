const express = require("express");
const router = express.Router();
const Vessel = require("../models/Vessel");
const Track = require("../models/Track");

// GET /api/vessels - fetch all active vessels with filters
router.get("/", async (req, res) => {
  try {
    const { search, vesselType, voiLevel, minSpeed, maxSpeed } = req.query;
    
    let query = {};
    
    // Search by MMSI or Name
    if (search) {
      query.$or = [
        { mmsi: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } }
      ];
    }
    
    // Filter by type
    if (vesselType && vesselType !== "All") {
      query.vesselType = vesselType;
    }
    
    // Filter by threat/VOI level
    if (voiLevel && voiLevel !== "All") {
      query.voiLevel = voiLevel;
    }
    
    // Filter by speed range
    if (minSpeed || maxSpeed) {
      query.speed = {};
      if (minSpeed) query.speed.$gte = parseFloat(minSpeed);
      if (maxSpeed) query.speed.$lte = parseFloat(maxSpeed);
    }
    
    // Fetch latest updated vessels (e.g. active in last 30 minutes, or just all since it's a dashboard)
    const vessels = await Vessel.find(query).sort({ timestamp: -1 });
    res.json(vessels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vessels/:mmsi - fetch specific vessel details
router.get("/:mmsi", async (req, res) => {
  try {
    const vessel = await Vessel.findOne({ mmsi: req.params.mmsi });
    if (!vessel) return res.status(404).json({ error: "Vessel not found" });
    res.json(vessel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vessels/:mmsi/track - fetch historical trail for a vessel
router.get("/:mmsi/track", async (req, res) => {
  try {
    const tracks = await Track.find({ vesselMmsi: req.params.mmsi })
      .sort({ timestamp: 1 })
      .limit(500); // limit to last 500 coordinates for performance
    res.json(tracks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
