from flask import Flask, request, jsonify
import joblib
import tempfile
from scipy.sparse import hstack
import pdfplumber
from Setup_File import logger
from config import Config

app = Flask(__name__)


# Load Model & Vectorizer

def load_model():
    logger.info("Loading trained model and vectorizer...")
    model = joblib.load(Config.MODEL_SAVE_PATH)
    vectorizer = joblib.load(Config.VECTORIZER_SAVE_PATH)
    logger.info("Model loaded successfully.")
    return model, vectorizer

model, vectorizer = load_model()



# Utility Functions
def extract_job_text(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + " "
    return text.strip()


def candidate_to_text(candidate):
    return f"{candidate.get('Education','')} {candidate.get('Skills','')} " \
           f"{candidate.get('Previous_Companies','')} {candidate.get('Certifications','')} " \
           f"{candidate.get('Job_Role_Applied','')}"


def predict_fit(candidate, job_pdf_path):
    job_text = extract_job_text(job_pdf_path)
    candidate_text = candidate_to_text(candidate)

    combined_text = candidate_text + " " + job_text

    X_text = vectorizer.transform([combined_text])
    X_numeric = [[candidate["Age"], candidate["Experience_Years"]]]

    X = hstack([X_text, X_numeric])

    fit_score = model.predict(X)[0]
    return round(fit_score * 100, 2)



#  API Route
@app.route('/predict_fit', methods=['POST'])
def api_predict_fit():
    try:
        # 1. Candidate JSON
        candidate = request.form.get("candidate")

        if candidate is None:
            return jsonify({"error": "Missing candidate JSON"}), 400

        candidate = eval(candidate)  # convert string JSON to dict

        # 2. Job PDF
        if "job_pdf" not in request.files:
            return jsonify({"error": "Missing job_pdf file"}), 400

        pdf_file = request.files["job_pdf"]

        # Save PDF temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            pdf_file.save(temp_pdf.name)
            pdf_path = temp_pdf.name

        score = predict_fit(candidate, pdf_path)

        return jsonify({
            "status": "success",
            "fit_score_percent": score
        })

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({"error": str(e)}), 500



if __name__ == "__main__":
    app.run(debug=True)
