import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatLayout from './components/ChatLayout';
import './styles/global.css';
import './styles/components.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChatLayout />
  </React.StrictMode>
);
