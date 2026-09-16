// ============================================
// NotFound — trilingual 404 page
// ============================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../locales/translations';
import usePageMeta from '../hooks/usePageMeta';
import Icon from '../components/common/Icon';
import '../styles/NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { language } = useLanguage();
  const t = (path) => getTranslation(path, language);

  // A 404 page must never be indexed
  usePageMeta({ title: t('common.notFound.title'), noIndex: true });

  return (
    <div className="nf">
      <div className="nf-inner">
        <div className="nf-illustration" aria-hidden="true">
          <Icon name="map" size={64} className="nf-illustration__icon" />
          <span className="nf-code">{t('common.notFound.code')}</span>
        </div>
        <h1 className="nf-title">{t('common.notFound.title')}</h1>
        <p className="nf-message">{t('common.notFound.message')}</p>
        <div className="nf-actions">
          <button className="nf-btn nf-btn--primary" onClick={() => navigate('/')}>
            <Icon name="arrowL" size={15} /> {t('common.notFound.home')}
          </button>
          {isAuthenticated && (
            <button className="nf-btn nf-btn--outline" onClick={() => navigate('/activities')}>
              <Icon name="search" size={15} /> {t('common.notFound.explore')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
