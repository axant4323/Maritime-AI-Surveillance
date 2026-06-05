const WebSocket = require("ws");
const Vessel = require("./models/Vessel");
const Track = require("./models/Track");
const { analyzeVessel } = require("./services/threatEngine");

function startAISStream(io, apiKey, vesselCache) {
  if (!apiKey) {
    console.warn("AISStream API Key missing. Skipping live stream connection.");
    return;
  }

  const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");

  ws.on("open", () => {
    console.log("AISStream Connected");
    ws.send(
      JSON.stringify({
        APIKey: apiKey,
        BoundingBoxes: [[
          [24.0, -98.0],
          [50.0, -66.0]
        ]]
      })
    );
  });

  ws.on("message", async (data) => {
    try {
      const rawMsg = JSON.parse(data.toString());
      if (!rawMsg || !rawMsg.Message) return;

      const messageType = rawMsg.MessageType;
      const mmsi = rawMsg.MetaData.MMSI?.toString();
      if (!mmsi) return;

      let vesselData = vesselCache.get(mmsi) || {
        mmsi,
        name: rawMsg.MetaData.ShipName?.trim() || "Unknown",
        lat: 0,
        lon: 0,
        speed: 0,
        heading: 0,
        course: 0,
        vesselType: "Other",
        destination: "Unknown",
        eta: "Unknown",
        timestamp: new Date()
      };

      if (rawMsg.MetaData.ShipName) {
        vesselData.name = rawMsg.MetaData.ShipName.trim();
      }

      let updated = false;

      if (messageType === "PositionReport") {
        const pos = rawMsg.Message.PositionReport;
        vesselData.lat = pos.Latitude;
        vesselData.lon = pos.Longitude;
        vesselData.speed = pos.Sog;
        vesselData.heading = pos.TrueHeading;
        vesselData.course = pos.Cog;
        vesselData.timestamp = new Date();
        updated = true;
      } 
      else if (messageType === "ShipStaticData") {
        const staticData = rawMsg.Message.ShipStaticData;
        vesselData.name = staticData.Name?.trim() || vesselData.name;
        vesselData.vesselType = getVesselTypeString(staticData.Type);
        vesselData.destination = staticData.Destination?.trim() || vesselData.destination;
        if (staticData.EtaMonth && staticData.EtaDay) {
          vesselData.eta = `${staticData.EtaMonth}-${staticData.EtaDay} ${staticData.EtaHour || 0}:${staticData.EtaMinute || 0}`;
        }
        updated = true;
      }

      if (updated && vesselData.lat && vesselData.lon) {
        const prevVessel = vesselCache.get(mmsi) || null;

        const { threatScore, voiLevel, topReasons } = await analyzeVessel(vesselData, prevVessel, io);
        
        vesselData.threatScore = threatScore;
        vesselData.voiLevel = voiLevel;
        vesselData.topReasons = topReasons;

        vesselCache.set(mmsi, vesselData);

        try {
          await Vessel.findOneAndUpdate(
            { mmsi },
            vesselData,
            { upsert: true, new: true }
          );

          if (messageType === "PositionReport") {
            const trackDoc = new Track({
              vesselMmsi: mmsi,
              lat: vesselData.lat,
              lon: vesselData.lon,
              speed: vesselData.speed,
              heading: vesselData.heading,
              timestamp: new Date()
            });
            await trackDoc.save();
          }
        } catch (err) {
          console.error("DB error in AISStream update:", err.message);
        }

        io.emit("vessel-update", vesselData);
      }
    } catch (err) {
      console.error("AISStream message parsing error:", err.message);
    }
  });

  ws.on("error", (err) => {
    console.error("AISStream WebSocket error:", err.message);
  });

  ws.on("close", () => {
    console.log("AISStream Disconnected, reconnecting in 10s...");
    setTimeout(() => startAISStream(io, apiKey, vesselCache), 10000);
  });
}

function getVesselTypeString(typeNum) {
  if (!typeNum) return "Other";
  if (typeNum >= 70 && typeNum <= 79) return "Cargo";
  if (typeNum >= 80 && typeNum <= 89) return "Tanker";
  if (typeNum >= 60 && typeNum <= 69) return "Passenger";
  if (typeNum >= 40 && typeNum <= 49) return "High Speed";
  if (typeNum >= 30 && typeNum <= 30) return "Fishing";
  if (typeNum === 35) return "Military";
  return "Other";
}

module.exports = startAISStream;