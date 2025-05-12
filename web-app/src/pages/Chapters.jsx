import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import './Chapters.css';

const Chapters = ({ user }) => {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChapter, setActiveChapter] = useState(null);

  useEffect(() => {
    if (user) {
      fetchChapters();
    }
  }, [user]);

  const fetchChapters = async () => {
    try {
      setLoading(true);
      
      // Fetch chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .order('id');
      
      if (chaptersError) throw chaptersError;
      
      // For each chapter, fetch its topics
      const chaptersWithTopics = await Promise.all(
        chaptersData.map(async (chapter) => {
          const { data: topicsData, error: topicsError } = await supabase
            .from('chapter_topics')
            .select(`
              topic_id,
              topics (
                id,
                title,
                description
              )
            `)
            .eq('chapter_id', chapter.id);
          
          if (topicsError) throw topicsError;
          
          return {
            ...chapter,
            topics: topicsData.map(item => item.topics)
          };
        })
      );
      
      setChapters(chaptersWithTopics);
      
      // Set the first chapter as active by default
      if (chaptersWithTopics.length > 0 && !activeChapter) {
        setActiveChapter(chaptersWithTopics[0].id);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTopicCount = (chapterId) => {
    const chapter = chapters.find(c => c.id === chapterId);
    return chapter ? chapter.topics.length : 0;
  };

  const getProgressPercentage = (chapterId) => {
    // This could be calculated based on user's progress through the chapter
    // For now, return a random percentage between 0-100
    return Math.floor(Math.random() * 100);
  };

  return (
    <div className="chapters-container">
      <h1>SIE Exam Study Guide</h1>
      <p className="subtitle">Master the Securities Industry Essentials Exam with our comprehensive study materials</p>
      
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your study materials...</p>
        </div>
      ) : (
        <div className="chapters-content">
          <div className="chapters-sidebar">
            <h2>Study Chapters</h2>
            <ul className="chapter-list">
              {chapters.map((chapter) => (
                <li 
                  key={chapter.id} 
                  className={activeChapter === chapter.id ? 'active' : ''}
                  onClick={() => setActiveChapter(chapter.id)}
                >
                  <div className="chapter-list-item">
                    <span className="chapter-title">{chapter.title}</span>
                    <div className="chapter-meta">
                      <span className="topic-count">{getTopicCount(chapter.id)} topics</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${getProgressPercentage(chapter.id)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="chapter-detail">
            {activeChapter && (
              <>
                {chapters.filter(chapter => chapter.id === activeChapter).map((chapter) => (
                  <div key={chapter.id} className="active-chapter">
                    <div className="chapter-header">
                      <h2>{chapter.title}</h2>
                      <p>{chapter.description}</p>
                    </div>
                    
                    <div className="topics-grid">
                      {chapter.topics.map((topic) => (
                        <div key={topic.id} className="topic-card">
                          <h3>{topic.title}</h3>
                          <p>{topic.description}</p>
                          <div className="topic-actions">
                            <Link to={`/concepts/${topic.id}`} className="btn btn-primary">
                              Study Concepts
                            </Link>
                            <Link to={`/flashcards/${topic.id}`} className="btn btn-secondary">
                              Flashcards
                            </Link>
                            <Link to={`/quiz/${topic.id}`} className="btn btn-accent">
                              Take Quiz
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chapters;
