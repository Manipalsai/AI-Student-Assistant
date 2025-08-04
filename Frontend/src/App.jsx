import React from 'react';
import './App.css';

import SummaryGenerator from './components/SummaryGenerator';
import McqGenerator from './components/McqGenerator';
import Quiz from './components/Quiz';

function App() {
  return (
    <div className="app-container">
      {/* 🌟 Custom heading */}
      <header style={{ textAlign: 'center', padding: '20px 0', fontSize: '3rem', fontWeight: 'bold' }}>
        AI Study Assistant
      </header>

      <div className="content">
        <SummaryGenerator />
        <McqGenerator />
        <Quiz />
      </div>
    </div>
  );
}

export default App;
