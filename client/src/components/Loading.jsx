import React from 'react';
import './Loading.css';

const Loading = () => {
  return (
    <div className="loading-container" data-testid="loading-container">
      <div className="loading-spinner" data-testid="loading-spinner"></div>
      <p className="loading-text">Loading TigerType...</p>
    </div>
  );
};

export default Loading;