
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from './AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Login successful! Redirecting...');
        setMessageType('success');
        login(result.user._id, result.user.email, 'Player');
        setTimeout(() => {
          navigate('/CandidateFitPredictor');
        }, 1500);
      } else {
        setMessage(result.message || 'Invalid email or password');
        setMessageType('danger');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('An error occurred. Please try again.');
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">
            <i className="fas fa-sign-in-alt"></i>
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to access your account</p>
        </div>

        {message && (
          <div className={`alert alert-${messageType}`}>
            <i className={`fas fa-${messageType === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
            <span>{message}</span>
            <button className="alert-close" onClick={() => setMessage('')}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">
              <i className="fas fa-envelope"></i>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <i className="fas fa-lock"></i>
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="form-control"
            />
          </div>
 

          <button 
            type="submit" 
            className="auth-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Signing In...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account?</p>
          <Link to="/Player_register" className="auth-link">
            <i className="fas fa-user-plus"></i>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;