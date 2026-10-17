// ============================================
// Login Page Component with i18n
// ============================================

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../locales/translations';
import PasswordInput from '../components/common/PasswordInput';
import useAuthStore from '../stores/authStore';
import '../styles/Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // The origin page remembered by ProtectedRoute or by a sign-in
  // invitation: we return there once authenticated.
  const redirectTo = location.state?.from || '/dashboard';
  const { language } = useLanguage();
  const { login, googleLogin, isLoading, error, clearError } = useAuthStore();
  const t = (path) => getTranslation(path, language);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
    clearError();
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.email) {
      errors.email = t('login.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = t('login.errors.emailInvalid');
    }

    if (!formData.password) {
      errors.password = t('login.errors.passwordRequired');
    } else if (formData.password.length < 6) {
      errors.password = t('login.errors.passwordTooShort');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) return;

    try {
      await login(formData);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  // Google sign-in: Google Identity Services returns an ID token
  // (credential), which the backend verifies against our client ID
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await googleLogin(credentialResponse.credential);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.error('Google login error:', err);
    }
  };

  return (
    <div className="auth-container">

      <div className="auth-card">
        <div className="auth-header">
          <h1>{t('login.title')}</h1>
          <p>{t('login.subtitle')}</p>
        </div>

        {/* Official Google button (renders its own UI) */}
        <div className="google-button-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => console.error('Google OAuth error')}
            text="continue_with"
            shape="pill"
            locale={language}
          />
        </div>

        <div className="auth-divider">
          <span>oppure</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">{t('login.emailLabel')}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={formErrors.email ? 'error' : ''}
              placeholder={t('login.emailPlaceholder')}
            />
            {formErrors.email && (
              <span className="field-error">{formErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('login.passwordLabel')}</label>
            <PasswordInput
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={formErrors.password ? 'error' : ''}
              placeholder={t('login.passwordPlaceholder')}
              autoComplete="current-password"
              showLabel={getTranslation('common.showPassword', language)}
              hideLabel={getTranslation('common.hidePassword', language)}
            />
            {formErrors.password && (
              <span className="field-error">{formErrors.password}</span>
            )}
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? t('login.loggingIn') : t('login.loginButton')}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            {t('login.noAccount')}{' '}
            <Link to="/register">{t('login.signUpLink')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
