import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, updateXP } from '../supabase';
import './Flashcards.css';

const Flashcards = ({ user }) => {
  const { topicId } = useParams();
  const [flashcards, setFlashcards] = useState([]);
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mastered, setMastered] = useState([]);

  useEffect(() => {
    if (user && topicId) {
      fetchTopic();
      fetchFlashcards();
    }
  }, [user, topicId]);
  
  // Effect to fetch mastered status from the database
  useEffect(() => {
    if (user && flashcards.length > 0) {
      fetchMasteredStatus();
    }
  }, [user, flashcards]);

  const fetchTopic = async () => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('id, title, description')
        .eq('id', topicId)
        .single();
      
      if (error) throw error;
      setTopic(data);
    } catch (error) {
      console.error('Error fetching topic:', error.message);
    }
  };

  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('flashcards')
        .select(`
          id, 
          front, 
          back, 
          created_at
        `)
        .eq('topic_id', topicId);
      
      if (error) throw error;
      setFlashcards(data || []);
      
      // Initialize mastered state array
      setMastered(new Array(data?.length || 0).fill(false));
    } catch (error) {
      console.error('Error fetching flashcards:', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch mastered status from study_progress table
  const fetchMasteredStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('study_progress')
        .select('content_id')
        .eq('user_id', user.id)
        .eq('content_type', 'flashcard')
        .eq('mastered', true);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Create a set of mastered flashcard IDs for faster lookup
        const masteredIds = new Set(data.map(item => item.content_id));
        
        // Update mastered state array
        const newMastered = flashcards.map(card => masteredIds.has(card.id));
        setMastered(newMastered);
        
        // Calculate progress
        const masteredCount = newMastered.filter(Boolean).length;
        setProgress(Math.round((masteredCount / flashcards.length) * 100));
      }
    } catch (error) {
      console.error('Error fetching mastered status:', error);
    }
  };

  const markAsMastered = async (index) => {
    const newMastered = [...mastered];
    newMastered[index] = !newMastered[index];
    setMastered(newMastered);
    
    // Calculate progress
    const masteredCount = newMastered.filter(Boolean).length;
    setProgress(Math.round((masteredCount / flashcards.length) * 100));
    
    const flashcard = flashcards[index];
    console.log('Marking flashcard as mastered:', flashcard.id, newMastered[index]);
    
    try {
      // Update study progress in the database
      if (newMastered[index]) {
        // Check if entry exists
        const { data: existingProgress, error: checkError } = await supabase
          .from('study_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('content_type', 'flashcard')
          .eq('content_id', flashcard.id);
        
        console.log('Existing progress check:', existingProgress, checkError);
        
        if (existingProgress && existingProgress.length > 0) {
          // Update existing entry
          const { data: updateData, error: updateError } = await supabase
            .from('study_progress')
            .update({ 
              mastered: true,
              last_studied: new Date().toISOString()
            })
            .eq('id', existingProgress[0].id);
          
          console.log('Update result:', updateData, updateError);
        } else {
          // Create new entry
          const { data: insertData, error: insertError } = await supabase
            .from('study_progress')
            .insert({
              user_id: user.id,
              topic_id: parseInt(topicId),
              content_type: 'flashcard',
              content_id: flashcard.id,
              mastered: true,
              last_studied: new Date().toISOString()
            });
          
          console.log('Insert result:', insertData, insertError);
          
          if (insertError) {
            console.error('Insert error details:', insertError);
            
            // If there's an error with the UUID format, try with a string ID
            if (insertError.message && insertError.message.includes('invalid input syntax')) {
              const { data: retryData, error: retryError } = await supabase
                .from('study_progress')
                .insert({
                  user_id: user.id,
                  topic_id: parseInt(topicId),
                  content_type: 'flashcard',
                  content_id: flashcard.id.toString(),
                  mastered: true,
                  last_studied: new Date().toISOString()
                });
              
              console.log('Retry insert result:', retryData, retryError);
            }
          }
        }
        
        // Award XP for mastering a flashcard
        await updateXP(user.id, 2, 'master_flashcard');
        
        // Update overall progress in profiles table
        await updateOverallProgress(user.id);
      } else {
        // Mark as not mastered
        const { data: unmasterData, error: unmasterError } = await supabase
          .from('study_progress')
          .update({ mastered: false })
          .eq('user_id', user.id)
          .eq('content_type', 'flashcard')
          .eq('content_id', flashcard.id);
        
        console.log('Unmaster result:', unmasterData, unmasterError);
        
        // Update overall progress in profiles table
        await updateOverallProgress(user.id);
      }
    } catch (error) {
      console.error('Error updating flashcard mastery:', error);
    }
  };
  
  // Helper function to update overall progress in profiles table
  const updateOverallProgress = async (userId) => {
    try {
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
      
      console.log('Updated overall progress:', progressData, error);
      
      return progressData;
    } catch (error) {
      console.error('Error updating overall progress:', error);
      return null;
    }
  };

  const startStudyMode = () => {
    if (flashcards.length === 0) {
      alert('No flashcards available for this topic!');
      return;
    }
    
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setIsStudyMode(true);
    
    // Award XP for starting study session
    updateXP(user.id, 10, 'start_study');
  };

  const nextCard = async () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      // End of deck
      // Update progress in database and award XP
      try {
        // Award XP for completing the deck
        await updateXP(user.id, 20, 'complete_flashcards');
        
        // Show completion message with progress
        const masteredCount = mastered.filter(Boolean).length;
        const progressPercent = Math.round((masteredCount / flashcards.length) * 100);
        alert(`You have completed all flashcards! +20 XP\n\nYou've mastered ${masteredCount} out of ${flashcards.length} cards (${progressPercent}%)`);
      } catch (error) {
        console.error('Error updating completion progress:', error);
        alert('You have completed all flashcards! +20 XP');
      }
      
      setIsStudyMode(false);
      
      // Award XP for completing the deck
      updateXP(user.id, 20, 'complete_flashcards');
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading flashcards...</p>
      </div>
    );
  }

  return (
    <div className="flashcards-container">
      <div className="flashcards-header">
        <Link to="/chapters" className="back-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Chapters
        </Link>
        <h1>{topic?.title || 'Flashcards'}</h1>
      </div>
      
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading flashcards...</p>
        </div>
      ) : isStudyMode ? (
        <div className="study-mode">
          {flashcards.length > 0 && (
            <div className="flashcard">
              <div className="card-progress">
                <div className="progress-text">
                  Card {currentCardIndex + 1} of {flashcards.length}
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className={`card-content ${showAnswer ? 'flipped' : ''}`}>
                <div className="card-inner">
                  <div className="card-front">
                    <div className="card-text">{flashcards[currentCardIndex].front}</div>
                  </div>
                  
                  <div className="card-back">
                    <div className="card-text">{flashcards[currentCardIndex].back}</div>
                  </div>
                </div>
              </div>
              
              <div className="card-actions">
                {!showAnswer ? (
                  <button onClick={() => setShowAnswer(true)} className="btn-primary">
                    Reveal Answer
                  </button>
                ) : (
                  <div className="next-actions">
                    <button 
                      onClick={() => {
                        markAsMastered(currentCardIndex);
                        nextCard();
                      }} 
                      className="btn-success"
                    >
                      I Know This
                    </button>
                    <button onClick={nextCard} className="btn-warning">
                      Still Learning
                    </button>
                  </div>
                )}
                
                <button onClick={() => setIsStudyMode(false)} className="btn-secondary">
                  Exit Study Mode
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flashcards-content">
          <div className="topic-description">
            <p>{topic?.description}</p>
          </div>
          
          <div className="flashcards-stats">
            <div className="stat-card">
              <div className="stat-value">{flashcards.length}</div>
              <div className="stat-label">Total Cards</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{mastered.filter(Boolean).length}</div>
              <div className="stat-label">Mastered</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{progress}%</div>
              <div className="stat-label">Progress</div>
            </div>
          </div>
          
          <div className="flashcards-actions">
            <button onClick={startStudyMode} className="btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Start Study Session
            </button>
          </div>
          
          {flashcards.length === 0 ? (
            <div className="no-flashcards">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <path d="M12 12h.01"></path>
              </svg>
              <p>No flashcards available for this topic yet.</p>
              <Link to="/chapters" className="btn-primary">Browse Other Topics</Link>
            </div>
          ) : (
            <div className="flashcards-preview">
              <h2>Preview Cards</h2>
              <div className="flashcards-list">
                {flashcards.map((card, index) => (
                  <div key={card.id} className={`flashcard-item ${mastered[index] ? 'mastered' : ''}`}>
                    <div className="flashcard-content">
                      <div className="flashcard-front">{card.front}</div>
                      <div className="flashcard-back">{card.back}</div>
                    </div>
                    <div className="flashcard-actions">
                      <button 
                        onClick={() => markAsMastered(index)} 
                        className={mastered[index] ? 'btn-outline' : 'btn-success'}
                      >
                        {mastered[index] ? 'Unmark' : 'Mark as Mastered'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Flashcards;
