
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from './AuthContext';
 

const API_BASE_URL = 'http://localhost:5003';

const EmployeeAttrition = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState(null);
  const [isCheckingApi, setIsCheckingApi] = useState(false);
  
  // Batch processing state
  const [csvFile, setCsvFile] = useState(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [batchResult, setBatchResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  // Check API health on mount
  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    setIsCheckingApi(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/test`);
      if (response.ok) {
        const data = await response.json();
        setApiStatus({ 
          status: 'connected', 
          message: `✅ API connected. Model exists: ${data.model_exists ? 'Yes' : 'No'}`,
          details: data
        });
      } else {
        setApiStatus({ status: 'error', message: '❌ API not responding properly' });
      }
    } catch (err) {
      setApiStatus({ 
        status: 'error', 
        message: '❌ Cannot connect to API. Make sure Flask server is running on port 5003.' 
      });
    } finally {
      setIsCheckingApi(false);
    }
  };

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      setCsvFile(file);
      setCsvFileName(file.name);
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

      const formData = new FormData();
      formData.append('csv_file', csvFile);

      const response = await fetch(`${API_BASE_URL}/api/predict/batch`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setBatchResult(data);
      } else {
        throw new Error(data.error || 'Batch prediction failed');
      }
    } catch (err) {
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

      const response = await fetch(`${API_BASE_URL}/api/predict/preview`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setPreviewData(data);
      } else {
        throw new Error(data.error || 'Preview failed');
      }
    } catch (err) {
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

  const getRiskColor = (riskLabel) => {
    switch(riskLabel) {
      case 'High Risk': return '#dc3545';
      case 'Medium Risk': return '#ffc107';
      case 'Low Risk': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (!user) {
    return (
      <div className="attrition-container">
        <div className="login-message">
          <h2>Please log in to access Employee Attrition Predictor</h2>
          <p>Batch process employee CSV files to predict attrition risk</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attrition-container">
<div className="predictor-hero">
  <div className="hero-content">
    <div className="hero-icon">
      <i className="fas fa-exclamation-triangle"></i>
    </div>

    <div className="hero-text">
      <h1>Employee Attrition Risk Predictor</h1>
      <p>
        Identify employees at risk of leaving using advanced machine learning 
        models and proactive workforce analytics to improve retention strategies.
      </p>
    </div>
  </div>

  <div className="hero-stats">
    <div className="hero-stat">
      <i className="fas fa-user-shield"></i>
      <span>Risk Detection</span>
    </div>
    <div className="hero-stat">
      <i className="fas fa-chart-pie"></i>
      <span>Workforce Insights</span>
    </div>
    <div className="hero-stat">
      <i className="fas fa-hand-holding-heart"></i>
      <span>Retention Strategy</span>
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

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
          <button onClick={() => setError('')} className="dismiss-error">×</button>
        </div>
      )}

      {/* Batch Processing Section */}
      <div className="batch-processing-section">
        <div className="batch-upload-card">
          <div className="upload-icon">
            <i className="fas fa-file-csv"></i>
          </div>
          <h3>Upload Employee CSV File</h3>
          <p className="upload-description">
            Upload a CSV file with the following required columns:
          </p>
          
        
          
          <label className="file-upload-label large">
            <i className="fas fa-cloud-upload-alt"></i>
            {csvFileName ? 'Change CSV File' : 'Select CSV File'}
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

          <div className="batch-actions">
            <button 
              className="preview-btn"
              onClick={handlePreview}
              disabled={loading || !csvFile}
            >
              <i className="fas fa-eye"></i>
              Preview Data
            </button>
            
            <button 
              className="predict-btn"
              onClick={handleBatchPredict}
              disabled={loading || !csvFile}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-play"></i>
                  Predict Attrition Risk
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview Results */}
        {previewData && (
          <div className="preview-section">
            <h3>📋 Data Preview</h3>
            <p>Total rows: {previewData.total_rows} | Showing first {previewData.preview_rows}</p>
            
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
                        <td key={col}>
                          {col === 'Risk_Score' && row[col] ? 
                            row[col].toFixed(2) : 
                            row[col]?.toString() || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Batch Results */}
        {batchResult && (
          <div className="batch-results">
            <h3>✅ Batch Processing Complete</h3>
            
            <div className="summary-stats">
              <div className="stat-card">
                <i className="fas fa-users"></i>
                <div>
                  <span className="stat-label">Total Employees</span>
                  <span className="stat-value">{batchResult.total_employees}</span>
                </div>
              </div>
              
              <div className="stat-card">
                <i className="fas fa-chart-line"></i>
                <div>
                  <span className="stat-label">Avg Risk Score</span>
                  <span className="stat-value">{batchResult.summary.average_risk_score}</span>
                </div>
              </div>
              
              <div className="stat-card">
                <i className="fas fa-exclamation-triangle"></i>
                <div>
                  <span className="stat-label">High Risk</span>
                  <span className="stat-value">{batchResult.summary.high_risk_count}</span>
                </div>
              </div>
            </div>

            {/* Risk Distribution */}
            <div className="risk-distribution">
              <h4>Risk Distribution</h4>
              <div className="risk-bars">
                {Object.entries(batchResult.summary.risk_distribution).map(([risk, count]) => (
                  <div key={risk} className="risk-bar-item">
                    <span className="risk-label">{risk}</span>
                    <div className="progress-bar">
                      <div 
                        className={`progress-fill ${risk.toLowerCase().replace(' ', '-')}`}
                        style={{ width: `${(count / batchResult.total_employees) * 100}%` }}
                      ></div>
                    </div>
                    <span className="risk-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* High Risk Employees */}
            {batchResult.high_risk_employees.length > 0 && (
              <div className="high-risk-employees">
                <h4>⚠️ Top High Risk Employees</h4>
                <div className="risk-list">
                  {batchResult.high_risk_employees.map((employee, idx) => (
                    <div key={idx} className="risk-item">
                      <span className="rank">#{idx + 1}</span>
                      <span className="name">{employee.name}</span>
                      <span className="role">{employee.job_role}</span>
                      <span className="score" style={{ color: '#dc3545', fontWeight: 'bold' }}>
                        Risk: {employee.risk_score.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="download-btn" onClick={downloadResults}>
              <i className="fas fa-download"></i>
              Download Full Results CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeAttrition;