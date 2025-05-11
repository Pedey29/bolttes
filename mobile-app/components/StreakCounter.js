import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function StreakCounter({ streak, size = 'medium' }) {
  const styles = getStyles(size);
  
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.streakText}>{streak}</Text>
        <Text style={styles.streakLabel}>
          {streak === 1 ? 'Day' : 'Days'}
        </Text>
      </View>
      <Text style={styles.streakTitle}>Current Streak</Text>
    </View>
  );
}

const getStyles = (size) => {
  const baseSize = size === 'small' ? 50 : size === 'medium' ? 70 : 90;
  const fontSize = size === 'small' ? 18 : size === 'medium' ? 24 : 32;
  const labelSize = size === 'small' ? 10 : size === 'medium' ? 12 : 14;
  
  return StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    badge: {
      width: baseSize,
      height: baseSize,
      borderRadius: baseSize / 2,
      backgroundColor: '#e74c3c',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    streakText: {
      color: '#fff',
      fontSize: fontSize,
      fontWeight: 'bold',
    },
    streakLabel: {
      color: '#fff',
      fontSize: labelSize,
      opacity: 0.8,
    },
    streakTitle: {
      fontSize: labelSize,
      color: '#7f8c8d',
      marginTop: 5,
    },
  });
};
