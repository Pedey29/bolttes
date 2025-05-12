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
  const [daysUntilExam, setDaysUntilExam] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for user on initial load and set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user || null);
          if (session?.user) {
            navigate('/dashboard');
            fetchExamDate(session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setDaysUntilExam(null);
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
        if (session?.user) {
          fetchExamDate(session.user.id);
        }
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
  
  // Fetch exam date from user profile
  const fetchExamDate = async (userId) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('exam_date')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      
      if (profileData?.exam_date) {
        const examDate = new Date(profileData.exam_date);
        const today = new Date();
        
        // Reset hours to compare just the dates
        today.setHours(0, 0, 0, 0);
        examDate.setHours(0, 0, 0, 0);
        
        const timeDiff = examDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        setDaysUntilExam(daysDiff);
      }
    } catch (error) {
      console.error('Error fetching exam date:', error.message);
    }
  };

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (loading) return <div className="loading">Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
  };

  return (
    <div className="app">
      {user && <Navbar user={user} daysUntilExam={daysUntilExam} />}
      
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
