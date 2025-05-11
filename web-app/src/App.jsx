import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Chapters from './pages/Chapters';
import Flashcards from './pages/Flashcards';
import Quiz from './pages/Quiz';
import Concepts from './pages/Concepts';
import Profile from './pages/Profile';
import GuidedLearning from './pages/GuidedLearning';
import GuidedLearningExperience from './pages/GuidedLearningExperience';
import Navbar from './components/Navbar';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for user on initial load and set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user || null);
          if (session?.user) navigate('/dashboard');
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          navigate('/login');
        }
      }
    );
    
    // Get initial session
    const checkUser = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Error checking session:', error.message);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();

    return () => {
      if (authListener) authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (loading) return <div className="loading">Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
  };

  return (
    <div className="app">
      {user && <Navbar user={user} />}
      
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard user={user} />
            </ProtectedRoute>
          } />
          
          <Route path="/chapters" element={
            <ProtectedRoute>
              <Chapters user={user} />
            </ProtectedRoute>
          } />
          
          <Route path="/flashcards/:topicId" element={
            <ProtectedRoute>
              <Flashcards user={user} />
            </ProtectedRoute>
          } />
          
          <Route path="/quiz/:topicId" element={
            <ProtectedRoute>
              <Quiz user={user} />
            </ProtectedRoute>
          } />
          
          <Route path="/concepts" element={
            <ProtectedRoute>
              <Concepts user={user} />
            </ProtectedRoute>
          } />
          
          <Route path="/concepts/:topicId" element={
            <ProtectedRoute>
              <Concepts user={user} />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile user={user} />
            </ProtectedRoute>
          } />
          
          <Route path="/guided-learning" element={
            <ProtectedRoute>
              <GuidedLearning user={user} />
            </ProtectedRoute>
          } />
          
          <Route path="/guided-learning-experience" element={
            <ProtectedRoute>
              <GuidedLearningExperience user={user} />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
