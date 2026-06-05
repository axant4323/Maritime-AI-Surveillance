const { haversineDistance, PORTS } = require("../threatEngine");

/**
 * Mocks SAR detection by generating some random ship detections
 * near the uploaded image area. In a real system, this would
 * call a Python AI microservice with the SAR image.
 */
async function detectShipsInSarImage(filePath) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Generate 1 to 3 random detections near Houston/Galveston area
  // Lat: 29.0 to 29.8, Lon: -94.0 to -95.5
  const numDetections = Math.floor(Math.random() * 3) + 1;
  const ships = [];

  for (let i = 0; i < numDetections; i++) {
    ships.push({
      id: i + 1,
      lat: 29.0 + Math.random() * 0.8,
      lon: -95.5 + Math.random() * 1.5,
      confidence: 0.8 + (Math.random() * 0.19)
    });
  }

  return { ships };
}

module.exports = { detectShipsInSarImage };
