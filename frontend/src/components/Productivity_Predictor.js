
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from './AuthContext';


const API_BASE_URL = 'http://localhost:5002';

const EmployeeProductivity = () => {
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
          message: `API connected. Model loaded: ${data.model_loaded ? 'Yes' : 'No'}`,
          details: data
        });
      } else {
        setApiStatus({ status: 'error', message: 'API not responding properly' });
      }
    } catch (err) {
      setApiStatus({
        status: 'error',
        message: 'Cannot connect to API. Make sure Flask server is running on port 5002.'
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

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'High Risk': return '#dc3545';
      case 'Moderate Risk': return '#ffc107';
      case 'Low Risk': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getClassLabel = (predClass) => {
    const labels = ['Very Low', 'Low', 'Average', 'High', 'Very High'];
    return labels[predClass - 1] || 'Unknown';
  };

  if (!user) {
    return (
      <div className="productivity-container">
        <div className="login-message">
          <h2>Please log in to access Employee Productivity Predictor</h2>
          <p>Batch process employee CSV files to predict productivity levels and risk assessment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="productivity-container">
      <div className="prod-hero">
        {/* Centred heading block */}
        <div className="prod-hero-heading">
          <div className="prod-hero-badge">
            <i className="fas fa-chart-bar"></i>
            <span>AI-Powered Analytics</span>
          </div>
          <h1 className="prod-hero-title">
            Employee Performance &amp; <span className="prod-hero-highlight">Productivity Predictor</span>
          </h1>
          <p className="prod-hero-subtitle">
            Analyze employee performance data in bulk and generate productivity
            insights using intelligent machine learning models.
          </p>
        </div>

        {/* Vertical spacer + stat pills */}
        <div className="prod-hero-divider"></div>

        <div className="prod-hero-pills">
          <div className="prod-hero-pill">
            <span className="prod-pill-icon"><i className="fas fa-database"></i></span>
            <span className="prod-pill-label">Bulk Processing</span>
          </div>
          <div className="prod-hero-pill">
            <span className="prod-pill-icon"><i className="fas fa-chart-line"></i></span>
            <span className="prod-pill-label">Performance Insights</span>
          </div>
          <div className="prod-hero-pill">
            <span className="prod-pill-icon"><i className="fas fa-cogs"></i></span>
            <span className="prod-pill-label">Automated Analysis</span>
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

      {/* Upload Section */}
      <div className="batch-processing-section">
        <div className="upload-card-modern">

          {/* Cloud icon */}
          <div className="ucm-icon-wrap">
            <i className="fas fa-cloud-upload-alt"></i>
          </div>

          {/* Title & subtitle */}
          <h3 className="ucm-title">Upload Employee Data</h3>
          <p className="ucm-subtitle">
            Drag and drop your CSV file here, or click to browse.
          </p>

          {/* Selected file indicator */}
          {csvFileName && (
            <p className="ucm-selected">
              <i className="fas fa-file-csv"></i>
              Selected: <strong>{csvFileName}</strong>
            </p>
          )}

          {/* Action buttons — Row 1: secondary actions */}
          <div className="ucm-actions ucm-row-secondary">
            {/* SELECT CSV FILE */}
            <label className="ucm-btn ucm-btn-outline ucm-half">
              <i className="fas fa-folder-open"></i>
              Select CSV File
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                style={{ display: 'none' }}
              />
            </label>

            {/* PREVIEW DATA */}
            <button
              className="ucm-btn ucm-btn-outline ucm-half"
              onClick={handlePreview}
              disabled={loading || !csvFile}
            >
              <i className="fas fa-eye"></i>
              Preview Data
            </button>
          </div>

          {/* Row 2: Primary action full-width */}
          <button
            className="ucm-btn ucm-btn-primary ucm-full"
            onClick={handleBatchPredict}
            disabled={loading || !csvFile}
          >
            {loading ? (
              <><i className="fas fa-spinner fa-spin"></i> Processing...</>
            ) : (
              <><i className="fas fa-bolt"></i> Run Prediction</>
            )}
          </button>
        </div>

        {/* Preview Results */}
        {previewData && (() => {
          const PREVIEW_COLUMNS = ['role_level', 'position', 'Predicted_Class', 'Productivity_Score', 'Adjusted_Productivity', 'Risk_Level'];
          const visibleCols = PREVIEW_COLUMNS.filter(col => previewData.columns.includes(col));
          return (
            <div className="preview-section">
              <h3>Data Preview</h3>
              <p>Total rows: {previewData.total_rows} | Showing first {previewData.preview_rows}</p>

              <div className="preview-table">
                <table>
                  <thead>
                    <tr>
                      {visibleCols.map(col => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.preview.map((row, idx) => (
                      <tr key={idx}>
                        {visibleCols.map(col => (
                          <td key={col}>
                            {typeof row[col] === 'number' ? row[col].toFixed(2) : (row[col] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Batch Results */}
        {batchResult && (
          <div className="batch-results">
            <h3>Batch Processing Complete</h3>

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
                  <span className="stat-label">Avg Productivity</span>
                  <span className="stat-value">{batchResult.summary.average_productivity.toFixed(1)}%</span>
                </div>
              </div>

              <div className="stat-card">
                <i className="fas fa-tachometer-alt"></i>
                <div>
                  <span className="stat-label">Avg Adjusted</span>
                  <span className="stat-value">{batchResult.summary.average_adjusted.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Class Distribution */}
            <div className="class-distribution">
              <div className="class-dist-header">
                <div className="class-dist-title-group">
                  <i className="fas fa-chart-pie class-dist-icon"></i>
                  <h4>Performance Class Distribution</h4>
                </div>
                <span className="class-dist-total">{batchResult.total_employees} employees</span>
              </div>
              <div className="class-cards-grid">
                {[1, 2, 3, 4, 5].map(classNum => {
                  const count = batchResult.summary.class_distribution[classNum] || 0;
                  const percentage = batchResult.total_employees > 0
                    ? ((count / batchResult.total_employees) * 100).toFixed(1)
                    : 0;
                  const classConfig = [
                    { label: 'Very Low', gradient: 'linear-gradient(135deg, #f5576c, #f093fb)', glow: '#f5576c' },
                    { label: 'Low', gradient: 'linear-gradient(135deg, #fd7e14, #ffc107)', glow: '#fd7e14' },
                    { label: 'Average', gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)', glow: '#4facfe' },
                    { label: 'High', gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)', glow: '#43e97b' },
                    { label: 'Very High', gradient: 'linear-gradient(135deg, #667eea, #764ba2)', glow: '#667eea' },
                  ][classNum - 1];
                  return (
                    <div key={classNum} className="class-perf-card">
                      <div className="class-perf-card-top" style={{ background: classConfig.gradient }}>
                        <span className="class-perf-num">C{classNum}</span>
                        <span className="class-perf-pct">{percentage}%</span>
                      </div>
                      <div className="class-perf-card-body">
                        <div className="class-perf-count">{count}</div>
                        <div className="class-perf-label">{classConfig.label}</div>
                        <div className="class-perf-bar-wrap">
                          <div
                            className="class-perf-bar-fill"
                            style={{ width: `${percentage}%`, background: classConfig.gradient, boxShadow: `0 0 8px ${classConfig.glow}60` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Risk Distribution — Pie Chart */}
            {(() => {
              const RISK_CONFIG = {
                'High Risk': { color: '#ef4444', glow: '#ef444440' },
                'Moderate Risk': { color: '#f59e0b', glow: '#f59e0b40' },
                'Low Risk': { color: '#10b981', glow: '#10b98140' },
              };
              const riskEntries = Object.entries(batchResult.summary.risk_distribution);
              const total = riskEntries.reduce((s, [, c]) => s + c, 0);

              // SVG donut parameters
              const R = 70; // radius
              const CX = 90; const CY = 90; // centre of SVG
              const STROKE = 28; // donut width
              const circumference = 2 * Math.PI * R;
              let cumulativeAngle = -90; // start at top

              const slices = riskEntries.map(([risk, count]) => {
                const pct = total > 0 ? count / total : 0;
                const angle = pct * 360;
                const startAngle = cumulativeAngle;
                cumulativeAngle += angle;
                const config = RISK_CONFIG[risk] || { color: '#94a3b8', glow: '#94a3b840' };
                return { risk, count, pct, startAngle, angle, ...config };
              });

              // Compute stroke-dasharray arc for each slice
              const polarToXY = (angleDeg, r) => {
                const rad = (angleDeg * Math.PI) / 180;
                return {
                  x: CX + r * Math.cos(rad),
                  y: CY + r * Math.sin(rad),
                };
              };

              const describeArc = (startDeg, angleDeg) => {
                if (angleDeg >= 360) angleDeg = 359.99;
                const start = polarToXY(startDeg, R);
                const end = polarToXY(startDeg + angleDeg, R);
                const large = angleDeg > 180 ? 1 : 0;
                return `M ${start.x} ${start.y} A ${R} ${R} 0 ${large} 1 ${end.x} ${end.y}`;
              };

              return (
                <div className="risk-pie-section">
                  <div className="risk-pie-header">
                    <i className="fas fa-chart-pie risk-pie-icon"></i>
                    <h4>Risk Distribution</h4>
                  </div>

                  <div className="risk-pie-layout">
                    {/* SVG Donut */}
                    <div className="risk-pie-chart-wrap">
                      <svg width="180" height="180" viewBox="0 0 180 180">
                        {/* Background ring */}
                        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
                        {/* Slices */}
                        {slices.map((s, i) => (
                          <path
                            key={i}
                            d={describeArc(s.startAngle, s.angle)}
                            fill="none"
                            stroke={s.color}
                            strokeWidth={STROKE}
                            strokeLinecap="butt"
                            style={{ filter: `drop-shadow(0 0 4px ${s.glow})` }}
                          />
                        ))}
                        {/* Count labels on each slice */}
                        {slices.map((s, i) => {
                          if (s.angle < 20) return null; // skip tiny slices
                          const midAngle = s.startAngle + s.angle / 2;
                          const midRad = (midAngle * Math.PI) / 180;
                          const lx = CX + R * Math.cos(midRad);
                          const ly = CY + R * Math.sin(midRad);
                          return (
                            <text
                              key={`lbl-${i}`}
                              x={lx}
                              y={ly + 4}
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight="800"
                              fill="#ffffff"
                              style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
                            >
                              {s.count}
                            </text>
                          );
                        })}
                        {/* Centre text */}
                        <text x={CX} y={CY - 8} textAnchor="middle" fontSize="24" fontWeight="800" fill="#1e293b">{total}</text>
                        <text x={CX} y={CY + 12} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600" letterSpacing="1">TOTAL</text>
                      </svg>
                    </div>

                    {/* Legend */}
                    <div className="risk-pie-legend">
                      {slices.map((s, i) => (
                        <div key={i} className="risk-legend-item">
                          <span className="risk-legend-dot" style={{ background: s.color, boxShadow: `0 0 6px ${s.glow}` }}></span>
                          <div className="risk-legend-info">
                            <span className="risk-legend-name">{s.risk}</span>
                            <div className="risk-legend-bar-wrap">
                              <div className="risk-legend-bar-fill" style={{ width: `${(s.pct * 100).toFixed(1)}%`, background: s.color }}></div>
                            </div>
                          </div>
                          <div className="risk-legend-stats">
                            <span className="risk-legend-count" style={{ color: s.color }}>{s.count}</span>
                            <span className="risk-legend-pct">{(s.pct * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Top Performers */}
            {batchResult.top_performers.length > 0 && (
              <div className="top-performers">
                <h4>🏆 Top 5 Performers</h4>
                <div className="performers-list">
                  {batchResult.top_performers.map((performer, idx) => (
                    <div key={idx} className="performer-item">
                      <span className="rank">#{idx + 1}</span>
                      <span className="name">{performer.name || `Employee ${idx + 1}`}</span>
                      <span className="score">{performer.Adjusted_Productivity.toFixed(1)}%</span>
                      <span className="risk-badge" style={{
                        background: getRiskColor(performer.Risk_Level) + '20',
                        color: getRiskColor(performer.Risk_Level)
                      }}>
                        {performer.Risk_Level}
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

export default EmployeeProductivity;