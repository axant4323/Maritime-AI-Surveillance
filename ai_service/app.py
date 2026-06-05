import os
import math
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import xgboost as xgb
import shap

app = Flask(__name__)
CORS(app)

# Ports coordinates and radius (in km)
PORTS = {
    "Houston Port": {"lat": 29.76, "lon": -95.36, "radius": 15},
    "Galveston Port": {"lat": 29.30, "lon": -94.79, "radius": 15},
    "Miami Port": {"lat": 25.77, "lon": -80.19, "radius": 15},
    "Seattle Port": {"lat": 47.60, "lon": -122.33, "radius": 20}
}

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

# Load Pre-trained Models
try:
    iso_model = joblib.load('isolation_forest.pkl')
    xgb_model = joblib.load('xgb_threat_model.pkl')
    # Initialize SHAP explainer
    explainer = shap.TreeExplainer(xgb_model)
    print("Models and SHAP explainer loaded successfully.")
except Exception as e:
    print(f"Error loading models: {e}")
    iso_model, xgb_model, explainer = None, None, None

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json or {}
        
        speed = float(data.get("speed") or 0.0)
        heading = float(data.get("heading") or 0.0)
        lat = float(data.get("latitude") or 0.0)
        lon = float(data.get("longitude") or 0.0)
        vessel_type = data.get("vessel_type") or "Other"
        
        sog_kmh = speed * 1.852
        cog = heading
        
        min_port_dist = float('inf')
        nearest_port = None
        for port, info in PORTS.items():
            dist = haversine_distance(lat, lon, info["lat"], info["lon"])
            if dist < min_port_dist:
                min_port_dist = dist
                nearest_port = port
                
        dist_km = min_port_dist
        
        length = float(data.get("length") or 150.0)
        width = float(data.get("width") or 25.0)
        draft = float(data.get("draft") or 10.0)
        eta_hours = float(data.get("eta_hours") or 12.0)
        night_movement = int(data.get("night_movement") or 0)
        
        speed_anomaly = 1 if speed > 25 else 0
        heading_anomaly = 0
        distance_anomaly = 1 if dist_km < 15 else 0

        X_iso = pd.DataFrame([[sog_kmh, cog, heading, dist_km, eta_hours]], 
                             columns=['SOG_kmh', 'COG', 'Heading', 'dist_km', 'ETA_hours'])
        
        if iso_model:
            anomaly_score = float(iso_model.decision_function(X_iso)[0])
            anomaly_score = max(0.0, min(100.0, (0.5 - anomaly_score) * 100))
        else:
            anomaly_score = 0.0

        X_xgb = pd.DataFrame([[sog_kmh, cog, heading, length, width, draft, dist_km, eta_hours, night_movement, speed_anomaly, heading_anomaly, distance_anomaly]],
                             columns=['SOG_kmh', 'COG', 'Heading', 'Length', 'Width', 'Draft', 'dist_km', 'ETA_hours', 'Night_Movement', 'Speed_Anomaly', 'Heading_Anomaly', 'Distance_Anomaly'])
        
        threat_score = 0.0
        top_reasons = []
        
        if xgb_model and explainer:
            threat_prob = xgb_model.predict_proba(X_xgb)[0][1]
            threat_score = min(100.0, max(0.0, threat_prob * 100))
            
            shap_vals = explainer.shap_values(X_xgb)
            if isinstance(shap_vals, list):
                shap_vals_target = shap_vals[1][0]
            else:
                shap_vals_target = shap_vals[0]
                
            feature_names = X_xgb.columns.tolist()
            shap_dict = {feature_names[i]: float(shap_vals_target[i]) for i in range(len(feature_names))}
            
            sorted_shap = sorted(shap_dict.items(), key=lambda x: x[1], reverse=True)
            for k, v in sorted_shap:
                if v > 0:
                    top_reasons.append({"feature": k, "impact": round(v, 3)})
            
            top_reasons = top_reasons[:3]
            
        if threat_score < 20:
            voi_level = "Normal"
        elif threat_score < 40:
            voi_level = "Monitor"
        elif threat_score < 60:
            voi_level = "Vessel of Interest"
        elif threat_score < 80:
            voi_level = "High Risk"
        else:
            voi_level = "Critical"
            
        return jsonify({
            "threat_score": float(round(threat_score, 1)),
            "voi_level": voi_level,
            "anomaly_score": float(round(anomaly_score, 1)),
            "nearest_port": nearest_port,
            "distance_to_port_km": float(round(min_port_dist, 2)),
            "top_reasons": top_reasons
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
