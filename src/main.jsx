import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {clerkPubKey ? (
        <ClerkProvider publishableKey={clerkPubKey}>
          <App />
        </ClerkProvider>
      ) : (
        <App />
      )}
    </BrowserRouter>
  </React.StrictMode>,
);
