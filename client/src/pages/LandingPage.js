// ============================================
// LandingPage — the public home page
// Photo hero with search, then the presentation sections.
// ============================================

import React, { useEffect, useState, useRef } from 'react';
import Icon from '../components/common/Icon';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getCategoryLabel } from '../utils/categoryLabel';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../locales/translations';
import usePageMeta from '../hooks/usePageMeta';
import '../styles/LandingPage.css';

const LandingPage = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = (path) => getTranslation(path, language);

  const [query, setQuery] = useState('');

  // ── Suggestions while typing ──
  // Matching businesses appear from the first few letters, and the
  // visitor can jump straight to a listing.
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeSuggest, setActiveSuggest] = useState(-1);
  const searchRef = useRef(null);

  // Deferred search: the server is not queried on every keystroke
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/businesses/search', { q });
        if (active) setSuggestions((res.data || []).slice(0, 6));
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);

    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  // Close on an outside click
  useEffect(() => {
    if (!showSuggest) return;
    const onClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggest(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showSuggest]);

  const openBusiness = (b) => {
    setShowSuggest(false);
    navigate(`/businesses/${b.slug}`);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    // A suggestion is highlighted with the keyboard: open its listing
    if (activeSuggest >= 0 && suggestions[activeSuggest]) {
      openBusiness(suggestions[activeSuggest]);
      return;
    }
    const q = query.trim();
    setShowSuggest(false);
    navigate(q ? `/activities?q=${encodeURIComponent(q)}` : '/activities');
  };

  // Keyboard navigation inside the list
  const onSearchKeyDown = (e) => {
    if (!showSuggest || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggest(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggest(i => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setShowSuggest(false);
      setActiveSuggest(-1);
    }
  };

  usePageMeta({
    title: t('landing.hero.title'),
    description: t('landing.hero.description'),
  });

  // ── Reveal sections as they scroll into view ──
  useEffect(() => {
    const els = document.querySelectorAll('.landing-page .gh-reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page">

      {/* ════════ HERO — full-screen photo ════════ */}
      {/* The photo is set in LandingPage.css (--hero-image).
          Without one, a warm gradient takes over. */}
      <section className="hero-section hero-section--photo">
        <div className="hero-media" aria-hidden="true" />
        <div className="hero-scrim" aria-hidden="true" />

        <div className="hero-content">
          <span className="hero-eyebrow">{t('landing.hero.eyebrow')}</span>
          <h1 className="hero-title">
            {t('landing.hero.title')}
          </h1>
          <p className="hero-description">{t('landing.hero.description')}</p>

          {/* Search: the home page's primary action, no account needed */}
          <div className="hero-search-wrap" ref={searchRef}>
            <form className="hero-search" onSubmit={submitSearch} role="search">
              <Icon name="search" size={20} className="hero-search__icon" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggest(true);
                  setActiveSuggest(-1);
                }}
                onFocus={() => setShowSuggest(true)}
                onKeyDown={onSearchKeyDown}
                placeholder={t('landing.search.placeholder')}
                aria-label={t('landing.search.placeholder')}
                role="combobox"
                aria-expanded={showSuggest && suggestions.length > 0}
                aria-controls="hero-suggest-list"
                aria-autocomplete="list"
              />
              <button type="submit" className="hero-search__btn">
                {t('landing.search.button')}
              </button>
            </form>

            {/* Business suggestions while typing */}
            {showSuggest && query.trim().length >= 2 && (
              <div className="hero-suggest" id="hero-suggest-list" role="listbox">
                {searching && suggestions.length === 0 ? (
                  <div className="hero-suggest__msg">{t('landing.search.searching')}</div>
                ) : suggestions.length === 0 ? (
                  <div className="hero-suggest__msg">{t('landing.search.noResult')}</div>
                ) : (
                  <>
                    {suggestions.map((b, i) => (
                      <button
                        type="button"
                        key={b.id}
                        role="option"
                        aria-selected={i === activeSuggest}
                        className={`hero-suggest__item ${i === activeSuggest ? 'is-active' : ''}`}
                        onMouseDown={(e) => { e.preventDefault(); openBusiness(b); }}
                        onMouseEnter={() => setActiveSuggest(i)}
                      >
                        <span className="hero-suggest__icon">
                          <Icon name="store" size={16} />
                        </span>
                        <span className="hero-suggest__text">
                          <strong>{b.name}</strong>
                          <small>
                            {getCategoryLabel(b.category, language)}
                            {b.city?.name ? ` · ${b.city.name}` : ''}
                          </small>
                        </span>
                        <Icon name="arrowR" size={14} className="hero-suggest__go" />
                      </button>
                    ))}
                    <button
                      type="button"
                      className="hero-suggest__all"
                      onMouseDown={(e) => { e.preventDefault(); submitSearch(e); }}
                    >
                      {t('landing.search.seeAllResults')} « {query.trim()} »
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <Link to="/activities" className="hero-browse">
            {t('landing.search.browseAll')} <Icon name="arrowR" size={15} />
          </Link>
        </div>

        <div className="hero-scroll-indicator" aria-hidden="true">
          <Icon name="arrowDown" size={22} />
        </div>
      </section>

      {/* ════════ MISSION ════════ */}
      <section id="mission" className="mission-section">
        <div className="container">
          <div className="section-header gh-reveal">
            <span className="gh-eyebrow gh-eyebrow--gold">UbuntuHub</span>
            <h2 className="section-title">{t('landing.mission.title')}</h2>
          </div>
          <div className="mission-content">
            {[1, 2, 3].map((n) => (
              <div className="mission-card gh-card gh-reveal" key={n}>
                <h3>{t(`landing.mission.card${n}.title`)}</h3>
                <p>{t(`landing.mission.card${n}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ HOW IT WORKS — vertical beam ════════ */}
      <section className="how-it-works-section">
        <div className="gh-beam" aria-hidden="true"></div>
        <div className="container">
          <div className="section-header gh-reveal">
            <span className="gh-eyebrow gh-eyebrow--ember">Step by step</span>
            <h2 className="section-title">{t('landing.howItWorks.title')}</h2>
          </div>
          <div className="steps-container">
            {[1, 2, 3].map((n) => (
              <div className="step gh-reveal" key={n}>
                <div className="step-number">{n}</div>
                <h3>{t(`landing.howItWorks.step${n}.title`)}</h3>
                <p>{t(`landing.howItWorks.step${n}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FEATURES ════════ */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header gh-reveal">
            <span className="gh-eyebrow gh-eyebrow--gold">Features</span>
            <h2 className="section-title">{t('landing.features.title')}</h2>
          </div>
          <div className="features-grid">
            {[
              { icon: 'store',    key: 'businessDirectory' },
              { icon: 'star',     key: 'reviews' },
              { icon: 'calendar', key: 'events' },
              { icon: 'pin',      key: 'location' },
              { icon: 'chart',    key: 'dashboard' },
              { icon: 'users',    key: 'community' },
            ].map((f) => (
              <div className="feature-card gh-card gh-reveal" key={f.key}>
                <div className="feature-icon"><Icon name={f.icon} size={26} /></div>
                <h3>{t(`landing.features.${f.key}.title`)}</h3>
                <p>{t(`landing.features.${f.key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ BENEFITS ════════ */}
      <section className="benefits-section">
        <div className="container">
          <div className="section-header gh-reveal">
            <span className="gh-eyebrow gh-eyebrow--ember">Why UbuntuHub</span>
            <h2 className="section-title">{t('landing.benefits.title')}</h2>
          </div>
          <div className="benefits-container">
            <div className="benefit-column gh-card gh-reveal">
              <h3>{t('landing.benefits.forCustomers.title')}</h3>
              <ul className="benefit-list">
                {[1, 2, 3, 4, 5].map((n) => (
                  <li key={n}>
                    <Icon name="check" size={16} className="benefit-check" />
                    {t(`landing.benefits.forCustomers.benefit${n}`)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="benefit-column gh-card gh-reveal">
              <h3>{t('landing.benefits.forBusinesses.title')}</h3>
              <ul className="benefit-list">
                {[1, 2, 3, 4, 5].map((n) => (
                  <li key={n}>
                    <Icon name="check" size={16} className="benefit-check" />
                    {t(`landing.benefits.forBusinesses.benefit${n}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ FINAL CALL TO ACTION ════════ */}
      <section className="final-cta-section">
        <div className="gh-orb gh-orb--cta" aria-hidden="true"></div>
        <div className="container gh-reveal">
          <h2><span className="gh-gradient-text">{t('landing.finalCta.title')}</span></h2>
          <p>{t('landing.finalCta.description')}</p>
          {/* Browsing comes first: an account is only needed to contribute. */}
          <div className="cta-buttons">
            <Link to="/activities" className="btn btn-primary btn-large">
              {t('landing.finalCta.exploreButton')}
              <Icon name="arrowR" size={16} />
            </Link>
            <Link to="/add-service" className="btn btn-secondary btn-large">
              {t('landing.finalCta.publishButton')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
