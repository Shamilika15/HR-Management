# app.py
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

# Import your existing working modules
from Setup_File import logger
from config import Config

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configuration
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  
app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'csv'}


os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


model = None
vectorizer = None

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

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({
        'status': 'success',
        'message': 'API is working correctly',
        'config': {
            'model_path': Config.MODEL_SAVE_PATH,
            'vectorizer_path': Config.VECTORIZER_SAVE_PATH,
            'model_exists': os.path.exists(Config.MODEL_SAVE_PATH),
            'vectorizer_exists': os.path.exists(Config.VECTORIZER_SAVE_PATH)
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
    
    try:

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
        

        if not allowed_file(csv_file.filename) or not csv_file.filename.endswith('.csv'):
            return jsonify({'success': False, 'error': 'Please upload a CSV file'}), 400
        
        if not allowed_file(pdf_file.filename):
            return jsonify({'success': False, 'error': 'Please upload a PDF file'}), 400
        

        csv_filename = secure_filename(csv_file.filename)
        csv_path = os.path.join(app.config['UPLOAD_FOLDER'], f"input_{datetime.now().timestamp()}_{csv_filename}")
        csv_file.save(csv_path)
        temp_files.append(csv_path)
        
        pdf_filename = secure_filename(pdf_file.filename)
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], f"job_{datetime.now().timestamp()}_{pdf_filename}")
        pdf_file.save(pdf_path)
        temp_files.append(pdf_path)

        job_text = extract_job_text_from_pdf(pdf_path)
        
        if not job_text:
            return jsonify({
                'success': False,
                'error': 'Could not extract text from PDF. Please ensure the PDF contains selectable text.'
            }), 400
        

        try:
            df = pd.read_csv(csv_path)
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error reading CSV file: {str(e)}'
            }), 400
        

        required_columns = ['Age', 'Experience_Years']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            return jsonify({
                'success': False,
                'error': f'CSV missing required columns: {", ".join(missing_columns)}'
            }), 400
        

        logger.info(f"Starting batch prediction for {len(df)} candidates...")
        result_df = predict_fit_batch_from_dataframe(df, job_text)
        

        output_filename = f"results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
        result_df.to_csv(output_path, index=False)
        temp_files.append(output_path)
        
        logger.info(f"Batch prediction completed. Results saved to {output_path}")
        

        return jsonify({
            'success': True,
            'message': f'Successfully processed {len(df)} candidates',
            'result_file': output_filename,
            'download_url': f'/api/download/{output_filename}',
            'total_candidates': len(df),
            'summary': {
                'average_fit': round(result_df['Fit_Percentage'].mean(), 2),
                'max_fit': round(result_df['Fit_Percentage'].max(), 2),
                'min_fit': round(result_df['Fit_Percentage'].min(), 2),
                'top_candidates': result_df.nlargest(5, 'Fit_Percentage')[['Name', 'Fit_Percentage']].to_dict('records') if 'Name' in result_df.columns else []
            }
        })
        
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500
    
    finally:

        for file_path in temp_files[:-1] if temp_files else []:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except:
                pass

@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):

    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'File not found'}), 404
        
        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='text/csv'
        )
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

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
        

        csv_filename = secure_filename(csv_file.filename)
        csv_path = os.path.join(app.config['UPLOAD_FOLDER'], f"preview_{datetime.now().timestamp()}_{csv_filename}")
        csv_file.save(csv_path)
        
        try:

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
            if os.path.exists(csv_path):
                os.remove(csv_path)
                
    except Exception as e:
        logger.error(f"Preview error: {str(e)}")
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

    if os.path.exists(Config.MODEL_SAVE_PATH) and os.path.exists(Config.VECTORIZER_SAVE_PATH):
        load_model_global()
    else:
        logger.warning("Model files not found. API will return errors until models are loaded.")
        logger.warning(f"Please ensure model exists at: {Config.MODEL_SAVE_PATH}")
        logger.warning(f"Please ensure vectorizer exists at: {Config.VECTORIZER_SAVE_PATH}")
    
    app.run(debug=True, host='0.0.0.0', port=5001)