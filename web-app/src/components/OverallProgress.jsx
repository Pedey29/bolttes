import React from 'react';
import './OverallProgress.css';

const OverallProgress = ({ progress, totalTopics }) => {
  // Calculate percentages for each category and overall
  const flashcardPercentage = progress?.flashcards?.percentage || 0;
  const quizPercentage = progress?.quizzes?.percentage || 0;
  const conceptPercentage = progress?.concepts?.percentage || 0;
  
  // Calculate overall percentage as weighted average
  const overallPercentage = progress?.total?.percentage || 
    Math.round((flashcardPercentage + quizPercentage + conceptPercentage) / 3);
  
  // Define status based on percentage
  const getStatus = (percentage) => {
    if (percentage < 25) return 'just-started';
    if (percentage < 50) return 'in-progress';
    if (percentage < 75) return 'advancing';
    if (percentage < 100) return 'almost-complete';
    return 'complete';
  };
  
  const overallStatus = getStatus(overallPercentage);
  
  // Get text description based on status
  const getStatusText = (status) => {
    switch(status) {
      case 'just-started': return 'Just Started';
      case 'in-progress': return 'In Progress';
      case 'advancing': return 'Advancing Well';
      case 'almost-complete': return 'Almost Complete';
      case 'complete': return 'Complete';
      default: return 'Not Started';
    }
  };

  return (
    <div className="overall-progress-container">
      <div className="progress-header">
        <h2>SIE Exam Preparation Progress</h2>
        <p>Track your overall progress across all study materials</p>
      </div>
      
      <div className="progress-overview">
        <div className="progress-percentage">
          <span className="percentage-value">{overallPercentage}%</span>
          <span className="percentage-label">Complete</span>
        </div>
        
        <div className="progress-bar-container">
          <div className="progress-bar-wrapper">
            <div 
              className={`progress-bar ${overallStatus}`}
              style={{ width: `${overallPercentage}%` }}
            ></div>
          </div>
          <div className="progress-status">
            <span className={`status-indicator ${overallStatus}`}>
              {getStatusText(overallStatus)}
            </span>
            <span className="topics-count">
              {progress?.total?.completed || 0} of {progress?.total?.total || totalTopics} topics covered
            </span>
          </div>
        </div>
      </div>
      
      <div className="progress-categories">
        <div className="category-item">
          <div className="category-header">
            <span className="category-icon flashcards">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <path d="M12 12h.01"></path>
              </svg>
            </span>
            <span className="category-title">Flashcards</span>
            <span className="category-percentage">{flashcardPercentage}%</span>
          </div>
          <div className="category-bar-wrapper">
            <div 
              className="category-bar flashcards"
              style={{ width: `${flashcardPercentage}%` }}
            ></div>
          </div>
          <div className="category-stats">
            <span>{progress?.flashcards?.completed || 0} of {progress?.flashcards?.total || 0} mastered</span>
          </div>
        </div>
        
        <div className="category-item">
          <div className="category-header">
            <span className="category-icon quizzes">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </span>
            <span className="category-title">Quizzes</span>
            <span className="category-percentage">{quizPercentage}%</span>
          </div>
          <div className="category-bar-wrapper">
            <div 
              className="category-bar quizzes"
              style={{ width: `${quizPercentage}%` }}
            ></div>
          </div>
          <div className="category-stats">
            <span>{progress?.quizzes?.completed || 0} of {progress?.quizzes?.total || 0} completed</span>
          </div>
        </div>
        
        <div className="category-item">
          <div className="category-header">
            <span className="category-icon concepts">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </span>
            <span className="category-title">Concepts</span>
            <span className="category-percentage">{conceptPercentage}%</span>
          </div>
          <div className="category-bar-wrapper">
            <div 
              className="category-bar concepts"
              style={{ width: `${conceptPercentage}%` }}
            ></div>
          </div>
          <div className="category-stats">
            <span>{progress?.concepts?.completed || 0} of {progress?.concepts?.total || 0} reviewed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverallProgress;
