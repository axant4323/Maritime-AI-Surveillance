const { detectShipsInSarImage } = require("./sarDetectionService");
const { correlateSarWithAis } = require("./aisCorrelationEngine");

function startSarScheduler(io, vesselCache, intervalMs = 30000) {
  console.log(`Starting Automated SAR Scheduler. Polling every ${intervalMs / 1000} seconds.`);

  setInterval(async () => {
    try {
      console.log("[SAR Scheduler] Simulating background satellite pass...");
      
      // We pass null to simulate an auto-generated image
      const { ships } = await detectShipsInSarImage(null);
      
      if (ships && ships.length > 0) {
        console.log(`[SAR Scheduler] Found ${ships.length} potential targets in latest imagery. Correlating...`);
        const { correlated, newAlerts } = await correlateSarWithAis(ships, vesselCache, io);
        
        console.log(`[SAR Scheduler] Correlation complete. Generated ${newAlerts.length} new dark vessel alerts.`);
      }
    } catch (error) {
      console.error("[SAR Scheduler] Error during automated scan:", error);
    }
  }, intervalMs);
}

module.exports = { startSarScheduler };
