const Alert = require("../models/Alert");
const Vessel = require("../models/Vessel");

const PORTS = [
  { name: "Houston Port", lat: 29.76, lon: -95.36, radius: 15 }, // 15km
  { name: "Galveston Port", lat: 29.30, lon: -94.79, radius: 15 }, // 15km
  { name: "Miami Port", lat: 25.77, lon: -80.19, radius: 15 }, // 15km
  { name: "Seattle Port", lat: 47.60, lon: -122.33, radius: 20 } // 20km
];

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371.0; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function analyzeVessel(vesselData, prevVessel, io) {
  const { mmsi, lat, lon, speed, heading, name, vesselType, destination, eta, course } = vesselData;
  
  let threatScore = 0;
  let voiLevel = "Normal";
  let topReasons = [];
  
  // 1. Call Python AI Microservice
  try {
    const response = await fetch("http://localhost:5001/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        speed: speed || 0.0,
        heading: heading || 0.0,
        latitude: lat,
        longitude: lon,
        vessel_type: vesselType || "Other"
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      threatScore = result.threat_score;
      voiLevel = result.voi_level;
      if (result.top_reasons) {
        topReasons = result.top_reasons;
      }
    } else {
      console.error(`AI Microservice error status: ${response.status}`);
      threatScore = calculateFallbackThreat(speed, lat, lon, vesselType);
      voiLevel = getVoiLevel(threatScore);
    }
  } catch (error) {
    console.error("Failed to connect to AI Microservice, using fallback logic:", error.message);
    threatScore = calculateFallbackThreat(speed, lat, lon, vesselType);
    voiLevel = getVoiLevel(threatScore);
  }
  
  const alertsToTrigger = [];
  
  // 2. Anomaly Checks
  // A. Restricted Zone Entry Check
  let currentZone = null;
  for (const port of PORTS) {
    const dist = haversineDistance(lat, lon, port.lat, port.lon);
    if (dist <= port.radius) {
      currentZone = port.name;
      break;
    }
  }
  
  if (currentZone) {
    let previouslyInZone = false;
    if (prevVessel) {
      const pPort = PORTS.find(p => p.name === currentZone);
      const prevDist = haversineDistance(prevVessel.lat, prevVessel.lon, pPort.lat, pPort.lon);
      if (prevDist <= pPort.radius) {
        previouslyInZone = true;
      }
    }
    
    if (!previouslyInZone) {
      alertsToTrigger.push({
        type: "Restricted Zone Entry",
        severity: voiLevel === "Normal" ? "Monitor" : voiLevel,
        message: `Vessel ${name || mmsi} entered restricted zone: ${currentZone}`
      });
      
      io.emit("vessel-enter-zone", {
        mmsi,
        name: name || "Unknown",
        zoneName: currentZone,
        lat,
        lon,
        timestamp: new Date()
      });
    }
  }
  
  // B. Speed Anomaly Check
  if (speed > 25) {
    alertsToTrigger.push({
      type: "High Speed Anomaly",
      severity: "High Risk",
      message: `Vessel ${name || mmsi} is sailing at anomalous speed of ${speed} knots.`
    });
  } else if (speed > 18 && (vesselType === "Cargo" || vesselType === "Tanker")) {
    alertsToTrigger.push({
      type: "High Speed Anomaly",
      severity: "Monitor",
      message: `Vessel ${name || mmsi} (Cargo/Tanker) is sailing fast: ${speed} knots.`
    });
  }
  
  // C. Heading Anomaly Check (sudden course change)
  if (prevVessel && prevVessel.heading !== undefined) {
    const diff = Math.abs(heading - prevVessel.heading);
    const normalizedDiff = diff > 180 ? 360 - diff : diff;
    if (normalizedDiff > 55 && speed > 5) {
      alertsToTrigger.push({
        type: "Heading Anomaly",
        severity: "Vessel of Interest",
        message: `Vessel ${name || mmsi} made an abrupt heading change of ${Math.round(normalizedDiff)}°`
      });
    }
  }
  
  // D. Critical Threat Score Anomaly
  if (threatScore >= 80) {
    alertsToTrigger.push({
      type: "Critical Vessel Detected",
      severity: "Critical",
      message: `Vessel ${name || mmsi} flagged with critical threat score: ${threatScore}%`
    });
  }
  
  // 3. Save alerts and emit socket events
  for (const alertData of alertsToTrigger) {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const existingAlert = await Alert.findOne({
      vesselMmsi: mmsi,
      type: alertData.type,
      createdAt: { $gte: twoMinutesAgo }
    });
    
    if (!existingAlert) {
      const alertDoc = new Alert({
        vesselMmsi: mmsi,
        vesselName: name || "Unknown",
        type: alertData.type,
        severity: alertData.severity,
        message: alertData.message,
        timestamp: new Date()
      });
      await alertDoc.save();
      io.emit("vessel-alert", alertDoc);
    }
  }
  
  return { threatScore, voiLevel, topReasons };
}

function calculateFallbackThreat(speed, lat, lon, vesselType) {
  let score = 10;
  
  if (speed > 25) score += 35;
  else if (speed > 18) score += 15;
  else if (speed < 1.0) score += 5;
  
  let nearestDist = Infinity;
  for (const port of PORTS) {
    const dist = haversineDistance(lat, lon, port.lat, port.lon);
    if (dist < nearestDist) nearestDist = dist;
  }
  
  if (nearestDist < 5.0) {
    score += 25;
  } else if (nearestDist < 15.0) {
    score += 12;
  }
  
  if (vesselType === "High Speed") score += 10;
  
  return Math.min(100, score);
}

function getVoiLevel(score) {
  if (score < 20) return "Normal";
  if (score < 40) return "Monitor";
  if (score < 60) return "Vessel of Interest";
  if (score < 80) return "High Risk";
  return "Critical";
}

module.exports = { analyzeVessel, haversineDistance, PORTS };
