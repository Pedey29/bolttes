import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, updateXP } from '../supabase';
import './Concepts.css';

const Concepts = ({ user }) => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedConcept, setSelectedConcept] = useState(null);

  useEffect(() => {
    if (user) {
      fetchTopics();
    }
  }, [user]);
  
  // Effect to handle direct navigation to a specific topic
  useEffect(() => {
    if (topicId && topics.length > 0) {
      const topic = topics.find(t => t.id === parseInt(topicId));
      if (topic) {
        handleTopicSelect(topic);
      }
    }
  }, [topicId, topics]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('title');
      
      if (error) throw error;
      setTopics(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching topics:', error.message);
      setLoading(false);
    }
  };

  const fetchConcepts = async (topicId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('concepts')
        .select('*')
        .eq('topic_id', topicId)
        .order('title');
      
      if (error) throw error;
      setConcepts(data || []);
      
      // Award XP for viewing a topic (once per session)
      if (user && !selectedTopic) {
        await updateXP(user.id, 2, 'view_topic');
      }
      
      setLoading(false);
      
      // Auto-select the first concept if available
      if (data && data.length > 0 && !selectedConcept) {
        handleConceptSelect(data[0]);
      }
    } catch (error) {
      console.error('Error fetching concepts:', error.message);
      setLoading(false);
    }
  };

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
    setSelectedConcept(null);
    fetchConcepts(topic.id);
    
    // Update URL to reflect the selected topic
    if (topicId !== topic.id.toString()) {
      navigate(`/concepts/${topic.id}`, { replace: true });
    }
  };

  const handleConceptSelect = async (concept) => {
    setSelectedConcept(concept);
    
    // Award XP for viewing a concept (once per concept)
    try {
      if (user) {
        await updateXP(user.id, 3, 'view_concept');
        
        console.log('Tracking concept as viewed:', concept.id);
        
        // Track concept as viewed/mastered in study_progress
        const { data: existingProgress, error: checkError } = await supabase
          .from('study_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('content_type', 'concept')
          .eq('content_id', concept.id);
        
        console.log('Existing concept progress:', existingProgress, checkError);
        
        if (existingProgress && existingProgress.length > 0) {
          // Update last studied timestamp
          const { data: updateData, error: updateError } = await supabase
            .from('study_progress')
            .update({ 
              last_studied: new Date().toISOString(),
              mastered: true // Mark as mastered when viewed
            })
            .eq('id', existingProgress[0].id);
          
          console.log('Update concept result:', updateData, updateError);
        } else {
          // Create new progress entry
          const { data: insertData, error: insertError } = await supabase
            .from('study_progress')
            .insert({
              user_id: user.id,
              topic_id: concept.topic_id,
              content_type: 'concept',
              content_id: concept.id,
              mastered: true, // Mark as mastered when viewed
              last_studied: new Date().toISOString()
            });
          
          console.log('Insert concept result:', insertData, insertError);
          
          if (insertError) {
            console.error('Insert concept error details:', insertError);
            
            // If there's an error with the UUID format, try with a string ID
            if (insertError.message && insertError.message.includes('invalid input syntax')) {
              const { data: retryData, error: retryError } = await supabase
                .from('study_progress')
                .insert({
                  user_id: user.id,
                  topic_id: concept.topic_id,
                  content_type: 'concept',
                  content_id: concept.id.toString(),
                  mastered: true, // Mark as mastered when viewed
                  last_studied: new Date().toISOString()
                });
              
              console.log('Retry concept insert result:', retryData, retryError);
            }
          }
        }
        
        // Update overall progress
        await updateOverallProgress(user.id);
      }
    } catch (error) {
      console.error('Error updating concept progress:', error.message);
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
      
      console.log('Updating overall progress:', progressData);
      
      // Update profiles table
      const { data, error } = await supabase
        .from('profiles')
        .update({ overall_progress: progressData })
        .eq('id', userId);
      
      if (error) {
        console.error('Error updating profiles table:', error);
      }
      
      return progressData;
    } catch (error) {
      console.error('Error updating overall progress:', error);
      return null;
    }
  };

  const handleNextConcept = async () => {
    if (selectedConcept && concepts.length > 0) {
      const currentIndex = concepts.findIndex(c => c.id === selectedConcept.id);
      if (currentIndex < concepts.length - 1) {
        await handleConceptSelect(concepts[currentIndex + 1]);
        // Scroll to the concept content
        document.querySelector('.concept-content')?.scrollIntoView({ behavior: 'smooth' });
        
        // Check if this is the last concept in the topic
        if (currentIndex + 1 === concepts.length - 1) {
          // Award bonus XP for completing the entire topic
          try {
            await updateXP(user.id, 10, 'complete_topic');
            
            // Show a congratulatory message
            setTimeout(() => {
              alert(`Congratulations! You've completed all concepts in this topic. +10 XP`);
            }, 500);
          } catch (error) {
            console.error('Error awarding completion XP:', error);
          }
        }
      }
    }
  };

  const handlePreviousConcept = async () => {
    if (selectedConcept && concepts.length > 0) {
      const currentIndex = concepts.findIndex(c => c.id === selectedConcept.id);
      if (currentIndex > 0) {
        await handleConceptSelect(concepts[currentIndex - 1]);
        // Scroll to the concept content
        document.querySelector('.concept-content')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  if (loading && !selectedTopic && !concepts.length) {
    return (
      <div className="concepts-loading">
        <div className="loader"></div>
        <p>Loading topics...</p>
      </div>
    );
  }

  return (
    <div className="concepts-container">
      <div className="concepts-header">
        <h1>
          {selectedTopic ? selectedTopic.title : 'Learning Concepts'}
        </h1>
        
        {selectedTopic && (
          <button 
            className="back-button"
            onClick={() => {
              // Navigate back to the study guide instead of just the concepts page
              navigate('/chapters', { replace: true });
            }}
          >
            Back to Study Guide
          </button>
        )}
      </div>
      
      {!selectedTopic && (
        <div className="topics-container">
          <p className="instruction-text">
            Select a topic to explore SIE exam concepts
          </p>
          
          <div className="topics-list">
            {topics.map(topic => (
              <div 
                key={topic.id}
                className="topic-card"
                onClick={() => handleTopicSelect(topic)}
              >
                <h2>{topic.title}</h2>
                {topic.description && <p>{topic.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {selectedTopic && (
        <div className="combined-view">
          {loading ? (
            <div className="concepts-loading">
              <div className="loader"></div>
              <p>Loading concepts...</p>
            </div>
          ) : (
            <>
              <p className="topic-description">
                {selectedTopic.description || 'Explore concepts related to this topic'}
              </p>
              
              <div className="concepts-detail-layout">
                {/* Left side: Concept list */}
                <div className="concepts-sidebar">
                  {concepts.length > 0 ? (
                    <div className="concepts-list">
                      {concepts.map(concept => (
                        <div 
                          key={concept.id}
                          data-id={concept.id}
                          className={`concept-card ${selectedConcept && selectedConcept.id === concept.id ? 'selected' : ''}`}
                          onClick={() => handleConceptSelect(concept)}
                        >
                          <h3>{concept.title}</h3>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-concepts">
                      <p>No concepts available for this topic yet</p>
                      <p>Check back later for updates</p>
                    </div>
                  )}
                </div>
                
                {/* Right side: Concept detail */}
                <div className="concept-detail-container">
                  {selectedConcept ? (
                    <div className="concept-detail">
                      <h2 className="concept-title">{selectedConcept.title}</h2>
                      
                      <div className="concept-section">
                        <h3>Explanation</h3>
                        <p>{selectedConcept.explanation}</p>
                      </div>
                      
                      {selectedConcept.example && (
                        <div className="concept-section example">
                          <h3>Example</h3>
                          <p>{selectedConcept.example}</p>
                        </div>
                      )}
                      
                      <div className="concept-navigation">
                        <button 
                          className="prev-concept"
                          disabled={!concepts.length || concepts.findIndex(c => c.id === selectedConcept.id) === 0}
                          onClick={handlePreviousConcept}
                        >
                          <span>←</span> Previous Concept
                        </button>
                        
                        <button 
                          className="next-concept"
                          disabled={!concepts.length || concepts.findIndex(c => c.id === selectedConcept.id) === concepts.length - 1}
                          onClick={handleNextConcept}
                        >
                          Next Concept <span>→</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="select-concept-prompt">
                      <p>Select a concept from the list to view details</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Concepts;
