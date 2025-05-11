import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import OverallProgress from '../components/OverallProgress';
import './Dashboard.css';

const Dashboard = ({ user }) => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    flashcards: 0,
    quizzes: 0,
    topics: 0
  });
  const [loading, setLoading] = useState(true);
  const [daysUntilExam, setDaysUntilExam] = useState(null);
  const [overallProgress, setOverallProgress] = useState(null);
  const [learningProgress, setLearningProgress] = useState(null);

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchLearningProgress();
      // updateUserStreak();
    }
  }, [user]);

  // Fetch user's learning progress for guided learning
  const fetchLearningProgress = async () => {
    try {
      // Get the user's learning progress
      const { data, error } = await supabase
        .from('user_learning_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setLearningProgress(data);
      }
    } catch (error) {
      console.error('Error fetching learning progress:', error);
    }
  };
  
  // Calculate percentage of learning progress
  const calculateLearningProgress = () => {
    if (!learningProgress) return 0;
    
    // Fetch total chapters count from database (for simplicity, using a fixed value here)
    const totalChapters = 10; // This should ideally come from the database
    const totalTopicsPerChapter = 5; // Average topics per chapter
    
    // Calculate total steps
    const totalSteps = totalChapters * totalTopicsPerChapter * 3; // 3 steps per topic (concept, flashcard, quiz)
    
    // Calculate completed steps
    let completedSteps = 0;
    
    // Add completed chapters
    completedSteps += learningProgress.current_chapter_index * totalTopicsPerChapter * 3;
    
    // Add completed topics in current chapter
    completedSteps += learningProgress.current_topic_index * 3;
    
    // Add steps in current topic
    if (learningProgress.current_step === 'flashcard') completedSteps += 1;
    if (learningProgress.current_step === 'quiz') completedSteps += 2;
    
    // Calculate percentage
    return Math.round((completedSteps / totalSteps) * 100);
  };
  
  // Helper function to calculate and update overall progress
  const calculateAndUpdateProgress = async (userId) => {
    try {
      console.log('Calculating overall progress for user:', userId);
      
      // Get counts of mastered items
      const [flashcardsResult, quizzesResult, conceptsResult] = await Promise.all([
        supabase.from('study_progress').select('content_id', { count: 'exact' })
          .eq('user_id', userId).eq('content_type', 'flashcard').eq('mastered', true),
        supabase.from('study_progress').select('content_id', { count: 'exact' })
          .eq('user_id', userId).eq('content_type', 'quiz').eq('mastered', true),
        supabase.from('study_progress').select('content_id', { count: 'exact' })
          .eq('user_id', userId).eq('content_type', 'concept').eq('mastered', true)
      ]);
      
      // Get total counts
      const [totalFlashcardsResult, totalQuizzesResult, totalConceptsResult] = await Promise.all([
        supabase.from('flashcards').select('id', { count: 'exact' }),
        supabase.from('topics').select('id', { count: 'exact' }), // One quiz per topic
        supabase.from('concepts').select('id', { count: 'exact' })
      ]);
      
      const flashcardsMastered = flashcardsResult.count || 0;
      const quizzesCompleted = quizzesResult.count || 0;
      const conceptsReviewed = conceptsResult.count || 0;
      
      const totalFlashcards = totalFlashcardsResult.count || 0;
      const totalQuizzes = totalQuizzesResult.count || 0;
      const totalConcepts = totalConceptsResult.count || 0;
      
      // Calculate percentages
      const flashcardsPercentage = totalFlashcards > 0 ? Math.round((flashcardsMastered / totalFlashcards) * 100) : 0;
      const quizzesPercentage = totalQuizzes > 0 ? Math.round((quizzesCompleted / totalQuizzes) * 100) : 0;
      const conceptsPercentage = totalConcepts > 0 ? Math.round((conceptsReviewed / totalConcepts) * 100) : 0;
      
      // Calculate overall progress
      const totalItems = totalFlashcards + totalQuizzes + totalConcepts;
      const totalCompleted = flashcardsMastered + quizzesCompleted + conceptsReviewed;
      const overallPercentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
      
      // Create progress object
      const progressData = {
        flashcards: {
          total: totalFlashcards,
          completed: flashcardsMastered,
          percentage: flashcardsPercentage
        },
        quizzes: {
          total: totalQuizzes,
          completed: quizzesCompleted,
          percentage: quizzesPercentage
        },
        concepts: {
          total: totalConcepts,
          completed: conceptsReviewed,
          percentage: conceptsPercentage
        },
        total: {
          total: totalItems,
          completed: totalCompleted,
          percentage: overallPercentage
        }
      };
      
      // Update profiles table
      const { data, error } = await supabase
        .from('profiles')
        .update({ overall_progress: progressData })
        .eq('id', userId);
      
      if (error) {
        console.error('Error updating profiles table:', error);
      } else {
        console.log('Updated overall progress in profile:', progressData);
        setOverallProgress(progressData);
      }
      
      return progressData;
    } catch (error) {
      console.error('Error calculating overall progress:', error);
      return null;
    }
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" error, which we handle by creating a profile
        throw profileError;
      }

      if (!profileData) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ 
            id: user.id, 
            xp: 0, 
            streak: 0,
            overall_progress: {
              flashcards: { total: 0, completed: 0, percentage: 0 },
              quizzes: { total: 0, completed: 0, percentage: 0 },
              concepts: { total: 0, completed: 0, percentage: 0 },
              total: { total: 0, completed: 0, percentage: 0 }
            }
          }])
          .select()
          .single();
          
        if (createError) throw createError;
        setProfile(newProfile);
      } else {
        setProfile(profileData);
        console.log('Profile data loaded:', profileData);
        
        // Calculate days until exam if exam_date is set
        if (profileData.exam_date) {
          const examDate = new Date(profileData.exam_date);
          const today = new Date();
          
          // Reset hours to compare just the dates
          today.setHours(0, 0, 0, 0);
          examDate.setHours(0, 0, 0, 0);
          
          const timeDiff = examDate.getTime() - today.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          setDaysUntilExam(daysDiff);
        }
        
        // If profile has overall_progress, use it
        if (profileData.overall_progress) {
          console.log('Using profile overall progress:', profileData.overall_progress);
        } else {
          // If not, calculate it
          await calculateAndUpdateProgress(user.id);
        }
      }
      
      // Get stats
      const [
        { count: flashcardsCount },
        { count: quizzesCount },
        { data: topicsData },
        { data: flashcardsMasteredData },
        { data: quizzesCompletedData },
        { data: conceptsViewedData }
      ] = await Promise.all([
        supabase.from('flashcards').select('*', { count: 'exact', head: true }),
        supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('topics').select('id'),
        supabase.from('study_progress').select('content_id').eq('user_id', user.id).eq('content_type', 'flashcard').eq('mastered', true),
        supabase.from('study_progress').select('content_id').eq('user_id', user.id).eq('content_type', 'quiz').eq('mastered', true),
        supabase.from('study_progress').select('content_id').eq('user_id', user.id).eq('content_type', 'concept').eq('mastered', true)
      ]);
      
      // Calculate total flashcards, quizzes, and concepts
      const totalFlashcards = flashcardsCount || 0;
      const totalQuizzes = topicsData?.length || 0; // Assuming one quiz per topic
      const totalConcepts = await supabase.from('concepts').select('*', { count: 'exact', head: true });
      const totalConceptsCount = totalConcepts.count || 0;
      
      // Calculate completed items
      const flashcardsMastered = flashcardsMasteredData?.length || 0;
      const quizzesCompleted = quizzesCompletedData?.length || 0;
      const conceptsReviewed = conceptsViewedData?.length || 0;
      
      // Calculate percentages
      const flashcardsPercentage = totalFlashcards > 0 ? Math.round((flashcardsMastered / totalFlashcards) * 100) : 0;
      const quizzesPercentage = totalQuizzes > 0 ? Math.round((quizzesCompleted / totalQuizzes) * 100) : 0;
      const conceptsPercentage = totalConceptsCount > 0 ? Math.round((conceptsReviewed / totalConceptsCount) * 100) : 0;
      
      // Calculate overall progress
      const totalItems = totalFlashcards + totalQuizzes + totalConceptsCount;
      const totalCompleted = flashcardsMastered + quizzesCompleted + conceptsReviewed;
      const overallPercentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
      
      // Set overall progress
      setOverallProgress({
        flashcards: {
          total: totalFlashcards,
          completed: flashcardsMastered,
          percentage: flashcardsPercentage
        },
        quizzes: {
          total: totalQuizzes,
          completed: quizzesCompleted,
          percentage: quizzesPercentage
        },
        concepts: {
          total: totalConceptsCount,
          completed: conceptsReviewed,
          percentage: conceptsPercentage
        },
        total: {
          total: totalItems,
          completed: totalCompleted,
          percentage: overallPercentage
        }
      });
      
      setStats({
        flashcards: flashcardsMastered || 0,
        quizzes: quizzesCompleted || 0,
        topics: topicsData?.length || 0
      });
    } catch (error) {
      console.error('Error fetching user data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  const userStats = {
    xp: profile?.xp || 0,
    streak: profile?.streak || 0,
    flashcards: stats.flashcards,
    quizzes: stats.quizzes
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-welcome">
        <div className="welcome-content">
          <h1>Welcome, {profile?.username || user?.email?.split('@')[0]}!</h1>
          <p className="dashboard-subtitle">Track your progress and continue your SIE exam preparation journey</p>
        </div>
      </div>
      
      <div className="dashboard-header">
        
        {daysUntilExam !== null && (
          <div className={`exam-countdown ${daysUntilExam <= 7 ? 'urgent' : daysUntilExam <= 14 ? 'warning' : ''}`}>
            <div className="countdown-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div className="countdown-content">
              <span className="countdown-days">{daysUntilExam}</span>
              <span className="countdown-label">Days until your SIE exam</span>
              <Link to="/profile" className="countdown-edit">Update exam date</Link>
            </div>
          </div>
        )}
        
        {daysUntilExam === null && (
          <div className="exam-countdown no-date">
            <div className="countdown-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div className="countdown-content">
              <span className="countdown-label">Set your exam date to see a countdown</span>
              <Link to="/profile" className="countdown-edit">Set exam date</Link>
            </div>
          </div>
        )}
      </div>
      
      {profile?.overall_progress ? (
        <OverallProgress progress={profile.overall_progress} totalTopics={stats.topics} />
      ) : overallProgress ? (
        <OverallProgress progress={overallProgress} totalTopics={stats.topics} />
      ) : (
        <div className="progress-placeholder">
          <h2>Track Your SIE Exam Progress</h2>
          <p>Complete flashcards, quizzes, and review concepts to see your progress here!</p>
        </div>
      )}
      
      <h2 className="section-title">Study Resources</h2>
      
      <div className="dashboard-actions">
        {learningProgress ? (
          <Link to="/guided-learning-experience" className="action-card continue-learning">
            <div className="action-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            <h3 className="action-title">Continue Learning</h3>
            <p className="action-description">
              {learningProgress.completed ? 
                'You completed all chapters! Start again or explore specific topics.' : 
                `Continue from Chapter ${learningProgress.current_chapter_index + 1}, Topic ${learningProgress.current_topic_index + 1}`}
            </p>
            <div className="progress-indicator">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${calculateLearningProgress()}%` }}
                ></div>
              </div>
              <span className="progress-text">{calculateLearningProgress()}% Complete</span>
            </div>
            <div className="action-button">Continue Learning</div>
          </Link>
        ) : (
          <Link to="/guided-learning-experience" className="action-card primary-action">
            <div className="action-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            <h3 className="action-title">Start Guided Learning</h3>
            <p className="action-description">Begin a structured learning path that guides you through all chapters in order</p>
            <div className="action-button">Start Learning</div>
          </Link>
        )}
        
        <Link to="/chapters" className="action-card secondary-action">
          <div className="action-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
          </div>
          <h3 className="action-title">SIE Exam Study Guide</h3>
          <p className="action-description">Access our comprehensive study guide organized by chapters with flashcards, quizzes, and concepts</p>
          <div className="action-button">Browse Topics</div>
        </Link>
      </div>
      
      <h2 className="section-title">Your Progress</h2>
      
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-value">
            {userStats.xp || 0}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <div className="stat-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="7"></circle>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
            </svg>
            Total XP Points
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">
            {userStats.streak || 0}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
            </svg>
          </div>
          <div className="stat-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
            </svg>
            Day Streak
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">
            {userStats.flashcards || 0}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <path d="M12 12h.01"></path>
            </svg>
          </div>
          <div className="stat-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            Flashcards Mastered
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">
            {userStats.quizzes || 0}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div className="stat-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            Quizzes Completed
          </div>
        </div>
      </div>
      
      <div className="dashboard-tips">
        <h3>Study Tips for Success</h3>
        <ul>
          <li>Study consistently for at least 30 minutes each day to maintain your streak</li>
          <li>Create flashcards for concepts you find challenging to reinforce your memory</li>
          <li>Take practice quizzes regularly to identify knowledge gaps and track improvement</li>
          <li>Review your incorrect answers to focus your study on weak areas</li>
          <li>Use the learning concepts section to ensure comprehensive coverage of all exam topics</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
