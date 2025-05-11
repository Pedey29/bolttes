import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, updateXP } from '../supabase';
import './GuidedLearning.css';

const GuidedLearning = ({ user }) => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [topics, setTopics] = useState([]);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState('concept'); // concept, flashcard, quiz
  const [userProgress, setUserProgress] = useState(null);
  
  useEffect(() => {
    if (user) {
      fetchAllChapters();
      fetchUserProgress();
    }
  }, [user]);
  
  const fetchAllChapters = async () => {
    try {
      setLoading(true);
      
      // Fetch all chapters in order
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .order('id');
      
      if (chaptersError) throw chaptersError;
      setChapters(chaptersData);
      
      // If we have chapters, fetch topics for the current chapter
      if (chaptersData && chaptersData.length > 0) {
        await fetchTopicsForChapter(chaptersData[0].id);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chapters data:', error);
      setLoading(false);
    }
  };
  
  const fetchTopicsForChapter = async (chapterId) => {
    try {
      // Fetch topics for this chapter
      const { data: topicsData, error: topicsError } = await supabase
        .from('chapter_topics')
        .select(`
          topic_id,
          topics (
            id,
            title,
            description
          )
        `)
        .eq('chapter_id', chapterId)
        .order('order');
      
      if (topicsError) throw topicsError;
      
      const formattedTopics = topicsData.map(item => item.topics);
      setTopics(formattedTopics);
      return formattedTopics;
    } catch (error) {
      console.error('Error fetching topics for chapter:', error);
      return [];
    }
  };
  
  const fetchUserProgress = async () => {
    try {
      // Get the user's overall learning progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_learning_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (progressError && progressError.code !== 'PGRST116') {
        throw progressError;
      }
      
      if (progressData) {
        setUserProgress(progressData);
        
        // Set current chapter, topic and step based on saved progress
        setCurrentChapterIndex(progressData.current_chapter_index || 0);
        setCurrentTopicIndex(progressData.current_topic_index || 0);
        setCurrentStep(progressData.current_step || 'concept');
        
        // If we have chapters data, fetch topics for the current chapter
        if (chapters && chapters.length > 0) {
          const chapterIndex = progressData.current_chapter_index || 0;
          if (chapterIndex < chapters.length) {
            await fetchTopicsForChapter(chapters[chapterIndex].id);
          }
        }
      } else {
        // Create new progress entry
        const { data: newProgress, error: createError } = await supabase
          .from('user_learning_progress')
          .insert({
            user_id: user.id,
            current_chapter_index: 0,
            current_topic_index: 0,
            current_step: 'concept',
            completed: false,
            last_updated: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError) throw createError;
        setUserProgress(newProgress);
      }
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };
  
  const updateUserProgress = async (chapterIndex, topicIndex, step, completed = false) => {
    try {
      const { data, error } = await supabase
        .from('user_learning_progress')
        .update({
          current_chapter_index: chapterIndex,
          current_topic_index: topicIndex,
          current_step: step,
          completed: completed,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setCurrentChapterIndex(chapterIndex);
      setCurrentTopicIndex(topicIndex);
      setCurrentStep(step);
    } catch (error) {
      console.error('Error updating user progress:', error);
    }
  };
  
  const handleContinue = async () => {
    // Logic to move to the next step, topic, or chapter
    if (currentStep === 'concept') {
      // Move to flashcards
      updateUserProgress(currentChapterIndex, currentTopicIndex, 'flashcard');
    } else if (currentStep === 'flashcard') {
      // Move to quiz
      updateUserProgress(currentChapterIndex, currentTopicIndex, 'quiz');
    } else if (currentStep === 'quiz') {
      // Move to next topic's concept
      if (currentTopicIndex < topics.length - 1) {
        // Move to next topic in current chapter
        updateUserProgress(currentChapterIndex, currentTopicIndex + 1, 'concept');
      } else if (currentChapterIndex < chapters.length - 1) {
        // Move to next chapter
        const nextChapterIndex = currentChapterIndex + 1;
        await fetchTopicsForChapter(chapters[nextChapterIndex].id);
        updateUserProgress(nextChapterIndex, 0, 'concept');
      } else {
        // Completed all chapters
        updateUserProgress(currentChapterIndex, currentTopicIndex, 'quiz', true);
        alert('Congratulations! You have completed all chapters.');
      }
    }
  };
  
  const navigateToContent = () => {
    const currentTopic = topics[currentTopicIndex];
    if (!currentTopic) return;
    
    if (currentStep === 'concept') {
      navigate(`/concepts/${currentTopic.id}`);
    } else if (currentStep === 'flashcard') {
      navigate(`/flashcards/${currentTopic.id}`);
    } else if (currentStep === 'quiz') {
      navigate(`/quiz/${currentTopic.id}`);
    }
  };
  
  const saveAndExit = async () => {
    // Save current progress and return to dashboard
    try {
      await supabase
        .from('user_learning_progress')
        .update({
          last_updated: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving progress:', error);
      navigate('/dashboard');
    }
  };
  
  const calculateProgress = () => {
    if (!chapters.length || !topics.length) return 0;
    
    // Calculate total steps across all chapters
    let totalTopics = 0;
    let completedTopics = 0;
    
    // Count completed chapters
    for (let i = 0; i < currentChapterIndex; i++) {
      // For simplicity, assume each chapter has 5 topics on average if we don't have the actual count
      totalTopics += 5;
      completedTopics += 5;
    }
    
    // Add current chapter
    totalTopics += topics.length;
    completedTopics += currentTopicIndex;
    
    // Add partial completion of current topic
    if (currentStep === 'flashcard') completedTopics += 0.33;
    if (currentStep === 'quiz') completedTopics += 0.67;
    
    // Calculate percentage
    return Math.round((completedTopics / totalTopics) * 100);
  };
  
  if (loading) {
    return (
      <div className="guided-loading">
        <div className="loader"></div>
        <p>Loading your learning path...</p>
      </div>
    );
  }
  
  return (
    <div className="guided-learning-container">
      <div className="guided-header">
        <h1>Guided Learning Path</h1>
        <p>Progress through all chapters in a structured way</p>
      </div>
      
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${calculateProgress()}%` }}
          ></div>
        </div>
        <div className="progress-text">
          {calculateProgress()}% Complete
        </div>
      </div>
      
      <div className="current-topic-container">
        <div className="topic-header">
          <h2>
            Chapter {currentChapterIndex + 1} of {chapters.length}: {chapters[currentChapterIndex]?.title}
          </h2>
          <p>{chapters[currentChapterIndex]?.description}</p>
          <h3>
            Topic {currentTopicIndex + 1} of {topics.length}: {topics[currentTopicIndex]?.title}
          </h3>
          <p>{topics[currentTopicIndex]?.description}</p>
        </div>
        
        <div className="learning-steps">
          <div className={`step-item ${currentStep === 'concept' ? 'active' : ''} ${currentStep === 'flashcard' || currentStep === 'quiz' ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Study Concepts</h3>
              <p>Learn the key concepts and definitions</p>
            </div>
          </div>
          
          <div className={`step-item ${currentStep === 'flashcard' ? 'active' : ''} ${currentStep === 'quiz' ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Practice Flashcards</h3>
              <p>Reinforce your knowledge with flashcards</p>
            </div>
          </div>
          
          <div className={`step-item ${currentStep === 'quiz' ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Test Your Knowledge</h3>
              <p>Take a quiz to assess your understanding</p>
            </div>
          </div>
        </div>
        
        <div className="guided-actions">
          <button 
            className="btn-continue"
            onClick={navigateToContent}
          >
            {currentStep === 'concept' ? 'Study Concepts' : 
             currentStep === 'flashcard' ? 'Practice Flashcards' : 'Take Quiz'}
          </button>
          
          <button 
            className="btn-save-exit"
            onClick={saveAndExit}
          >
            Save Progress & Exit
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuidedLearning;
