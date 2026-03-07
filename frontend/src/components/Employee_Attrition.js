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

  // Live reload state
  const [showLivePopup, setShowLivePopup] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveData, setLiveData] = useState(null);
  const [highRiskEmployees, setHighRiskEmployees] = useState([]);
  const [lastReloadTime, setLastReloadTime] = useState(null);

  // Selected employee for recommendations
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

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

  // Function to generate retention recommendations based on employee data
  const generateRecommendations = (employee) => {
    const riskScore = parseFloat(employee.Risk_Score || employee.risk_score || 0);
    const age = parseInt(employee.Age) || 0;
    const jobRole = employee.JobRole || employee.job_role || '';
    const jobLevel = parseInt(employee.JobLevel || employee.job_level) || 0;
    const monthlyIncome = parseFloat(employee.MonthlyIncome || employee.monthly_income) || 0;
    const overTime = employee.OverTime || employee.over_time || '';
    const businessTravel = employee.BusinessTravel || employee.business_travel || '';

    const recommendations = [];

    // High risk recommendations
    if (riskScore > 0.30) {
      recommendations.push({
        priority: 'Critical',
        icon: '🔴',
        category: 'Immediate Action',
        suggestions: [
          'Schedule an urgent one-on-one meeting within 48 hours',
          'Conduct stay interview to understand concerns',
          'Review compensation package for immediate adjustment',
          'Assign a mentor or buddy for additional support',
          'Consider temporary workload reduction'
        ]
      });
    }

    // Overtime related recommendations
    if (overTime === 'Yes' || overTime === 'Yes') {
      recommendations.push({
        priority: 'High',
        icon: '⏰',
        category: 'Work-Life Balance',
        suggestions: [
          'Review workload distribution',
          'Consider hiring additional support for the team',
          'Implement flexible working hours',
          'Ensure overtime is compensated properly',
          'Set boundaries for after-hours communication'
        ]
      });
    }

    // Job level and career growth recommendations
    if (jobLevel < 3) {
      recommendations.push({
        priority: 'Medium',
        icon: '📈',
        category: 'Career Development',
        suggestions: [
          'Create a clear career progression path',
          'Offer skill development training programs',
          'Assign stretch projects to build experience',
          'Provide mentorship from senior staff',
          'Discuss promotion opportunities in next review'
        ]
      });
    }

    // Age-related recommendations
    if (age < 30) {
      recommendations.push({
        priority: 'Medium',
        icon: '🌱',
        category: 'Early Career Retention',
        suggestions: [
          'Offer continuous learning opportunities',
          'Provide regular feedback and recognition',
          'Create peer networking opportunities',
          'Assign challenging projects to maintain engagement',
          'Consider student loan repayment assistance'
        ]
      });
    } else if (age > 45) {
      recommendations.push({
        priority: 'Medium',
        icon: '🌟',
        category: 'Experienced Employee Retention',
        suggestions: [
          'Offer flexible retirement options',
          'Provide mentoring opportunities',
          'Consider phased retirement plans',
          'Offer enhanced health benefits',
          'Create knowledge transfer programs'
        ]
      });
    }

    // Income-related recommendations
    if (monthlyIncome < 50000) {
      recommendations.push({
        priority: 'High',
        icon: '💰',
        category: 'Compensation Review',
        suggestions: [
          'Conduct market rate analysis for role',
          'Consider salary adjustment',
          'Review bonus structure',
          'Add performance-based incentives',
          'Explore non-monetary benefits (extra leave, flexible hours)'
        ]
      });
    }

    // Business travel recommendations
    if (businessTravel === 'Travel_Frequently' || businessTravel === 'Frequent Traveler') {
      recommendations.push({
        priority: 'Medium',
        icon: '✈️',
        category: 'Travel Management',
        suggestions: [
          'Review travel frequency and necessity',
          'Offer additional compensation for travel',
          'Provide better travel accommodations',
          'Allow remote work days between travel',
          'Consider virtual meeting alternatives'
        ]
      });
    }

    // Job role specific recommendations
    if (jobRole.includes('Sales')) {
      recommendations.push({
        priority: 'High',
        icon: '🎯',
        category: 'Sales Team Retention',
        suggestions: [
          'Review sales targets and quotas',
          'Enhance commission structure',
          'Provide advanced sales training',
          'Recognize top performers publicly',
          'Create sales career advancement path'
        ]
      });
    } else if (jobRole.includes('Research') || jobRole.includes('Scientist')) {
      recommendations.push({
        priority: 'Medium',
        icon: '🔬',
        category: 'R&D Retention',
        suggestions: [
          'Provide research budget and resources',
          'Support conference attendance',
          'Allow publication opportunities',
          'Offer patent filing support',
          'Create innovation time (20% projects)'
        ]
      });
    } else if (jobRole.includes('Manager') || jobRole.includes('Director')) {
      recommendations.push({
        priority: 'High',
        icon: '👔',
        category: 'Management Retention',
        suggestions: [
          'Provide leadership development programs',
          'Offer executive coaching',
          'Review decision-making authority',
          'Create succession planning opportunities',
          'Enhance performance bonuses'
        ]
      });
    }

    // Add general recommendations if none specific
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'Standard',
        icon: '📋',
        category: 'General Retention',
        suggestions: [
          'Schedule regular check-ins',
          'Recognize achievements publicly',
          'Provide professional development budget',
          'Ensure competitive benefits package',
          'Create positive team culture'
        ]
      });
    }

    return recommendations;
  };

  // Handle viewing recommendations for an employee
  const handleViewRecommendations = (employee) => {
    const enrichedEmployee = {
      ...employee,
      recommendations: generateRecommendations(employee)
    };
    setSelectedEmployee(enrichedEmployee);
    setShowRecommendations(true);
  };

  // Live reload function to load employee.csv
  const handleLiveReload = async () => {
    setLiveLoading(true);
    setError('');

    try {
      // Try multiple possible paths for the CSV file
      let response;
      const possiblePaths = [
        '/employee.csv',
        './employee.csv',
        `${window.location.origin}/employee.csv`,
        '/public/employee.csv'
      ];

      let csvContent = null;
      let successfulPath = '';

      for (const path of possiblePaths) {
        try {
          console.log(`Trying to fetch from: ${path}`);
          response = await fetch(path);
          if (response.ok) {
            csvContent = await response.text();
            successfulPath = path;
            console.log(`✅ Successfully loaded from: ${path}`);
            break;
          }
        } catch (err) {
          console.log(`❌ Failed to load from: ${path}`);
        }
      }

      if (!csvContent) {
        throw new Error('Could not load employee.csv file. Please ensure it exists in the public folder.');
      }

      console.log('CSV content loaded, length:', csvContent.length);

      // Validate CSV format
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows');
      }

      const headerCount = lines[0].split(',').length;

      // Check each line for correct number of fields
      for (let i = 1; i < Math.min(lines.length, 20); i++) {
        if (lines[i].trim() === '') continue;
        const fieldCount = lines[i].split(',').length;
        if (fieldCount !== headerCount) {
          throw new Error(`CSV format error at line ${i + 1}`);
        }
      }

      // Create file and send to API
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'employee.csv', { type: 'text/csv' });

      const formData = new FormData();
      formData.append('csv_file', file);

      console.log('Sending to API for batch prediction...');
      const apiResponse = await fetch(`${API_BASE_URL}/api/predict/batch`, {
        method: 'POST',
        body: formData
      });

      const data = await apiResponse.json();
      console.log('API Response:', data);

      if (data.success) {
        // Get all employees from preview
        let allEmployees = data.preview || [];

        // Filter employees with risk score > 0.20
        const highRisk = allEmployees.filter(emp => {
          const riskScore = parseFloat(emp.Risk_Score || emp.risk_score || 0);
          return riskScore > 0.20;
        });

        console.log(`Found ${highRisk.length} high-risk employees (risk > 0.20)`);

        setLiveData(data);
        setHighRiskEmployees(highRisk);
        setLastReloadTime(new Date());
        setShowLivePopup(true);

        if (highRisk.length > 0) {
          console.log(`🔔 ${highRisk.length} high-risk employees detected`);
        }
      } else {
        throw new Error(data.error || 'Live reload failed');
      }
    } catch (err) {
      console.error('Live reload error:', err);
      setError(`Live reload failed: ${err.message}`);
    } finally {
      setLiveLoading(false);
    }
  };

  // Debug function to check CSV file
  const debugCsvFile = async () => {
    try {
      const response = await fetch('/employee.csv');
      if (!response.ok) {
        alert('❌ employee.csv not found in public folder');
        return;
      }

      const text = await response.text();
      const lines = text.split('\n');

      let debugInfo = '📄 employee.csv Debug Info:\n\n';
      debugInfo += `File size: ${text.length} bytes\n`;
      debugInfo += `Total lines: ${lines.length}\n`;
      debugInfo += `Header: ${lines[0] || 'Empty'}\n`;
      debugInfo += `Header fields: ${lines[0] ? lines[0].split(',').length : 0}\n\n`;

      debugInfo += 'First 5 data rows:\n';
      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        if (lines[i].trim()) {
          debugInfo += `Line ${i + 1}: ${lines[i].substring(0, 100)}`;
          debugInfo += ` (${lines[i].split(',').length} fields)\n`;
        }
      }

      alert(debugInfo);
    } catch (err) {
      alert('Error reading CSV: ' + err.message);
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


	const generateQuickRecommendations = (employee) => {
	  const riskScore = parseFloat(employee.Risk_Score || employee.risk_score || 0);
	  const overTime = employee.OverTime || employee.over_time || '';
	  const jobLevel = parseInt(employee.JobLevel || employee.job_level) || 0;
	  const monthlyIncome = parseFloat(employee.MonthlyIncome || employee.monthly_income) || 0;

	  const quick = [];

	  if (riskScore > 0.30) {
		quick.push("Immediate HR check-in meeting");
	  }

	  if (overTime === "Yes") {
		quick.push("Reduce overtime / adjust workload");
	  }

	  if (jobLevel < 3) {
		quick.push("Discuss career progression plan");
	  }

	  if (monthlyIncome < 50000) {
		quick.push("Review salary & compensation");
	  }

	  if (quick.length === 0) {
		quick.push("Schedule employee engagement discussion");
	  }

	  return quick;
	};


  const getRiskScoreColor = (score) => {
    if (score > 0.20) return '#dc3545';
    if (score > 0.10) return '#ffc107';
    return '#28a745';
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
      {/* Live Reload Bell Button */}
      <div className="live-reload-container">
        <button
          className={`live-reload-btn ${liveLoading ? 'loading' : ''} ${highRiskEmployees.length > 0 && !showLivePopup ? 'has-alerts' : ''}`}
          onClick={handleLiveReload}
          disabled={liveLoading}
          title="Load employee.csv and check high-risk employees"
        >
          <i className={`fas fa-bell ${liveLoading ? 'fa-ring' : ''}`}></i>
          <span className="reload-text">
            {liveLoading ? 'Loading...' : 'Reload Live'}
          </span>
          {highRiskEmployees.length > 0 && !showLivePopup && (
            <span className="notification-badge">{highRiskEmployees.length}</span>
          )}
        </button>
        {lastReloadTime && (
          <span className="last-reload">
            Last: {lastReloadTime.toLocaleTimeString()}
          </span>
        )}

        {/* Debug button - shows CSV content */}

      </div>

      <div className="predictor-hero">
        <div className="hero-content">
          <div className="hero-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="hero-text">
            <h1>Employee Attrition Risk Predictor</h1>
            <p>
              Identify employees at risk of leaving and get personalized retention recommendations
              to improve workforce stability and reduce turnover costs.
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

      {/* Recommendations Modal */}
      {showRecommendations && selectedEmployee && (
        <div className="recommendations-modal-overlay">
          <div className="recommendations-modal">
            <div className="modal-header">
              <h3>
                <i className="fas fa-hand-holding-heart"></i>
                Retention Recommendations for {selectedEmployee.Name || selectedEmployee.name}
              </h3>
              <button className="close-btn" onClick={() => setShowRecommendations(false)}>×</button>
            </div>

            <div className="modal-content">
              <div className="employee-summary">
                <div className="summary-card">
                  <div className="summary-row">
                    <span className="label">Risk Score:</span>
                    <span className="value" style={{
                      color: getRiskScoreColor(parseFloat(selectedEmployee.Risk_Score || selectedEmployee.risk_score || 0)),
                      fontWeight: 'bold'
                    }}>
                      {((parseFloat(selectedEmployee.Risk_Score || selectedEmployee.risk_score || 0)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="label">Job Role:</span>
                    <span className="value">{selectedEmployee.JobRole || selectedEmployee.job_role || 'N/A'}</span>
                  </div>
                  <div className="summary-row">
                    <span className="label">Job Level:</span>
                    <span className="value">{selectedEmployee.JobLevel || selectedEmployee.job_level || 'N/A'}</span>
                  </div>
                  <div className="summary-row">
                    <span className="label">Age:</span>
                    <span className="value">{selectedEmployee.Age || selectedEmployee.age || 'N/A'}</span>
                  </div>
                  <div className="summary-row">
                    <span className="label">Overtime:</span>
                    <span className="value">{selectedEmployee.OverTime || selectedEmployee.over_time || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="recommendations-list">
                {selectedEmployee.recommendations && selectedEmployee.recommendations.map((rec, idx) => (
                  <div key={idx} className={`recommendation-card priority-${rec.priority.toLowerCase()}`}>
                    <div className="recommendation-header">
                      <span className="priority-icon">{rec.icon}</span>
                      <span className="priority-badge">{rec.priority} Priority</span>
                      <span className="category">{rec.category}</span>
                    </div>
                    <ul className="suggestions-list">
                      {rec.suggestions.map((suggestion, sIdx) => (
                        <li key={sIdx}>
                          <i className="fas fa-check-circle"></i>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="retention-tips">
                <h4>💡 Quick Retention Tips</h4>
                <div className="tips-grid">
                  <div className="tip-item">
                    <i className="fas fa-comments"></i>
                    <span>Regular check-ins</span>
                  </div>
                  <div className="tip-item">
                    <i className="fas fa-trophy"></i>
                    <span>Recognition programs</span>
                  </div>
                  <div className="tip-item">
                    <i className="fas fa-chart-line"></i>
                    <span>Career progression</span>
                  </div>
                  <div className="tip-item">
                    <i className="fas fa-balance-scale"></i>
                    <span>Work-life balance</span>
                  </div>
                  <div className="tip-item">
                    <i className="fas fa-graduation-cap"></i>
                    <span>Learning opportunities</span>
                  </div>
                  <div className="tip-item">
                    <i className="fas fa-heart"></i>
                    <span>Wellness programs</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="download-pdf-btn" onClick={() => {
                // Here you could implement PDF download
                alert('Download recommendations as PDF - feature coming soon!');
              }}>
                <i className="fas fa-file-pdf"></i>
                Download Recommendations
              </button>
              <button className="close-btn" onClick={() => setShowRecommendations(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Reload Popup */}
      {showLivePopup && liveData && (
        <div className="live-popup-overlay">
          <div className="live-popup">
            <div className="popup-header">
              <h3>
                <i className="fas fa-bell"></i>
                Live Reload Results - employee.csv
              </h3>
              <button className="close-btn" onClick={() => setShowLivePopup(false)}>×</button>
            </div>

            <div className="popup-content">
              <div className="popup-summary">
                <div className="summary-item">
                  <span className="label">Total Employees:</span>
                  <span className="value">{liveData.total_employees || 0}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Avg Risk Score:</span>
                  <span className="value">
                    {liveData.summary?.average_risk_score ?
                      (liveData.summary.average_risk_score * 100).toFixed(1) + '%' :
                      '0%'}
                  </span>
                </div>
              </div>

              {/* High Risk Employees Section (Risk > 0.20) */}
              <div className="high-risk-section">
                <h4>
                  <i className="fas fa-exclamation-triangle" style={{ color: '#dc3545' }}></i>
                  High Risk Employees (Risk Score > 20%)
                  <span className="high-risk-count">{highRiskEmployees.length}</span>
                </h4>

                {highRiskEmployees.length > 0 ? (
                  <div className="high-risk-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Job Role</th>
                          <th>Risk Score</th>
                          <th>Risk Label</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {highRiskEmployees.map((emp, idx) => (
                          <tr key={idx}>
                            <td>{emp.Name || emp.name || `Employee ${idx + 1}`}</td>
                            <td>{emp.JobRole || emp.job_role || emp.Job_Role || 'N/A'}</td>
                            <td style={{
                              color: getRiskScoreColor(parseFloat(emp.Risk_Score || emp.risk_score || 0)),
                              fontWeight: 'bold'
                            }}>
                              {((parseFloat(emp.Risk_Score || emp.risk_score || 0)) * 100).toFixed(1)}%
                            </td>
                            <td>
                              <span className={`risk-badge ${(emp.Risk_Label || emp.risk_label || '').toLowerCase().replace(' ', '-')}`}>
                                {emp.Risk_Label || emp.risk_label || 'Unknown'}
                              </span>
                            </td>

							 <td>
  <ul className="quick-recommend-list">
    {generateQuickRecommendations(emp).map((rec, i) => (
      <li key={i}>{rec}</li>
    ))}
  </ul>
</td>



                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-risk">No employees with risk score above 20%</p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="popup-stats">
                <div className="stat-box">
                  <span className="stat-label">High Risk</span>
                  <span className="stat-value" style={{ color: '#dc3545' }}>
                    {liveData.summary?.high_risk_count || 0}
                  </span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Medium Risk</span>
                  <span className="stat-value" style={{ color: '#ffc107' }}>
                    {liveData.summary?.medium_risk_count || 0}
                  </span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Low Risk</span>
                  <span className="stat-value" style={{ color: '#28a745' }}>
                    {liveData.summary?.low_risk_count || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="popup-footer">
              <button
                className="download-btn small"
                onClick={() => window.open(`${API_BASE_URL}${liveData.download_url}`, '_blank')}
              >
                <i className="fas fa-download"></i>
                Download Full Results
              </button>
              <button className="close-btn" onClick={() => setShowLivePopup(false)}>
                Close
              </button>
            </div>
          </div>
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
          <p className="required-columns">
            <strong>Required:</strong> Age, BusinessTravel, JobRole, JobLevel, MonthlyIncome, OverTime
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
                            (row[col] * 100).toFixed(1) + '%' :
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
                  <span className="stat-value">
                    {batchResult.summary?.average_risk_score ?
                      (batchResult.summary.average_risk_score * 100).toFixed(1) + '%' :
                      '0%'}
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <i className="fas fa-exclamation-triangle"></i>
                <div>
                  <span className="stat-label">High Risk</span>
                  <span className="stat-value">{batchResult.summary?.high_risk_count || 0}</span>
                </div>
              </div>
            </div>

            {/* Risk Distribution */}
            {batchResult.summary?.risk_distribution && (
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
            )}

            {/* High Risk Employees */}
            {batchResult.high_risk_employees && batchResult.high_risk_employees.length > 0 && (
              <div className="high-risk-employees">
                <h4>⚠️ Top High Risk Employees</h4>
                <div className="risk-list">
                  {batchResult.high_risk_employees.map((employee, idx) => (
                    <div key={idx} className="risk-item">
                      <span className="rank">#{idx + 1}</span>
                      <span className="name">{employee.name}</span>
                      <span className="role">{employee.job_role}</span>
                      <span className="score" style={{ color: '#dc3545', fontWeight: 'bold' }}>
                        Risk: {(employee.risk_score * 100).toFixed(1)}%
                      </span>
                      <button
                        className="small-recommend-btn"
                        onClick={() => handleViewRecommendations(employee)}
                        title="View retention recommendations"
                      >
                        <i className="fas fa-hand-holding-heart"></i>
                      </button>
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

      {/* Additional Styles for Recommendations */}
      <style jsx>{`
        .live-reload-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
        }

        .live-reload-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 50px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          transition: all 0.3s ease;
          position: relative;
        }

        .live-reload-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }

        .live-reload-btn.has-alerts {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          animation: pulse 2s infinite;
        }

        .live-reload-btn.loading {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .debug-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          margin-top: 5px;
        }

        .fa-ring {
          animation: ring 0.5s ease;
        }

        .notification-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #dc3545;
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          border: 2px solid white;
        }

        .last-reload {
          font-size: 12px;
          color: #666;
          background: white;
          padding: 4px 8px;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .live-popup-overlay,
        .recommendations-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .live-popup,
        .recommendations-modal {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .recommendations-modal {
          max-width: 900px;
        }

        .popup-header,
        .modal-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header {
          background: linear-gradient(135deg, #43a047 0%, #2e7d32 100%);
        }

        .popup-header h3,
        .modal-header h3 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .popup-content,
        .modal-content {
          padding: 20px;
          overflow-y: auto;
          max-height: calc(80vh - 140px);
        }

        .popup-summary {
          display: flex;
          justify-content: space-around;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .summary-item {
          text-align: center;
        }

        .summary-item .label {
          display: block;
          font-size: 14px;
          color: #666;
          margin-bottom: 5px;
        }

        .summary-item .value {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }

        .high-risk-section {
          background: #fff5f5;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
          border-left: 4px solid #dc3545;
        }

        .high-risk-section h4 {
          margin: 0 0 15px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .high-risk-count {
          background: #dc3545;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 14px;
          margin-left: 10px;
        }

        .high-risk-table {
          overflow-x: auto;
        }

        .high-risk-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .high-risk-table th,
        .high-risk-table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }

        .high-risk-table th {
          background: #f8f9fa;
          font-weight: 600;
        }

        .recommend-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .recommend-btn:hover {
          background: #218838;
        }

        .small-recommend-btn {
          background: #28a745;
          color: white;
          border: none;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          margin-left: 10px;
        }

        .small-recommend-btn:hover {
          background: #218838;
        }

        .risk-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .risk-badge.high-risk {
          background: #dc3545;
          color: white;
        }

        .risk-badge.medium-risk {
          background: #ffc107;
          color: #000;
        }

        .risk-badge.low-risk {
          background: #28a745;
          color: white;
        }

        .popup-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-top: 20px;
        }

        .stat-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-box .stat-label {
          display: block;
          font-size: 14px;
          color: #666;
          margin-bottom: 5px;
        }

        .stat-box .stat-value {
          font-size: 24px;
          font-weight: bold;
        }

        .popup-footer,
        .modal-footer {
          padding: 20px;
          background: #f8f9fa;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .no-risk {
          color: #28a745;
          font-style: italic;
          padding: 10px;
        }

        .required-columns {
          background: #e3f2fd;
          padding: 10px;
          border-radius: 4px;
          margin: 10px 0;
          font-size: 14px;
        }

        /* Recommendations Modal Styles */
        .employee-summary {
          margin-bottom: 20px;
        }

        .summary-card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 15px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }

        .summary-row {
          display: flex;
          flex-direction: column;
        }

        .summary-row .label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }

        .summary-row .value {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .recommendations-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-bottom: 20px;
        }

        .recommendation-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          background: white;
        }

        .recommendation-card.priority-critical {
          border-left: 4px solid #dc3545;
        }

        .recommendation-card.priority-high {
          border-left: 4px solid #fd7e14;
        }

        .recommendation-card.priority-medium {
          border-left: 4px solid #ffc107;
        }

        .recommendation-card.priority-standard {
          border-left: 4px solid #28a745;
        }

        .recommendation-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .priority-icon {
          font-size: 20px;
        }

        .priority-badge {
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .category {
          font-weight: 600;
          color: #333;
        }

        .suggestions-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .suggestions-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .suggestions-list li:last-child {
          border-bottom: none;
        }

        .suggestions-list li i {
          color: #28a745;
          font-size: 14px;
        }

        .retention-tips {
          background: linear-gradient(135deg, #667eea0 0%, #764ba2 100%);
          border-radius: 8px;
          padding: 15px;
          margin-top: 20px;
        }

        .retention-tips h4 {
          margin: 0 0 15px 0;
          color: black;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .tips-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
        }

        .tip-item {
          background: rgba(255, 255, 255, 0.9);
          padding: 10px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .tip-item i {
          color: #28a745;
        }

        .download-pdf-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .download-pdf-btn:hover {
          background: #c82333;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        @keyframes ring {
          0% { transform: rotate(0); }
          25% { transform: rotate(15deg); }
          50% { transform: rotate(-15deg); }
          75% { transform: rotate(5deg); }
          100% { transform: rotate(0); }
        }
      `}</style>
    </div>
  );
};

export default EmployeeAttrition;