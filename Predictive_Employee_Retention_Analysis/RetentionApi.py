import os
import logging
from datetime import datetime
from flask import Flask, request, jsonify, make_response
from predictor_utils import predict_single_employee

# CONFIGURATION & CONSTANTS
class Config:
    MODEL_PATH = os.getenv("ATTRITION_MODEL_PATH", "employee_attrition_model.pkl")
    API_VERSION = "v1.0.0"
    DEBUG_MODE = True



# LOGGER SETUP
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler("api_logs.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)



# FLASK APP INITIALIZATION
app = Flask(__name__)
app.config.from_object(Config)



# CUSTOM RESPONSE WRAPPER

def build_response(status, message, data=None):
    return make_response(jsonify({
        "status": status,
        "message": message,
        "version": app.config["API_VERSION"],
        "timestamp": str(datetime.utcnow()),
        "data": data
    }), status)



# ERROR HANDLERS
@app.errorhandler(404)
def not_found(e):
    return build_response(404, "Endpoint Not Found")

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal Server Error: {e}")
    return build_response(500, "Internal Server Error")



# ROOT ENDPOINT

@app.route("/", methods=["GET"])
def root():
    logger.info("Root endpoint accessed")
    return build_response(200, "Employee Attrition Prediction API is Live")



# PREDICTION ENDPOINT
@app.route("/api/predict-attrition", methods=["POST"])
def predict_attrition():
    logger.info("Prediction request received")

    try:
        payload = request.get_json()

        if not payload:
            logger.warning("No JSON payload received")
            return build_response(400, "Invalid JSON payload")

        logger.debug(f"Received Payload: {payload}")

        # Perform prediction
        result = predict_single_employee(app.config["MODEL_PATH"], payload)

        logger.info("Prediction successfully completed")
        logger.debug(f"Prediction Result: {result}")

        return build_response(200, "Prediction Successful", result)

    except Exception as e:
        logger.error(f"Prediction Error: {e}", exc_info=True)
        return build_response(500, f"Prediction Failed: {str(e)}")



if __name__ == "__main__":
    logger.info("Starting Employee Attrition Prediction API Server...")
    app.run(debug=Config.DEBUG_MODE)
