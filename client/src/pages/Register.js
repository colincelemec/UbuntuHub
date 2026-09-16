// ============================================
// Register Page Component with i18n
// ============================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../locales/translations';
import PasswordInput from '../components/common/PasswordInput';
import useAuthStore from '../stores/authStore';
import '../styles/Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { register, isLoading, error, clearError } = useAuthStore();
  const t = (path) => getTranslation(path, language);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
    clearError();
  };

  const validateForm = () => {
    const errors = {};

    // Name validation
    if (!formData.name) {
      errors.name = t('register.errors.nameRequired');
    } else if (formData.name.length < 2) {
      errors.name = t('register.errors.nameTooShort');
    }

    // Email validation
    if (!formData.email) {
      errors.email = t('register.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = t('register.errors.emailInvalid');
    }

    // Password validation
    if (!formData.password) {
      errors.password = t('register.errors.passwordRequired');
    } else if (formData.password.length < 6) {
      errors.password = t('register.errors.passwordTooShort');
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = t('register.errors.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('register.errors.passwordsNoMatch');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      // Split the full name into first and last name for the API
      const trimmed = formData.name.trim();
      const spaceIdx = trimmed.indexOf(' ');
      const firstName = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
      const lastName = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();

      await register({
        firstName,
        lastName,
        email: formData.email,
        password: formData.password,
        lang: language,
      });
      navigate('/dashboard'); // Redirect to dashboard after successful registration
    } catch (err) {
      // Error is handled by the store
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="auth-container">
      {/* Language Selector */}

      <div className="auth-card">
        <div className="auth-header">
          <h1>{t('register.title')}</h1>
          <p>{t('register.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">{t('register.nameLabel')}</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={formErrors.name ? 'error' : ''}
              placeholder={t('register.namePlaceholder')}
            />
            {formErrors.name && (
              <span className="field-error">{formErrors.name}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">{t('register.emailLabel')}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={formErrors.email ? 'error' : ''}
              placeholder={t('register.emailPlaceholder')}
            />
            {formErrors.email && (
              <span className="field-error">{formErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('register.passwordLabel')}</label>
            <PasswordInput
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={formErrors.password ? 'error' : ''}
              placeholder={t('register.passwordPlaceholder')}
              autoComplete="new-password"
              showLabel={getTranslation('common.showPassword', language)}
              hideLabel={getTranslation('common.hidePassword', language)}
            />
            {formErrors.password && (
              <span className="field-error">{formErrors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t('register.confirmPasswordLabel')}</label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={formErrors.confirmPassword ? 'error' : ''}
              placeholder={t('register.confirmPasswordPlaceholder')}
              autoComplete="new-password"
              showLabel={getTranslation('common.showPassword', language)}
              hideLabel={getTranslation('common.hidePassword', language)}
            />
            {formErrors.confirmPassword && (
              <span className="field-error">{formErrors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? t('register.registering') : t('register.registerButton')}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            {t('register.hasAccount')}{' '}
            <Link to="/login">{t('register.loginLink')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
