
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from './AuthContext';
 

const API_BASE_URL = 'http://localhost:5004';

const DynamicInterview = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState(null);
  const [isCheckingApi, setIsCheckingApi] = useState(false);
  

  const [role, setRole] = useState('Backend Engineer');
  const [numQuestions, setNumQuestions] = useState(10);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [candidateAnswers, setCandidateAnswers] = useState([]);
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [showResults, setShowResults] = useState(false);


  useEffect(() => {
    checkApiHealth();
    fetchDatasetInfo();
  }, []);

  const checkApiHealth = async () => {
    setIsCheckingApi(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/test`);
      if (response.ok) {
        const data = await response.json();
        setApiStatus({ 
          status: 'connected', 
          message: `✅ API connected. Dataset loaded: ${data.dataset_loaded ? 'Yes' : 'No'}`,
          details: data
        });
      } else {
        setApiStatus({ status: 'error', message: '❌ API not responding properly' });
      }
    } catch (err) {
      setApiStatus({ 
        status: 'error', 
        message: '❌ Cannot connect to API. Make sure Flask server is running on port 5004.' 
      });
    } finally {
      setIsCheckingApi(false);
    }
  };

  const fetchDatasetInfo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dataset-info`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDatasetInfo(data.dataset_info);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dataset info:', err);
    }
  };


  const extractQuestions = (questionsData) => {
    let extractedQuestions = [];
    
    console.log('Raw questions data:', questionsData);
    
    if (!questionsData) return extractedQuestions;
    

    if (Array.isArray(questionsData)) {
      questionsData.forEach(item => {
        if (typeof item === 'string') {

          let clean = item
            .replace(/^\[|\]$/g, '')
            .replace(/^\{|\}$/g, '')
            .replace(/^"|"$/g, '')
            .replace(/^"question":\s*"/i, '')   // Remove "question": prefix
            .replace(/",$/, '')                  // Remove trailing comma and quote
            .trim();
          
          if (clean && clean.length > 5) {
            extractedQuestions.push(clean);
          }
        } else if (typeof item === 'object' && item !== null) {
          // If it's an object, try to extract question property
          const question = item.question || item.text || item.content || JSON.stringify(item);
          if (question && typeof question === 'string') {
            let clean = question
              .replace(/^\[|\]$/g, '')
              .replace(/^\{|\}$/g, '')
              .replace(/^"|"$/g, '')
              .trim();
            if (clean && clean.length > 5) {
              extractedQuestions.push(clean);
            }
          }
        }
      });
    }
    

    else if (typeof questionsData === 'string') {
      try {

        const parsed = JSON.parse(questionsData);
        if (Array.isArray(parsed)) {
          return extractQuestions(parsed);
        } else if (typeof parsed === 'object') {
          return extractQuestions(Object.values(parsed));
        }
      } catch {

        const lines = questionsData.split('\n');
        lines.forEach(line => {
          let clean = line
            .replace(/^\d+[\.\)]\s*/, '')
            .replace(/^\[|\]$/g, '')
            .replace(/^\{|\}$/g, '')
            .replace(/^"|"$/g, '')
            .replace(/^"question":\s*"/i, '')
            .trim();
          
          if (clean && clean.length > 5 && !clean.startsWith('===') && !clean.startsWith('---')) {
            extractedQuestions.push(clean);
          }
        });
      }
    }
    

    else if (typeof questionsData === 'object' && questionsData !== null) {

      Object.values(questionsData).forEach(value => {
        if (typeof value === 'string') {
          let clean = value
            .replace(/^\[|\]$/g, '')
            .replace(/^\{|\}$/g, '')
            .replace(/^"|"$/g, '')
            .trim();
          if (clean && clean.length > 5) {
            extractedQuestions.push(clean);
          }
        }
      });
    }
    

    extractedQuestions = [...new Set(extractedQuestions)]
      .filter(q => q && q.length > 5)
      .slice(0, numQuestions);
    
    console.log('Extracted questions:', extractedQuestions);
    return extractedQuestions;
  };

  const handleGenerateQuestions = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setGeneratedQuestions([]);
    setCandidateAnswers([]);
    setEvaluationResults(null);
    setShowResults(false);

    try {
      if (!role) {
        throw new Error('Please enter a job role');
      }

      console.log('Generating questions for role:', role);
      
      const response = await fetch(`${API_BASE_URL}/api/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: role,
          n_questions: numQuestions
        })
      });

      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {

        let questions = extractQuestions(data.questions);
        

        if (questions.length === 0) {
          questions = [
            `What experience do you have with ${role} technologies?`,
            `Describe a challenging project you worked on as a ${role}.`,
            `How do you stay updated with the latest trends in ${role}?`,
            `What are the most important skills for a ${role}?`,
            `Tell me about a time you solved a complex problem in your ${role} role.`
          ].slice(0, numQuestions);
        }
        
        setGeneratedQuestions(questions);

        setCandidateAnswers(questions.map(() => ''));
        
        if (data.note) {
          console.log('Note:', data.note);
        }
      } else {
        throw new Error(data.error || 'Failed to generate questions');
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (index, value) => {
    const updated = [...candidateAnswers];
    updated[index] = value;
    setCandidateAnswers(updated);
  };

  const handleEvaluate = async () => {
    setLoading(true);
    setError('');
    setEvaluationResults(null);

    try {

      const validAnswers = candidateAnswers.filter(ans => ans && ans.trim() !== '');
      
      if (validAnswers.length === 0) {
        throw new Error('Please provide at least one answer');
      }


      const response = await fetch(`${API_BASE_URL}/api/evaluate-answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_answers: candidateAnswers,
          ideal_answers: generatedQuestions
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setEvaluationResults(data);
        setShowResults(true);
      } else {
        throw new Error(data.error || 'Evaluation failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#4caf50';
    if (score >= 70) return '#8bc34a';
    if (score >= 60) return '#ffc107';
    if (score >= 50) return '#ff9800';
    return '#f44336';
  };

  const resetInterview = () => {
    setGeneratedQuestions([]);
    setCandidateAnswers([]);
    setEvaluationResults(null);
    setShowResults(false);
  };

  if (!user) {
    return (
      <div className="interview-container">
       
	 
		
		
      </div>
    );
  }

  return (
    <div className="interview-container">
      
	  
	<div className="predictor-hero">
  <div className="hero-content">
    <div className="hero-icon">
      <i className="fas fa-user-lock"></i>
    </div>

    <div className="hero-text">
      <h1>Dynamic Interview System</h1>
      <p>
        Please log in to access the AI-powered interview platform and 
        generate intelligent, role-specific interview questions.
      </p>
    </div>
  </div>

  <div className="hero-stats">
    <div className="hero-stat">
      <i className="fas fa-brain"></i>
      <span>AI Question Generation</span>
    </div>
    <div className="hero-stat">
      <i className="fas fa-comments"></i>
      <span>Dynamic Interviews</span>
    </div>
    <div className="hero-stat">
      <i className="fas fa-shield-alt"></i>
      <span>Secure Access</span>
    </div>
  </div>
</div>

      {/* API Status */}
      {apiStatus && (
        <div className={`api-status ${apiStatus.status}`}>
          <i className={`fas fa-${apiStatus.status === 'connected' ? 'check-circle' : 'exclamation-circle'}`}></i>
          <span>{apiStatus.message}</span>
          <button onClick={checkApiHealth} className="refresh-status" disabled={isCheckingApi}>
            <i className={`fas fa-sync-alt ${isCheckingApi ? 'fa-spin' : ''}`}></i>
            {isCheckingApi ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      )}

      {/* Dataset Info */}
      {datasetInfo && (
        <div className="dataset-info">
          <i className="fas fa-database"></i>
          <span>Dataset: {datasetInfo.rows} rows, {datasetInfo.columns} columns</span>
          <span>Available roles: {Array.isArray(datasetInfo.roles) ? datasetInfo.roles.slice(0, 3).join(', ') : 'N/A'}...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
          <button onClick={() => setError('')} className="dismiss-error">×</button>
        </div>
      )}

      {/* Interview Setup */}
      {!showResults && (
        <div className="interview-setup-card">
          <h3>Interview  </h3>
          <form onSubmit={handleGenerateQuestions}>
            <div className="form-row">
             

<label>Job Role *</label>
<select
  value={role}
  onChange={(e) => setRole(e.target.value)}
  required
>
  <option value="">-- Select Job Role --</option>
  <option value="Mobile Developer">Mobile Developer</option>
  <option value="Frontend Developer">Frontend Developer</option>
  <option value="Backend Engineer">Backend Engineer</option>
  <option value="BI Analyst">BI Analyst</option>
  <option value="ML Engineer">ML Engineer</option>
  <option value="Cloud Engineer">Cloud Engineer</option>
  <option value="Data Scientist">Data Scientist</option>
  <option value="DevOps Engineer">DevOps Engineer</option>
  <option value="HR Manager">HR Manager</option>
  <option value="Cybersecurity Specialist">Cybersecurity Specialist</option>
</select>
              
            <div className="form-group" style={{ display: 'none' }}>
  <label>Number of Questions</label>
  <input
    type="number"
    value={numQuestions}
    onChange={(e) => setNumQuestions(parseInt(e.target.value) || 10)}
    min="1"
    max="10"
  />
</div>
            </div>
			
			
			
			
            
            <button type="submit" className="generate-btn" disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Generating Questions...
                </>
              ) : (
                <>
                  <i className="fas fa-play"></i>
                    Start
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Questions and Answers Section */}
      {generatedQuestions.length > 0 && !showResults && (
        <div className="interview-section">
          <h3>Interview Questions for {role}</h3>
          
          <div className="questions-list">
            {generatedQuestions.map((question, idx) => (
              <div key={idx} className="question-answer-card">
                <div className="question-header">
                  <span className="question-number">Question {idx + 1}</span>
                </div>
                <div className="question-text">
                  <strong>Q:</strong> {question}
                </div>
                <div className="answer-section">
                  <label>Your Answer:</label>
                  <textarea
                    value={candidateAnswers[idx] || ''}
                    onChange={(e) => handleAnswerChange(idx, e.target.value)}
                    placeholder="Type your answer here..."
                    rows="4"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="action-buttons">
            <button 
              className="evaluate-btn"
              onClick={handleEvaluate}
              disabled={loading || !candidateAnswers.some(ans => ans && ans.trim() !== '')}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Evaluating...
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle"></i>
                  Evaluate Answers
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Evaluation Results */}
      {showResults && evaluationResults && (
        <div className="results-section">
          <h3>📊 Evaluation Results</h3>
          
          <div className="summary-stats">
            <div className="stat-card">
              <span className="stat-label">Average Score</span>
              <span className="stat-value">{evaluationResults.summary.average_score}%</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Strong Matches</span>
              <span className="stat-value">{evaluationResults.summary.strong_matches}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Weak Matches</span>
              <span className="stat-value">{evaluationResults.summary.weak_matches}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Assessment</span>
              <span className="stat-value">{evaluationResults.summary.overall_assessment}</span>
            </div>
          </div>

          <div className="results-list">
            <h4>Detailed Analysis</h4>
            {evaluationResults.results.map((result, idx) => (
              <div key={idx} className="result-card">
                <div className="result-header">
                  <span className="question-number">Question {result.question_number}</span>
                  <span 
                    className="score-badge"
                    style={{ backgroundColor: getScoreColor(result.score) }}
                  >
                    {result.score}% - {result.result_label}
                  </span>
                </div>
                
                <div className="question-text">
                  <strong>Question:</strong> {generatedQuestions[idx] || 'N/A'}
                </div>
                
                <div className="answer-comparison">
                  <div className="candidate-answer">
                    <strong>Your Answer:</strong>
                    <p>{result.candidate_answer || 'No answer provided'}</p>
                  </div>
                  <div className="ideal-answer">
                    <strong>Ideal Answer (Reference):</strong>
                    <p>{result.ideal_answer}</p>
                  </div>
                </div>

                <div className="similarity-indicator">
                  <div className="similarity-bar">
                    <div 
                      className="similarity-fill"
                      style={{ 
                        width: `${result.score}%`,
                        backgroundColor: getScoreColor(result.score)
                      }}
                    ></div>
                  </div>
                  <span className="similarity-score">Match Score: {result.score}%</span>
                </div>
              </div>
            ))}
          </div>

          <button 
            className="new-interview-btn"
            onClick={resetInterview}
          >
            <i className="fas fa-redo"></i>
            Start New Interview
          </button>
        </div>
      )}
    </div>
  );
};

export default DynamicInterview;