from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import joblib
import pandas as pd
from scipy.sparse import hstack
import pdfplumber
import os
from werkzeug.utils import secure_filename
import logging
from datetime import datetime
import json
import traceback
import tempfile
import time

# Import your existing working modules
from Setup_File import logger
from config import Config

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Get the absolute path of the current directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Configuration with absolute paths
app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'uploads')
app.config['RESULTS_FOLDER'] = os.path.join(BASE_DIR, 'results')
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'csv'}
app.config['RESULT_FILE_RETENTION_HOURS'] = 24  # Keep result files for 24 hours

# Create necessary folders
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['RESULTS_FOLDER'], exist_ok=True)

# Log the paths for debugging
logger.info(f"BASE_DIR: {BASE_DIR}")
logger.info(f"UPLOAD_FOLDER: {app.config['UPLOAD_FOLDER']}")
logger.info(f"RESULTS_FOLDER: {app.config['RESULTS_FOLDER']}")

model = None
vectorizer = None


def cleanup_old_files():
    """
    Clean up result files older than retention period
    """
    try:
        current_time = time.time()
        retention_seconds = app.config['RESULT_FILE_RETENTION_HOURS'] * 3600
        cleaned_count = 0

        for filename in os.listdir(app.config['RESULTS_FOLDER']):
            if filename.startswith('results_') and filename.endswith('.csv'):
                file_path = os.path.join(app.config['RESULTS_FOLDER'], filename)
                file_age = current_time - os.path.getctime(file_path)

                if file_age > retention_seconds:
                    os.remove(file_path)
                    cleaned_count += 1
                    logger.info(f"Cleaned up old result file: {filename}")

        if cleaned_count > 0:
            logger.info(f"Cleanup completed: removed {cleaned_count} old files")
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")


def load_model_global():
    global model, vectorizer
    try:
        logger.info("Loading trained model and vectorizer...")
        logger.info(f"Model path from Config: {Config.MODEL_SAVE_PATH}")
        logger.info(f"Vectorizer path from Config: {Config.VECTORIZER_SAVE_PATH}")

        if not os.path.exists(Config.MODEL_SAVE_PATH):
            logger.error(f"Model file not found at {Config.MODEL_SAVE_PATH}")
            return False

        if not os.path.exists(Config.VECTORIZER_SAVE_PATH):
            logger.error(f"Vectorizer file not found at {Config.VECTORIZER_SAVE_PATH}")
            return False

        model = joblib.load(Config.MODEL_SAVE_PATH)
        vectorizer = joblib.load(Config.VECTORIZER_SAVE_PATH)
        logger.info("Model and vectorizer loaded successfully.")
        return True
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        logger.error(traceback.format_exc())
        return False


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


def extract_job_text_from_pdf(pdf_path):
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + " "
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        return ""


def candidate_to_text_format(candidate):
    return f"{candidate.get('Education', '')} {candidate.get('Skills', '')} " \
           f"{candidate.get('Previous_Companies', '')} {candidate.get('Certifications', '')} " \
           f"{candidate.get('Job_Role_Applied', '')}"


def predict_fit_batch_from_dataframe(df, job_text):
    global model, vectorizer

    if model is None or vectorizer is None:
        if not load_model_global():
            raise Exception("Model not loaded")

    # Store results
    fit_scores = []

    for index, row in df.iterrows():
        candidate = {
            "Age": row["Age"],
            "Experience_Years": row["Experience_Years"],
            "Education": row.get("Education", ""),
            "Skills": row.get("Skills", ""),
            "Previous_Companies": row.get("Previous_Companies", ""),
            "Certifications": row.get("Certifications", ""),
            "Job_Role_Applied": row.get("Job_Role_Applied", "")
        }

        candidate_text = candidate_to_text_format(candidate)
        combined_text = candidate_text + " " + job_text

        X_text = vectorizer.transform([combined_text])
        X_numeric = [[candidate["Age"], candidate["Experience_Years"]]]

        X = hstack([X_text, X_numeric])

        fit_score = model.predict(X)[0]
        fit_scores.append(round(fit_score * 100, 2))

    df_result = df.copy()
    df_result["Fit_Percentage"] = fit_scores

    return df_result


@app.route('/api/batch-predict-preview', methods=['POST', 'OPTIONS'])
def batch_predict_preview():
    # Handle preflight request
    if request.method == 'OPTIONS':
        return '', 200

    try:
        if 'csv_file' not in request.files:
            return jsonify({'success': False, 'error': 'No CSV file uploaded'}), 400

        csv_file = request.files['csv_file']
        job_text = request.form.get('job_text', '')

        if not job_text:
            return jsonify({'success': False, 'error': 'Job description text is required'}), 400

        # Save temporary file
        csv_filename = secure_filename(csv_file.filename)
        csv_path = os.path.join(app.config['UPLOAD_FOLDER'], f"preview_{datetime.now().timestamp()}_{csv_filename}")
        csv_file.save(csv_path)

        try:
            # Read CSV and perform prediction
            df = pd.read_csv(csv_path)
            result_df = predict_fit_batch_from_dataframe(df, job_text)
            preview_data = result_df.head(10).to_dict('records')

            return jsonify({
                'success': True,
                'preview': preview_data,
                'columns': list(result_df.columns),
                'total_rows': len(result_df),
                'summary': {
                    'average_fit': round(result_df['Fit_Percentage'].mean(), 2),
                    'max_fit': round(result_df['Fit_Percentage'].max(), 2),
                    'min_fit': round(result_df['Fit_Percentage'].min(), 2)
                }
            })

        finally:
            # Clean up temporary preview file
            if os.path.exists(csv_path):
                os.remove(csv_path)
                logger.info(f"Cleaned up preview file: {csv_path}")

    except Exception as e:
        logger.error(f"Preview error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/test', methods=['GET'])
def test():
    # Run cleanup on test endpoint to keep it active
    cleanup_old_files()

    return jsonify({
        'status': 'success',
        'message': 'API is working correctly',
        'config': {
            'model_path': Config.MODEL_SAVE_PATH,
            'vectorizer_path': Config.VECTORIZER_SAVE_PATH,
            'model_exists': os.path.exists(Config.MODEL_SAVE_PATH),
            'vectorizer_exists': os.path.exists(Config.VECTORIZER_SAVE_PATH),
            'upload_folder': app.config['UPLOAD_FOLDER'],
            'results_folder': app.config['RESULTS_FOLDER']
        },
        'model_loaded': model is not None and vectorizer is not None,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None and vectorizer is not None,
        'config': {
            'model_path': Config.MODEL_SAVE_PATH,
            'vectorizer_path': Config.VECTORIZER_SAVE_PATH,
            'model_exists': os.path.exists(Config.MODEL_SAVE_PATH),
            'vectorizer_exists': os.path.exists(Config.VECTORIZER_SAVE_PATH)
        },
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/batch-predict-csv', methods=['POST', 'OPTIONS'])
def batch_predict_csv():
    # Handle preflight request
    if request.method == 'OPTIONS':
        return '', 200

    global model, vectorizer

    # Ensure results folder exists
    os.makedirs(app.config['RESULTS_FOLDER'], exist_ok=True)

    # Run cleanup occasionally
    if datetime.now().minute % 10 == 0:
        cleanup_old_files()

    # Check if model is loaded
    if model is None or vectorizer is None:
        if not load_model_global():
            return jsonify({
                'success': False,
                'error': 'Model not loaded. Please check server logs.',
                'details': {
                    'model_exists': os.path.exists(Config.MODEL_SAVE_PATH),
                    'vectorizer_exists': os.path.exists(Config.VECTORIZER_SAVE_PATH)
                }
            }), 500

    temp_files = []
    output_path = None

    try:
        # Check if files are present
        if 'csv_file' not in request.files:
            return jsonify({'success': False, 'error': 'No CSV file uploaded'}), 400

        if 'job_pdf' not in request.files:
            return jsonify({'success': False, 'error': 'No PDF file uploaded'}), 400

        csv_file = request.files['csv_file']
        pdf_file = request.files['job_pdf']

        if csv_file.filename == '':
            return jsonify({'success': False, 'error': 'No CSV file selected'}), 400

        if pdf_file.filename == '':
            return jsonify({'success': False, 'error': 'No PDF file selected'}), 400

        # Validate file types
        if not allowed_file(csv_file.filename) or not csv_file.filename.endswith('.csv'):
            return jsonify({'success': False, 'error': 'Please upload a CSV file'}), 400

        if not allowed_file(pdf_file.filename):
            return jsonify({'success': False, 'error': 'Please upload a PDF file'}), 400

        # Save uploaded files
        csv_filename = secure_filename(csv_file.filename)
        csv_path = os.path.join(app.config['UPLOAD_FOLDER'], f"input_{datetime.now().timestamp()}_{csv_filename}")
        csv_file.save(csv_path)
        temp_files.append(csv_path)

        pdf_filename = secure_filename(pdf_file.filename)
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], f"job_{datetime.now().timestamp()}_{pdf_filename}")
        pdf_file.save(pdf_path)
        temp_files.append(pdf_path)

        # Extract text from PDF
        job_text = extract_job_text_from_pdf(pdf_path)

        if not job_text:
            return jsonify({
                'success': False,
                'error': 'Could not extract text from PDF. Please ensure the PDF contains selectable text.'
            }), 400

        # Read CSV file
        try:
            df = pd.read_csv(csv_path)
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error reading CSV file: {str(e)}'
            }), 400

        # Validate required columns
        required_columns = ['Age', 'Experience_Years']
        missing_columns = [col for col in required_columns if col not in df.columns]

        if missing_columns:
            return jsonify({
                'success': False,
                'error': f'CSV missing required columns: {", ".join(missing_columns)}'
            }), 400

        # Perform prediction
        logger.info(f"Starting batch prediction for {len(df)} candidates...")
        result_df = predict_fit_batch_from_dataframe(df, job_text)

        # Save result file in results folder
        output_filename = f"results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        output_path = os.path.join(app.config['RESULTS_FOLDER'], output_filename)
        result_df.to_csv(output_path, index=False)

        # Verify file was saved
        if not os.path.exists(output_path):
            logger.error(f"Failed to save result file: {output_path}")
            return jsonify({'success': False, 'error': 'Failed to save result file'}), 500

        file_size = os.path.getsize(output_path)
        logger.info(f"Batch prediction completed. Results saved to {output_path} (size: {file_size} bytes)")

        # Prepare summary data
        summary = {
            'average_fit': round(result_df['Fit_Percentage'].mean(), 2),
            'max_fit': round(result_df['Fit_Percentage'].max(), 2),
            'min_fit': round(result_df['Fit_Percentage'].min(), 2)
        }

        # Add top candidates if Name column exists
        if 'Name' in result_df.columns:
            summary['top_candidates'] = result_df.nlargest(5, 'Fit_Percentage')[['Name', 'Fit_Percentage']].to_dict(
                'records')

        return jsonify({
            'success': True,
            'message': f'Successfully processed {len(df)} candidates',
            'result_file': output_filename,
            'download_url': f'/api/download/{output_filename}',
            'total_candidates': len(df),
            'summary': summary
        })

    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        logger.error(traceback.format_exc())
        # If there was an error and we created the output file, clean it up
        if output_path and os.path.exists(output_path):
            try:
                os.remove(output_path)
                logger.info(f"Cleaned up output file due to error: {output_path}")
            except:
                pass
        return jsonify({'success': False, 'error': str(e)}), 500

    finally:
        # Clean up temporary input files only (PDF and input CSV)
        for file_path in temp_files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"Cleaned up temporary file: {file_path}")
            except Exception as e:
                logger.error(f"Error cleaning up file {file_path}: {str(e)}")


@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    try:
        # Sanitize the filename
        filename = secure_filename(filename)

        # Only allow downloading result files
        if not filename.startswith('results_') or not filename.endswith('.csv'):
            logger.error(f"Invalid filename requested: {filename}")
            return jsonify({'success': False, 'error': 'Invalid file request'}), 400

        # Get the results folder path from config
        results_folder = app.config['RESULTS_FOLDER']
        file_path = os.path.join(results_folder, filename)

        # Normalize the path
        file_path = os.path.normpath(file_path)

        logger.info(f"Looking for file: {file_path}")
        logger.info(f"Results folder exists: {os.path.exists(results_folder)}")

        if os.path.exists(results_folder):
            files_in_results = os.listdir(results_folder)
            logger.info(f"Files in results folder: {files_in_results}")

        # Check if file exists
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")

            # Try the uploads folder as fallback (for backward compatibility)
            alt_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.exists(alt_path):
                file_path = alt_path
                logger.info(f"Found file in uploads folder: {alt_path}")
            else:
                return jsonify({
                    'success': False,
                    'error': f'File {filename} not found. Please run batch prediction first.'
                }), 404

        # Verify it's a file
        if not os.path.isfile(file_path):
            logger.error(f"Path is not a file: {file_path}")
            return jsonify({'success': False, 'error': 'Invalid file path'}), 400

        # Get file size for logging
        file_size = os.path.getsize(file_path)
        logger.info(f"Sending file: {filename}, size: {file_size} bytes from {file_path}")

        # Send the file
        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='text/csv'
        )

    except FileNotFoundError as e:
        logger.error(f"File not found error: {str(e)}")
        return jsonify({'success': False, 'error': f'File not found: {filename}'}), 404
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/cleanup', methods=['POST'])
def manual_cleanup():
    """
    Manual endpoint to trigger cleanup of old result files
    """
    try:
        cleanup_old_files()
        return jsonify({
            'success': True,
            'message': 'Cleanup completed successfully'
        })
    except Exception as e:
        logger.error(f"Manual cleanup error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/list-results', methods=['GET'])
def list_results():
    """
    List all available result files
    """
    try:
        files = []
        for filename in os.listdir(app.config['RESULTS_FOLDER']):
            if filename.startswith('results_') and filename.endswith('.csv'):
                file_path = os.path.join(app.config['RESULTS_FOLDER'], filename)
                file_stats = os.stat(file_path)
                files.append({
                    'filename': filename,
                    'size': file_stats.st_size,
                    'created': datetime.fromtimestamp(file_stats.st_ctime).isoformat(),
                    'download_url': f'/api/download/{filename}'
                })

        # Sort by creation time, newest first
        files.sort(key=lambda x: x['created'], reverse=True)

        return jsonify({
            'success': True,
            'files': files,
            'total': len(files)
        })
    except Exception as e:
        logger.error(f"List results error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'error': 'Internal server error'}), 500


if __name__ == '__main__':
    logger.info("Starting Flask API server...")
    logger.info(f"Using model path: {Config.MODEL_SAVE_PATH}")
    logger.info(f"Using vectorizer path: {Config.VECTORIZER_SAVE_PATH}")
    logger.info(f"Upload folder: {app.config['UPLOAD_FOLDER']}")
    logger.info(f"Results folder: {app.config['RESULTS_FOLDER']}")

    # Run initial cleanup
    cleanup_old_files()

    if os.path.exists(Config.MODEL_SAVE_PATH) and os.path.exists(Config.VECTORIZER_SAVE_PATH):
        load_model_global()
    else:
        logger.warning("Model files not found. API will return errors until models are loaded.")
        logger.warning(f"Please ensure model exists at: {Config.MODEL_SAVE_PATH}")
        logger.warning(f"Please ensure vectorizer exists at: {Config.VECTORIZER_SAVE_PATH}")

    app.run(debug=True, host='0.0.0.0', port=5001)