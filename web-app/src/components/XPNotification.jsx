import React, { useState, useEffect } from 'react';
import './XPNotification.css';

const XPNotification = ({ amount, eventType, onClose }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  const getEventMessage = () => {
    switch (eventType) {
      case 'complete_flashcards':
        return 'Completed flashcard deck!';
      case 'master_flashcard':
        return 'Mastered a flashcard!';
      case 'start_study':
        return 'Started study session!';
      case 'view_topic':
        return 'Explored a new topic!';
      case 'view_concept':
        return 'Learned a new concept!';
      case 'quiz_correct':
        return 'Correct answer!';
      case 'quiz_complete':
        return 'Completed quiz!';
      default:
        return 'Achievement unlocked!';
    }
  };
  
  return (
    <div className={`xp-notification ${visible ? 'visible' : 'hidden'}`}>
      <div className="xp-notification-content">
        <div className="xp-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </div>
        <div className="xp-details">
          <div className="xp-message">{getEventMessage()}</div>
          <div className="xp-amount">+{amount} XP</div>
        </div>
        <button className="xp-close" onClick={() => {
          setVisible(false);
          if (onClose) onClose();
        }}>
          &times;
        </button>
      </div>
    </div>
  );
};

export default XPNotification;
