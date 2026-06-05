const { haversineDistance, PORTS } = require("../threatEngine");
const Alert = require("../../models/Alert");

const DARK_VESSEL_THRESHOLD_KM = 3.0; // Distance in km to consider a SAR detection "unmatched"

/**
 * Correlates SAR detections with the active AIS vessel cache.
 * Finds the nearest AIS signal for each detection.
 */
async function correlateSarWithAis(sarDetections, vesselCache, io) {
  const vessels = Array.from(vesselCache.values());
  const results = [];
  const newAlerts = [];

  for (const detection of sarDetections) {
    let nearestAisDist = Infinity;
    let nearestAisVessel = null;

    for (const vessel of vessels) {
      const dist = haversineDistance(detection.lat, detection.lon, vessel.lat, vessel.lon);
      if (dist < nearestAisDist) {
        nearestAisDist = dist;
        nearestAisVessel = vessel;
      }
    }

    const isDarkVessel = nearestAisDist > DARK_VESSEL_THRESHOLD_KM;
    let threatScore = 0;
    let voiLevel = "Normal";

    if (isDarkVessel) {
      threatScore = calculateDarkVesselThreat(detection.lat, detection.lon, detection.confidence);
      voiLevel = getVoiLevel(threatScore);
    }

    const result = {
      ...detection,
      nearestAisMmsi: nearestAisVessel ? nearestAisVessel.mmsi : null,
      nearestAisName: nearestAisVessel ? nearestAisVessel.name : null,
      distanceToAisKm: nearestAisDist !== Infinity ? nearestAisDist : null,
      isDarkVessel,
      threatScore,
      voiLevel
    };

    results.push(result);

    // If it's a dark vessel, generate an alert
    if (isDarkVessel) {
      const alertDoc = new Alert({
        vesselMmsi: `SAR-DARK-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        vesselName: "Unknown Dark Vessel",
        type: "Dark Vessel Detection",
        severity: voiLevel,
        message: `Dark vessel detected via SAR imagery at Lat: ${detection.lat.toFixed(4)}, Lon: ${detection.lon.toFixed(4)}. Confidence: ${(detection.confidence * 100).toFixed(1)}%.`,
        timestamp: new Date()
      });
      await alertDoc.save();
      
      const alertData = {
        id: alertDoc._id,
        lat: detection.lat,
        lon: detection.lon,
        confidence: detection.confidence,
        threatScore: threatScore,
        voiLevel: voiLevel,
        isDarkVessel: true,
        nearestAisMmsi: nearestAisVessel ? nearestAisVessel.mmsi : null,
        distanceToAisKm: nearestAisDist !== Infinity ? nearestAisDist : null,
        alertDoc: alertDoc
      };

      io.emit("dark-vessel-alert", alertData);
      io.emit("vessel-alert", alertDoc); // Also emit to regular alerts table
      newAlerts.push(alertData);
    }
  }

  return { correlated: results, newAlerts };
}

function calculateDarkVesselThreat(lat, lon, confidence) {
  let score = 40; // Base score for being a dark vessel

  // Confidence factor
  if (confidence > 0.9) score += 15;
  else if (confidence > 0.8) score += 5;

  // Proximity to restricted ports
  let nearestPortDist = Infinity;
  for (const port of PORTS) {
    const dist = haversineDistance(lat, lon, port.lat, port.lon);
    if (dist < nearestPortDist) nearestPortDist = dist;
  }

  if (nearestPortDist < 10.0) {
    score += 40; // Extremely close to port without AIS
  } else if (nearestPortDist < 25.0) {
    score += 20;
  }

  return Math.min(100, score);
}

function getVoiLevel(score) {
  if (score < 40) return "Monitor";
  if (score < 60) return "Vessel of Interest";
  if (score < 80) return "High Risk";
  return "Critical";
}

module.exports = { correlateSarWithAis };
