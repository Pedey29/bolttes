import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import './Navbar.css';

const Navbar = ({ user }) => {
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
          <span>SIE Prep</span>
        </Link>
        
        {user && (
          <div className="navbar-links">
            <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
              Dashboard
            </Link>
            <Link to="/chapters" className={location.pathname === '/chapters' || location.pathname.includes('/flashcards/') || location.pathname.includes('/quiz/') || location.pathname.includes('/concepts/') ? 'active' : ''}>
              Study Guide
            </Link>
            <Link to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>
              Profile
            </Link>
          </div>
        )}
        
        {user && (
          <div className="navbar-user">
            <div className="navbar-user-info">
              <span className="navbar-user-name">{user.email?.split('@')[0]}</span>
              <span className="navbar-user-email">{user.email}</span>
            </div>
            <button onClick={handleSignOut} className="navbar-button">
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
