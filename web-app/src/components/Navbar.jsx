import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import './Navbar.css';

const Navbar = ({ user, daysUntilExam }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-logo">
          <span>FinLearn</span>
        </Link>
        
        {user && daysUntilExam !== null && (
          <div className="navbar-countdown">
            <span className="days-count">{daysUntilExam}</span>
            <span className="days-label">Days until exam</span>
          </div>
        )}
        
        {user && (
          <div className="navbar-links">
            <Link to="/guided-learning-experience" className={location.pathname === '/guided-learning-experience' ? 'active' : ''}>
              Learning
            </Link>
            <Link to="/chapters" className={location.pathname === '/chapters' || location.pathname.includes('/flashcards/') || location.pathname.includes('/quiz/') || location.pathname.includes('/concepts/') ? 'active' : ''}>
              Chapters
            </Link>
            <Link to="/profile" className="profile-circle-link">
              <div className="profile-circle">
                <span>{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
              </div>
            </Link>
            <button onClick={handleSignOut} className="sign-out-button">
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
