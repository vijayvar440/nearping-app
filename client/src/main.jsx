import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { LocationProvider } from './context/LocationContext'
import { AuthProvider } from './context/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <LocationProvider>
        <App />
      </LocationProvider>
    </AuthProvider>
  </React.StrictMode>,
)