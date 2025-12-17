import os

class Config:
    DATA_PATH = "dataset/cv_job_dataset.csv"
    MODEL_SAVE_PATH = "CV Models/cv_job_fit_model.pkl"
    VECTORIZER_SAVE_PATH = "CV Models/cv_job_fit_vectorizer.pkl"
    MAX_FEATURES = 300
    TEST_SIZE = 0.2
    RANDOM_STATE = 42
