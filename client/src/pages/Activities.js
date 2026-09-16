// ============================================
// Activities — the business directory
// Featured slideboard, grid and map views,
// inline SVG icons (no emoji), debounced search
// ============================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../locales/translations';
import usePageMeta from '../hooks/usePageMeta';
import { getCategoryLabel } from '../utils/categoryLabel';
import Icon from '../components/common/Icon';
import SafeImage from '../components/common/SafeImage';
import '../styles/Activities.css';

// ── Leaflet icon fix ──
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ITALY_CENTER = [42.5, 12.5];

// Slugs identical to the database categories (seed)
const CATEGORIES = [
  { slug: 'all',        labelKey: 'app.activities.catAll',         icon: 'all' },
  { slug: 'restaurant', labelKey: 'app.activities.catRestaurants', icon: 'ristorante' },
  { slug: 'coiffeur',   labelKey: 'app.activities.catHair',        icon: 'bellezza' },
  { slug: 'epicerie',   labelKey: 'app.activities.catGrocery',     icon: 'negozio' },
  { slug: 'mode',       labelKey: 'app.activities.catFashion',     icon: 'moda' },
  { slug: 'beaute',     labelKey: 'app.activities.catBeauty',      icon: 'cosmetici' },
  { slug: 'service',    labelKey: 'app.activities.catServices',    icon: 'servizi' },
];

// Cities come from the database (/api/meta/cities): every provincial capital.
const ALL_CITIES = 'ALL';

const SORTS = [
  { value: 'rating',  labelKey: 'app.activities.sortRating' },
  { value: 'reviews', labelKey: 'app.activities.sortReviews' },
  { value: 'name',    labelKey: 'app.activities.sortName' },
];

const PAGE_SIZE = 12;

const Stars = ({ value }) => (
  <span className="act-stars" aria-label={`${value} / 5`}>
    {[1, 2, 3, 4, 5].map(i => (
      <Icon key={i} name="star" size={14} className={i <= Math.round(value) ? 'on' : 'off'} />
    ))}
  </span>
);

const SkeletonCard = () => (
  <div className="act-card act-card--skeleton">
    <div className="act-card__media act-shimmer" />
    <div className="act-card__body">
      <div className="act-shimmer act-line w70" />
      <div className="act-shimmer act-line w90" />
      <div className="act-shimmer act-line w40" />
    </div>
  </div>
);

const Activities = () => {
  const navigate = useNavigate();
  const boardRef = useRef(null);
  const { language } = useLanguage();
  const t = useCallback((path) => getTranslation(path, language), [language]);

  usePageMeta({
    title: getTranslation('app.activities.heroTitle', language),
    description: getTranslation('app.activities.heroSubtitle', language),
  });

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  // Filters are initialised from the URL: a search started on the home
  // page (/activities?q=…) or a category shortcut lands here.
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || 'all';
  const initialCity = searchParams.get('city') || ALL_CITIES;

  const [category, setCategory] = useState(initialCategory);
  // `city` holds the city slug (e.g. 'reggio-calabria') or ALL_CITIES
  const [city, setCity] = useState(initialCity);
  const [cities, setCities] = useState([]);
  const [sort, setSort] = useState('rating');
  const [searchInput, setSearchInput] = useState(initialQ);
  const [search, setSearch] = useState(initialQ);
  const [view, setView] = useState('grid'); // 'grid' | 'map'
  // Sidebar: always visible on large screens, a sliding panel
  // on mobile.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Server-side search (case-insensitive, across the whole database) ──
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeSuggest, setActiveSuggest] = useState(-1);

  // ── Cities from the database (every provincial capital) ──
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get('/meta/cities');
        if (active) setCities(res.data?.cities || []);
      } catch {
        if (active) setCities([]);
      }
    })();
    return () => { active = false; };
  }, []);

  // ── Search debounce ──
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Fetch suggestions and results from the server when a query exists ──
  useEffect(() => {
    let active = true;
    if (!search) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    (async () => {
      try {
        const params = { q: search };
        if (category !== 'all') params.category = category;
        const res = await api.get('/businesses/search', params);
        if (active) setSearchResults(res.data || []);
      } catch (e) {
        if (active) setSearchResults([]);
      } finally {
        if (active) setSearchLoading(false);
      }
    })();
    return () => { active = false; };
  }, [search, category]);

  // ── Fetch from the server ──
  const fetchPage = useCallback(async (pg, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const params = { page: pg, limit: PAGE_SIZE };
      if (category !== 'all') params.category = category;
      if (city !== ALL_CITIES) params.city = city; // `city` already holds the slug

      const res = await api.get('/businesses', params);
      const data = res.data || [];
      setBusinesses(prev => (append ? [...prev, ...data] : data));
      setPagination(res.pagination || { totalPages: 1, total: data.length });
      setPage(pg);
    } catch (err) {
      setError(err.message || t('app.activities.loadError'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, city, t]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  // ── Filtering and sorting ──
  // With a query: results come from the server (case-insensitive, whole DB).
  // Without a query: the paginated page already loaded.
  const visible = useMemo(() => {
    const list = search ? searchResults : businesses;
    const sorted = [...list];
    if (sort === 'rating') sorted.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    if (sort === 'reviews') sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    if (sort === 'name') sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return sorted;
  }, [businesses, searchResults, search, sort]);

  // ── Autocomplete suggestions (best matches by name) ──
  const suggestions = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    // names starting with the query come first, then the rest
    const ranked = [...searchResults].sort((a, b) => {
      const an = (a.name || '').toLowerCase().startsWith(q) ? 0 : 1;
      const bn = (b.name || '').toLowerCase().startsWith(q) ? 0 : 1;
      return an - bn;
    });
    return ranked.slice(0, 6);
  }, [searchResults, search]);

  // ── Featured: real rating only, no purchased placement ──
  const featured = useMemo(() => {
    return [...businesses]
      .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
      .slice(0, 10);
  }, [businesses]);

  const mappable = useMemo(() => visible.filter(b => b.latitude && b.longitude), [visible]);

  // Readable name of the selected city (state holds the slug)
  const cityName = useMemo(
    () => cities.find(c => c.slug === city)?.name || city,
    [cities, city]
  );

  const hasActiveFilters = category !== 'all' || city !== ALL_CITIES || search;

  const resetFilters = () => {
    setCategory('all');
    setCity(ALL_CITIES);
    setSearchInput('');
    setSort('rating');
  };

  const scrollBoard = (dir) => {
    boardRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  const goTo = (slug) => navigate(`/businesses/${slug}`);

  // ── Picking a suggestion → open the listing ──
  const selectSuggestion = (b) => {
    setShowSuggest(false);
    setActiveSuggest(-1);
    goTo(b.slug);
  };

  // ── Keyboard navigation inside the dropdown ──
  const onSearchKeyDown = (e) => {
    if (!showSuggest || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggest(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggest(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeSuggest >= 0 && suggestions[activeSuggest]) {
        e.preventDefault();
        selectSuggestion(suggestions[activeSuggest]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggest(false);
      setActiveSuggest(-1);
    }
  };

  // Translated category name — shared implementation (utils/categoryLabel)
  const catLabel = (b) => getCategoryLabel(b.category, language);

  return (
    <div className="act">

      {/* ════════ HERO ════════ */}
      <header className="act-hero">
        <div className="act-container">
          <span className="act-hero__eyebrow">{t('app.activities.eyebrow')}</span>
          <h1>{t('app.activities.heroTitle')}</h1>
          <p>{t('app.activities.heroSubtitle')}</p>

          <div className="act-searchbar" role="search">
            <Icon name="search" size={20} className="act-searchbar__svg" />
            <input
              type="search"
              placeholder={t('app.activities.searchPlaceholder')}
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setShowSuggest(true); setActiveSuggest(-1); }}
              onFocus={() => setShowSuggest(true)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              onKeyDown={onSearchKeyDown}
              role="combobox"
              aria-expanded={showSuggest && suggestions.length > 0}
              aria-autocomplete="list"
              aria-controls="act-suggest-list"
              aria-label={t('app.activities.a11ySearch')}
            />
            {searchInput && (
              <button className="act-searchbar__clear" onClick={() => { setSearchInput(''); setShowSuggest(false); }} aria-label={t('app.activities.a11yClearSearch')}>✕</button>
            )}

            {/* ── Suggestions dropdown ── */}
            {showSuggest && searchInput && (
              <div className="act-suggest" id="act-suggest-list" role="listbox">
                {searchLoading && suggestions.length === 0 ? (
                  <div className="act-suggest__empty">{t('app.activities.searching')}</div>
                ) : suggestions.length === 0 ? (
                  <div className="act-suggest__empty">{t('app.activities.noSuggest')}</div>
                ) : (
                  suggestions.map((b, i) => (
                    <button
                      type="button"
                      key={b.id}
                      role="option"
                      aria-selected={i === activeSuggest}
                      className={`act-suggest__item ${i === activeSuggest ? 'is-active' : ''}`}
                      onMouseDown={(e) => { e.preventDefault(); selectSuggestion(b); }}
                      onMouseEnter={() => setActiveSuggest(i)}
                    >
                      <Icon name={CATEGORIES.find(c => c.slug === b.category?.slug)?.icon || 'store'} size={16} className="act-suggest__icon" />
                      <span className="act-suggest__name">{b.name}</span>
                      <span className="act-suggest__meta">{b.city?.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ════════ SLIDEBOARD — Featured ════════ */}
      {!loading && !error && featured.length > 0 && (
        <section className="act-board-section">
          <div className="act-container">
            <div className="act-board-head">
              <h2>{t('app.activities.featured')}</h2>
              <div className="act-board-nav">
                <button onClick={() => scrollBoard(-1)} aria-label={t('app.activities.a11yScrollLeft')}>
                  <Icon name="arrowL" size={16} />
                </button>
                <button onClick={() => scrollBoard(1)} aria-label={t('app.activities.a11yScrollRight')}>
                  <Icon name="arrowR" size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="act-board" ref={boardRef}>
            <div className="act-board__track">
              {featured.map(b => (
                <article
                  key={b.id}
                  className="act-slide"
                  onClick={() => goTo(b.slug)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && goTo(b.slug)}
                >
                  <div className="act-slide__media">
                    <SafeImage
                      src={b.coverImage || b.logo}
                      alt={b.name}
                      loading="lazy"
                      fallback={<Icon name={CATEGORIES.find(c => c.slug === b.category?.slug)?.icon || 'store'} size={42} className="act-slide__fallback" />}
                    />
                    <div className="act-slide__overlay">
                      <h3>{b.name}</h3>
                      <p>
                        <Icon name="pin" size={13} /> {b.city?.name} · {catLabel(b)}
                      </p>
                      <div className="act-slide__rating">
                        <Stars value={b.averageRating || 0} />
                        <span>({b.reviewCount || 0})</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════ LAYOUT: SIDEBAR + RESULTS ════════ */}
      <div className="act-layout act-container">

        {/* ── Open button, mobile only ── */}
        <button
          className="act-sidebar-toggle"
          onClick={() => setSidebarOpen(true)}
          aria-expanded={sidebarOpen}
        >
          <Icon name="grid" size={16} />
          {t('app.activities.filters')}
          {hasActiveFilters && <span className="act-sidebar-toggle__dot" aria-hidden="true" />}
        </button>

        {/* Dark scrim behind the mobile panel */}
        {sidebarOpen && (
          <div className="act-sidebar-scrim" onClick={() => setSidebarOpen(false)} role="presentation" />
        )}

        {/* ── Sidebar ── */}
        <aside className={`act-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
          <div className="act-sidebar__head">
            <h2>{t('app.activities.filters')}</h2>
            <button
              className="act-sidebar__close"
              onClick={() => setSidebarOpen(false)}
              aria-label={t('app.activities.closeFilters')}
            >✕</button>
          </div>

          {/* Categories */}
          <nav className="act-catnav" aria-label={t('app.activities.a11yCategories')}>
            <span className="act-sidebar__label">{t('app.activities.a11yCategories')}</span>
            {CATEGORIES.map(c => (
              <button
                key={c.slug}
                aria-current={category === c.slug}
                className={`act-catnav__item ${category === c.slug ? 'is-active' : ''}`}
                onClick={() => { setCategory(c.slug); setSidebarOpen(false); }}
              >
                <span className="act-catnav__icon"><Icon name={c.icon} size={17} /></span>
                <span className="act-catnav__label">{t(c.labelKey)}</span>
                {category === c.slug && <Icon name="check" size={15} className="act-catnav__check" />}
              </button>
            ))}
          </nav>

          {/* City */}
          <div className="act-sidebar__group">
            <label className="act-sidebar__label" htmlFor="act-city">
              {t('app.activities.a11yFilterCity')}
            </label>
            <select
              id="act-city"
              className="act-sidebar__select"
              value={city}
              onChange={e => setCity(e.target.value)}
            >
              <option value={ALL_CITIES}>{t('app.activities.allCities')}</option>
              {cities.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </div>

          {/* Sorting */}
          <div className="act-sidebar__group">
            <label className="act-sidebar__label" htmlFor="act-sort">
              {t('app.activities.a11ySortBy')}
            </label>
            <select
              id="act-sort"
              className="act-sidebar__select"
              value={sort}
              onChange={e => setSort(e.target.value)}
            >
              {SORTS.map(s => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
            </select>
          </div>

          {hasActiveFilters && (
            <button className="act-sidebar__reset" onClick={resetFilters}>
              {t('app.activities.removeFilters')}
            </button>
          )}
        </aside>

      {/* ════════ RESULTS ════════ */}
        <main className="act-results">

        <div className="act-results__bar">
          <div className="act-viewtoggle" role="group" aria-label={t('app.activities.a11yViewMode')}>
            <button
              className={view === 'grid' ? 'active' : ''}
              onClick={() => setView('grid')}
              aria-label={t('app.activities.a11yGridView')}
            >
              <Icon name="grid" size={15} /> {t('app.activities.viewGrid')}
            </button>
            <button
              className={view === 'map' ? 'active' : ''}
              onClick={() => setView('map')}
              aria-label={t('app.activities.a11yMapView')}
            >
              <Icon name="map" size={15} /> {t('app.activities.viewMap')}
            </button>
          </div>
        </div>

        <div className="act-results__meta">
          {!loading && (
            <span>
              <strong>{search ? visible.length : pagination.total || visible.length}</strong> {t('app.activities.results')}
              {category !== 'all' && <> {t('app.activities.resultsIn')} <strong>{t(CATEGORIES.find(c => c.slug === category)?.labelKey)}</strong></>}
              {city !== ALL_CITIES && <> {t('app.activities.resultsAt')} <strong>{cityName}</strong></>}
              {view === 'map' && <> · <strong>{mappable.length}</strong> {t('app.activities.onTheMap')}</>}
            </span>
          )}
          {hasActiveFilters && !loading && (
            <button className="act-reset" onClick={resetFilters}>{t('app.activities.removeFilters')}</button>
          )}
        </div>

        {error ? (
          <div className="act-state">
            <Icon name="alert" size={38} className="act-state__svg" />
            <p>{error}</p>
            <button className="act-btn" onClick={() => fetchPage(1)}>{t('app.activities.retry')}</button>
          </div>
        ) : loading ? (
          <div className="act-grid">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : view === 'map' ? (

          /* ──────── MAP VIEW ──────── */
          <div className="act-map">
            <MapContainer center={ITALY_CENTER} zoom={6} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mappable.map(b => (
                <Marker key={b.id} position={[b.latitude, b.longitude]}>
                  <Popup>
                    <div className="act-popup">
                      <strong>{b.name}</strong>
                      <p>{catLabel(b)} · {b.city?.name}</p>
                      <Link to={`/businesses/${b.slug}`}>{t('app.activities.seeDetails')}</Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

        ) : visible.length === 0 ? (
          <div className="act-state">
            <Icon name="search" size={38} className="act-state__svg" />
            <p>{t('app.activities.emptyTitle')}{search && <> {t('app.activities.emptyFor')} «{searchInput}»</>}.</p>
            <button className="act-btn" onClick={resetFilters}>{t('app.activities.removeFilters')}</button>
          </div>
        ) : (

          /* ──────── GRID VIEW ────────
             Businesses stack vertically: every "load more" appends the
             new ones underneath. A horizontal carousel used to hide the
             results that had already been loaded. */
          <>
            <div className="act-grid">
              {visible.map(b => (
                <article
                  key={b.id}
                  className="act-card"
                  onClick={() => goTo(b.slug)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && goTo(b.slug)}
                >
                  <div className="act-card__media">
                    <SafeImage
                      src={b.coverImage || b.logo}
                      alt={b.name}
                      loading="lazy"
                      fallback={<Icon name={CATEGORIES.find(c => c.slug === b.category?.slug)?.icon || 'store'} size={46} className="act-card__fallback" />}
                    />
                  </div>

                  <div className="act-card__body">
                    <h3 className="act-card__title">
                      {b.name}
                      {b.isVerified && <Icon name="check" size={16} className="act-verified" />}
                    </h3>
                    <p className="act-card__desc">
                      {b.shortDesc || (b.description ? b.description.substring(0, 100) + '…' : '')}
                    </p>
                    <div className="act-card__meta">
                      <span className="act-tag">{catLabel(b)}</span>
                      <span className="act-city">
                        <Icon name="pin" size={13} /> {b.city?.name}
                      </span>
                    </div>
                    <div className="act-card__footer">
                      <Stars value={b.averageRating || 0} />
                      <span className="act-count">({b.reviewCount || 0})</span>
                      <span className="act-card__cta">{t('app.activities.seeDetails')}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {!search && page < pagination.totalPages && (
              <div className="act-loadmore">
                <button
                  className="act-btn act-btn--outline"
                  disabled={loadingMore}
                  onClick={() => fetchPage(page + 1, true)}
                >
                  {loadingMore ? t('app.activities.loading') : t('app.activities.loadMore')}
                </button>
                <span className="act-loadmore__info">{t('app.activities.page')} {page} {t('app.activities.pageOf')} {pagination.totalPages}</span>
              </div>
            )}
          </>
        )}
        </main>
      </div>
    </div>
  );
};

export default Activities;
