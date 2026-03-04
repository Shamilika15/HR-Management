import pandas as pd
import numpy as np
from model_utils import load_feedback_model, load_preprocessor
import os


print("Loading model and preprocessor...")
model = load_feedback_model()
preprocessor = load_preprocessor()

# Load New Employee Data
DATA_PATH = "PredictionData/Newupload_employee.csv"
try:
    new_df = pd.read_csv(DATA_PATH)
    print(f"New data loaded successfully from {DATA_PATH}")
except Exception as e:
    raise FileNotFoundError(f"Failed to load new data. Error: {e}")

# Preprocess Data
try:
    X_new = preprocessor.transform(new_df)
except Exception as e:
    raise RuntimeError(f"Error during preprocessing. Check your feature columns. {e}")

# Make Predictions
print("Generating predictions...")
pred_probs = model.predict(X_new)
pred_classes = np.argmax(pred_probs, axis=1) + 1  # 1–5 scale

results = new_df.copy()
results["Predicted_Class"] = pred_classes.astype(int)

# Productivity Score Calculation
results["Productivity_Score"] = (
    results["avg_task_completion"] * 0.4 +
    results["attendance_rate"] * 0.3 +
    results["projects_handled"] * 0.2 +
    results["training_hours"] * 0.1
)

# Scale Productivity Score to 0–100
results["Productivity_Score"] = (
    results["Productivity_Score"] / results["Productivity_Score"].max()
) * 100
results["Productivity_Score"] = results["Productivity_Score"].round(2)

# Adjusted Productivity (Experience-based)
# Apply experience adjustment first
results["Adjusted_Productivity"] = results["Productivity_Score"] * (1 + results["experience_years"] / 100)

# Scale Adjusted Productivity to 0–100
results["Adjusted_Productivity"] = (
    (results["Adjusted_Productivity"] / results["Adjusted_Productivity"].max()) * 100
).round(2)

# Risk / Alert Flag
def risk_flag(row):
    if row["Predicted_Class"] <= 2 or row["Adjusted_Productivity"] < 50:
        return "High Risk"
    elif row["Predicted_Class"] == 3 or 50 <= row["Adjusted_Productivity"] <= 70:
        return "Moderate Risk"
    else:
        return "Low Risk"

results["Risk_Level"] = results.apply(risk_flag, axis=1)

# Save Results
OUTPUT_PATH = "Result/prediction_results.csv"
os.makedirs("Result", exist_ok=True)
results.to_csv(OUTPUT_PATH, index=False)
print(f"\nPredictions saved to {OUTPUT_PATH}")

# Display Sample Results
print("\n========== Sample Prediction Results ==========\n")
print(results.head(10).to_string(index=False))