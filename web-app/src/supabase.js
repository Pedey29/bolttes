import { createClient } from '@supabase/supabase-js';

// Supabase credentials
// These are public keys that can be exposed in client-side code
const supabaseUrl = 'https://owhpnuhhladvmxjmdxbb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93aHBudWhobGFkdm14am1keGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MTgwMDEsImV4cCI6MjA2MjQ5NDAwMX0.YK4Bt5x_QjwKkz3Zvl0JXfFcaulQufb8OU8tZKNVe1w';

// Initialize the Supabase client with additional options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// XP and streak helpers
export const updateXP = async (userId, amount, eventType) => {
  try {
    // First get current XP
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', userId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      return { error: fetchError };
    }
    
    // Calculate new XP value
    const currentXP = currentProfile?.xp || 0;
    const newXP = currentXP + amount;
    
    // Update the user's XP directly
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .update({ xp: newXP })
      .eq('id', userId)
      .select('xp');

    if (profileError) {
      console.error('Error updating profile XP:', profileError);
      return { error: profileError };
    }

    // Then log the XP event
    const { data: eventData, error: eventError } = await supabase
      .from('xp_events')
      .insert([{ user_id: userId, amount, event_type: eventType }]);

    if (eventError) {
      console.error('Error logging XP event:', eventError);
    }

    return { 
      data: { profile: profileData?.[0], event: eventData?.[0] }, 
      error: eventError 
    };
  } catch (error) {
    console.error('Unexpected error in updateXP:', error);
    return { error };
  }
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
