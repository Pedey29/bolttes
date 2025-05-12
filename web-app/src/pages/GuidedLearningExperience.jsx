import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './GuidedLearningExperience.css';

// Fallback data for testing
const FALLBACK_DATA = {
  chapters: [
    { id: 'fallback-1', title: 'Capital Markets', chapter_order: 1 },
    { id: 'fallback-2', title: 'Regulatory Framework', chapter_order: 2 },
    { id: 'fallback-3', title: 'Securities Products', chapter_order: 3 }
  ],
  topics: [
    { id: 'topic-1', title: 'Market Structure', topic_order: 1, chapter_id: 'fallback-1' },
    { id: 'topic-2', title: 'Economic Factors', topic_order: 2, chapter_id: 'fallback-1' },
    { id: 'topic-3', title: 'Equity Markets', topic_order: 3, chapter_id: 'fallback-1' }
  ],
  concepts: {
    'topic-1': {
      title: 'Market Structure',
      description: '<p>Market structure refers to the organizational and functional characteristics of a financial market. The structure influences how market participants interact, how prices are discovered, and how securities are traded.</p><p>Key components of market structure include:</p><ul><li>Market participants (buyers, sellers, intermediaries)</li><li>Trading mechanisms</li><li>Price discovery processes</li><li>Market regulations</li></ul>',
      example: 'The New York Stock Exchange (NYSE) is an example of a centralized exchange where buyers and sellers meet to trade securities through a continuous auction process.'
    },
    'topic-2': {
      title: 'Economic Factors',
      description: '<p>Economic factors are variables that can influence the performance of financial markets and securities. Understanding these factors is crucial for making informed investment decisions.</p><p>Key economic factors include:</p><ul><li>Interest rates</li><li>Inflation</li><li>GDP growth</li><li>Employment data</li><li>Consumer spending</li></ul>',
      example: 'When the Federal Reserve raises interest rates, bond prices typically fall as yields rise to reflect the higher rates.'
    },
    'topic-3': {
      title: 'Equity Markets',
      description: '<p>Equity markets are where shares of companies are issued and traded. These markets play a crucial role in capital formation and investment.</p><p>Key aspects of equity markets include:</p><ul><li>Primary and secondary markets</li><li>Market indices</li><li>Types of orders</li><li>Market participants</li><li>Trading mechanisms</li></ul>',
      example: 'An investor can place a limit order to buy shares of Apple Inc. at $150 per share, which will only execute if the price falls to or below that level.'
    }
  },
  flashcards: {
    'topic-1': [
      { id: 'flash-1-1', term: 'Primary Market', definition: 'The market where new securities are issued and sold to investors for the first time.' },
      { id: 'flash-1-2', term: 'Secondary Market', definition: 'The market where existing securities are bought and sold among investors.' },
      { id: 'flash-1-3', term: 'Market Maker', definition: 'A firm that stands ready to buy and sell a particular stock on a regular and continuous basis at publicly quoted prices.' }
    ],
    'topic-2': [
      { id: 'flash-2-1', term: 'Inflation', definition: 'A general increase in prices and fall in the purchasing value of money.' },
      { id: 'flash-2-2', term: 'GDP', definition: 'Gross Domestic Product - the total value of goods produced and services provided in a country during one year.' },
      { id: 'flash-2-3', term: 'Yield Curve', definition: 'A line that plots yields (interest rates) of bonds having equal credit quality but differing maturity dates.' }
    ],
    'topic-3': [
      { id: 'flash-3-1', term: 'Market Index', definition: 'A measurement of the value of a section of the stock market, calculated from the prices of selected stocks.' },
      { id: 'flash-3-2', term: 'Limit Order', definition: 'An order to buy or sell a security at a specific price or better.' },
      { id: 'flash-3-3', term: 'Market Capitalization', definition: 'The total dollar market value of a company\'s outstanding shares of stock.' }
    ]
  },
  quizzes: {
    'topic-1': [
      {
        id: 'quiz-1-1',
        question: 'Which of the following is NOT a function of capital markets?',
        option_a: 'Price discovery',
        option_b: 'Liquidity provision',
        option_c: 'Physical commodity delivery',
        option_d: 'Capital formation',
        correct_answer: 'C'
      },
      {
        id: 'quiz-1-2',
        question: 'In which market are securities first issued to the public?',
        option_a: 'Primary market',
        option_b: 'Secondary market',
        option_c: 'Tertiary market',
        option_d: 'Derivative market',
        correct_answer: 'A'
      },
      {
        id: 'quiz-1-3',
        question: 'What is the main role of a market maker?',
        option_a: 'To regulate markets',
        option_b: 'To provide liquidity',
        option_c: 'To issue new securities',
        option_d: 'To audit financial statements',
        correct_answer: 'B'
      }
    ],
    'topic-2': [
      {
        id: 'quiz-2-1',
        question: 'Which economic indicator measures the change in prices of goods and services over time?',
        option_a: 'GDP',
        option_b: 'Unemployment rate',
        option_c: 'Inflation rate',
        option_d: 'Trade balance',
        correct_answer: 'C'
      },
      {
        id: 'quiz-2-2',
        question: 'What typically happens to bond prices when interest rates rise?',
        option_a: 'Bond prices rise',
        option_b: 'Bond prices fall',
        option_c: 'Bond prices remain unchanged',
        option_d: 'Bond prices become more volatile',
        correct_answer: 'B'
      },
      {
        id: 'quiz-2-3',
        question: 'An inverted yield curve often indicates:',
        option_a: 'Economic growth',
        option_b: 'Stable interest rates',
        option_c: 'A potential recession',
        option_d: 'Decreasing inflation',
        correct_answer: 'C'
      }
    ],
    'topic-3': [
      {
        id: 'quiz-3-1',
        question: 'Which of the following is a major stock market index in the United States?',
        option_a: 'DAX',
        option_b: 'FTSE',
        option_c: 'S&P 500',
        option_d: 'Nikkei',
        correct_answer: 'C'
      },
      {
        id: 'quiz-3-2',
        question: 'What does market capitalization measure?',
        option_a: 'A company\'s annual revenue',
        option_b: 'The total value of a company\'s outstanding shares',
        option_c: 'A company\'s profit margin',
        option_d: 'The number of employees in a company',
        correct_answer: 'B'
      },
      {
        id: 'quiz-3-3',
        question: 'Which order type guarantees execution but not price?',
        option_a: 'Limit order',
        option_b: 'Stop order',
        option_c: 'Market order',
        option_d: 'Day order',
        correct_answer: 'C'
      }
    ]
  }
};

const GuidedLearningExperience = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState('concept'); // concept, flashcard, quiz
  const [conceptContent, setConceptContent] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [allChaptersCompleted, setAllChaptersCompleted] = useState(false);
  const [learningProgress, setLearningProgress] = useState(null);

  // Fetch all chapters and topics on component mount
  useEffect(() => {
    if (user) {
      fetchChaptersAndTopics();
      fetchUserProgress();
    }
  }, [user]);
  
  // Add fallback content if database is empty
  useEffect(() => {
    // If after loading there's still no content, add fallback content
    if (!loading && chapters.length === 0) {
      setChapters([
        { id: 'fallback-1', title: 'Capital Markets', chapter_order: 1 },
        { id: 'fallback-2', title: 'Regulatory Framework', chapter_order: 2 },
        { id: 'fallback-3', title: 'Securities Products', chapter_order: 3 }
      ]);
      
      setTopics([
        { id: 'topic-1', title: 'Market Structure', topic_order: 1, chapter_id: 'fallback-1' },
        { id: 'topic-2', title: 'Economic Factors', topic_order: 2, chapter_id: 'fallback-1' },
        { id: 'topic-3', title: 'Equity Markets', topic_order: 3, chapter_id: 'fallback-1' }
      ]);
      
      // Set fallback concept content
      setConceptContent({
        title: 'Market Structure',
        description: '<p>Market structure refers to the organizational and functional characteristics of a financial market. The structure influences how market participants interact, how prices are discovered, and how securities are traded.</p><p>Key components of market structure include:</p><ul><li>Market participants (buyers, sellers, intermediaries)</li><li>Trading mechanisms</li><li>Price discovery processes</li><li>Market regulations</li></ul>',
        example: 'The New York Stock Exchange (NYSE) is an example of a centralized exchange where buyers and sellers meet to trade securities through a continuous auction process.'
      });
      
      // Set fallback flashcards
      setFlashcards([
        {
          id: 'flash-1',
          term: 'Primary Market',
          definition: 'The market where new securities are issued and sold to investors for the first time.'
        },
        {
          id: 'flash-2',
          term: 'Secondary Market',
          definition: 'The market where existing securities are bought and sold among investors.'
        },
        {
          id: 'flash-3',
          term: 'Market Maker',
          definition: 'A firm that stands ready to buy and sell a particular stock on a regular and continuous basis at publicly quoted prices.'
        }
      ]);
      
      // Set fallback quiz questions
      setQuizQuestions([
        {
          id: 'quiz-1',
          question: 'Which of the following is NOT a function of capital markets?',
          option_a: 'Price discovery',
          option_b: 'Liquidity provision',
          option_c: 'Physical commodity delivery',
          option_d: 'Capital formation',
          correct_answer: 'C'
        },
        {
          id: 'quiz-2',
          question: 'In which market are securities first issued to the public?',
          option_a: 'Primary market',
          option_b: 'Secondary market',
          option_c: 'Tertiary market',
          option_d: 'Derivative market',
          correct_answer: 'A'
        },
        {
          id: 'quiz-3',
          question: 'What is the main role of a market maker?',
          option_a: 'To regulate markets',
          option_b: 'To provide liquidity',
          option_c: 'To issue new securities',
          option_d: 'To audit financial statements',
          correct_answer: 'B'
        }
      ]);
      
      setQuizAnswers(Array(3).fill(''));
    }
  }, [loading, chapters.length]);

  // Fetch user's learning progress
  const fetchUserProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('user_learning_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user progress:', error);
        return;
      }
      
      if (data) {
        setLearningProgress(data);
        setCurrentChapterIndex(data.current_chapter_index);
        setCurrentTopicIndex(data.current_topic_index);
        setCurrentStep(data.current_step);
      }
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };

  // Fetch all chapters and topics
  const fetchChaptersAndTopics = async () => {
    setLoading(true);
    try {
      // Try to fetch from database first
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .order('chapter_order', { ascending: true });
      
      if (chaptersError) throw chaptersError;
      
      // If no chapters in database, use fallback data
      if (!chaptersData || chaptersData.length === 0) {
        console.log('No chapters found in database, using fallback data');
        setChapters(FALLBACK_DATA.chapters);
        setTopics(FALLBACK_DATA.topics);
        
        // Set initial content from fallback data
        const currentTopicId = FALLBACK_DATA.topics[0].id;
        setConceptContent(FALLBACK_DATA.concepts[currentTopicId]);
        setFlashcards(FALLBACK_DATA.flashcards[currentTopicId]);
        setQuizQuestions(FALLBACK_DATA.quizzes[currentTopicId]);
        setQuizAnswers(Array(FALLBACK_DATA.quizzes[currentTopicId].length).fill(''));
      } else {
        setChapters(chaptersData);
        
        // Fetch topics for the first chapter
        const { data: topicsData, error: topicsError } = await supabase
          .from('topics')
          .select('*')
          .eq('chapter_id', chaptersData[0].id)
          .order('topic_order', { ascending: true });
        
        if (topicsError) throw topicsError;
        
        if (!topicsData || topicsData.length === 0) {
          // No topics found, use fallback
          setTopics(FALLBACK_DATA.topics);
          const currentTopicId = FALLBACK_DATA.topics[0].id;
          setConceptContent(FALLBACK_DATA.concepts[currentTopicId]);
          setFlashcards(FALLBACK_DATA.flashcards[currentTopicId]);
          setQuizQuestions(FALLBACK_DATA.quizzes[currentTopicId]);
          setQuizAnswers(Array(FALLBACK_DATA.quizzes[currentTopicId].length).fill(''));
        } else {
          setTopics(topicsData);
          // Load initial content
          await loadContent(chaptersData[0].id, topicsData[0].id);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chapters and topics:', error);
      // Use fallback data on error
      setChapters(FALLBACK_DATA.chapters);
      setTopics(FALLBACK_DATA.topics);
      
      // Set initial content from fallback data
      const currentTopicId = FALLBACK_DATA.topics[0].id;
      setConceptContent(FALLBACK_DATA.concepts[currentTopicId]);
      setFlashcards(FALLBACK_DATA.flashcards[currentTopicId]);
      setQuizQuestions(FALLBACK_DATA.quizzes[currentTopicId]);
      setQuizAnswers(Array(FALLBACK_DATA.quizzes[currentTopicId].length).fill(''));
      
      setLoading(false);
    }
  };

  // Load content based on current chapter, topic, and step
  useEffect(() => {
    if (chapters.length > 0 && topics.length > 0) {
      const currentChapter = chapters[currentChapterIndex];
      const currentTopic = topics[currentTopicIndex];
      
      if (currentChapter && currentTopic) {
        loadContent(currentChapter.id, currentTopic.id);
      }
    }
  }, [currentChapterIndex, currentTopicIndex, currentStep, chapters, topics]);

  // Load content (concept, flashcards, or quiz) based on current step
  const loadContent = async (chapterId, topicId) => {
    try {
      // First try to get the topic ID string
      const currentTopicId = typeof topicId === 'string' ? topicId : topicId.toString();
      
      // Check if we have fallback data for this topic
      const hasFallbackData = FALLBACK_DATA.concepts[currentTopicId] && 
                              FALLBACK_DATA.flashcards[currentTopicId] && 
                              FALLBACK_DATA.quizzes[currentTopicId];
      
      if (currentStep === 'concept') {
        // Try database first, fallback if needed
        const result = await loadConcept(currentTopicId);
        if (!result && hasFallbackData) {
          setConceptContent(FALLBACK_DATA.concepts[currentTopicId]);
        }
      } else if (currentStep === 'flashcard') {
        const result = await loadFlashcards(currentTopicId);
        if ((!result || result.length === 0) && hasFallbackData) {
          setFlashcards(FALLBACK_DATA.flashcards[currentTopicId]);
          setCurrentCardIndex(0);
          setFlipped(false);
        }
      } else if (currentStep === 'quiz') {
        const result = await loadQuiz(currentTopicId);
        if ((!result || result.length === 0) && hasFallbackData) {
          setQuizQuestions(FALLBACK_DATA.quizzes[currentTopicId]);
          setQuizAnswers(Array(FALLBACK_DATA.quizzes[currentTopicId].length).fill(''));
          setQuizSubmitted(false);
          setQuizScore(0);
        }
      }
    } catch (error) {
      console.error('Error loading content:', error);
      // Use fallback data on error
      const currentTopicId = typeof topicId === 'string' ? topicId : topicId.toString();
      
      if (currentStep === 'concept' && FALLBACK_DATA.concepts[currentTopicId]) {
        setConceptContent(FALLBACK_DATA.concepts[currentTopicId]);
      } else if (currentStep === 'flashcard' && FALLBACK_DATA.flashcards[currentTopicId]) {
        setFlashcards(FALLBACK_DATA.flashcards[currentTopicId]);
        setCurrentCardIndex(0);
        setFlipped(false);
      } else if (currentStep === 'quiz' && FALLBACK_DATA.quizzes[currentTopicId]) {
        setQuizQuestions(FALLBACK_DATA.quizzes[currentTopicId]);
        setQuizAnswers(Array(FALLBACK_DATA.quizzes[currentTopicId].length).fill(''));
        setQuizSubmitted(false);
        setQuizScore(0);
      }
    }
  };

  // Load concept content
  const loadConcept = async (topicId) => {
    try {
      const { data, error } = await supabase
        .from('concepts')
        .select('*')
        .eq('topic_id', topicId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // No data found
          return null;
        }
        throw error;
      }
      
      setConceptContent(data);
      return data;
    } catch (error) {
      console.error('Error loading concept:', error);
      return null;
    }
  };

  // Load flashcards
  const loadFlashcards = async (topicId) => {
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('topic_id', topicId);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setFlashcards(data);
        setCurrentCardIndex(0);
        setFlipped(false);
      }
      return data;
    } catch (error) {
      console.error('Error loading flashcards:', error);
      return [];
    }
  };

  // Load quiz questions
  const loadQuiz = async (topicId) => {
    try {
      // Reset quiz state immediately to prevent showing old quiz results
      setQuizSubmitted(false);
      setQuizScore(0);
      setQuizAnswers([]);
      
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('topic_id', topicId);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setQuizQuestions(data);
        setQuizAnswers(Array(data.length).fill(''));
      } else {
        setQuizQuestions([]);
      }
      return data;
    } catch (error) {
      console.error('Error loading quiz questions:', error);
      setQuizQuestions([]);
      return [];
    }
  };

  // Update user progress in the database
  const updateUserProgress = async (chapterIndex, topicIndex, step) => {
    try {
      // First check if a record exists
      const { data: existingData, error: checkError } = await supabase
        .from('user_learning_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing progress:', checkError);
      }
      
      // Prepare progress data
      const progressData = {
        user_id: user.id,
        current_chapter_index: chapterIndex,
        current_topic_index: topicIndex,
        current_step: step,
        last_updated: new Date().toISOString(),
        completed: step === 'completed'
      };
      
      let result;
      
      if (existingData) {
        // Update existing record
        const { data, error } = await supabase
          .from('user_learning_progress')
          .update(progressData)
          .eq('user_id', user.id)
          .select();
        
        if (error) throw error;
        result = data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('user_learning_progress')
          .insert(progressData)
          .select();
        
        if (error) throw error;
        result = data;
      }
      
      console.log('Progress saved successfully:', result);
      setLearningProgress(result[0]);
      
      // Also update study progress for this topic
      if (step === 'quiz' && quizSubmitted) {
        const currentTopic = topics[topicIndex];
        if (currentTopic) {
          await supabase
            .from('study_progress')
            .upsert({
              user_id: user.id,
              content_id: currentTopic.id,
              content_type: 'topic',
              mastered: quizScore >= 70,
              last_studied: new Date().toISOString()
            });
        }
      }
    } catch (error) {
      console.error('Error updating user progress:', error);
    }
  };

  // Handle continue button click
  const handleContinue = async () => {
    // Update XP for completing the current step
    await updateXP(user.id, 5, `complete_${currentStep}`);
    
    if (currentStep === 'concept') {
      // Move to flashcards
      setCurrentStep('flashcard');
      await updateUserProgress(currentChapterIndex, currentTopicIndex, 'flashcard');
    } else if (currentStep === 'flashcard') {
      // Move to quiz
      setCurrentStep('quiz');
      await updateUserProgress(currentChapterIndex, currentTopicIndex, 'quiz');
    } else if (currentStep === 'quiz') {
      // Move to next topic or chapter
      if (currentTopicIndex < topics.length - 1) {
        // Move to next topic
        setCurrentTopicIndex(currentTopicIndex + 1);
        setCurrentStep('concept');
        await updateUserProgress(currentChapterIndex, currentTopicIndex + 1, 'concept');
      } else {
        // Check if there are more chapters
        if (currentChapterIndex < chapters.length - 1) {
          // Move to next chapter
          setCurrentChapterIndex(currentChapterIndex + 1);
          setCurrentTopicIndex(0);
          setCurrentStep('concept');
          
          // Fetch topics for the next chapter
          const nextChapter = chapters[currentChapterIndex + 1];
          const { data: topicsData, error: topicsError } = await supabase
            .from('topics')
            .select('*')
            .eq('chapter_id', nextChapter.id)
            .order('topic_order', { ascending: true });
          
          if (topicsError) throw topicsError;
          
          setTopics(topicsData);
          await updateUserProgress(currentChapterIndex + 1, 0, 'concept');
        } else {
          // Completed all chapters
          await updateUserProgress(currentChapterIndex, currentTopicIndex, 'completed');
          // Award bonus XP for completing all chapters
          await updateXP(user.id, 100, 'complete_all_chapters');
          // Set completion state
          setAllChaptersCompleted(true);
        }
      }
    }
  };

  // Update user XP
  const updateXP = async (userId, points, action) => {
    try {
      // Get current XP
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;
      
      const currentXP = profileData.xp || 0;
      const newXP = currentXP + points;
      
      // Update XP
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ xp: newXP })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      
      // Log XP gain
      const { error: logError } = await supabase
        .from('xp_history')
        .insert({
          user_id: userId,
          points,
          action,
          timestamp: new Date().toISOString()
        });
      
      if (logError) throw logError;
    } catch (error) {
      console.error('Error updating XP:', error);
    }
  };

  // Handle flashcard navigation
  const handleNextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setFlipped(false);
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setFlipped(false);
    }
  };

  // Handle quiz answer selection
  const handleAnswerSelect = (questionIndex, answer) => {
    if (!quizSubmitted) {
      const newAnswers = [...quizAnswers];
      newAnswers[questionIndex] = answer;
      setQuizAnswers(newAnswers);
    }
  };

  // Handle quiz submission
  const handleQuizSubmit = async () => {
    // Calculate score
    let score = 0;
    quizQuestions.forEach((question, index) => {
      if (quizAnswers[index] === question.correct_answer) {
        score++;
      }
    });
    
    const percentage = Math.round((score / quizQuestions.length) * 100);
    setQuizScore(percentage);
    setQuizSubmitted(true);
    
    // Update XP based on score
    await updateXP(user.id, Math.max(1, Math.round(percentage / 10)), 'quiz_completion');
    
    // Save progress in the database
    const currentChapter = chapters[currentChapterIndex];
    const currentTopic = topics[currentTopicIndex];
    
    if (currentChapter && currentTopic) {
      try {
        // Save quiz result
        await supabase.from('quiz_attempts').insert({
          user_id: user.id,
          topic_id: currentTopic.id,
          score: percentage,
          completed_at: new Date().toISOString()
        });
        
        // Update user progress
        await updateUserProgress(currentChapterIndex, currentTopicIndex, 'quiz');
      } catch (error) {
        console.error('Error saving quiz results:', error);
      }
    }
  };
  
  // Handle quiz restart
  const handleRestartQuiz = () => {
    setQuizSubmitted(false);
    setQuizScore(0);
    setQuizAnswers(Array(quizQuestions.length).fill(''));
  };

  // Handle save and exit
  const handleSaveAndExit = async () => {
    // Save current progress
    await updateUserProgress(currentChapterIndex, currentTopicIndex, currentStep);
    // Navigate back to dashboard
    navigate('/dashboard');
  };

  // Render loading state
  if (loading) {
    return (
      <div className="guided-learning-experience loading">
        <div className="loading-spinner"></div>
        <p>Loading your learning experience...</p>
      </div>
    );
  }
  
  // If no chapters or topics are available after loading
  if (!loading && chapters.length === 0) {
    return (
      <div className="guided-learning-experience empty-state">
        <div className="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h2>No Content Available</h2>
        <p>We couldn't find any learning content. Please check back later or contact support.</p>
        <button className="primary-button" onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
      </div>
    );
  }

  // Render content based on current step
  const renderContent = () => {
    if (currentStep === 'concept' && conceptContent) {
      return (
        <div className="guided-content concept-content">
          <h2>{conceptContent.title}</h2>
          <div className="concept-description" dangerouslySetInnerHTML={{ __html: conceptContent.description }}></div>
          <div className="concept-example">
            <h3>Example:</h3>
            <p>{conceptContent.example}</p>
          </div>
        </div>
      );
    } else if (currentStep === 'flashcard' && flashcards.length > 0) {
      const currentCard = flashcards[currentCardIndex];
      return (
        <div className="guided-content flashcard-content">
          <h2>Flashcards</h2>
          <div className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
            <div className="flashcard-inner">
              <div className="flashcard-front">
                <p>{currentCard.term}</p>
                <span className="flip-instruction">Click to flip</span>
              </div>
              <div className="flashcard-back">
                <p>{currentCard.definition}</p>
                <span className="flip-instruction">Click to flip</span>
              </div>
            </div>
          </div>
          <div className="flashcard-navigation">
            <button 
              className="nav-button" 
              onClick={handlePrevCard} 
              disabled={currentCardIndex === 0}
            >
              Previous
            </button>
            <span className="card-counter">{currentCardIndex + 1} / {flashcards.length}</span>
            <button 
              className="nav-button" 
              onClick={handleNextCard} 
              disabled={currentCardIndex === flashcards.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      );
    } else if (currentStep === 'quiz' && quizQuestions.length > 0) {
      return (
        <div className="guided-content quiz-content">
          <h2>Quiz</h2>
          {quizSubmitted ? (
            <div className="quiz-results">
              <h3>Your Score: {quizScore}%</h3>
              <div className="quiz-feedback">
                {quizScore >= 70 ? (
                  <p className="success-message">Great job! You've mastered this topic.</p>
                ) : (
                  <p className="warning-message">You might want to review this topic again.</p>
                )}
                
                {/* Add restart quiz button for scores of 66% or less (2/3 or less correct) */}
                {quizScore <= 66 && (
                  <button 
                    className="restart-quiz-button" 
                    onClick={handleRestartQuiz}
                  >
                    Restart Quiz
                  </button>
                )}
              </div>
              <div className="quiz-review">
                {quizQuestions.map((question, index) => (
                  <div 
                    key={index} 
                    className={`quiz-review-item ${quizAnswers[index] === question.correct_answer ? 'correct' : 'incorrect'}`}
                  >
                    <p className="question">{question.question}</p>
                    <p className="answer">
                      Your answer: <span>{quizAnswers[index] || 'Not answered'}</span>
                    </p>
                    <p className="correct-answer">
                      Correct answer: <span>{question.correct_answer}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="quiz-questions">
              {quizQuestions.map((question, index) => (
                <div key={index} className="quiz-question">
                  <p className="question-text">{question.question}</p>
                  <div className="answer-options">
                    {['A', 'B', 'C', 'D'].map((option) => (
                      <div 
                        key={option} 
                        className={`answer-option ${quizAnswers[index] === option ? 'selected' : ''}`}
                        onClick={() => handleAnswerSelect(index, option)}
                      >
                        <span className="option-label">{option}</span>
                        <span className="option-text">{question[`option_${option.toLowerCase()}`]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button 
                className="submit-button" 
                onClick={handleQuizSubmit}
                disabled={quizAnswers.includes('')}
              >
                Submit Answers
              </button>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="guided-content empty-content">
          <p>No content available for this topic.</p>
        </div>
      );
    }
  };

  // If all chapters are completed, show the completion screen
  if (allChaptersCompleted) {
    return (
      <div className="guided-learning-experience">
        <div className="completion-container">
          <div className="completion-header">
            <h1>Congratulations!</h1>
            <p>You've completed all chapters in the SIE Guided Learning Experience</p>
          </div>
          
          <div className="completion-content">
            <div className="completion-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            
            <div className="completion-message">
              <h2>You're Ready for the Practice Test!</h2>
              <p>Now that you've mastered all the material, it's time to test your knowledge with our comprehensive 75-question practice exam.</p>
              <p>The practice test will simulate the actual exam conditions and give you detailed feedback on your performance.</p>
            </div>
            
            <div className="completion-stats">
              <div className="stat-item">
                <div className="stat-value">{chapters.length}</div>
                <div className="stat-label">Chapters Completed</div>
              </div>
              
              <div className="stat-item">
                <div className="stat-value">{topics.length}</div>
                <div className="stat-label">Topics Mastered</div>
              </div>
              
              <div className="stat-item">
                <div className="stat-value">+100</div>
                <div className="stat-label">Bonus XP Earned</div>
              </div>
            </div>
            
            <div className="completion-actions">
              <button 
                className="practice-test-button"
                onClick={() => navigate('/practice-test')}
              >
                Take Practice Test
              </button>
              
              <button 
                className="dashboard-button"
                onClick={() => navigate('/dashboard')}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Regular learning experience view
  return (
    <div className="guided-learning-experience">
      <div className="guided-learning-header">
        <div className="progress-tracker">
          <div className="chapter-info">
            <h2>Chapter {currentChapterIndex + 1}: {chapters[currentChapterIndex]?.title}</h2>
            <h3>Topic {currentTopicIndex + 1}: {topics[currentTopicIndex]?.title}</h3>
          </div>
          <div className="step-indicator">
            <div className={`step ${currentStep === 'concept' ? 'active' : currentStep === 'flashcard' || currentStep === 'quiz' ? 'completed' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">Concept</div>
            </div>
            <div className="step-connector"></div>
            <div className={`step ${currentStep === 'flashcard' ? 'active' : currentStep === 'quiz' ? 'completed' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">Flashcards</div>
            </div>
            <div className="step-connector"></div>
            <div className={`step ${currentStep === 'quiz' ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <div className="step-label">Quiz</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="guided-learning-content">
        {renderContent()}
      </div>
      
      <div className="guided-learning-footer">
        <button className="exit-button" onClick={handleSaveAndExit}>
          Save Progress & Exit
        </button>
        <button 
          className="continue-button" 
          onClick={handleContinue}
          disabled={(currentStep === 'quiz' && !quizSubmitted) || (currentStep === 'flashcard' && currentCardIndex < flashcards.length - 1)}
        >
          {currentStep === 'quiz' && quizSubmitted ? 'Next Topic' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default GuidedLearningExperience;
