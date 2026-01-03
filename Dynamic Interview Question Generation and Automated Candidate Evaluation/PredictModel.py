import joblib
from sentence_transformers import util
import Config as CF

def load_model():
    model = joblib.load(CF.Config.TRAINED_MODEL_PATH)
    df = joblib.load(CF.Config.PROCESSED_DATA_PATH)
    return model, df

def predict_similarity(candidate_answer: str, ideal_answer: str):
    model, _ = load_model()
    emb1 = model.encode(candidate_answer, convert_to_tensor=True)
    emb2 = model.encode(ideal_answer, convert_to_tensor=True)
    score = util.cos_sim(emb1, emb2).item()
    return round(score*100, 2)
