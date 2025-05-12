import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, updateXP } from '../supabase';
import './PracticeTest.css';

const PracticeTest = ({ user }) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testStarted, setTestStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(120 * 60); // 120 minutes in seconds
  const [testCompleted, setTestCompleted] = useState(false);
  const [results, setResults] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const totalQuestions = 75;

  useEffect(() => {
    if (user) {
      fetchQuestions();
    }
  }, [user]);

  // Timer effect
  useEffect(() => {
    let timer;
    if (testStarted && !testCompleted && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            submitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [testStarted, testCompleted, timeRemaining]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      
      // Fetch all questions from the database
      const { data, error } = await supabase
        .from('questions')
        .select('*');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        alert('No questions available for the practice test.');
        navigate('/dashboard');
        return;
      }
      
      // Shuffle all questions and take the first 75
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      const selectedQuestions = shuffled.slice(0, totalQuestions);
      
      setQuestions(selectedQuestions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching questions:', error.message);
      setLoading(false);
    }
  };

  const startTest = () => {
    setTestStarted(true);
    setCurrentQuestionIndex(0);
    setSelectedOptions({});
    setTimeRemaining(120 * 60); // Reset timer to 120 minutes
  };

  const handleOptionSelect = (questionId, optionIndex) => {
    setSelectedOptions({
      ...selectedOptions,
      [questionId]: optionIndex
    });
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowExplanation(false);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowExplanation(false);
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
    setShowExplanation(false);
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateResults = () => {
    let correctCount = 0;
    const questionResults = {};
    
    questions.forEach((question) => {
      const isCorrect = selectedOptions[question.id] === question.correct_option;
      questionResults[question.id] = {
        selected: selectedOptions[question.id],
        correct: question.correct_option,
        isCorrect
      };
      
      if (isCorrect) {
        correctCount++;
      }
    });
    
    const score = correctCount / questions.length;
    const passed = score >= 0.7; // 70% passing threshold
    
    return {
      score,
      correctCount,
      totalQuestions: questions.length,
      passed,
      questionResults
    };
  };

  const submitTest = async () => {
    const results = calculateResults();
    setResults(results);
    setTestCompleted(true);
    
    try {
      // Award XP based on performance
      const xpEarned = Math.round(results.score * 100); // Up to 100 XP for perfect score
      await updateXP(user.id, xpEarned, 'practice_test_complete');
      
      // Save test results to database
      await supabase
        .from('practice_test_results')
        .insert({
          user_id: user.id,
          score: results.score,
          correct_count: results.correctCount,
          total_questions: results.totalQuestions,
          passed: results.passed,
          completed_at: new Date().toISOString(),
          time_taken: 120 * 60 - timeRemaining // seconds taken
        });
        
    } catch (error) {
      console.error('Error saving test results:', error);
    }
  };

  const restartTest = () => {
    fetchQuestions();
    setTestStarted(false);
    setTestCompleted(false);
    setResults(null);
    setSelectedOptions({});
  };

  if (loading) {
    return (
      <div className="practice-test-loading">
        <div className="loader"></div>
        <p>Loading practice test questions...</p>
      </div>
    );
  }

  // Question review mode - when user clicks on a question from results
  if (!testCompleted && showExplanation) {
    const currentQuestion = questions[currentQuestionIndex];
    const result = results.questionResults[currentQuestion.id];
    const isCorrect = result?.isCorrect;
    const selectedOption = result?.selected;
    const correctOption = result?.correct;
    
    return (
      <div className="practice-test-container">
        <div className="review-header">
          <h2>Question Review</h2>
          <button onClick={() => {
            setTestCompleted(true);
            setShowExplanation(false);
          }} className="btn-back-to-results">
            Back to Results
          </button>
        </div>
        
        <div className="question-container review-mode">
          <div className="question-text">
            <span className="question-number">{currentQuestionIndex + 1}.</span>
            {currentQuestion.question}
          </div>
          
          <div className="options-list">
            {currentQuestion.options.map((option, index) => (
              <div
                key={index}
                className={`option-item ${index === selectedOption ? 'selected' : ''} ${
                  index === correctOption ? 'correct' : ''
                } ${
                  index === selectedOption && index !== correctOption ? 'incorrect' : ''
                }`}
              >
                <div className="option-letter">{String.fromCharCode(65 + index)}</div>
                <div className="option-text">{option}</div>
              </div>
            ))}
          </div>
          
          <div className="result-indicator">
            {isCorrect ? (
              <div className="correct-answer">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>Correct Answer</span>
              </div>
            ) : (
              <div className="incorrect-answer">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <span>Incorrect Answer</span>
              </div>
            )}
          </div>
          
          {currentQuestion.explanation && (
            <div className="explanation-box">
              <h3>Explanation:</h3>
              <p>{currentQuestion.explanation}</p>
            </div>
          )}
          
          <div className="review-navigation">
            <button 
              onClick={() => {
                if (currentQuestionIndex > 0) {
                  setCurrentQuestionIndex(currentQuestionIndex - 1);
                }
              }} 
              disabled={currentQuestionIndex === 0}
              className="btn-nav"
            >
              Previous Question
            </button>
            
            <button 
              onClick={() => {
                if (currentQuestionIndex < questions.length - 1) {
                  setCurrentQuestionIndex(currentQuestionIndex + 1);
                }
              }} 
              disabled={currentQuestionIndex === questions.length - 1}
              className="btn-nav"
            >
              Next Question
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (testCompleted && results) {
    return (
      <div className="practice-test-container">
        <div className="test-results">
          <h1>Practice Test Results</h1>
          
          <div className="results-summary">
            <div className="result-card">
              <div className="result-title">Score</div>
              <div className="result-value">{Math.round(results.score * 100)}%</div>
            </div>
            
            <div className="result-card">
              <div className="result-title">Correct Answers</div>
              <div className="result-value">{results.correctCount} / {results.totalQuestions}</div>
            </div>
            
            <div className="result-card">
              <div className="result-title">Status</div>
              <div className={`result-value ${results.passed ? 'passed' : 'failed'}`}>
                {results.passed ? 'PASSED' : 'FAILED'}
              </div>
            </div>
          </div>
          
          <div className="results-message">
            {results.passed ? (
              <div className="success-message">
                <h2>Congratulations!</h2>
                <p>You've passed the practice test. You're well-prepared for the SIE exam!</p>
              </div>
            ) : (
              <div className="failure-message">
                <h2>Keep Studying</h2>
                <p>You didn't pass this time, but don't worry! Review the questions you missed and try again.</p>
              </div>
            )}
          </div>
          
          <div className="results-actions">
            <button onClick={restartTest} className="btn-primary">
              Take Another Practice Test
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">
              Return to Dashboard
            </button>
          </div>
          
          <div className="question-review">
            <h2>Question Review</h2>
            <p className="review-instructions">Click on any question to view details and explanation</p>
            
            <div className="question-list">
              {questions.map((question, index) => {
                const result = results.questionResults[question.id];
                const isCorrect = result?.isCorrect;
                
                return (
                  <div 
                    key={question.id} 
                    className={`question-item ${isCorrect ? 'correct' : 'incorrect'}`}
                    onClick={() => {
                      setCurrentQuestionIndex(index);
                      setTestCompleted(false);
                      setShowExplanation(true);
                    }}
                  >
                    <span className="question-number">{index + 1}</span>
                    <span className="question-status">
                      {isCorrect ? '✓' : '✗'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="practice-test-container">
        <div className="test-intro">
          <h1>SIE Practice Test</h1>
          <div className="test-info">
            <p>This practice test consists of {totalQuestions} questions designed to simulate the actual SIE exam.</p>
            <ul>
              <li><strong>Time Limit:</strong> 2 hours (120 minutes)</li>
              <li><strong>Passing Score:</strong> 70% or higher</li>
              <li><strong>Question Types:</strong> Multiple choice</li>
              <li><strong>Topics:</strong> Covers all exam topics in proportion to the actual test</li>
            </ul>
            <p>You can navigate between questions and change your answers at any time during the test.</p>
            <p><strong>Note:</strong> Your progress will not be saved if you leave this page.</p>
          </div>
          
          <button onClick={startTest} className="btn-start-test">
            Start Practice Test
          </button>
          
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Test in progress
  const currentQuestion = questions[currentQuestionIndex];
  const isAnswered = selectedOptions[currentQuestion.id] !== undefined;
  const questionsAnswered = Object.keys(selectedOptions).length;
  const progressPercentage = (questionsAnswered / questions.length) * 100;
  
  return (
    <div className="practice-test-container">
      <div className="test-header">
        <div className="test-progress">
          <div className="progress-text">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{questionsAnswered} of {questions.length} answered</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
        
        <div className="test-timer">
          <div className="timer-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="timer-value">{formatTime(timeRemaining)}</div>
        </div>
      </div>
      
      <div className="question-container">
        <div className="question-text">
          <span className="question-number">{currentQuestionIndex + 1}.</span>
          {currentQuestion.question}
        </div>
        
        <div className="options-list">
          {currentQuestion.options.map((option, index) => (
            <div
              key={index}
              className={`option-item ${selectedOptions[currentQuestion.id] === index ? 'selected' : ''}`}
              onClick={() => handleOptionSelect(currentQuestion.id, index)}
            >
              <div className="option-letter">{String.fromCharCode(65 + index)}</div>
              <div className="option-text">{option}</div>
            </div>
          ))}
        </div>

        
        <div className="question-actions">
          <button 
            onClick={goToPreviousQuestion} 
            disabled={currentQuestionIndex === 0}
            className="btn-nav"
          >
            Previous
          </button>
          
          <button 
            onClick={goToNextQuestion} 
            disabled={currentQuestionIndex === questions.length - 1}
            className="btn-nav"
          >
            Next
          </button>
        </div>
      </div>
      
      <div className="question-navigation">
        <div className="navigation-header">
          <h3>Question Navigator</h3>
          <div className="navigation-legend">
            <div className="legend-item">
              <div className="legend-color unanswered"></div>
              <span>Unanswered</span>
            </div>
            <div className="legend-item">
              <div className="legend-color answered"></div>
              <span>Answered</span>
            </div>
            <div className="legend-item">
              <div className="legend-color current"></div>
              <span>Current</span>
            </div>
          </div>
        </div>
        
        <div className="question-grid">
          {questions.map((question, index) => (
            <div
              key={index}
              className={`question-number-box ${
                selectedOptions[question.id] !== undefined ? 'answered' : 'unanswered'
              } ${currentQuestionIndex === index ? 'current' : ''}`}
              onClick={() => goToQuestion(index)}
            >
              {index + 1}
            </div>
          ))}
        </div>
        
        <button 
          onClick={submitTest} 
          className="btn-submit-test"
          disabled={questionsAnswered === 0}
        >
          Submit Test
        </button>
      </div>
    </div>
  );
};

export default PracticeTest;
