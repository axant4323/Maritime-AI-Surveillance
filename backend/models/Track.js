const mongoose = require("mongoose");

const TrackSchema = new mongoose.Schema({
  vesselMmsi: { type: String, required: true },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

TrackSchema.index({ vesselMmsi: 1, timestamp: 1 });

module.exports = mongoose.model("Track", TrackSchema);
