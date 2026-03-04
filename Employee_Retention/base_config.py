from datetime import datetime
import os
import logging

class AppConfig:
    MODEL_PATH = os.getenv("MODEL_PATH", "Employee_Retention/employee_attrition_model.pkl")
    APP_NAME = "Employee Attrition Risk Engine"
    VERSION = ""

    @classmethod
    def display_config(cls):
        print(f"Model Path   : {cls.MODEL_PATH}")
        print(f"Started At   : {datetime.now()}")



# LOGGER SETUP

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler("attrition_prediction.log"),
        logging.StreamHandler()
    ]
)
