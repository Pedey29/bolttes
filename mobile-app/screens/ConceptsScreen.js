import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import { supabase, getCurrentUser, updateXP } from '../utils/supabase';

export default function ConceptsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedConcept, setSelectedConcept] = useState(null);

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
    }
  };

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('title');
      
      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error.message);
    } finally {
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
    } catch (error) {
      console.error('Error fetching concepts:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
    setSelectedConcept(null);
    fetchConcepts(topic.id);
  };

  const handleConceptSelect = async (concept) => {
    setSelectedConcept(concept);
    
    // Award XP for viewing a concept (once per concept)
    try {
      if (user) {
        await updateXP(user.id, 3, 'view_concept');
      }
    } catch (error) {
      console.error('Error updating XP:', error.message);
    }
  };

  const renderTopicItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.topicItem,
        selectedTopic?.id === item.id && styles.selectedTopicItem
      ]}
      onPress={() => handleTopicSelect(item)}
    >
      <Text 
        style={[
          styles.topicTitle,
          selectedTopic?.id === item.id && styles.selectedTopicTitle
        ]}
      >
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  const renderConceptItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.conceptItem,
        selectedConcept?.id === item.id && styles.selectedConceptItem
      ]}
      onPress={() => handleConceptSelect(item)}
    >
      <Text 
        style={[
          styles.conceptTitle,
          selectedConcept?.id === item.id && styles.selectedConceptTitle
        ]}
      >
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  const renderConceptDetail = () => {
    if (!selectedConcept) return null;
    
    return (
      <ScrollView style={styles.conceptDetailContainer}>
        <Text style={styles.conceptDetailTitle}>{selectedConcept.title}</Text>
        
        <View style={styles.explanationContainer}>
          <Text style={styles.explanationLabel}>Explanation:</Text>
          <Text style={styles.explanationText}>{selectedConcept.explanation}</Text>
        </View>
        
        {selectedConcept.example && (
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleLabel}>Example:</Text>
            <Text style={styles.exampleText}>{selectedConcept.example}</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  if (loading && !selectedTopic && !selectedConcept) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading topics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (selectedConcept) {
              setSelectedConcept(null);
            } else if (selectedTopic) {
              setSelectedTopic(null);
              setConcepts([]);
            } else {
              navigation.goBack();
            }
          }}
        >
          <Text style={styles.backButtonText}>
            {selectedConcept ? 'Back to Concepts' : (selectedTopic ? 'Back to Topics' : 'Back')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedConcept ? 'Concept Detail' : (selectedTopic ? selectedTopic.title : 'Learning Concepts')}
        </Text>
      </View>
      
      <View style={styles.content}>
        {!selectedTopic && (
          <>
            <Text style={styles.instructionText}>
              Select a topic to explore SIE exam concepts
            </Text>
            <FlatList
              data={topics}
              renderItem={renderTopicItem}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContainer}
            />
          </>
        )}
        
        {selectedTopic && !selectedConcept && (
          <>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>Loading concepts...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.topicDescription}>
                  {selectedTopic.description || 'Explore concepts related to this topic'}
                </Text>
                
                {concepts.length > 0 ? (
                  <FlatList
                    data={concepts}
                    renderItem={renderConceptItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContainer}
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No concepts available yet</Text>
                    <Text style={styles.emptySubtext}>Check back later for updates</Text>
                  </View>
                )}
              </>
            )}
          </>
        )}
        
        {selectedConcept && renderConceptDetail()}
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
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instructionText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  topicItem: {
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
  selectedTopicItem: {
    backgroundColor: '#3498db',
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  selectedTopicTitle: {
    color: '#fff',
  },
  topicDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
    lineHeight: 24,
  },
  conceptItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedConceptItem: {
    backgroundColor: '#2ecc71',
  },
  conceptTitle: {
    fontSize: 16,
    color: '#2c3e50',
  },
  selectedConceptTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
  },
  conceptDetailContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  conceptDetailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  explanationContainer: {
    marginBottom: 20,
  },
  explanationLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  explanationText: {
    fontSize: 16,
    color: '#34495e',
    lineHeight: 24,
  },
  exampleContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    padding: 15,
  },
  exampleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  exampleText: {
    fontSize: 16,
    color: '#34495e',
    lineHeight: 24,
    fontStyle: 'italic',
  },
});
