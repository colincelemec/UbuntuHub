import React from 'react';
import Icon from '../common/Icon';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslation } from '../../locales/translations';
import '../../styles/Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const t = (path) => getTranslation(path, language);

  // Scroll to a landing-page section (works from any page)
  const goToSection = (e, sectionId) => {
    e.preventDefault();
    const scroll = () => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (location.pathname === '/') {
      scroll();
    } else {
      navigate('/');
      setTimeout(scroll, 250);
    }
  };

  // Back to the top of the home page
  const goHome = (e) => {
    e.preventDefault();
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Footer Main Content */}
        <div className="footer-content">
          {/* About Section */}
          <div className="footer-section">
            <h3 className="footer-title">UbuntuHub</h3>
            <p className="footer-description">
              {t('footer.description')}
            </p>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h4 className="footer-subtitle">{t('footer.quickLinks')}</h4>
            <ul className="footer-links">
              <li><a href="/" onClick={goHome}>{t('footer.home')}</a></li>
              <li><a href="#mission" onClick={(e) => goToSection(e, 'mission')}>{t('footer.about')}</a></li>
              <li><a href="#features" onClick={(e) => goToSection(e, 'features')}>{t('footer.features')}</a></li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div className="footer-section">
            <h4 className="footer-subtitle">{t('footer.contact')}</h4>
            <ul className="footer-links">
              <li>
                <a href="tel:+393715412337">
                  <Icon name="phone" size={14} /> +39 371 541 2337
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-divider"></div>
          <div className="footer-copyright">
            <p>
              © {currentYear} UbuntuHub. {t('footer.copyright')}
            </p>
            <p className="footer-tagline">
              {t('footer.tagline')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
