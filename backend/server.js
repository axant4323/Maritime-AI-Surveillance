require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const startAISStream = require("./aisStream");
const { startAisSimulator } = require("./services/aisSimulator");
const { startSarScheduler } = require("./services/sar/sarScheduler");

const vesselRouter = require("./routes/vesselRoutes");
const alertRouter = require("./routes/alertRoutes");
const statsRouter = require("./routes/statsRoutes");

const app = express();
app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://maritime-ai-surveillance.vercel.app"
    ],
    credentials: true
}));
app.use(express.json());

// In-memory vessel cache
const vesselCache = new Map();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
        "http://localhost:5173",
        "https://maritime-ai-surveillance.vercel.app"
    ],
    credentials: true
  }
});

const sarRouter = require("./routes/sarRoutes")(io, vesselCache);

// API Routes
app.use("/api/vessels", vesselRouter);
app.use("/api/alerts", alertRouter);
app.use("/api/statistics", statsRouter);
app.use("/api/sar", sarRouter);


io.on("connection", (socket) => {
  console.log("Frontend Connected:", socket.id);
  
  // Send current vessel cache immediately on connection
  socket.emit("initial-vessels", Array.from(vesselCache.values()));

  socket.on("disconnect", () => {
    console.log("Frontend Disconnected:", socket.id);
  });
});

// Database connection
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/maritime";
mongoose.connect(mongoUri)
  .then(() => {
    console.log("MongoDB Connected to:", mongoUri);
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err.message);
  });

// Start AIS data sources
const apiKey = process.env.AISSTREAM_API_KEY;
if (apiKey) {
  startAISStream(io, apiKey, vesselCache);
} else {
  console.warn("AISSTREAM_API_KEY not found. Running in SIMULATOR mode.");
}

// Start Simulator
const simulatorEnabled = process.env.SIMULATOR_ENABLED !== "false";
if (simulatorEnabled) {
  startAisSimulator(io, vesselCache);
}

// Start Automated SAR Scheduler (Simulated)
startSarScheduler(io, vesselCache, 30000); // 30 seconds

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});