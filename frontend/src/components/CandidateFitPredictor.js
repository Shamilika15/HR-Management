
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from './AuthContext';



const API_BASE_URL = 'http://localhost:5001';

const CandidateFitPredictor = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('single');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [isCheckingApi, setIsCheckingApi] = useState(false);


  const [csvFile, setCsvFile] = useState(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [jobPdfFile, setJobPdfFile] = useState(null);
  const [jobPdfFileName, setJobPdfFileName] = useState('');
  const [batchResult, setBatchResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);


  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    setIsCheckingApi(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/test`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setApiStatus({
          status: 'connected',
          message: `API connected. Model loaded: ${data.model_loaded ? 'Yes' : 'No'}`,
          details: data
        });
        setError('');
      } else {
        setApiStatus({
          status: 'error',
          message: `API returned status ${response.status}`
        });
      }
    } catch (err) {
      setApiStatus({
        status: 'error',
        message: `Cannot connect to API at ${API_BASE_URL}. Make sure Flask server is running.`
      });
    } finally {
      setIsCheckingApi(false);
    }
  };

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      setCsvFile(file);
      setCsvFileName(file.name);
      setError('');
    }
  };

  const handleJobPdfFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      setJobPdfFile(file);
      setJobPdfFileName(file.name);
      setError('');
    }
  };

  const handleBatchPredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setBatchResult(null);

    try {
      if (!csvFile) {
        throw new Error('Please upload a CSV file');
      }

      if (!jobPdfFile) {
        throw new Error('Please upload a job description PDF');
      }

      const formData = new FormData();
      formData.append('csv_file', csvFile);
      formData.append('job_pdf', jobPdfFile);

      const response = await fetch(`${API_BASE_URL}/api/batch-predict-csv`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setBatchResult(data);
      } else {
        throw new Error(data.error || 'Batch prediction failed');
      }
    } catch (err) {
      console.error('Batch prediction error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    setError('');
    setPreviewData(null);

    try {
      if (!csvFile) {
        throw new Error('Please upload a CSV file');
      }

      const formData = new FormData();
      formData.append('csv_file', csvFile);
      formData.append('job_text', 'Sample job description for preview'); // You can make this editable

      const response = await fetch(`${API_BASE_URL}/api/batch-predict-preview`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setPreviewData(data);
      } else {
        throw new Error(data.error || 'Preview failed');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadResults = () => {
    if (batchResult?.download_url) {
      window.open(`${API_BASE_URL}${batchResult.download_url}`, '_blank');
    }
  };

  if (!user) {
    return (
      <div className="predictor-container">
        <div className="login-message">
          <h2>Please log in to access the Candidate Fit Predictor</h2>
          <p>This tool helps you predict how well candidates match job descriptions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="predictor-container">
      <div className="prod-hero">
        <div className="prod-hero-heading">
          <div className="prod-hero-badge">
            <i className="fas fa-brain"></i>
            <span>AI-Powered Talent Matching</span>
          </div>
          <h1 className="prod-hero-title">
            Candidate-Job Fit <span className="prod-hero-highlight">Predictor</span>
          </h1>
          <p className="prod-hero-subtitle">
            Analyze candidate profiles against job descriptions using advanced
            machine learning algorithms to identify the best-fit talent instantly.
          </p>
        </div>

        <div className="prod-hero-divider"></div>

        <div className="prod-hero-pills">
          <div className="prod-hero-pill">
            <span className="prod-pill-icon"><i className="fas fa-robot"></i></span>
            <span className="prod-pill-label">Smart Matching</span>
          </div>
          <div className="prod-hero-pill">
            <span className="prod-pill-icon"><i className="fas fa-chart-line"></i></span>
            <span className="prod-pill-label">Data-Driven Insights</span>
          </div>
          <div className="prod-hero-pill">
            <span className="prod-pill-icon"><i className="fas fa-bolt"></i></span>
            <span className="prod-pill-label">Fast Processing</span>
          </div>
        </div>
      </div>

      {/* API Status Indicator */}
      {apiStatus && (
        <div className={`api-status ${apiStatus.status}`}>
          <i className={`fas fa-${apiStatus.status === 'connected' ? 'check-circle' : 'exclamation-circle'}`}></i>
          <span>{apiStatus.message}</span>
          <button
            onClick={checkApiHealth}
            className="refresh-status"
            disabled={isCheckingApi}
          >
            <i className={`fas fa-sync-alt ${isCheckingApi ? 'fa-spin' : ''}`}></i>
            {isCheckingApi ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      )}

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
          <button onClick={() => setError('')} className="dismiss-error">×</button>
        </div>
      )}

      {/* Batch CSV Upload Section */}
      <div className="batch-csv-section">
        <form onSubmit={handleBatchPredict} className="predictor-form">
          <div className="form-section">

            <p className="section-description">
              Upload an employee CSV file and a job description PDF to get fit scores for all candidates.

            </p>

            <div className="file-upload-grid">
              <div className="file-upload-card">
                <div className="file-upload-icon">
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                </div>
                <h4>Employee CSV File</h4>
                <label className="file-upload-label large">
                  <i className="fas fa-cloud-upload-alt"></i>
                  {csvFileName ? 'Change CSV' : 'Select CSV File'}
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
                {csvFileName && (
                  <div className="selected-file">
                    <i className="fas fa-check-circle"></i>
                    <span>{csvFileName}</span>
                  </div>
                )}
              </div>

              <div className="file-upload-card">
                <div className="file-upload-icon">
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                </div>
                <h4>Job Description PDF</h4>
                <label className="file-upload-label large">
                  <i className="fas fa-cloud-upload-alt"></i>
                  {jobPdfFileName ? 'Change PDF' : 'Select PDF File'}
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleJobPdfFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
                {jobPdfFileName && (
                  <div className="selected-file">
                    <i className="fas fa-check-circle"></i>
                    <span>{jobPdfFileName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="action-buttons">
              <button
                type="button"
                className="preview-btn"
                onClick={handlePreview}
                disabled={loading || !csvFile}
              >
                <i className="fas fa-eye"></i>
                Preview Results
              </button>

              <button
                type="submit"
                className="predict-btn"
                disabled={loading || !csvFile || !jobPdfFile || apiStatus?.status !== 'connected'}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-play"></i>
                    Run Batch Prediction
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Preview Results */}
        {previewData && (
          <div className="preview-section">
            <h3>📊 Data Preview</h3>
            <div className="summary-stats">
              <div className="stat-card">
                <span className="stat-label">Total Rows</span>
                <span className="stat-value">{previewData.total_rows}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Avg Fit Score</span>
                <span className="stat-value">{previewData.summary.average_fit}%</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Max Fit</span>
                <span className="stat-value">{previewData.summary.max_fit}%</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Min Fit</span>
                <span className="stat-value">{previewData.summary.min_fit}%</span>
              </div>
            </div>

            <div className="preview-table">
              <table>
                <thead>
                  <tr>
                    {previewData.columns.map(col => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.preview.map((row, idx) => (
                    <tr key={idx}>
                      {previewData.columns.map(col => (
                        <td key={col}>{row[col]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.total_rows > 10 && (
                <p className="preview-note">Showing first 10 of {previewData.total_rows} rows</p>
              )}
            </div>
          </div>
        )}

        {/* Batch Results */}
        {batchResult && (
          <div className="batch-results">
            <h3>Batch Processing Complete</h3>
            <div className="result-summary">
              <div className="result-stat">
                <i className="fas fa-users"></i>
                <div>
                  <span className="stat-label">Processed</span>
                  <span className="stat-value">{batchResult.total_candidates} Candidates</span>
                </div>
              </div>

              {batchResult.summary && (
                <>
                  <div className="result-stat">
                    <i className="fas fa-chart-line"></i>
                    <div>
                      <span className="stat-label">Average Fit</span>
                      <span className="stat-value">{batchResult.summary.average_fit}%</span>
                    </div>
                  </div>

                  <div className="result-stat">
                    <i className="fas fa-trophy"></i>
                    <div>
                      <span className="stat-label">Top Score</span>
                      <span className="stat-value">{batchResult.summary.max_fit}%</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {batchResult.summary?.top_candidates?.length > 0 && (
              <div className="top-candidates">
                <h4>🏆 Top 5 Candidates</h4>
                <div className="top-candidates-list">
                  {batchResult.summary.top_candidates.map((candidate, idx) => (
                    <div key={idx} className="top-candidate-item">
                      <span className="rank">#{idx + 1}</span>
                      <span className="name">{candidate.Name || `Candidate ${idx + 1}`}</span>
                      <span className="score" style={{ color: getScoreColor(candidate.Fit_Percentage) }}>
                        {candidate.Fit_Percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="download-btn" onClick={downloadResults}>
              <i className="fas fa-download"></i>
              Download Results CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const getScoreColor = (score) => {
  if (score >= 80) return '#4caf50';
  if (score >= 60) return '#ff9800';
  return '#f44336';
};

export default CandidateFitPredictor;