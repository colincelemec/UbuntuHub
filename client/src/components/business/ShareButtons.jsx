// ============================================
// ShareButtons — share a business listing
// On mobile it uses the system share sheet (navigator.share);
// otherwise it shows WhatsApp, Facebook, email and "copy link".
// ============================================

import React, { useState, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslation } from '../../locales/translations';
import { useToast } from '../../contexts/ToastContext';
import Icon from '../common/Icon';
import './ShareButtons.css';

const ShareButtons = ({ business }) => {
  const { language } = useLanguage();
  const t = useCallback(
    (key) => getTranslation(`app.businessDetail.${key}`, language),
    [language]
  );
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const title = business?.name || 'UbuntuHub';
  const text = `${t('shareText')} ${title}`;

  // Native sharing (mobile): one tap opens the system share sheet
  const nativeShare = async () => {
    try {
      await navigator.share({ title, text, url });
    } catch {
      /* the user cancelled: nothing to do */
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('linkCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Browser without clipboard access: fall back to manual selection
      window.prompt(t('copyLink'), url);
    }
  };

  const links = [
    {
      key: 'whatsapp',
      label: t('shareWhatsapp'),
      icon: 'chat',
      className: 'sb-btn--whatsapp',
      href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    },
    {
      key: 'facebook',
      label: t('shareFacebook'),
      icon: 'globe',
      className: 'sb-btn--facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      key: 'email',
      label: t('shareEmail'),
      icon: 'mail',
      className: 'sb-btn--email',
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n${url}`)}`,
    },
  ];

  const canShareNatively = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="sb">
      <span className="sb__label"><Icon name="arrowR" size={14} /> {t('share')}</span>

      <div className="sb__buttons">
        {/* Mobile: system share sheet */}
        {canShareNatively && (
          <button type="button" className="sb-btn sb-btn--native" onClick={nativeShare}>
            <Icon name="arrowR" size={15} /> {t('share')}
          </button>
        )}

        {links.map(l => (
          <a
            key={l.key}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`sb-btn ${l.className}`}
            aria-label={l.label}
            title={l.label}
          >
            <Icon name={l.icon} size={15} />
            <span className="sb-btn__text">{l.key === 'whatsapp' ? 'WhatsApp' : l.key === 'facebook' ? 'Facebook' : 'Email'}</span>
          </a>
        ))}

        <button
          type="button"
          className={`sb-btn sb-btn--copy ${copied ? 'is-copied' : ''}`}
          onClick={copyLink}
          aria-label={t('copyLink')}
          title={t('copyLink')}
        >
          <Icon name={copied ? 'check' : 'grid'} size={15} />
          <span className="sb-btn__text">{copied ? t('linkCopied') : t('copyLink')}</span>
        </button>
      </div>
    </div>
  );
};

export default ShareButtons;
