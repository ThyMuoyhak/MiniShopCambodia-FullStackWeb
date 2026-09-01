import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { LanguageProvider } from './i18n';
import { CustomerProvider } from './contexts/CustomerContext';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <CustomerProvider>
          <App />
          <Toaster position="top-right" toastOptions={{ style: { borderRadius: '10px', zIndex: 99999 } }} />
        </CustomerProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
