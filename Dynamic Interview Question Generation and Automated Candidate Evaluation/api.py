from flask import Flask, request, jsonify
from PredictModel import predict_similarity
from QuestionGenerator import QuestionGenerator

app = Flask(__name__)

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Dynamic LLM Interview AI Running"})

@app.route("/generate_questions", methods=["POST"])
def generate_questions():
    data = request.json
    role = data.get("role")
    n = data.get("n_questions", 5)
    if not role:
        return jsonify({"error":"Missing role"}), 400
    questions = QuestionGenerator.generate_questions(role, n)
    return jsonify({"role": role, "questions": questions})

@app.route("/evaluate_answer", methods=["POST"])
def evaluate_answer():
    data = request.json
    candidate = data.get("candidate_answer")
    ideal = data.get("ideal_answer")
    if not candidate or not ideal:
        return jsonify({"error":"Missing text fields"}), 400
    score = predict_similarity(candidate, ideal)
    return jsonify({"similarity_score": score,
                    "result": "Strong Match" if score>70 else "Weak Match"})

if __name__ == "__main__":
    app.run(debug=True)
