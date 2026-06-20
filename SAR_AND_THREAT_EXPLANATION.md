# SAR Demo and Threat Calculation Explained

This document provides a detailed breakdown of two key mechanisms in the Maritime AI Surveillance Platform: the **SARship Demo (Dark Vessel Detection)** and the **Threat Calculation Engine**.

---

## 1. How the SARship Demo Works

The SARship demo simulates a real-world Search and Rescue (SAR) tracking workflow designed to detect "Dark Vessels"—ships that are physically present but not broadcasting their Automatic Identification System (AIS) location data. This is often an indicator of illegal activities such as smuggling, unauthorized fishing, or sanctions evasion.

### Step-by-Step Workflow

1. **SAR Image Simulation (`sarDetectionService.js`)**:
   - The user simulates uploading a Synthetic Aperture Radar (SAR) image.
   - A mock AI detection service processes this "image" and randomly generates 1 to 3 ship detections near the Houston/Galveston area (Lat: 29.0-29.8, Lon: -94.0 to -95.5).
   - Each detection is assigned a coordinate and a "confidence score" (e.g., 80% to 99% certainty it's a ship).

2. **AIS Correlation Engine (`aisCorrelationEngine.js`)**:
   - The system then takes these SAR detections and compares them against the active cache of live AIS vessels.
   - It uses the **Haversine formula** to calculate the distance between each SAR detection and every known AIS-transmitting ship to find the nearest match.

3. **Dark Vessel Identification**:
   - If the closest AIS signal to the SAR detection is greater than **3.0 kilometers** away (`DARK_VESSEL_THRESHOLD_KM`), the system concludes that the vessel in the image is not transmitting on AIS.
   - It flags this detection as a **"Dark Vessel"**.

4. **Alerting and Visualization**:
   - A specific dark vessel threat score is calculated based on its confidence and proximity to restricted ports (e.g., being extremely close to a port without AIS significantly increases the score).
   - A `dark-vessel-alert` is generated and emitted over WebSockets to the frontend.
   - The frontend immediately updates the SAR Dashboard, plotting the dark vessel on the map and logging the alert.

---

## 2. How the Threat Score is Calculated

The platform uses a hybrid approach to evaluate vessel threats, combining advanced Machine Learning (ML) models running in a Python microservice with rule-based heuristics running in the Node.js backend.

### Part A: The Machine Learning Engine (`ai_service/app.py`)

When the Node.js backend receives an AIS update, it forwards the vessel's telemetry (speed, heading, location, vessel type) to the Python AI service for analysis.

1. **XGBoost Classifier (Primary Threat Model)**:
   - A trained XGBoost model evaluates the vessel's features (Speed over Ground, Course over Ground, Heading, Dimensions, Distance to the nearest port, and local anomalies).
   - It calculates the probability of the vessel being a threat, which translates to a `threat_score` out of 100%.

2. **Explainable AI with SHAP**:
   - The system uses **SHAP (SHapley Additive exPlanations)** to peek inside the XGBoost model and understand *why* it assigned a specific score. 
   - SHAP breaks down the exact features contributing to the threat (e.g., "High Speed Anomaly", "Close proximity to port") and returns these as `top_reasons`. This provides human-readable context to the operators.

3. **Isolation Forest (Anomaly Detection)**:
   - Alongside XGBoost, an Isolation Forest model calculates an `anomaly_score`. This model detects deviance from typical behavior in the region, rather than classifying explicit threats.

### Part B: Rule-Based Heuristics (`backend/services/threatEngine.js`)

In addition to the AI scores, the backend runs real-time heuristic checks to catch immediate, explicit violations:

- **Restricted Zone Entry**: The system maintains a list of major ports with defined radii (e.g., 15km for Houston). If a vessel crosses into this radius, it triggers a restricted zone alert.
- **Speed Anomalies**: 
  - *High Risk*: Any vessel exceeding 25 knots.
  - *Monitor*: Cargo or Tanker vessels exceeding 18 knots (as large commercial vessels rarely move this fast).
- **Heading Anomalies**: Flags vessels making abrupt heading changes of greater than 55 degrees while moving at over 5 knots, which indicates suspicious maneuvering.

#### Fallback Threat Calculation
If the AI microservice goes down, the backend seamlessly switches to a hardcoded heuristic fallback. The threat score starts at 10 and increases if:
- Speed > 25 knots (+35 points)
- Speed > 18 knots (+15 points)
- Vessel is loitering (Speed < 1.0 knots) (+5 points)
- Very close to a port (< 5.0 km) (+25 points)
- Vessel type is "High Speed" (+10 points)

### Vessel of Interest (VOI) Levels

Whether the `threat_score` (0-100) comes from the ML model or the fallback heuristic, it is finally mapped to a human-readable **Vessel of Interest (VOI) Level**:

| Threat Score | VOI Level |
| :--- | :--- |
| **0 - 19** | Normal |
| **20 - 39** | Monitor |
| **40 - 59** | Vessel of Interest |
| **60 - 79** | High Risk |
| **80 - 100** | Critical |
