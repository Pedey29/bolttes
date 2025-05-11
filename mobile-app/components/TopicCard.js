import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function TopicCard({ topic, onPress, completed = false }) {
  return (
    <TouchableOpacity 
      style={[styles.card, completed && styles.completedCard]} 
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{topic.title}</Text>
        {topic.description && (
          <Text style={styles.description}>{topic.description}</Text>
        )}
      </View>
      
      {completed && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  completedCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#2ecc71',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2ecc71',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  completedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
