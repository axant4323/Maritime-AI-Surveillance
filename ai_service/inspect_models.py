import traceback
import joblib
import xgboost as xgb
import shap
import pandas as pd
import numpy as np

try:
    xgb_model = joblib.load('xgb_threat_model.pkl')
    explainer = shap.TreeExplainer(xgb_model)
    X = pd.DataFrame(np.zeros((1, 12)), columns=['SOG_kmh', 'COG', 'Heading', 'Length', 'Width', 'Draft', 'dist_km', 'ETA_hours', 'Night_Movement', 'Speed_Anomaly', 'Heading_Anomaly', 'Distance_Anomaly'])
    shap_vals = explainer.shap_values(X)
    print("SHAP successful.")
    print("SHAP type:", type(shap_vals))
    print("SHAP shape:", np.array(shap_vals).shape)
except Exception as e:
    print("Error:", e)
    traceback.print_exc()



