// ============================================
// Profile Page — editable & savable
// Fields supported by the backend: firstName, lastName, phone, avatar
// ============================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../locales/translations';
import usePageMeta from '../hooks/usePageMeta';
import Icon from '../components/common/Icon';
import '../styles/Profile.css';

const Profile = () => {
  const { user, updateProfile } = useAuthStore();
  const { language } = useLanguage();
  const t = (path) => getTranslation(path, language);

  usePageMeta({ title: t('app.nav.profile'), noIndex: true });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const initialForm = () => ({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
  });

  const [formData, setFormData] = useState(initialForm);

  const initials = `${(user?.firstName || ' ')[0]}${(user?.lastName || ' ')[0]}`.trim().toUpperCase();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile(formData);
      setSuccess(t('app.profile.success'));
      setIsEditing(false);
    } catch (err) {
      setError(err.message || t('app.profile.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(initialForm());
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>{t('app.profile.title')}</h1>
      </div>

      <div className="profile-content">
        <div className="profile-card">

          {/* Avatar */}
          <div className="profile-avatar-row">
            {formData.avatar || user?.avatar ? (
              <img
                src={isEditing ? formData.avatar || user?.avatar : user?.avatar}
                alt="Avatar"
                className="profile-avatar"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="profile-avatar profile-avatar--initials">
                {initials || <Icon name="user" size={30} />}
              </div>
            )}
            <div>
              <h2 className="profile-name">
                {user?.firstName || ''} {user?.lastName || ''}
              </h2>
              <p className="profile-email">{user?.email}</p>
            </div>
          </div>

          <div className="profile-card-header">
            <h2>{t('app.profile.personalInfo')}</h2>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="edit-button">
                {t('app.profile.edit')}
              </button>
            )}
          </div>

          {success && <div className="success-message">{success}</div>}
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">{t('app.profile.firstName')}</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">{t('app.profile.lastName')}</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">{t('app.profile.email')}</label>
              <input
                type="email"
                id="email"
                value={user?.email || ''}
                disabled
                className="readonly-input"
                title={t('app.profile.emailNote')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">{t('app.profile.phone')}</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder={t('app.profile.phonePlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="avatar">{t('app.profile.avatar')}</label>
              <input
                type="url"
                id="avatar"
                name="avatar"
                value={formData.avatar}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="https://esempio.com/la-mia-foto.jpg"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('app.profile.accountType')}</label>
                <input
                  type="text"
                  value={user?.role === 'ADMIN' ? t('app.profile.roleAdmin') : user?.role === 'BUSINESS' ? t('app.profile.roleBusiness') : t('app.profile.roleUser')}
                  disabled
                  className="readonly-input"
                />
              </div>

              <div className="form-group">
                <label>{t('app.profile.memberSince')}</label>
                <input
                  type="text"
                  value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString(language === 'en' ? 'en-GB' : language === 'fr' ? 'fr-FR' : 'it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }) : 'N/D'}
                  disabled
                  className="readonly-input"
                />
              </div>
            </div>

            {isEditing && (
              <div className="form-actions">
                <button type="submit" className="save-button" disabled={loading}>
                  {loading ? t('app.profile.saving') : t('app.profile.save')}
                </button>
                <button type="button" onClick={handleCancel} className="cancel-button" disabled={loading}>
                  {t('app.profile.cancel')}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Quick links */}
        <div className="profile-links">
          <h2>{t('app.profile.mySpace')}</h2>
          <Link to="/dashboard" className="profile-link-card">
            <span className="profile-link-icon"><Icon name="heart" size={22} /></span>
            <div>
              <strong>{t('app.profile.favoritesCard')}</strong>
              <p>{t('app.profile.favoritesDesc')}</p>
            </div>
          </Link>
          <Link to="/dashboard" className="profile-link-card">
            <span className="profile-link-icon"><Icon name="pen" size={22} /></span>
            <div>
              <strong>{t('app.profile.reviewsCard')}</strong>
              <p>{t('app.profile.reviewsDesc')}</p>
            </div>
          </Link>
          <Link to="/dashboard" className="profile-link-card">
            <span className="profile-link-icon"><Icon name="store" size={22} /></span>
            <div>
              <strong>{t('app.profile.businessesCard')}</strong>
              <p>{t('app.profile.businessesDesc')}</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Profile;
