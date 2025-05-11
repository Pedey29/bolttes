import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, updateXP } from '../supabase';
import './Quiz.css';

const Quiz = ({ user }) => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    if (user && topicId) {
      fetchTopic();
      fetchQuestions(topicId);
    }
  }, [user, topicId]);

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

  const fetchQuestions = async (topicId) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('questions')
        .select('*');
      
      if (topicId) {
        query = query.eq('topic_id', topicId);
      }
      
      // Limit to 10 questions
      const { data, error } = await query.limit(10);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        alert('No questions available for this topic yet.');
        setLoading(false);
        navigate('/chapters');
        return false;
      }
      
      // Shuffle questions
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
      setQuizStarted(true);
      return true;
    } catch (error) {
      console.error('Error fetching questions:', error.message);
      setLoading(false);
      return false;
    }
  };

  const startQuiz = async () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setQuizCompleted(false);
    setAnswers([]);
    setQuizStarted(true);
    setLoading(false);
  };

  const handleOptionSelect = (optionIndex) => {
    setSelectedOption(optionIndex);
  };

  const handleNextQuestion = async () => {
    if (selectedOption === null) {
      alert('Please select an answer before proceeding.');
      return;
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion.correct_option;
    
    // Record answer
    const answer = {
      question_id: currentQuestion.id,
      selected_option: selectedOption,
      correct: isCorrect
    };
    
    setAnswers([...answers, answer]);
    
    // Update score if correct
    if (isCorrect) {
      setScore(score + 1);
    }
    
    // Save quiz attempt to Supabase
    try {
      await supabase
        .from('quiz_attempts')
        .insert([{
          user_id: user.id,
          question_id: currentQuestion.id,
          selected_option: selectedOption,
          correct: isCorrect
        }]);
    } catch (error) {
      console.error('Error saving quiz attempt:', error.message);
    }
    
    // Move to next question or complete quiz
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = async () => {
    // Calculate final score based on answers array
    const finalScore = answers.filter(answer => answer.correct).length;
    
    // Update the score state to ensure consistency
    setScore(finalScore);
    setQuizCompleted(true);
    
    // Calculate XP based on final score
    const xpEarned = Math.max(5, finalScore * 10); // Minimum 5 XP, 10 XP per correct answer
    
    try {
      // Use the updateXP function to update XP in the database
      await updateXP(user.id, xpEarned, 'quiz_complete');
      
      // Determine if quiz was passed (70% or higher)
      const passThreshold = 0.7; // 70%
      const percentageScore = finalScore / questions.length;
      const passed = percentageScore >= passThreshold;
      
      // Update study progress to track quiz completion
      if (selectedTopic) {
        // Check if entry exists
        const { data: existingProgress } = await supabase
          .from('study_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('content_type', 'quiz')
          .eq('topic_id', selectedTopic)
          .single();
        
        if (existingProgress) {
          // Update existing entry
          await supabase
            .from('study_progress')
            .update({ 
              mastered: passed, // Only mark as mastered if passed
              last_studied: new Date()
            })
            .eq('id', existingProgress.id);
        } else {
          // Create new entry with a generated UUID for content_id
          const contentId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
          
          await supabase
            .from('study_progress')
            .insert({
              user_id: user.id,
              topic_id: selectedTopic,
              content_type: 'quiz',
              content_id: contentId,
              mastered: passed, // Only mark as mastered if passed
              last_studied: new Date()
            });
        }
      }
      
      // Show a simple alert with pass/fail message
      const passMessage = passed ? "Congratulations! You passed the quiz!" : "You didn't pass this time. Keep studying and try again!";
      alert(`Quiz Completed! Your score: ${finalScore}/${questions.length} (${Math.round(percentageScore * 100)}%)\n${passMessage}\nYou earned ${xpEarned} XP!`);
    } catch (error) {
      console.error('Error updating quiz progress:', error.message);
      // Still show basic completion message if there was an error
      alert(`Quiz Completed! Your score: ${finalScore}/${questions.length}\nYou earned ${xpEarned} XP!`);
    }
  };

  if (loading) {
    return (
      <div className="quiz-loading">
        <div className="loader"></div>
        <p>Loading quiz...</p>
      </div>
    );
  }

  if (!quizStarted && !loading) {
    return (
      <div className="quiz-start-screen">
        <div className="quiz-header">
          <h1>{topic?.title || 'SIE Practice Quiz'}</h1>
          <p>{topic?.description || 'Test your knowledge with multiple-choice questions'}</p>
        </div>
        
        <div className="quiz-start-actions">
          <button 
            className="btn-start-quiz"
            onClick={startQuiz}
          >
            Start Quiz
          </button>
          
          <button 
            className="btn-back"
            onClick={() => navigate('/chapters')}
          >
            Back to Study Guide
          </button>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="quiz-results">
        <div className="quiz-header">
          <h1>Quiz Results</h1>
          <button 
            className="new-quiz-button"
            onClick={() => {
              setQuizStarted(false);
              setQuizCompleted(false);
            }}
          >
            Start New Quiz
          </button>
        </div>
        
        <div className="score-card">
          <h2>Your Score</h2>
          <div className="score-value">{score}/{questions.length}</div>
          <div className="score-percentage">
            {Math.round((score / questions.length) * 100)}%
          </div>
        </div>
        
        <h2 className="review-title">Review Questions</h2>
        
        <div className="review-list">
          {questions.map((question, index) => {
            const answer = answers[index];
            const isCorrect = answer.correct;
            
            return (
              <div key={index} className="review-item">
                <div className="review-question">
                  {index + 1}. {question.question}
                </div>
                
                <div className="review-options">
                  {question.options.map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className={`review-option ${
                        answer.selected_option === optIndex ? 'selected' : ''
                      } ${
                        question.correct_option === optIndex ? 'correct' : ''
                      }`}
                    >
                      {String.fromCharCode(65 + optIndex)}. {option}
                      {question.correct_option === optIndex && ' ✓'}
                    </div>
                  ))}
                </div>
                
                {!isCorrect && question.explanation && (
                  <div className="explanation">
                    <h4>Explanation:</h4>
                    <p>{question.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Quiz in progress
  const currentQuestion = questions[currentQuestionIndex];
  
  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h1>Practice Quiz</h1>
        <button 
          className="quit-button"
          onClick={() => {
            if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
              setQuizStarted(false);
            }
          }}
        >
          Quit Quiz
        </button>
      </div>
      
      <div className="question-progress">
        Question {currentQuestionIndex + 1} of {questions.length}
      </div>
      
      <div className="question-card">
        <div className="question-text">
          {currentQuestion.question}
        </div>
        
        <div className="options-list">
          {currentQuestion.options.map((option, index) => (
            <div
              key={index}
              className={`option-item ${selectedOption === index ? 'selected' : ''}`}
              onClick={() => handleOptionSelect(index)}
            >
              <div className="option-letter">{String.fromCharCode(65 + index)}</div>
              <div className="option-text">{option}</div>
            </div>
          ))}
        </div>
        
        <button 
          className="next-button"
          onClick={handleNextQuestion}
          disabled={selectedOption === null}
        >
          {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Complete Quiz'}
        </button>
      </div>
    </div>
  );
};

export default Quiz;
