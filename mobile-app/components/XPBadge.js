import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function XPBadge({ xp, size = 'medium' }) {
  const styles = getStyles(size);
  
  return (
    <View style={styles.badge}>
      <Text style={styles.xpText}>{xp}</Text>
      <Text style={styles.xpLabel}>XP</Text>
    </View>
  );
}

const getStyles = (size) => {
  const baseSize = size === 'small' ? 40 : size === 'medium' ? 60 : 80;
  const fontSize = size === 'small' ? 14 : size === 'medium' ? 18 : 24;
  const labelSize = size === 'small' ? 10 : size === 'medium' ? 12 : 14;
  
  return StyleSheet.create({
    badge: {
      width: baseSize,
      height: baseSize,
      borderRadius: baseSize / 2,
      backgroundColor: '#3498db',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    xpText: {
      color: '#fff',
      fontSize: fontSize,
      fontWeight: 'bold',
    },
    xpLabel: {
      color: '#fff',
      fontSize: labelSize,
      opacity: 0.8,
    },
  });
};
