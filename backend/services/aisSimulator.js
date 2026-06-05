const Vessel = require("../models/Vessel");
const Track = require("../models/Track");
const { analyzeVessel } = require("./threatEngine");

// Initial simulated vessels
const SIMULATED_VESSELS = [
  {
    mmsi: "367123450",
    name: "Gulf Trader",
    vesselType: "Cargo",
    lat: 28.2,
    lon: -93.8,
    speed: 12.0,
    heading: 320,
    destination: "Houston Port",
    eta: "05-30 14:00",
    destLat: 29.76,
    destLon: -95.36,
  },
  {
    mmsi: "367123451",
    name: "Atlantic Titan",
    vesselType: "Tanker",
    lat: 28.4,
    lon: -94.2,
    speed: 14.0,
    heading: 310,
    destination: "Galveston Port",
    eta: "05-30 11:30",
    destLat: 29.30,
    destLon: -94.79,
  },
  {
    mmsi: "367123452",
    name: "Hurricane Express",
    vesselType: "High Speed",
    lat: 25.1,
    lon: -81.0,
    speed: 28.0,
    heading: 300,
    destination: "Miami Port",
    eta: "05-30 08:15",
    destLat: 25.77,
    destLon: -80.19,
  },
  {
    mmsi: "367123453",
    name: "Deep Blue V",
    vesselType: "Fishing",
    lat: 29.1,
    lon: -94.3,
    speed: 8.0,
    heading: 45,
    destination: "Galveston Port",
    eta: "05-30 18:45",
    destLat: 29.30,
    destLon: -94.79,
    erraticBehavior: true
  },
  {
    mmsi: "367123454",
    name: "Caribbean Sun",
    vesselType: "Passenger",
    lat: 24.8,
    lon: -80.8,
    speed: 19.0,
    heading: 350,
    destination: "Miami Port",
    eta: "05-30 09:30",
    destLat: 25.77,
    destLon: -80.19,
  },
  {
    mmsi: "367123455",
    name: "Seattle Mariner",
    vesselType: "Cargo",
    lat: 47.15,
    lon: -122.65,
    speed: 15.0,
    heading: 30,
    destination: "Seattle Port",
    eta: "05-30 10:00",
    destLat: 47.60,
    destLon: -122.33,
  }
];

let activeVessels = JSON.parse(JSON.stringify(SIMULATED_VESSELS));

function startAisSimulator(io, vesselCache) {
  console.log("AIS Simulator started");
  
  setInterval(async () => {
    for (let i = 0; i < activeVessels.length; i++) {
      const vessel = activeVessels[i];
      
      const dy = vessel.destLat - vessel.lat;
      const dx = (vessel.destLon - vessel.lon) * Math.cos(vessel.lat * Math.PI / 180);
      let angle = Math.atan2(dx, dy) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      
      let newHeading = Math.round(angle);
      let speedVar = (Math.random() - 0.5) * 1.5;
      let currentSpeed = Math.max(0.5, vessel.speed + speedVar);
      
      if (vessel.mmsi === "367123452") {
        currentSpeed = 26.0 + Math.sin(Date.now() / 10000) * 8.0;
      }
      
      if (vessel.erraticBehavior) {
        if (Math.random() < 0.25) {
          newHeading = (vessel.heading + 70) % 360;
          currentSpeed = 3.0 + Math.random() * 5.0;
        } else {
          newHeading = vessel.heading;
        }
      }
      
      if (vessel.mmsi === "367123450" && Math.random() < 0.08) {
        currentSpeed = 23.5;
      }
      
      const distDegrees = currentSpeed * 0.001;
      const rad = newHeading * Math.PI / 180;
      const newLat = vessel.lat + distDegrees * Math.cos(rad);
      const newLon = vessel.lon + distDegrees * Math.sin(rad);
      
      const distToDest = Math.sqrt(Math.pow(newLat - vessel.destLat, 2) + Math.pow(newLon - vessel.destLon, 2));
      if (distToDest < 0.015) {
        const initial = SIMULATED_VESSELS.find(v => v.mmsi === vessel.mmsi);
        vessel.lat = initial.lat;
        vessel.lon = initial.lon;
        vessel.speed = initial.speed;
        vessel.heading = initial.heading;
      } else {
        vessel.lat = newLat;
        vessel.lon = newLon;
        vessel.speed = parseFloat(currentSpeed.toFixed(1));
        vessel.heading = Math.round(newHeading);
      }
      
      const prevVessel = vesselCache.get(vessel.mmsi) || null;
      
      const { threatScore, voiLevel, topReasons } = await analyzeVessel({
        mmsi: vessel.mmsi,
        lat: vessel.lat,
        lon: vessel.lon,
        speed: vessel.speed,
        heading: vessel.heading,
        name: vessel.name,
        vesselType: vessel.vesselType,
        destination: vessel.destination,
        eta: vessel.eta,
        course: vessel.heading
      }, prevVessel, io);
      
      const updatedVesselData = {
        mmsi: vessel.mmsi,
        name: vessel.name,
        lat: vessel.lat,
        lon: vessel.lon,
        speed: vessel.speed,
        heading: vessel.heading,
        course: vessel.heading,
        vesselType: vessel.vesselType,
        destination: vessel.destination,
        eta: vessel.eta,
        threatScore,
        voiLevel,
        topReasons,
        timestamp: new Date()
      };
      
      vesselCache.set(vessel.mmsi, updatedVesselData);
      
      try {
        await Vessel.findOneAndUpdate(
          { mmsi: vessel.mmsi },
          updatedVesselData,
          { upsert: true, new: true }
        );
        
        const trackDoc = new Track({
          vesselMmsi: vessel.mmsi,
          lat: vessel.lat,
          lon: vessel.lon,
          speed: vessel.speed,
          heading: vessel.heading,
          timestamp: new Date()
        });
        await trackDoc.save();
      } catch (err) {
        console.error("Error saving simulated vessel to DB:", err.message);
      }
      
      io.emit("vessel-update", updatedVesselData);
    }
  }, 3000);
}

module.exports = { startAisSimulator };
