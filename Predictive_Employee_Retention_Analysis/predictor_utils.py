import pandas as pd
import joblib


def preprocess_for_prediction(input_dict, model):

    df = pd.DataFrame([input_dict])

    # Extract preprocessor
    try:
        preprocessor = model.named_steps['preprocessor']
        numeric_features = preprocessor.transformers_[0][2]
        categorical_features = preprocessor.transformers_[1][2]
    except Exception:
        raise ValueError("Model pipeline does not contain expected 'preprocessor' step.")


    for col in numeric_features:
        if col not in df.columns:
            df[col] = 0

    for col in categorical_features:
        if col not in df.columns:
            df[col] = "missing"

    # Restrict to model-expected columns
    allowed_cols = list(numeric_features) + list(categorical_features)
    df = df[allowed_cols]

    return df


def predict_single_employee(model_path, employee_data):

    # Load trained pipeline model
    model = joblib.load(model_path)

    # Preprocess input
    processed_df = preprocess_for_prediction(employee_data, model)

    # Predict probability
    prob = model.predict_proba(processed_df)[0][1]

    return {
        "risk_score": round(prob, 4),
        "risk_label": "High Risk" if prob > 0.5 else "Low Risk"
    }
