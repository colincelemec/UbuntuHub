import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import businessService from '../services/businessService';
import useAuthStore from '../stores/authStore';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../locales/translations';
import usePageMeta from '../hooks/usePageMeta';
import { getCategoryLabel } from '../utils/categoryLabel';
import Icon from '../components/common/Icon';
import SafeImage from '../components/common/SafeImage';
import ConfirmDialog from '../components/common/ConfirmDialog';
import '../styles/Dashboard.css';

// ── Leaflet icon fix (the default paths break with bundlers) ──
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ITALY_CENTER = [42.5, 12.5];

// ── Star rating ──
const Stars = ({ value }) => (
  <span className="dh-stars" aria-label={`${value} su 5`}>
    {[1, 2, 3, 4, 5].map(i => (
      <Icon key={i} name="star" size={14} className={i <= Math.round(value) ? 'on' : 'off'} />
    ))}
  </span>
);

// ── Compact business card ──
const BizCard = ({ business, onClick, language }) => (
  <article className="dh-bizcard" onClick={onClick} role="button" tabIndex={0}
    onKeyDown={e => e.key === 'Enter' && onClick()}>
    <div className="dh-bizcard__media">
      <SafeImage
        src={business.coverImage || business.logo}
        alt={business.name}
        loading="lazy"
        fallback={<Icon name="store" size={40} className="dh-bizcard__fallback" />}
      />
    </div>
    <div className="dh-bizcard__body">
      <h4>{business.name}</h4>
      <p className="dh-bizcard__meta">
        {getCategoryLabel(business.category, language)} · {business.city?.name}
      </p>
      <div className="dh-bizcard__rating">
        <Stars value={business.averageRating || 0} />
        <span>({business.reviewCount || 0})</span>
      </div>
    </div>
  </article>
);

const EmptyState = ({ icon, text, actionLabel, onAction }) => (
  <div className="dh-empty">
    <span className="dh-empty__badge"><Icon name={icon} size={30} className="dh-empty__svg" /></span>
    <p>{text}</p>
    {actionLabel && <button className="dh-btn dh-btn--ghost" onClick={onAction}>{actionLabel}</button>}
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { language } = useLanguage();
  const t = (path) => getTranslation(path, language);

  usePageMeta({ title: t('app.nav.dashboard'), noIndex: true });

  const [favorites, setFavorites] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [myBusinesses, setMyBusinesses] = useState([]);
  const [allBusinesses, setAllBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('favorites');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleting(true);
    try {
      await businessService.deleteBusiness(target.id);
      setMyBusinesses(prev => prev.filter(b => b.id !== target.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error('Errore eliminazione servizio:', e);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [favRes, revRes, mineRes, bizRes] = await Promise.allSettled([
        api.get('/users/favorites'),
        api.get('/users/my-reviews'),
        businessService.getMyBusinesses(),
        api.get('/businesses', { limit: 100 }),
      ]);
      if (!mounted) return;
      if (favRes.status === 'fulfilled') {
        setFavorites((favRes.value.data?.favorites || []).map(f => f.business).filter(Boolean));
      }
      if (revRes.status === 'fulfilled') {
        setMyReviews(revRes.value.data?.reviews || []);
      }
      if (mineRes.status === 'fulfilled') {
        setMyBusinesses(mineRes.value.data || []);
      }
      if (bizRes.status === 'fulfilled') {
        setAllBusinesses(bizRes.value.data || []);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  // Businesses that have coordinates, for the map
  const mappable = useMemo(
    () => allBusinesses.filter(b => b.latitude && b.longitude),
    [allBusinesses]
  );

  const firstName = user?.firstName || t('app.dashboard.welcome');

  const TABS = [
    { id: 'favorites', label: t('app.dashboard.favorites'), count: favorites.length },
    { id: 'reviews', label: t('app.dashboard.myReviews'), count: myReviews.length },
    { id: 'businesses', label: t('app.dashboard.myBusinesses'), count: myBusinesses.length },
  ];

  return (
    <div className="dh">

      {/* ════════ HERO ════════ */}
      <header className="dh-hero">
        <div className="dh-container">
          <h1>{t('app.dashboard.greeting')} {firstName}</h1>
          <p>{t('app.dashboard.subtitle')}</p>
          <div className="dh-hero__actions">
            <button className="dh-btn dh-btn--primary" onClick={() => navigate('/activities')}>
              <Icon name="search" size={15} /> {t('app.dashboard.explore')}
            </button>
            <button className="dh-btn dh-btn--outline" onClick={() => navigate('/add-service')}>
              {t('app.dashboard.addBusiness')}
            </button>
          </div>
        </div>
      </header>

      <div className="dh-container">

        {/* ════════ STATISTICS ════════ */}
        <section className="dh-stats">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`dh-stat ${activeTab === tab.id ? 'dh-stat--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="dh-stat__num">{loading ? '…' : tab.count}</span>
              <span className="dh-stat__label">{tab.label}</span>
            </button>
          ))}
        </section>

        {/* ════════ MAP ════════ */}
        <section className="dh-map-section">
          <div className="dh-section-head">
            <h2>{t('app.dashboard.mapTitle')}</h2>
            <span className="dh-section-sub">
              {loading ? t('app.dashboard.loading') : `${mappable.length} ${t('app.dashboard.mapCount')}`}
            </span>
          </div>
          <div className="dh-map">
            <MapContainer center={ITALY_CENTER} zoom={6} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mappable.map(b => (
                <Marker key={b.id} position={[b.latitude, b.longitude]}>
                  <Popup>
                    <div className="dh-popup">
                      <strong>{b.name}</strong>
                      <p>{getCategoryLabel(b.category, language)} · {b.city?.name}</p>
                      <Link to={`/businesses/${b.slug}`}>{t('app.dashboard.seeDetails')}</Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </section>

        {/* ════════ TABS ════════ */}
        <section className="dh-tabs-section">
          <nav className="dh-tabs" role="tablist">
            {TABS.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`dh-tab ${activeTab === tab.id ? 'dh-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label} {!loading && <span className="dh-tab__count">{tab.count}</span>}
              </button>
            ))}
          </nav>

          <div className="dh-tab-panel">
            {loading ? (
              <div className="dh-loading">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="dh-skeleton" />)}
              </div>

            ) : activeTab === 'favorites' ? (
              favorites.length === 0 ? (
                <EmptyState icon="heart" text={t('app.dashboard.emptyFavorites')}
                  actionLabel={t('app.dashboard.emptyFavoritesCta')} onAction={() => navigate('/activities')} />
              ) : (
                <div className="dh-grid">
                  {favorites.map(b => (
                    <BizCard key={b.id} language={language} business={b} onClick={() => navigate(`/businesses/${b.slug}`)} />
                  ))}
                </div>
              )

            ) : activeTab === 'reviews' ? (
              myReviews.length === 0 ? (
                <EmptyState icon="pen" text={t('app.dashboard.emptyReviews')}
                  actionLabel={t('app.dashboard.emptyReviewsCta')} onAction={() => navigate('/activities')} />
              ) : (
                <ul className="dh-reviews">
                  {myReviews.map(r => (
                    <li key={r.id} className="dh-review" onClick={() => navigate(`/businesses/${r.business?.slug}`)}>
                      <div className="dh-review__head">
                        <strong>{r.business?.name}</strong>
                        <Stars value={r.rating} />
                      </div>
                      <p className="dh-review__text">{r.comment}</p>
                      <span className="dh-review__meta">
                        {getCategoryLabel(r.business?.category, language)} · {r.business?.city?.name}
                      </span>
                    </li>
                  ))}
                </ul>
              )

            ) : (
              myBusinesses.length === 0 ? (
                <EmptyState icon="store" text={t('app.dashboard.emptyBusinesses')}
                  actionLabel={t('app.dashboard.emptyBusinessesCta')} onAction={() => navigate('/add-service')} />
              ) : (
                <div className="dh-grid">
                  {myBusinesses.map(b => (
                    <div key={b.id} className="dh-myservice">
                      <BizCard language={language} business={b} onClick={() => navigate(`/businesses/${b.slug}`)} />
                      <div className="dh-myservice__actions">
                        <button
                          className="dh-btn dh-btn--ghost"
                          onClick={() => navigate(`/edit-service/${b.id}`, { state: { business: b } })}
                        >
                          <Icon name="pen" size={14} /> {t('app.dashboard.edit')}
                        </button>
                        <button
                          className="dh-btn dh-btn--danger"
                          onClick={() => setDeleteTarget(b)}
                        >
                          <Icon name="trash" size={14} /> {t('app.dashboard.delete')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </section>

      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('app.dashboard.deleteTitle')}
        message={`${t('app.dashboard.deleteMessage')} ${deleteTarget?.name || ''}`}
        yesLabel={deleting ? t('app.dashboard.deleting') : t('app.dashboard.deleteYes')}
        cancelLabel={t('app.dashboard.deleteCancel')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Dashboard;
