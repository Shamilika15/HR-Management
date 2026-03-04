import joblib
from tensorflow.keras.models import load_model

def load_feedback_model(model_path="Performance_Productivity/Performance Productivity Model/advanced_feedback_model.h5"):

    try:
        model = load_model(model_path)
        print(f"Model loaded successfully from {model_path}.")
        return model
    except Exception as e:
        raise FileNotFoundError(f"Failed to load model. Error: {e}")

def load_preprocessor(preprocessor_path="Performance_Productivity/preprocessor.pkl"):

    try:
        preprocessor = joblib.load(preprocessor_path)
        print(f"Preprocessor loaded successfully from {preprocessor_path}.")
        return preprocessor
    except Exception as e:
        raise FileNotFoundError(f"Failed to load preprocessor. Error: {e}")
