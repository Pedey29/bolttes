import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList, 
  Modal, 
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { supabase, getCurrentUser, updateXP } from '../utils/supabase';

export default function FlashcardsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [newCard, setNewCard] = useState({
    question: '',
    answer: '',
    topic_id: null
  });

  useEffect(() => {
    fetchUserData();
    fetchTopics();
    fetchFlashcards();
  }, []);

  const fetchUserData = async () => {
    try {
      const { user, error } = await getCurrentUser();
      if (error) throw error;
      setUser(user);
    } catch (error) {
      console.error('Error fetching user:', error.message);
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

  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('flashcards')
        .select(`
          id, 
          question, 
          answer, 
          created_at,
          topics(id, title)
        `)
        .eq('user_id', (await getCurrentUser()).user?.id);
      
      if (error) throw error;
      setFlashcards(data || []);
    } catch (error) {
      console.error('Error fetching flashcards:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const createFlashcard = async () => {
    if (!newCard.question || !newCard.answer) {
      Alert.alert('Error', 'Please fill in both question and answer');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('flashcards')
        .insert([{
          ...newCard,
          user_id: user.id
        }])
        .select();
      
      if (error) throw error;
      
      // Award XP for creating a flashcard
      await updateXP(user.id, 5, 'create_flashcard');
      
      setFlashcards([...flashcards, data[0]]);
      setNewCard({ question: '', answer: '', topic_id: null });
      setModalVisible(false);
      
      Alert.alert('Success', 'Flashcard created! +5 XP');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const deleteFlashcard = async (id) => {
    try {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setFlashcards(flashcards.filter(card => card.id !== id));
      Alert.alert('Success', 'Flashcard deleted');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const startStudyMode = () => {
    if (flashcards.length === 0) {
      Alert.alert('No Flashcards', 'Create some flashcards first to study');
      return;
    }
    
    // Shuffle the flashcards
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setIsStudyMode(true);
  };

  const handleNextCard = async () => {
    // Award XP for reviewing a flashcard
    if (currentCardIndex === 0 || currentCardIndex % 5 === 0) {
      await updateXP(user.id, 2, 'review_flashcard');
    }
    
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      // Completed all cards
      Alert.alert(
        'Study Complete!', 
        'You have reviewed all your flashcards. +10 XP',
        [{ text: 'OK', onPress: () => {
          setIsStudyMode(false);
          updateXP(user.id, 10, 'complete_flashcard_review');
        }}]
      );
    }
  };

  const renderFlashcardItem = ({ item }) => (
    <View style={styles.flashcardItem}>
      <View style={styles.flashcardContent}>
        <Text style={styles.flashcardQuestion}>{item.question}</Text>
        <Text style={styles.flashcardTopic}>
          Topic: {item.topics?.title || 'General'}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => deleteFlashcard(item.id)}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStudyCard = () => {
    const card = flashcards[currentCardIndex];
    return (
      <View style={styles.studyCardContainer}>
        <View style={styles.studyCard}>
          <Text style={styles.cardProgress}>
            {currentCardIndex + 1} / {flashcards.length}
          </Text>
          
          <Text style={styles.studyQuestion}>{card.question}</Text>
          
          {showAnswer ? (
            <View style={styles.answerContainer}>
              <Text style={styles.answerLabel}>Answer:</Text>
              <Text style={styles.studyAnswer}>{card.answer}</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.showAnswerButton}
              onPress={() => setShowAnswer(true)}
            >
              <Text style={styles.showAnswerText}>Show Answer</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.studyButtonsContainer}>
          <TouchableOpacity 
            style={[styles.studyButton, { backgroundColor: '#e74c3c' }]}
            onPress={() => handleNextCard()}
          >
            <Text style={styles.studyButtonText}>
              {currentCardIndex < flashcards.length - 1 ? 'Next Card' : 'Finish'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading flashcards...</Text>
      </View>
    );
  }

  if (isStudyMode) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setIsStudyMode(false)}
          >
            <Text style={styles.backButtonText}>Exit Study Mode</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Study Flashcards</Text>
        </View>
        
        {renderStudyCard()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Flashcards</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#3498db' }]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.actionButtonText}>Create New</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#2ecc71' }]}
            onPress={startStudyMode}
          >
            <Text style={styles.actionButtonText}>Study Mode</Text>
          </TouchableOpacity>
        </View>
        
        {flashcards.length > 0 ? (
          <FlatList
            data={flashcards}
            renderItem={renderFlashcardItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No flashcards yet</Text>
            <Text style={styles.emptySubtext}>Create your first flashcard to start studying</Text>
          </View>
        )}
      </View>
      
      {/* Create Flashcard Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Flashcard</Text>
            
            <Text style={styles.inputLabel}>Question:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your question"
              value={newCard.question}
              onChangeText={(text) => setNewCard({...newCard, question: text})}
              multiline
            />
            
            <Text style={styles.inputLabel}>Answer:</Text>
            <TextInput
              style={[styles.input, styles.answerInput]}
              placeholder="Enter the answer"
              value={newCard.answer}
              onChangeText={(text) => setNewCard({...newCard, answer: text})}
              multiline
            />
            
            <Text style={styles.inputLabel}>Topic:</Text>
            <View style={styles.topicsContainer}>
              {topics.map(topic => (
                <TouchableOpacity
                  key={topic.id}
                  style={[
                    styles.topicChip,
                    newCard.topic_id === topic.id && styles.selectedTopicChip
                  ]}
                  onPress={() => setNewCard({...newCard, topic_id: topic.id})}
                >
                  <Text style={[
                    styles.topicChipText,
                    newCard.topic_id === topic.id && styles.selectedTopicChipText
                  ]}>
                    {topic.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.createButton]}
                onPress={createFlashcard}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  flashcardItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  flashcardContent: {
    flex: 1,
  },
  flashcardQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  flashcardTopic: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2c3e50',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2c3e50',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  answerInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  topicChip: {
    backgroundColor: '#ecf0f1',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    margin: 5,
  },
  selectedTopicChip: {
    backgroundColor: '#3498db',
  },
  topicChipText: {
    color: '#7f8c8d',
    fontSize: 14,
  },
  selectedTopicChipText: {
    color: '#fff',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#3498db',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  studyCardContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  studyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    minHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardProgress: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  studyQuestion: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 30,
    textAlign: 'center',
  },
  showAnswerButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  showAnswerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  answerContainer: {
    marginTop: 20,
  },
  answerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 10,
  },
  studyAnswer: {
    fontSize: 18,
    color: '#2c3e50',
    lineHeight: 24,
  },
  studyButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  studyButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  studyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
