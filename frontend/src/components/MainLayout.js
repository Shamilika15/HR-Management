
import React, { useContext, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContext';

const MainLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/Register');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const closeMobileSidebar = () => setMobileOpen(false);

  const isAuthPage = location.pathname.toLowerCase() === '/login' || location.pathname.toLowerCase() === '/register';

  if (isAuthPage) {
    return (
      <div className="app-container" style={{ background: '#0f1624' }}>
        <main className="main-content" style={{ marginLeft: 0, padding: 0, width: '100%' }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Mobile Hamburger Button */}
      <button
        className="mobile-menu-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <i className={`fas fa-${mobileOpen ? 'times' : 'bars'}`}></i>
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={closeMobileSidebar}></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <img src="/static/Assets/images/logo.png" alt="FOCUSBOOST" className="sidebar-logo" />
            {!sidebarCollapsed && <span className="logo-text">AI HCM System</span>}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <i className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'}`}></i>
          </button>
        </div>

        <div className="sidebar-content">
          {/* User Info */}
          {user && (
            <div className="user-info">
              <div className="user-avatar">
                <i className="fas fa-user-circle"></i>
              </div>
              {!sidebarCollapsed && (
                <div className="user-details">
                  <span className="user-name">{user.email}</span>

                </div>
              )}
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="sidebar-nav">
            <ul className="nav-menu">
              {!user ? (
                // Public Menu - Simple Register and Login
                <>
                  <li className={`nav-item ${isActive('/') ? 'active' : ''}`}>
                    <Link to="/" className="nav-link">
                      <i className="fas fa-home"></i>
                      {!sidebarCollapsed && <span>Home</span>}
                    </Link>
                  </li>

                  <li className={`nav-item ${isActive('/register') ? 'active' : ''}`}>
                    <Link to="/register" className="nav-link">
                      <i className="fas fa-user-plus"></i>
                      {!sidebarCollapsed && <span>Register</span>}
                    </Link>
                  </li>

                  <li className={`nav-item ${isActive('/login') ? 'active' : ''}`}>
                    <Link to="/login" className="nav-link">
                      <i className="fas fa-sign-in-alt"></i>
                      {!sidebarCollapsed && <span>Login</span>}
                    </Link>
                  </li>
                </>
              ) : (
                // Authenticated Menu
                <>
                  {user.userType === 'Player' && (
                    <>
                      <li className={`nav-item ${isActive('/') ? 'active' : ''}`}>
                        <Link to="/" className="nav-link">
                          <i className="fas fa-home"></i>
                          {!sidebarCollapsed && <span>Dashboard</span>}
                        </Link>
                      </li>

                      <li className={`nav-item ${isActive('/CandidateFitPredictor') ? 'active' : ''}`}>
                        <Link to="/CandidateFitPredictor" className="nav-link">
                          <i className="fas fa-chart-line"></i>
                          {!sidebarCollapsed && <span>Candidate Fit</span>}
                        </Link>
                      </li>

                      <li className={`nav-item ${isActive('/Productivity_Predictor') ? 'active' : ''}`}>
                        <Link to="/Productivity_Predictor" className="nav-link">
                          <i className="fas fa-tachometer-alt"></i>
                          {!sidebarCollapsed && <span>Productivity</span>}
                        </Link>
                      </li>

                      <li className={`nav-item ${isActive('/Employee_Attrition') ? 'active' : ''}`}>
                        <Link to="/Employee_Attrition" className="nav-link">
                          <i className="fas fa-exclamation-triangle"></i>
                          {!sidebarCollapsed && <span>Attrition</span>}
                        </Link>
                      </li>

                      <li className={`nav-item ${isActive('/Dynamic_Interview') ? 'active' : ''}`}>
                        <Link to="/Dynamic_Interview" className="nav-link">
                          <i className="fas fa-comments"></i>
                          {!sidebarCollapsed && <span>Interview</span>}
                        </Link>
                      </li>
                    </>
                  )}

                  {user.userType === 'club' && (
                    <li className={`nav-item ${isActive('/RankedPlayers') ? 'active' : ''}`}>
                      <Link to="/RankedPlayers" className="nav-link">
                        <i className="fas fa-trophy"></i>
                        {!sidebarCollapsed && <span>Ranked Players</span>}
                      </Link>
                    </li>
                  )}

                  <li className="nav-item logout">
                    <button className="nav-link logout-btn" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt"></i>
                      {!sidebarCollapsed && <span>Logout</span>}
                    </button>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>

        {!sidebarCollapsed && (
          <div className="sidebar-footer">
            <p>© 2026 AI HCM System</p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        {children}
      </main>
    </div>
  );
};

export default MainLayout;