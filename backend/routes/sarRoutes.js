const express = require("express");
const multer = require("multer");
const { detectShipsInSarImage } = require("../services/sar/sarDetectionService");
const { correlateSarWithAis } = require("../services/sar/aisCorrelationEngine");

// Setup multer for image uploads
const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

module.exports = function(io, vesselCache) {
  const router = express.Router();

  // POST /api/sar/upload - Upload SAR image (dummy endpoint)
  router.post("/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    
    // In a real system, you'd save it or pass it to Python AI.
    // For now we just return the path to simulate it.
    res.json({ message: "File uploaded successfully", fileId: req.file.filename });
  });

  // POST /api/sar/detect - Run detection and correlation
  router.post("/detect", async (req, res) => {
    try {
      const { fileId } = req.body;
      // In a real system, use the fileId to load the image and run inference.
      
      // 1. Detect Ships in SAR
      const { ships } = await detectShipsInSarImage(fileId);
      
      // 2. Correlate with AIS
      const { correlated, newAlerts } = await correlateSarWithAis(ships, vesselCache, io);
      
      res.json({
        totalDetections: ships.length,
        results: correlated,
        alertsGenerated: newAlerts.length
      });
    } catch (err) {
      console.error("SAR Detection Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
