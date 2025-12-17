from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from model_utils import load_feedback_model, load_preprocessor
import os

app = Flask(__name__)

# Load model & preprocessor once at startup
model = load_feedback_model()
preprocessor = load_preprocessor()

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        # Read CSV
        new_df = pd.read_csv(file)
    except Exception as e:
        return jsonify({"error": f"Failed to read CSV. {e}"}), 400

    try:
        # Preprocess
        X_new = preprocessor.transform(new_df)
    except Exception as e:
        return jsonify({"error": f"Error during preprocessing. Check your feature columns. {e}"}), 400

    try:
        # Predict
        pred_probs = model.predict(X_new)
        pred_classes = np.argmax(pred_probs, axis=1) + 1
        new_df["Predicted_Class"] = [f"'{int(v)}/5" for v in pred_classes]
    except Exception as e:
        return jsonify({"error": f"Prediction failed. {e}"}), 500

    #  save predictions
    OUTPUT_PATH = "prediction_results.csv"
    try:
        new_df.to_csv(OUTPUT_PATH, index=False)
    except Exception as e:
        return jsonify({"warning": f"Prediction succeeded but failed to save CSV. {e}"}), 200

    return jsonify(new_df.to_dict(orient='records'))


if __name__ == "__main__":
    # Set debug=False in production
    app.run(debug=True)
