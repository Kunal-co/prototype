# 21) ml/predict.py

import json
import sys
import joblib
import numpy as np
from flask import Flask, request, jsonify

app = Flask(__name__)

# Load models (will fail gracefully in testing)
try:
    xgb_model = joblib.load('xgboost_model.pkl')
    iso_model = joblib.load('isolation_forest.pkl')
    MODELS_LOADED = True
except:
    print("Warning: Could not load model files. Using mock mode.")
    MODELS_LOADED = False

# Feature order must match exactly with what backend sends
FEATURE_NAMES = [
    'Destination Port', 'Flow Duration', 'Total Fwd Packets',
    'Total Backward Packets', 'Total Length of Fwd Packets',
    'Total Length of Bwd Packets', 'Fwd Packet Length Max',
    'Fwd Packet Length Min', 'Fwd Packet Length Mean',
    'Fwd Packet Length Std', 'Bwd Packet Length Max',
    'Bwd Packet Length Min', 'Bwd Packet Length Mean',
    'Bwd Packet Length Std', 'Flow Bytes/s', 'Flow Packets/s',
    'Flow IAT Mean', 'Flow IAT Std', 'Flow IAT Max', 'Flow IAT Min',
    'Fwd IAT Total', 'Fwd IAT Mean', 'Fwd IAT Std', 'Fwd IAT Max',
    'Fwd IAT Min', 'Bwd IAT Total', 'Bwd IAT Mean', 'Bwd IAT Std',
    'Bwd IAT Max', 'Bwd IAT Min', 'Fwd PSH Flags', 'Bwd PSH Flags',
    'Fwd URG Flags', 'Bwd URG Flags', 'Fwd Header Length',
    'Bwd Header Length', 'Fwd Packets/s', 'Bwd Packets/s',
    'Min Packet Length', 'Max Packet Length', 'Packet Length Mean',
    'Packet Length Std', 'Packet Length Variance', 'FIN Flag Count',
    'SYN Flag Count', 'RST Flag Count', 'PSH Flag Count',
    'ACK Flag Count', 'URG Flag Count', 'CWE Flag Count',
    'ECE Flag Count', 'Down/Up Ratio', 'Average Packet Size',
    'Avg Fwd Segment Size', 'Avg Bwd Segment Size', 'Fwd Header Length.1',
    'Fwd Avg Bytes/Bulk', 'Fwd Avg Packets/Bulk', 'Fwd Avg Bulk Rate',
    'Bwd Avg Bytes/Bulk', 'Bwd Avg Packets/Bulk', 'Bwd Avg Bulk Rate',
    'Subflow Fwd Packets', 'Subflow Fwd Bytes', 'Subflow Bwd Packets',
    'Subflow Bwd Bytes', 'Init_Win_bytes_forward',
    'Init_Win_bytes_backward', 'act_data_pkt_fwd',
    'min_seg_size_forward', 'Active Mean', 'Active Std',
    'Active Max', 'Active Min', 'Idle Mean', 'Idle Std',
    'Idle Max', 'Idle Min'
]

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()

        if not data or 'features' not in data:
            return jsonify({'success': False, 'error': 'Missing features'}), 400

        features_dict = data['features']

        # Build feature vector in correct order
        feature_vector = []
        for feature_name in FEATURE_NAMES:
            value = features_dict.get(feature_name, 0)
            feature_vector.append(float(value))

        X = np.array([feature_vector])

        if not MODELS_LOADED:
            # Return mock response if models not loaded
            return jsonify({
                'success': True,
                'xgboost': {
                    'prediction': 0,
                    'label': 'normal',
                    'attackType': None,
                    'probability': 0.95
                },
                'isolationForest': {
                    'prediction': 1,
                    'label': 'normal',
                    'anomalyScore': 0.15
                }
            })

        # Get predictions
        xgb_pred = xgb_model.predict(X)[0]
        xgb_proba = xgb_model.predict_proba(X)[0]
        iso_pred = iso_model.predict(X)[0]
        iso_score = iso_model.score_samples(X)[0]

        # Map XGBoost prediction to label
        xgb_label = 'attack' if xgb_pred == 1 else 'normal'
        xgb_prob = float(max(xgb_proba))

        # Map Isolation Forest prediction
        iso_label = 'anomaly' if iso_pred == -1 else 'normal'
        iso_score = float(iso_score)

        response = {
            'success': True,
            'xgboost': {
                'prediction': int(xgb_pred),
                'label': xgb_label,
                'attackType': None,  # Add specific attack type if available
                'probability': xgb_prob
            },
            'isolationForest': {
                'prediction': int(iso_pred),
                'label': iso_label,
                'anomalyScore': iso_score
            }
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'models_loaded': MODELS_LOADED
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)