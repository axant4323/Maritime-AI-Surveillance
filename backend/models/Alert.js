const mongoose = require("mongoose");

const AlertSchema = new mongoose.Schema({
  vesselMmsi: { type: String, required: true },
  vesselName: { type: String, default: "Unknown" },
  type: { type: String, required: true },
  severity: { type: String, enum: ["Normal", "Monitor", "Vessel of Interest", "High Risk", "Critical"], default: "Normal" },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

AlertSchema.index({ timestamp: -1 });

module.exports = mongoose.model("Alert", AlertSchema);
