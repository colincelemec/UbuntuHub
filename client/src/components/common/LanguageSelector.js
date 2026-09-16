// ============================================
// LanguageSelector — the "choose a language" dropdown
// Open the menu, pick a language from the list.
// Accessible: keyboard, Escape, outside click.
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import Icon from './Icon';
import '../../styles/LanguageSelector.css';

const LANGUAGES = [
  { code: 'it', label: 'IT', name: 'Italiano' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'en', label: 'EN', name: 'English' },
];

const SELECT_LABEL = {
  it: 'Seleziona lingua',
  fr: 'Choisir la langue',
  en: 'Select a language',
};

const LanguageSelector = () => {
  const { language, changeLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const current = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  // Close on an outside click or with Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSelect = (code) => {
    changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="language-selector" ref={wrapRef}>
      <button
        className="lang-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={SELECT_LABEL[language] || SELECT_LABEL.en}
        title={SELECT_LABEL[language] || SELECT_LABEL.en}
      >
        <Icon name="globe" size={16} />
        <span className="lang-trigger__name">{current.name}</span>
        <span className="lang-trigger__code">{current.label}</span>
        <Icon name="arrowDown" size={14} className={`lang-caret ${open ? 'up' : ''}`} />
      </button>

      {open && (
        <ul className="lang-menu" role="listbox" aria-label={SELECT_LABEL[language] || SELECT_LABEL.en}>
          <li className="lang-menu__title" aria-hidden="true">
            {SELECT_LABEL[language] || SELECT_LABEL.en}
          </li>
          {LANGUAGES.map((lang) => (
            <li key={lang.code} role="option" aria-selected={language === lang.code}>
              <button
                className={`lang-option ${language === lang.code ? 'active' : ''}`}
                onClick={() => handleSelect(lang.code)}
              >
                <span className="lang-option__code">{lang.label}</span>
                <span className="lang-option__name">{lang.name}</span>
                {language === lang.code && <Icon name="check" size={16} className="lang-option__check" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguageSelector;
