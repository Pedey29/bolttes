import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { supabase, getCurrentUser, updateStreak } from '../utils/supabase';

export default function DashboardScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    flashcards: 0,
    quizzes: 0,
    topics: 0
  });

  useEffect(() => {
    fetchUserData();
    updateUserStreak();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { user, error } = await getCurrentUser();
      if (error) throw error;
      setUser(user);
      
      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      setProfile(profileData);
      
      // Get stats
      const [
        { count: flashcardsCount },
        { count: quizzesCount },
        { data: topicsData }
      ] = await Promise.all([
        supabase.from('flashcards').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('topics').select('id')
      ]);
      
      setStats({
        flashcards: flashcardsCount || 0,
        quizzes: quizzesCount || 0,
        topics: topicsData?.length || 0
      });
    } catch (error) {
      console.error('Error fetching user data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStreak = async () => {
    try {
      const { user } = await getCurrentUser();
      if (user) {
        await updateStreak(user.id);
      }
    } catch (error) {
      console.error('Error updating streak:', error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigation.replace('Login');
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.email?.split('@')[0] || 'Student'}!</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.xp || 0}</Text>
            <Text style={styles.statLabel}>XP Points</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.streak || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Study Options</Text>
        
        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Flashcards')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#3498db' }]}>
              <Text style={styles.menuIconText}>F</Text>
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Flashcards</Text>
              <Text style={styles.menuSubtitle}>{stats.flashcards} cards created</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Quiz')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#9b59b6' }]}>
              <Text style={styles.menuIconText}>Q</Text>
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Practice Quiz</Text>
              <Text style={styles.menuSubtitle}>{stats.quizzes} quizzes taken</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Concepts')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#2ecc71' }]}>
              <Text style={styles.menuIconText}>C</Text>
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Learning Concepts</Text>
              <Text style={styles.menuSubtitle}>{stats.topics} topics available</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  signOutButton: {
    padding: 8,
  },
  signOutText: {
    color: '#ecf0f1',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  menuIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuIconText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
});
