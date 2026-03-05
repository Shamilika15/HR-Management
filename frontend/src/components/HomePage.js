
import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="homepage-container">
      {/* Hero Section with Background */}
      <div className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <i className="fas fa-robot"></i>
            <span>AI-Powered HCM System</span>
          </div>
          
          <h1 className="hero-title">
            Welcome to <span className="gradient-text">AI_HCM</span>
          </h1>
          
          <p className="hero-subtitle">
            Revolutionizing Human Capital Management with Artificial Intelligence
          </p>
          
          <div className="hero-stats">
            <div className="stat-item">
              <i className="fas fa-chart-line"></i>
              <div>
                <span className="stat-value">4</span>
                <span className="stat-label">AI Predictors</span>
              </div>
            </div>
            <div className="stat-item">
              <i className="fas fa-users"></i>
              <div>
                <span className="stat-value">100%</span>
                <span className="stat-label">Data-Driven</span>
              </div>
            </div>
            <div className="stat-item">
              <i className="fas fa-bolt"></i>
              <div>
                <span className="stat-value">Real-time</span>
                <span className="stat-label">Analytics</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="section-header">
          <h2>Our AI-Powered Features</h2>
          <p>Leverage cutting-edge machine learning for smarter HR decisions</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <i className="fas fa-chart-line"></i>
            </div>
            <h3>Candidate Fit Predictor</h3>
            <p>Match candidates to job descriptions with AI-powered similarity scoring and predictive analytics.</p>
             
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <i className="fas fa-tachometer-alt"></i>
            </div>
            <h3>Productivity Predictor</h3>
            <p>Forecast employee productivity levels and identify performance patterns.</p>
             
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)' }}>
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Attrition Predictor</h3>
            <p>Identify employees at risk of leaving and take proactive retention measures.</p>
             
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <i className="fas fa-comments"></i>
            </div>
            <h3>Dynamic Interview</h3>
            <p>AI-powered interview questions and answer evaluation system.</p>
             
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="how-it-works">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Simple, intuitive, and powerful - get started in minutes</p>
        </div>

        <div className="steps-container">
          <div className="step-item">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Register Account</h3>
              <p>Create your account with basic information to access our AI tools</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Upload Data</h3>
              <p>Upload employee CSV files or input data for analysis</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Get Insights</h3>
              <p>Receive AI-powered predictions and actionable insights</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Make Decisions</h3>
              <p>Use data-driven insights for better HR decisions</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <div className="cta-content">
          <h2>Ready to Transform Your HR Operations?</h2>
          <p>Join hundreds of companies using AI to make smarter human capital decisions</p>
          <div className="cta-buttons">
            <Link to="/Player_register" className="cta-btn primary">
              <i className="fas fa-user-plus"></i>
              Get Started
            </Link>
            <Link to="/Player_login" className="cta-btn secondary">
              <i className="fas fa-sign-in-alt"></i>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;