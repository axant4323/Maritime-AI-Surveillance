const mongoose = require("mongoose");

const VesselSchema = new mongoose.Schema({
  mmsi: { type: String, required: true, unique: true },
  name: { type: String, default: "Unknown" },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  course: { type: Number, default: 0 },
  vesselType: { type: String, default: "Other" },
  destination: { type: String, default: "Unknown" },
  eta: { type: String, default: "Unknown" },
  threatScore: { type: Number, default: 0 },
  voiLevel: { type: String, default: "Normal" },
  topReasons: { type: Array, default: [] },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Vessel", VesselSchema);
