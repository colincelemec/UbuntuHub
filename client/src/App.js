import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './styles/App.css';

// Components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import ScrollToTop from './components/common/ScrollToTop';

// Pages
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Activities from './pages/Activities';
import BusinessDetail from './pages/BusinessDetail';
import Admin from './pages/Admin';
import AddService from './pages/AddService';
import NotFound from './pages/NotFound';

// Context
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';

// Store
import useAuthStore from './stores/authStore';

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();

  // Check the authentication state on start-up
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}>
    <LanguageProvider>
    <ToastProvider>
      <Router>
        <ScrollToTop />
        <div className="App">
          <Header />
          <main className="main-content">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Public directory: browsable without an account, so an owner can
                  see their own listing before registering and the pages
                  stay indexable by search engines. */}
              <Route path="/activities" element={<Activities />} />
              <Route path="/businesses/:slug" element={<BusinessDetail />} />

              {/* Routes reserved for authenticated users */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/add-service"
                element={
                  <ProtectedRoute>
                    <AddService />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-service/:id"
                element={
                  <ProtectedRoute>
                    <AddService />
                  </ProtectedRoute>
                }
              />

              {/* Administration panel */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Admin />
                  </AdminRoute>
                }
              />

              {/* Any other address */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          {/* The footer is only shown to visitors who are not signed in */}
          {!isAuthenticated && <Footer />}
        </div>
      </Router>
    </ToastProvider>
    </LanguageProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
