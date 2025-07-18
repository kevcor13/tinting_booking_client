import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import ClientApp from './ClientApp';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClientApp />
  </React.StrictMode>
);