import pandas as pd
import numpy as np
from model_utils import load_feedback_model, load_preprocessor


# Load Model & Preprocessor
model = load_feedback_model()
preprocessor = load_preprocessor()


# Load New Data for Prediction
DATA_PATH = "PredictionData/Newupload_employee.csv"
try:
    new_df = pd.read_csv(DATA_PATH)
    print(f"New data loaded successfully from {DATA_PATH}")
except Exception as e:
    raise FileNotFoundError(f"Failed to load new data. Error: {e}")


# Preprocess New Data
try:
    X_new = preprocessor.transform(new_df)
except Exception as e:
    raise RuntimeError(f"Error during preprocessing. Check your feature columns. {e}")


# Make Predictions
pred_probs = model.predict(X_new)
pred_classes = np.argmax(pred_probs, axis=1) + 1  # +1 to match original labels


# Display Results
results = new_df.copy()
results["Predicted_Class"] = [f"'{int(v)}/5" for v in pred_classes]


print("\nPrediction Results:")
print(results.head(10))


# Optionally Save Predictions
OUTPUT_PATH = "Result/prediction_results.csv"
results.to_csv(OUTPUT_PATH, index=False)
print(f"\nPredictions saved to {OUTPUT_PATH}")
