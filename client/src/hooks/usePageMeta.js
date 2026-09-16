// ============================================
// usePageMeta — per-page title and metadata
//
// The application is a SPA: without this, every page would share the
// same <title> and description. As a result, search engines would show
// the same label everywhere and a link shared on WhatsApp would read
// "UbuntuHub" instead of the business name.
//
// Note: social network crawlers (WhatsApp, Facebook) do not run
// JavaScript. This hook fixes what the browser and search engines see;
// flawless share previews would require server-side prerendering.
//
// ============================================

import { useEffect } from 'react';

const SITE_NAME = 'UbuntuHub';
const DEFAULT_IMAGE = '/logo-ubuntuhub.png';

/** Creates or updates a <meta> tag */
function setMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Creates or updates <link rel="canonical"> */
function setCanonical(url) {
  if (!url) return;
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

/**
 * @param {Object}  meta
 * @param {string}  meta.title        Page title (without the site name)
 * @param {string}  meta.description  Description for search engines and sharing
 * @param {string}  meta.image        Absolute URL of the preview image
 * @param {boolean} meta.noIndex      true for private pages
 */
export default function usePageMeta({ title, description, image, noIndex = false } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;

    const url = window.location.href;
    const img = image || `${window.location.origin}${DEFAULT_IMAGE}`;

    if (description) {
      setMeta('name', 'description', description);
      setMeta('property', 'og:description', description);
      setMeta('name', 'twitter:description', description);
    }

    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', img);
    setMeta('property', 'og:site_name', SITE_NAME);

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:image', img);

    // Private pages must not be indexed
    setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    setCanonical(url.split('?')[0]);
  }, [title, description, image, noIndex]);
}
