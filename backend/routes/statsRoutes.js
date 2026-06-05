const express = require("express");
const router = express.Router();
const Vessel = require("../models/Vessel");
const Alert = require("../models/Alert");

router.get("/", async (req, res) => {
  try {
    const activeCount = await Vessel.countDocuments();
    
    const criticalAlertsCount = await Alert.countDocuments({ severity: "Critical" });
    
    const highRiskCount = await Vessel.countDocuments({ voiLevel: "High Risk" });
    const voiCount = await Vessel.countDocuments({ voiLevel: "Vessel of Interest" });
    const monitorCount = await Vessel.countDocuments({ voiLevel: "Monitor" });
    const normalCount = await Vessel.countDocuments({ voiLevel: "Normal" });

    const aggregateData = await Vessel.aggregate([
      {
        $group: {
          _id: null,
          avgSpeed: { $avg: "$speed" },
          maxThreat: { $max: "$threatScore" }
        }
      }
    ]);

    const avgSpeed = aggregateData[0]?.avgSpeed || 0;
    const maxThreat = aggregateData[0]?.maxThreat || 0;

    res.json({
      activeVessels: activeCount,
      criticalAlerts: criticalAlertsCount,
      highRisk: highRiskCount,
      vesselOfInterest: voiCount,
      monitor: monitorCount,
      normal: normalCount,
      avgSpeed: parseFloat(avgSpeed.toFixed(1)),
      maxThreatScore: parseFloat(maxThreat.toFixed(1))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
