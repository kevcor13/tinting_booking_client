import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import './ClientApp.css'; // Add this import for the CSS
import ClientInterface from './components/ClientInterface';

function ClientApp() {
  return (
    <Router>
      <div className="client-container">
        <Routes>
          <Route path="/:sheetId" element={<ClientInterface />} />
        </Routes>
      </div>
    </Router>
  );
}

export default ClientApp;