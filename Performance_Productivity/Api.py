from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import os
from werkzeug.utils import secure_filename
import logging
from datetime import datetime
import traceback
import sys

from model_utils import load_feedback_model, load_preprocessor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('api.log')
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configuration
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['RESULT_FOLDER'] = 'results'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max
app.config['ALLOWED_EXTENSIONS'] = {'csv'}

# Create necessary directories
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['RESULT_FOLDER'], exist_ok=True)

# Global variables
model = None
preprocessor = None


def load_model_and_preprocessor():
    global model, preprocessor
    try:
        logger.info("Loading model and preprocessor using model_utils...")

        model = load_feedback_model()
        preprocessor = load_preprocessor()

        logger.info(" Model and preprocessor loaded successfully.")
        return True
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        logger.error(traceback.format_exc())
        return False


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


def calculate_productivity_metrics(df, predictions):
    results = df.copy()
    results["Predicted_Class"] = predictions.astype(int)

    results["Productivity_Score"] = (
            results["avg_task_completion"] * 0.4 +
            results["attendance_rate"] * 0.3 +
            results["projects_handled"] * 0.2 +
            results["training_hours"] * 0.1
    )

    if results["Productivity_Score"].max() > 0:
        results["Productivity_Score"] = (
                                                results["Productivity_Score"] / results["Productivity_Score"].max()
                                        ) * 100
    results["Productivity_Score"] = results["Productivity_Score"].round(2)

    results["Adjusted_Productivity"] = results["Productivity_Score"] * (1 + results["experience_years"] / 100)

    if results["Adjusted_Productivity"].max() > 0:
        results["Adjusted_Productivity"] = (
                (results["Adjusted_Productivity"] / results["Adjusted_Productivity"].max()) * 100
        ).round(2)

    def risk_flag(row):
        if row["Predicted_Class"] <= 2 or row["Adjusted_Productivity"] < 50:
            return "High Risk"
        elif row["Predicted_Class"] == 3 or (50 <= row["Adjusted_Productivity"] <= 70):
            return "Moderate Risk"
        else:
            return "Low Risk"

    results["Risk_Level"] = results.apply(risk_flag, axis=1)

    return results


@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({
        'status': 'success',
        'message': 'Employee Productivity API is running',
        'model_loaded': model is not None and preprocessor is not None,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None and preprocessor is not None,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/predict/single', methods=['POST', 'OPTIONS'])
def predict_single():
    if request.method == 'OPTIONS':
        return '', 200

    global model, preprocessor

    if model is None or preprocessor is None:
        if not load_model_and_preprocessor():
            return jsonify({
                'success': False,
                'error': 'Model not loaded. Please check server logs.'
            }), 500

    try:
        data = request.get_json()

        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        # Create DataFrame from single employee data
        employee_df = pd.DataFrame([{
            'employee_id': data.get('employee_id', ''),
            'name': data.get('name', ''),
            'age': float(data.get('age', 0)),
            'experience_years': float(data.get('experience_years', 0)),
            'avg_task_completion': float(data.get('avg_task_completion', 0)),
            'attendance_rate': float(data.get('attendance_rate', 0)),
            'projects_handled': float(data.get('projects_handled', 0)),
            'training_hours': float(data.get('training_hours', 0)),
            'department': data.get('department', ''),
            'job_role': data.get('job_role', '')
        }])

        X_new = preprocessor.transform(employee_df)
        pred_probs = model.predict(X_new)
        pred_classes = np.argmax(pred_probs, axis=1) + 1  # 1–5 scale

        results = calculate_productivity_metrics(employee_df, pred_classes)

        result = results.iloc[0].to_dict()

        for key, value in result.items():
            if isinstance(value, (np.integer, np.floating)):
                result[key] = float(value) if isinstance(value, np.floating) else int(value)

        return jsonify({
            'success': True,
            'result': result,
            'prediction_class': int(pred_classes[0]),
            'productivity_score': float(result['Productivity_Score']),
            'adjusted_productivity': float(result['Adjusted_Productivity']),
            'risk_level': result['Risk_Level']
        })

    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/predict/batch', methods=['POST', 'OPTIONS'])
def predict_batch():
    if request.method == 'OPTIONS':
        return '', 200

    global model, preprocessor

    if model is None or preprocessor is None:
        if not load_model_and_preprocessor():
            return jsonify({
                'success': False,
                'error': 'Model not loaded. Please check server logs.'
            }), 500

    temp_files = []
    output_path = None

    try:
        # Check if file is uploaded
        if 'csv_file' not in request.files:
            return jsonify({'success': False, 'error': 'No CSV file uploaded'}), 400

        file = request.files['csv_file']

        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Please upload a CSV file'}), 400

        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"input_{datetime.now().timestamp()}_{filename}")
        file.save(filepath)
        temp_files.append(filepath)

        try:
            df = pd.read_csv(filepath)
            logger.info(f"CSV loaded with {len(df)} rows and columns: {list(df.columns)}")
        except Exception as e:
            return jsonify({'success': False, 'error': f'Error reading CSV: {str(e)}'}), 400

        required_columns = ['avg_task_completion', 'attendance_rate', 'projects_handled',
                            'training_hours', 'experience_years']
        missing_columns = [col for col in required_columns if col not in df.columns]

        if missing_columns:
            return jsonify({
                'success': False,
                'error': f'CSV missing required columns: {", ".join(missing_columns)}'
            }), 400

        logger.info(f"Processing {len(df)} employees...")
        X_new = preprocessor.transform(df)
        pred_probs = model.predict(X_new)
        pred_classes = np.argmax(pred_probs, axis=1) + 1  # 1–5 scale

        results = calculate_productivity_metrics(df, pred_classes)

        output_filename = f"productivity_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        output_path = os.path.join(app.config['RESULT_FOLDER'], output_filename)
        results.to_csv(output_path, index=False)

        risk_counts = results['Risk_Level'].value_counts().to_dict()
        class_distribution = results['Predicted_Class'].value_counts().sort_index().to_dict()

        top_performers = []
        if 'name' in results.columns:
            top_performers = results.nlargest(5, 'Adjusted_Productivity')[
                ['name', 'Adjusted_Productivity', 'Risk_Level']
            ].to_dict('records')

        for performer in top_performers:
            for key, value in performer.items():
                if isinstance(value, (np.integer, np.floating)):
                    performer[key] = float(value) if isinstance(value, np.floating) else int(value)

        return jsonify({
            'success': True,
            'message': f'Successfully processed {len(df)} employees',
            'total_employees': len(df),
            'summary': {
                'average_productivity': float(results['Productivity_Score'].mean()),
                'average_adjusted': float(results['Adjusted_Productivity'].mean()),
                'max_productivity': float(results['Productivity_Score'].max()),
                'min_productivity': float(results['Productivity_Score'].min()),
                'risk_distribution': {str(k): int(v) for k, v in risk_counts.items()},
                'class_distribution': {str(k): int(v) for k, v in class_distribution.items()}
            },
            'top_performers': top_performers,
            'result_file': output_filename,
            'download_url': f'/api/download/{output_filename}'
        })



    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

    finally:

        for file_path in temp_files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except:
                pass


@app.route('/api/predict/preview', methods=['POST', 'OPTIONS'])
def predict_preview():
    if request.method == 'OPTIONS':
        return '', 200

    global model, preprocessor

    if model is None or preprocessor is None:
        if not load_model_and_preprocessor():
            return jsonify({'success': False, 'error': 'Model not loaded'}), 500

    try:
        if 'csv_file' not in request.files:
            return jsonify({'success': False, 'error': 'No CSV file uploaded'}), 400

        file = request.files['csv_file']

        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"preview_{datetime.now().timestamp()}_{filename}")
        file.save(filepath)

        try:

            df = pd.read_csv(filepath)

            preview_df = df.head(10).copy()
            X_preview = preprocessor.transform(preview_df)
            pred_probs = model.predict(X_preview)
            pred_classes = np.argmax(pred_probs, axis=1) + 1

            preview_results = calculate_productivity_metrics(preview_df, pred_classes)

            preview_data = preview_results.to_dict('records')
            for record in preview_data:
                for key, value in record.items():
                    if isinstance(value, (np.integer, np.floating)):
                        record[key] = float(value) if isinstance(value, np.floating) else int(value)

            return jsonify({
                'success': True,
                'preview': preview_data,
                'columns': list(preview_results.columns),
                'total_rows': len(df),
                'preview_rows': len(preview_data)
            })

        finally:
            # Clean up
            if os.path.exists(filepath):
                os.remove(filepath)

    except Exception as e:
        logger.error(f"Preview error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/get-file/<filename>', methods=['GET'])
def get_result_file(filename):
    """Alternative download endpoint"""
    try:
        file_path = os.path.join(app.config['RESULT_FOLDER'], filename)

        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'File not found'}), 404

        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='text/csv'
        )
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    """Download a result file"""
    try:
        # Security check - only allow alphanumeric, dots, underscores and hyphens
        import re
        if not re.match(r'^[a-zA-Z0-9_.-]+\.csv$', filename):
            return jsonify({'success': False, 'error': 'Invalid filename format'}), 400

        # Get absolute path to results folder
        results_folder = os.path.abspath(app.config['RESULT_FOLDER'])

        # Construct file path using os.path.join
        file_path = os.path.join(results_folder, filename)

        # Convert to absolute path and normalize
        file_path = os.path.abspath(os.path.normpath(file_path))

        logger.info(f"Results folder absolute path: {results_folder}")
        logger.info(f"Download requested - filename: {filename}")
        logger.info(f"Full file path: {file_path}")

        # Verify the file is within results folder (security)
        if not file_path.startswith(results_folder):
            logger.error(f"Security violation: {file_path} not in {results_folder}")
            return jsonify({'success': False, 'error': 'Invalid file path'}), 400

        # Check if file exists
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")

            # List available files
            available = []
            if os.path.exists(results_folder):
                available = os.listdir(results_folder)
                logger.info(f"Available files: {available}")

            return jsonify({
                'success': False,
                'error': 'File not found',
                'requested': filename,
                'available_files': available,
                'results_folder': results_folder
            }), 404

        # Check if it's a file (not a directory)
        if not os.path.isfile(file_path):
            return jsonify({'success': False, 'error': 'Path is not a file'}), 400

        # Check file size
        file_size = os.path.getsize(file_path)
        logger.info(f"File found, size: {file_size} bytes")

        if file_size == 0:
            return jsonify({'success': False, 'error': 'File is empty'}), 404

        # Send file with proper headers
        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='text/csv'
        )

    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/debug/paths', methods=['GET'])
def debug_paths():
    """Debug endpoint to check paths"""
    try:
        results_folder = os.path.abspath(app.config['RESULT_FOLDER'])
        files = []

        if os.path.exists(results_folder):
            for f in os.listdir(results_folder):
                if f.endswith('.csv'):
                    file_path = os.path.join(results_folder, f)
                    files.append({
                        'filename': f,
                        'exists': os.path.exists(file_path),
                        'isfile': os.path.isfile(file_path),
                        'size': os.path.getsize(file_path) if os.path.exists(file_path) else 0,
                        'path': file_path
                    })

        return jsonify({
            'success': True,
            'results_folder': results_folder,
            'folder_exists': os.path.exists(results_folder),
            'files': files,
            'current_working_dir': os.getcwd()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/model/status', methods=['GET'])
def model_status():
    global model, preprocessor

    status = {
        'model_loaded': model is not None and preprocessor is not None,
        'model_type': str(type(model)) if model else None,
        'preprocessor_type': str(type(preprocessor)) if preprocessor else None
    }

    if model is not None and hasattr(model, 'classes_'):
        status['num_classes'] = len(model.classes_)

    return jsonify(status)


@app.route('/api/files', methods=['GET'])
def list_files():
    """List all result files"""
    try:
        files = []
        if os.path.exists(app.config['RESULT_FOLDER']):
            for f in os.listdir(app.config['RESULT_FOLDER']):
                if f.endswith('.csv'):
                    file_path = os.path.join(app.config['RESULT_FOLDER'], f)
                    files.append({
                        'filename': f,
                        'size': os.path.getsize(file_path),
                        'created': datetime.fromtimestamp(os.path.getctime(file_path)).isoformat(),
                        'download_url': f'/api/download/{f}',
                        'alt_url': f'/api/get-file/{f}'
                    })

        return jsonify({
            'success': True,
            'files': files,
            'count': len(files)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'error': 'Internal server error'}), 500


if __name__ == '__main__':
    logger.info("Starting Employee Productivity API...")

    try:
        from model_utils import load_feedback_model, load_preprocessor

        logger.info("✓ model_utils imported successfully")
    except ImportError as e:
        logger.error(f"✗ Failed to import model_utils: {e}")
        logger.error("Make sure model_utils.py is in the same directory")
        sys.exit(1)

    # Load the model
    if load_model_and_preprocessor():
        logger.info("✓ API ready to accept requests")
    else:
        logger.warning("⚠ API starting without model - predictions will fail until model is loaded")

    app.run(debug=True, host='0.0.0.0', port=5002)