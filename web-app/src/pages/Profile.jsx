import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import './Profile.css';

const Profile = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    full_name: '',
    email: '',
    exam_date: '',
    bio: '',
    study_goal: ''
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // Get profile data from the profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      // Format the exam date for the date input if it exists
      const formattedData = {
        ...data,
        exam_date: data.exam_date ? new Date(data.exam_date).toISOString().split('T')[0] : ''
      };
      
      setProfile(formattedData);
    } catch (error) {
      console.error('Error fetching profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({
      ...profile,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setSuccessMessage('');
      setErrorMessage('');
      
      // Prepare the update data, converting study_goal to integer if needed
      const updateData = {
        username: profile.username,
        full_name: profile.full_name,
        bio: profile.bio,
        exam_date: profile.exam_date || null,
        updated_at: new Date()
      };
      
      // Only add study_goal if it's a valid number
      if (profile.study_goal) {
        updateData.study_goal = parseInt(profile.study_goal, 10) || null;
      }
      
      console.log('Updating profile with data:', updateData);
      
      // Update profile in the database
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Profile updated successfully:', data);
      setSuccessMessage('Profile updated successfully!');
      
      // Refresh profile data
      fetchProfile();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage(`Failed to update profile: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loader"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Your Profile</h1>
        <p>Manage your personal information and exam settings</p>
      </div>
      
      <div className="profile-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value={profile.email || user.email} 
              disabled 
              className="disabled-input"
            />
            <small>Email cannot be changed</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input 
              type="text" 
              id="username" 
              name="username" 
              value={profile.username || ''} 
              onChange={handleChange} 
              placeholder="Your username"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="full_name">Full Name</label>
            <input 
              type="text" 
              id="full_name" 
              name="full_name" 
              value={profile.full_name || ''} 
              onChange={handleChange} 
              placeholder="Your full name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="exam_date">SIE Exam Date</label>
            <input 
              type="date" 
              id="exam_date" 
              name="exam_date" 
              value={profile.exam_date || ''} 
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]} // Prevent past dates
            />
            <small>Set your upcoming exam date to track your countdown</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="study_goal">Daily Study Goal (minutes)</label>
            <input 
              type="number" 
              id="study_goal" 
              name="study_goal" 
              value={profile.study_goal || ''} 
              onChange={handleChange} 
              placeholder="e.g., 30"
              min="1"
              max="1440"
            />
            <small>Set a daily study goal to stay on track</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea 
              id="bio" 
              name="bio" 
              value={profile.bio || ''} 
              onChange={handleChange} 
              placeholder="Tell us about yourself and your study goals"
              rows="4"
            ></textarea>
          </div>
          
          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}
          
          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}
          
          <div className="profile-actions">
            <button 
              type="submit" 
              className="save-button" 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="profile-stats-card">
        <h2>Your Stats</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">{profile.xp || 0}</span>
            <span className="stat-label">Total XP</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{profile.streak || 0}</span>
            <span className="stat-label">Day Streak</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{profile.quizzes_completed || 0}</span>
            <span className="stat-label">Quizzes Completed</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{profile.flashcards_mastered || 0}</span>
            <span className="stat-label">Flashcards Mastered</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
