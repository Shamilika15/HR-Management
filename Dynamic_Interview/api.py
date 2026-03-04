from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
import traceback
import sys
import os
import re
from InterviewDataProcessor import InterviewDataProcessor
from QuestionGenerator import QuestionGenerator
from PredictModel import predict_similarity
import Config as CF

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('interview_api.log')
    ]
)
logger = logging.getLogger("InterviewAPI")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})


app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max


data_processor = None

def initialize_data_processor():
    global data_processor
    try:
        if os.path.exists(CF.Config.DATA_PATH):
            data_processor = InterviewDataProcessor(file_path=CF.Config.DATA_PATH)
            info = data_processor.get_dataset_info()
            logger.info(f"Dataset loaded: Rows={info['rows']}, Columns={info['columns']}, Roles={info['roles']}")
            return True
        else:
            logger.warning(f"Dataset not found at {CF.Config.DATA_PATH}")
            return False
    except Exception as e:
        logger.error(f"Failed to load dataset: {str(e)}")
        return False

def parse_questions_from_string(questions_text, n_questions=10):
    questions_array = []
    
    if isinstance(questions_text, str):
        lines = questions_text.strip().split('\n')
        for line in lines:
            line = line.strip()
            # Skip empty lines and separator lines
            if not line or line.startswith('===') or line.startswith('---'):
                continue
            
            # Remove numbering (e.g., "1. ", "1) ", etc.)
            cleaned = re.sub(r'^\d+[\.\)]\s*', '', line)
            if cleaned:
                questions_array.append(cleaned)
    
    return questions_array[:n_questions]

def get_fallback_questions(role, n_questions=10):
    fallbacks = {
        'default': [
            f"What experience do you have with {role} technologies?",
            f"Describe a challenging project you worked on as a {role}.",
            f"How do you stay updated with the latest trends in {role}?",
            f"What are the most important skills for a {role}?",
            f"Tell me about a time you solved a complex problem in your {role} role."
        ],
        'backend': [
            "Explain your experience with backend frameworks like Django or Flask.",
            "How do you design scalable database schemas?",
            "Describe your experience with RESTful API development.",
            "How do you handle authentication and authorization in web applications?",
            "What's your experience with cloud platforms like AWS or Azure?"
        ],
        'frontend': [
            "What's your experience with React or Vue.js?",
            "How do you manage state in large applications?",
            "Explain your approach to responsive web design.",
            "How do you optimize frontend performance?",
            "Describe your experience with modern CSS frameworks."
        ],
        'data': [
            "Explain your experience with machine learning libraries.",
            "How do you handle missing data in datasets?",
            "Describe your experience with data visualization tools.",
            "What's your approach to feature engineering?",
            "How do you evaluate model performance?"
        ]
    }
    

    role_lower = role.lower()
    if any(word in role_lower for word in ['backend', 'server', 'api', 'django', 'flask']):
        category = 'backend'
    elif any(word in role_lower for word in ['frontend', 'react', 'vue', 'ui', 'css']):
        category = 'frontend'
    elif any(word in role_lower for word in ['data', 'scientist', 'analyst', 'ml', 'ai']):
        category = 'data'
    else:
        category = 'default'
    
    return fallbacks[category][:n_questions]

@app.route('/api/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Dynamic Interview API is running',
        'dataset_loaded': data_processor is not None,
        'dataset_path': CF.Config.DATA_PATH,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'dataset_loaded': data_processor is not None,
        'timestamp': datetime.now().isoformat()
    })



@app.route('/api/generate-questions', methods=['POST', 'OPTIONS'])
def generate_questions():
    if request.method == 'OPTIONS':
        return '', 200

    try:
        data = request.get_json()

        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        role = data.get('role', '')
        n_questions = data.get('n_questions', 10)

        if not role:
            return jsonify({'success': False, 'error': 'Job role is required'}), 400

        logger.info(f"Generating {n_questions} questions for role: {role}")

        try:
            generated_questions = QuestionGenerator.generate_questions(role, n_questions=n_questions)
            logger.info(f"Raw output: {generated_questions}")
            logger.info(f"Raw output type: {type(generated_questions)}")


            questions_array = []

            if isinstance(generated_questions, list):
                # If it's already a list, use it directly
                questions_array = generated_questions
            elif isinstance(generated_questions, str):

                try:
                    import json
                    parsed = json.loads(generated_questions)
                    if isinstance(parsed, list):
                        questions_array = parsed
                    else:
                        questions_array = [str(parsed)]
                except:

                    questions_array = parse_questions_from_string(generated_questions, n_questions)
            elif isinstance(generated_questions, dict):

                if 'questions' in generated_questions:
                    questions_array = generated_questions['questions']
                else:
                    questions_array = list(generated_questions.values())
            elif generated_questions is None:
                questions_array = get_fallback_questions(role, n_questions)
            else:
                questions_array = [str(generated_questions)]


            cleaned_questions = []
            for q in questions_array:
                if isinstance(q, dict):

                    if 'question' in q:
                        q = q['question']
                    else:
                        q = str(q)
                

                q_str = str(q).strip()

                q_str = re.sub(r'^\{|\}$', '', q_str)
                q_str = re.sub(r'^\[|\]$', '', q_str)
                q_str = re.sub(r'^"|"$', '', q_str)
                q_str = re.sub(r'^"question":\s*', '', q_str, flags=re.IGNORECASE)
                
                if q_str and len(q_str) > 5:
                    cleaned_questions.append(q_str)


            if len(cleaned_questions) < n_questions:
                # Add fallback questions if needed
                fallback = get_fallback_questions(role, n_questions - len(cleaned_questions))
                cleaned_questions.extend(fallback)


            cleaned_questions = cleaned_questions[:n_questions]

            logger.info(f"Returning {len(cleaned_questions)} cleaned questions")

            return jsonify({
                'success': True,
                'role': role,
                'questions': cleaned_questions,
                'count': len(cleaned_questions)
            })

        except Exception as e:
            logger.error(f"Question generation failed: {str(e)}")
            logger.error(traceback.format_exc())


            fallback_questions = get_fallback_questions(role, n_questions)

            return jsonify({
                'success': True,
                'role': role,
                'questions': fallback_questions,
                'count': len(fallback_questions),
                'note': 'Using fallback questions due to generation error'
            }), 200

    except Exception as e:
        logger.error(f"Generate questions error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500
        
        

@app.route('/api/evaluate-answers', methods=['POST', 'OPTIONS'])
def evaluate_answers():

    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        candidate_answers = data.get('candidate_answers', [])
        ideal_answers = data.get('ideal_answers', [])
        
        if not candidate_answers or not ideal_answers:
            return jsonify({'success': False, 'error': 'Both candidate and ideal answers are required'}), 400
        
        if len(candidate_answers) != len(ideal_answers):
            return jsonify({
                'success': False, 
                'error': f'Number of candidate answers ({len(candidate_answers)}) does not match number of ideal answers ({len(ideal_answers)})'
            }), 400
        
        logger.info(f"Evaluating {len(candidate_answers)} answers...")
        
        results = []
        total_score = 0
        
        for i, (cand, ideal) in enumerate(zip(candidate_answers, ideal_answers), 1):
            try:
                score = predict_similarity(cand, ideal)

                if score <= 1:
                    score_percentage = round(score * 100, 2)
                else:
                    score_percentage = round(score, 2)
                
                result = {
                    'question_number': i,
                    'candidate_answer': cand,
                    'ideal_answer': ideal,
                    'score': score_percentage,
                    'is_strong_match': score_percentage > 70,
                    'result_label': 'Strong Match' if score_percentage > 70 else 'Weak Match'
                }
                results.append(result)
                total_score += score_percentage
                
            except Exception as e:
                logger.error(f"Error evaluating answer {i}: {str(e)}")
                results.append({
                    'question_number': i,
                    'candidate_answer': cand,
                    'ideal_answer': ideal,
                    'score': 0,
                    'is_strong_match': False,
                    'result_label': 'Error',
                    'error': str(e)
                })
        
        average_score = total_score / len(results) if results else 0
        
        return jsonify({
            'success': True,
            'results': results,
            'summary': {
                'total_questions': len(results),
                'average_score': round(average_score, 2),
                'strong_matches': sum(1 for r in results if r.get('is_strong_match', False)),
                'weak_matches': sum(1 for r in results if not r.get('is_strong_match', False)),
                'overall_assessment': 'Strong Candidate' if average_score > 70 else 'Needs Improvement'
            }
        })
        
    except Exception as e:
        logger.error(f"Evaluate answers error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/full-interview', methods=['POST', 'OPTIONS'])
def full_interview():

    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        role = data.get('role', '')
        candidate_answers = data.get('candidate_answers', [])
        n_questions = data.get('n_questions', len(candidate_answers))
        
        if not role:
            return jsonify({'success': False, 'error': 'Job role is required'}), 400
        
        if not candidate_answers:
            return jsonify({'success': False, 'error': 'Candidate answers are required'}), 400
        

        logger.info(f"Generating {n_questions} questions for role: {role}")
        try:
            generated_raw = QuestionGenerator.generate_questions(role, n_questions=n_questions)
            

            if isinstance(generated_raw, list):
                generated_questions = generated_raw
            elif isinstance(generated_raw, str):
                generated_questions = parse_questions_from_string(generated_raw, n_questions)
            else:
                generated_questions = get_fallback_questions(role, n_questions)
                
        except Exception as e:
            logger.error(f"Question generation failed: {str(e)}")
            generated_questions = get_fallback_questions(role, n_questions)
        

        while len(generated_questions) < len(candidate_answers):
            generated_questions.append(f"Tell me more about your experience with {role}.")
        

        results = []
        total_score = 0
        
        for i, (cand, question) in enumerate(zip(candidate_answers, generated_questions), 1):
            try:

                score = predict_similarity(cand, question)
                
                if score <= 1:
                    score_percentage = round(score * 100, 2)
                else:
                    score_percentage = round(score, 2)
                
                result = {
                    'question_number': i,
                    'question': question,
                    'candidate_answer': cand,
                    'score': score_percentage,
                    'is_strong_match': score_percentage > 70,
                    'result_label': 'Strong Match' if score_percentage > 70 else 'Weak Match'
                }
                results.append(result)
                total_score += score_percentage
                
            except Exception as e:
                logger.error(f"Error evaluating answer {i}: {str(e)}")
                results.append({
                    'question_number': i,
                    'question': question,
                    'candidate_answer': cand,
                    'score': 0,
                    'is_strong_match': False,
                    'result_label': 'Error',
                    'error': str(e)
                })
        
        average_score = total_score / len(results) if results else 0
        
        return jsonify({
            'success': True,
            'role': role,
            'questions': generated_questions,
            'results': results,
            'summary': {
                'total_questions': len(results),
                'average_score': round(average_score, 2),
                'strong_matches': sum(1 for r in results if r.get('is_strong_match', False)),
                'weak_matches': sum(1 for r in results if not r.get('is_strong_match', False)),
                'overall_assessment': 'Strong Candidate' if average_score > 70 else 'Needs Improvement'
            }
        })
        
    except Exception as e:
        logger.error(f"Full interview error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/dataset-info', methods=['GET'])
def dataset_info():

    global data_processor
    
    if data_processor is None:
        if not initialize_data_processor():
            return jsonify({
                'success': False,
                'error': 'Dataset not loaded',
                'dataset_path': CF.Config.DATA_PATH,
                'file_exists': os.path.exists(CF.Config.DATA_PATH)
            }), 404
    
    try:
        info = data_processor.get_dataset_info()
        return jsonify({
            'success': True,
            'dataset_info': info
        })
    except Exception as e:
        logger.error(f"Dataset info error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

if __name__ == '__main__':
    logger.info("Starting Dynamic Interview API...")
    logger.info(f"Dataset path: {CF.Config.DATA_PATH}")
    

    initialize_data_processor()
    
    app.run(debug=True, host='0.0.0.0', port=5004)