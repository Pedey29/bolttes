import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { supabase, getCurrentUser, updateXP } from '../utils/supabase';

export default function QuizScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    fetchUserData();
    fetchTopics();
  }, []);

  const fetchUserData = async () => {
    try {
      const { user, error } = await getCurrentUser();
      if (error) throw error;
      setUser(user);
    } catch (error) {
      console.error('Error fetching user:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('id, title');
      
      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error.message);
    }
  };

  const fetchQuestions = async (topicId = null) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('questions')
        .select('*');
      
      if (topicId) {
        query = query.eq('topic_id', topicId);
      }
      
      // Limit to 10 questions and randomize
      const { data, error } = await query.limit(10);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        Alert.alert('No Questions', 'No questions available for this topic yet.');
        setLoading(false);
        return false;
      }
      
      // Shuffle questions
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
      return true;
    } catch (error) {
      console.error('Error fetching questions:', error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async (topicId = null) => {
    setSelectedTopic(topicId);
    const success = await fetchQuestions(topicId);
    
    if (success) {
      setCurrentQuestionIndex(0);
      setScore(0);
      setQuizCompleted(false);
      setAnswers([]);
      setQuizStarted(true);
    }
  };

  const handleOptionSelect = (optionIndex) => {
    setSelectedOption(optionIndex);
  };

  const handleNextQuestion = async () => {
    if (selectedOption === null) {
      Alert.alert('Select an Option', 'Please select an answer before proceeding.');
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
    setQuizCompleted(true);
    
    // Calculate XP based on score
    const xpEarned = Math.max(5, score * 10); // Minimum 5 XP, 10 XP per correct answer
    
    try {
      await updateXP(user.id, xpEarned, 'complete_quiz');
      
      // Show completion message with XP earned
      Alert.alert(
        'Quiz Completed!',
        `Your score: ${score}/${questions.length}\nYou earned ${xpEarned} XP!`,
        [{ text: 'View Results', onPress: () => {} }]
      );
    } catch (error) {
      console.error('Error updating XP:', error.message);
    }
  };

  const renderQuestion = () => {
    const question = questions[currentQuestionIndex];
    return (
      <View style={styles.questionContainer}>
        <Text style={styles.questionProgress}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </Text>
        
        <Text style={styles.questionText}>{question.question}</Text>
        
        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedOption === index && styles.selectedOptionButton
              ]}
              onPress={() => handleOptionSelect(index)}
            >
              <Text style={[
                styles.optionText,
                selectedOption === index && styles.selectedOptionText
              ]}>
                {String.fromCharCode(65 + index)}. {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNextQuestion}
        >
          <Text style={styles.nextButtonText}>
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Complete Quiz'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderQuizResults = () => {
    return (
      <ScrollView style={styles.resultsContainer}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>Your Score</Text>
          <Text style={styles.scoreValue}>{score}/{questions.length}</Text>
          <Text style={styles.scorePercentage}>
            {Math.round((score / questions.length) * 100)}%
          </Text>
        </View>
        
        <Text style={styles.reviewTitle}>Review Questions</Text>
        
        {questions.map((question, index) => {
          const answer = answers[index];
          const isCorrect = answer.correct;
          
          return (
            <View key={index} style={styles.reviewItem}>
              <Text style={styles.reviewQuestion}>
                {index + 1}. {question.question}
              </Text>
              
              <View style={styles.reviewOptions}>
                {question.options.map((option, optIndex) => (
                  <Text
                    key={optIndex}
                    style={[
                      styles.reviewOption,
                      answer.selected_option === optIndex && styles.selectedReviewOption,
                      question.correct_option === optIndex && styles.correctReviewOption
                    ]}
                  >
                    {String.fromCharCode(65 + optIndex)}. {option}
                    {question.correct_option === optIndex && ' ✓'}
                  </Text>
                ))}
              </View>
              
              {!isCorrect && question.explanation && (
                <View style={styles.explanationContainer}>
                  <Text style={styles.explanationTitle}>Explanation:</Text>
                  <Text style={styles.explanationText}>{question.explanation}</Text>
                </View>
              )}
            </View>
          );
        })}
        
        <TouchableOpacity
          style={styles.newQuizButton}
          onPress={() => {
            setQuizStarted(false);
            setQuizCompleted(false);
          }}
        >
          <Text style={styles.newQuizButtonText}>Start New Quiz</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderTopicSelection = () => {
    return (
      <View style={styles.topicSelectionContainer}>
        <Text style={styles.selectionTitle}>Select Quiz Topic</Text>
        
        <TouchableOpacity
          style={styles.topicButton}
          onPress={() => startQuiz()}
        >
          <Text style={styles.topicButtonText}>Random Questions (All Topics)</Text>
        </TouchableOpacity>
        
        {topics.map(topic => (
          <TouchableOpacity
            key={topic.id}
            style={styles.topicButton}
            onPress={() => startQuiz(topic.id)}
          >
            <Text style={styles.topicButtonText}>{topic.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading quiz...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {quizStarted ? (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (quizCompleted) {
                setQuizStarted(false);
                setQuizCompleted(false);
              } else {
                Alert.alert(
                  'Quit Quiz?',
                  'Your progress will be lost.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Quit', onPress: () => setQuizStarted(false) }
                  ]
                );
              }
            }}
          >
            <Text style={styles.backButtonText}>
              {quizCompleted ? 'New Quiz' : 'Quit Quiz'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {quizStarted 
            ? (quizCompleted ? 'Quiz Results' : 'Practice Quiz') 
            : 'SIE Practice Quiz'}
        </Text>
      </View>
      
      <View style={styles.content}>
        {quizStarted 
          ? (quizCompleted ? renderQuizResults() : renderQuestion())
          : renderTopicSelection()
        }
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    backgroundColor: '#2c3e50',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    color: '#ecf0f1',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  topicSelectionContainer: {
    padding: 20,
  },
  selectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  topicButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  topicButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  questionContainer: {
    flex: 1,
    padding: 20,
  },
  questionProgress: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 30,
    lineHeight: 28,
  },
  optionsContainer: {
    marginBottom: 30,
  },
  optionButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  selectedOptionButton: {
    backgroundColor: '#3498db',
  },
  optionText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#2ecc71',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultsContainer: {
    padding: 20,
  },
  scoreContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  scoreText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  scorePercentage: {
    fontSize: 24,
    color: '#3498db',
    marginTop: 5,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  reviewItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  reviewQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    lineHeight: 24,
  },
  reviewOptions: {
    marginBottom: 10,
  },
  reviewOption: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  selectedReviewOption: {
    backgroundColor: '#e74c3c',
    color: '#fff',
  },
  correctReviewOption: {
    backgroundColor: '#2ecc71',
    color: '#fff',
    fontWeight: 'bold',
  },
  explanationContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    padding: 15,
    marginTop: 10,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  explanationText: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  newQuizButton: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginVertical: 20,
  },
  newQuizButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
