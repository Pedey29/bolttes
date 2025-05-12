import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, getCurrentUser } from '../supabase';
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
  const [learningProgress, setLearningProgress] = useState(null);
  const [error, setError] = useState(null);
  const [chapters, setChapters] = useState([]);

  useEffect(() => {
    const initDashboard = async () => {
      try {
        if (user) {
          await Promise.all([
            fetchUserData(),
            fetchLearningProgress(),
            fetchChapters()
          ]);
        }
      } catch (err) {
        console.error('Dashboard initialization error:', err);
        setError('Failed to load dashboard data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    
    initDashboard();
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
  
  // Fetch chapters for guided learning
  const fetchChapters = async () => {
    try {
      // Get all chapters
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .order('chapter_order', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setChapters(data);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
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

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Refresh Page</button>
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
      {/* Hero Section */}
      <section className="dashboard-hero">
        
        <div className="hero-content">
          <h1>Welcome, {profile?.username || user?.email?.split('@')[0]}!</h1>
          <p>Master the SIE exam with our structured guided learning experience</p>
          
          {/* Study Stats in Hero Section */}
          <div className="hero-stats-card">
            <div className="hero-stat-item">
              <div className="hero-stat-icon xp">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div className="hero-stat-info">
                <span className="hero-stat-value">{profile?.xp || 0}</span>
                <span className="hero-stat-label">XP Points</span>
              </div>
            </div>
            
            <div className="hero-stat-item">
              <div className="hero-stat-icon streak">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                </svg>
              </div>
              <div className="hero-stat-info">
                <span className="hero-stat-value">{profile?.streak || 0}</span>
                <span className="hero-stat-label">Day Streak</span>
              </div>
            </div>
            
            <div className="hero-stat-item">
              <div className="hero-stat-icon quizzes">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div className="hero-stat-info">
                <span className="hero-stat-value">{stats.quizzes}</span>
                <span className="hero-stat-label">Quizzes Completed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guided Learning Section */}
      <section className="guided-learning-section">
        <div className="guided-learning-container">
          <div className="guided-learning-header">
            <div className="header-content">
              <h2>Guided Learning Experience</h2>
              <p>Our step-by-step approach helps you master the SIE exam material efficiently</p>
              
              {learningProgress && (
                <div className="progress-indicator">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${calculateLearningProgress()}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{calculateLearningProgress()}% Complete</span>
                </div>
              )}
            </div>
            
            {learningProgress ? (
              <Link to="/guided-learning-experience" className="primary-button">
                Continue Learning
              </Link>
            ) : (
              <Link to="/guided-learning-experience" className="primary-button">
                Start Learning
              </Link>
            )}
          </div>
          
          <div className="guided-learning-features">
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <h3>Structured Concepts</h3>
              <p>Clear explanations of key exam topics</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                  <path d="M12 12h.01"></path>
                </svg>
              </div>
              <h3>Interactive Flashcards</h3>
              <p>Reinforce your understanding of key terms</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h3>Knowledge Quizzes</h3>
              <p>Test your understanding with practice questions</p>
            </div>
          </div>
          
          {learningProgress ? (
            <div className="current-progress">
              <div className="progress-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
                </svg>
              </div>
              <div className="progress-content">
                <h3>Current Progress</h3>
                <p>
                  {learningProgress.completed ? 
                    'You completed all chapters! Start again or explore specific topics.' : 
                    `You're on Chapter ${learningProgress.current_chapter_index + 1}, Topic ${learningProgress.current_topic_index + 1}, ${learningProgress.current_step.charAt(0).toUpperCase() + learningProgress.current_step.slice(1)} Section`}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
      
      {/* Chapters Overview Section */}
      <section className="chapters-overview-section">
        <div className="chapters-grid">
          {chapters.slice(0, 6).map((chapter, index) => (
            <div key={chapter.id} className="chapter-card">
              <div className="chapter-number">{chapter.chapter_order || index + 1}</div>
              <div className="chapter-content">
                <h3>{chapter.title}</h3>
                <p>{chapter.description ? 
                  (chapter.description.length > 100 ? 
                    `${chapter.description.substring(0, 100)}...` : 
                    chapter.description) : 
                  'Explore this chapter through our guided learning experience.'}</p>
              </div>
              <Link 
                to="/guided-learning-experience" 
                className="chapter-link"
                onClick={() => {
                  // Logic to start guided learning at this specific chapter
                  // This would be implemented in the GuidedLearningExperience component
                }}
              >
                Study This Chapter
              </Link>
            </div>
          ))}
          
          {chapters.length > 6 && (
            <div className="view-all-chapters">
              <Link to="/chapters" className="view-all-link">
                View All {chapters.length} Chapters
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>
          )}
        </div>
      </section>
      
      {/* Stats Summary Section removed - now in hero area */}
      
      {/* Study Tips Section - Simplified */}
      <section className="dashboard-tips-section">
        <h2>Study Tips for Success</h2>
        <div className="tips-card">
          <ul className="tips-list">
            <li>
              <div className="tip-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <span className="tip-text">Follow our guided learning path for comprehensive exam preparation</span>
            </li>
            <li>
              <div className="tip-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </div>
              <span className="tip-text">Study consistently for at least 30 minutes each day to build knowledge retention</span>
            </li>
            <li>
              <div className="tip-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <span className="tip-text">Complete all quizzes to identify and address knowledge gaps before your exam</span>
            </li>
            <li>
              <div className="tip-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6"></path>
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                  <path d="M3 22v-6h6"></path>
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                </svg>
              </div>
              <span className="tip-text">Regularly review flashcards to reinforce key concepts and improve long-term memory</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
