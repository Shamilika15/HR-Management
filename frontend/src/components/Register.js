
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    address: '',
    password: '',
    confirmPassword: ''
  });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('danger');
      return false;
    }
    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters');
      setMessageType('danger');
      return false;
    }
    return true;
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          mobile: formData.mobile,
          address: formData.address,
          password: formData.password,
          userType: 'Player'
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Registration successful! Redirecting to login...');
        setMessageType('success');
        setTimeout(() => {
          navigate('/Player_login');
        }, 2000);
      } else {
        setMessage(result.message || 'Registration failed');
        setMessageType('danger');
      }
    } catch (error) {
      console.error('Error during registration:', error);
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
            <i className="fas fa-user-plus"></i>
          </div>
          <h2>Create Account</h2>
          <p>Join us today! Fill in your details to get started.</p>
        </div>

        {message && (
          <div className={`alert alert-${messageType}`}>
            <i className={`fas fa-${messageType === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
            <span>{message}</span>
            <button className="alert-close" onClick={() => setMessage('')}>×</button>
          </div>
        )}

        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-group">
            <label htmlFor="fullName">
              <i className="fas fa-user"></i>
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              className="form-control"
            />
          </div>

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

          <div className="form-row">
            <div className="form-group half">
              <label htmlFor="mobile">
                <i className="fas fa-phone"></i>
                Mobile Number
              </label>
              <input
                type="tel"
                id="mobile"
                name="mobile"
                placeholder="Enter mobile number"
                value={formData.mobile}
                onChange={handleInputChange}
                required
                className="form-control"
              />
            </div>

            <div className="form-group half">
              <label htmlFor="address">
                <i className="fas fa-map-marker-alt"></i>
                Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                placeholder="Enter your address"
                value={formData.address}
                onChange={handleInputChange}
                required
                className="form-control"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group half">
              <label htmlFor="password">
                <i className="fas fa-lock"></i>
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="form-control"
              />
            </div>

            <div className="form-group half">
              <label htmlFor="confirmPassword">
                <i className="fas fa-lock"></i>
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                className="form-control"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="auth-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Creating Account...
              </>
            ) : (
              <>
                <i className="fas fa-user-plus"></i>
                Register Now
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account?</p>
          <Link to="/login" className="auth-link">
            <i className="fas fa-sign-in-alt"></i>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;