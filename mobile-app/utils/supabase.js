import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Supabase credentials
const supabaseUrl = 'https://owhpnuhhladvmxjmdxbb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93aHBudWhobGFkdm14am1keGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MTgwMDEsImV4cCI6MjA2MjQ5NDAwMX0.aCJpZm_CZv_CnYFnJu8lnJKJzYJOlRjVJKrZQOGDZUE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth helpers
export const signUp = async (email, password) => {
  return await supabase.auth.signUp({ email, password });
};

export const signIn = async (email, password) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
};

// XP and streak helpers
export const updateXP = async (userId, amount, eventType) => {
  // First update the user's XP
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .update({ xp: supabase.rpc('increment_xp', { amount }) })
    .eq('id', userId)
    .select('xp');

  if (profileError) return { error: profileError };

  // Then log the XP event
  const { data: eventData, error: eventError } = await supabase
    .from('xp_events')
    .insert([{ user_id: userId, amount, event_type: eventType }]);

  return { 
    data: { profile: profileData?.[0], event: eventData?.[0] }, 
    error: eventError 
  };
};

export const updateStreak = async (userId) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Check if streak already updated today
  const { data: existingStreak } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (existingStreak) return { data: existingStreak };

  // Get last streak date
  const { data: lastStreak } = await supabase
    .from('streaks')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  let streakCount = 1;
  
  if (lastStreak) {
    const lastDate = new Date(lastStreak.date);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
      // Increment streak if last activity was yesterday
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak')
        .eq('id', userId)
        .single();
      
      streakCount = (profile?.streak || 0) + 1;
    } else if (lastDate.toISOString().split('T')[0] !== today) {
      // Reset streak if last activity was before yesterday
      streakCount = 1;
    }
  }

  // Update streak count in profile
  await supabase
    .from('profiles')
    .update({ streak: streakCount, last_active: today })
    .eq('id', userId);

  // Add streak record
  const { data, error } = await supabase
    .from('streaks')
    .insert([{ user_id: userId, date: today }]);

  return { data, error, streakCount };
};
