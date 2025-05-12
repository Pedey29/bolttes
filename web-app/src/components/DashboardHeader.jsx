import React from 'react';
import { Link } from 'react-router-dom';
import './DashboardHeader.css';

const DashboardHeader = ({ user, daysUntilExam }) => {
  return (
    <header className="dashboard-header">
      <div className="header-container">
        <div className="header-logo">
          <Link to="/">FinLearn</Link>
        </div>
        
        <div className="header-center">
          {daysUntilExam !== null ? (
            <div className={`header-countdown ${daysUntilExam <= 7 ? 'urgent' : daysUntilExam <= 14 ? 'warning' : ''}`}>
              <div className="header-countdown-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className="header-countdown-content">
                <span className="header-countdown-days">{daysUntilExam}</span>
                <span className="header-countdown-label">Days until exam</span>
              </div>
            </div>
          ) : (
            <div className="header-countdown no-date">
              <Link to="/profile" className="set-exam-link">Set exam date</Link>
            </div>
          )}
        </div>
        
        <div className="header-nav">
          <nav>
            <ul>
              <li>
                <Link to="/guided-learning-experience">Learning</Link>
              </li>
              <li>
                <Link to="/chapters">Chapters</Link>
              </li>
              <li>
                <Link to="/profile" className="profile-link">
                  <div className="profile-avatar">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
