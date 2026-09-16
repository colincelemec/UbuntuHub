import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../services/api';
import ShareButtons from '../components/business/ShareButtons';
import useAuthStore from '../stores/authStore';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../locales/translations';
import usePageMeta from '../hooks/usePageMeta';
import { getCategoryLabel } from '../utils/categoryLabel';
import Icon from '../components/common/Icon';
import SafeImage from '../components/common/SafeImage';
import '../styles/BusinessDetail.css';

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const StarRating = ({ rating, size = 'sm' }) => (
  <div className="star-row">
    {[1, 2, 3, 4, 5].map(i => (
      <Icon key={i} name="star" size={size === 'lg' ? 20 : 14} className={`star ${i <= Math.round(rating) ? 'filled' : ''} ${size}`} />
    ))}
  </div>
);

const StarPicker = ({ value, onChange }) => (
  <div className="star-picker">
    {[1, 2, 3, 4, 5].map(i => (
      <span
        key={i}
        className={`star-pick ${i <= value ? 'filled' : ''}`}
        onClick={() => onChange(i)}
      ><Icon name="star" size={26} /></span>
    ))}
  </div>
);

// Day order; the labels come from the translations
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const BusinessDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const toast = useToast();
  const { language } = useLanguage();
  const t = useCallback((path) => getTranslation(`app.businessDetail.${path}`, language), [language]);

  const [business, setBusiness] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  const [activeTab, setActiveTab] = useState('info');
  const [activeImage, setActiveImage] = useState(0);

  const fetchBusiness = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/businesses/${slug}`);
      setBusiness(res.data);
    } catch (err) {
      setError(t('notFound'));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  const fetchReviews = useCallback(async (businessId) => {
    try {
      const res = await api.get(`/reviews/${businessId}`);
      setReviews(res.data?.reviews || []);
    } catch {
      setReviews([]);
    }
  }, []);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  useEffect(() => {
    if (business?.id) {
      fetchReviews(business.id);
    }
  }, [business, fetchReviews]);

  // The visitor is never kicked off the page: we invite them to sign in
  // while remembering where they were, so they come back here.
  const goToLogin = () => navigate('/login', { state: { from: location.pathname } });

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      toast.info(t('signInToFavorite'));
      return;
    }
    const wasFavorite = isFavorite;
    try {
      await api.post(`/businesses/${business.id}/favorite`);
      setIsFavorite(prev => !prev);
      toast.success(wasFavorite ? t('favoriteRemoved') : t('favoriteAdded'));
    } catch (err) {
      toast.error(err.message || t('favoriteError'));
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) { setReviewError(t('signInToReview')); return; }
    if (!reviewComment.trim()) { setReviewError(t('reviewEmpty')); return; }

    setSubmittingReview(true);
    setReviewError('');
    setReviewSuccess('');

    try {
      await api.post('/reviews', {
        businessId: business.id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewSuccess(t('reviewSuccess'));
      setReviewComment('');
      setReviewRating(5);
      setShowReviewForm(false);
      fetchReviews(business.id);
      fetchBusiness();
    } catch (err) {
      // The server's validation messages are in French: in a translated
      // interface we show our own localised message instead.
      const isValidationError = Boolean(err.fieldErrors && Object.keys(err.fieldErrors).length);
      setReviewError(isValidationError ? t('reviewError') : (err.message || t('reviewError')));
    } finally {
      setSubmittingReview(false);
    }
  };

  // Page metadata: the business name in the tab title and when shared
  usePageMeta({
    title: business ? `${business.name}${business.city?.name ? ` — ${business.city.name}` : ''}` : null,
    description: business?.shortDesc || business?.description?.slice(0, 160),
    image: business?.coverImage || business?.logo,
  });

  const userHasReviewed = reviews.some(r => r.user?.id === user?.id);
  const allImages = business ? [business.coverImage, ...(business.images || [])].filter(Boolean) : [];

  if (loading) {
    return (
      <div className="bd-loading">
        <div className="spinner"></div>
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="bd-error">
        <p><Icon name="alert" size={18} /> {error || t('notFound')}</p>
        <button onClick={() => navigate('/activities')} className="bd-back-btn">{t('backToDirectory')}</button>
      </div>
    );
  }

  const hasCoords = business.latitude && business.longitude;

  return (
    <div className="bd-page">
      {/* Back nav */}
      <div className="bd-nav">
        <button onClick={() => navigate('/activities')} className="bd-back-link">
          {t('directory')}
        </button>
        <span className="bd-breadcrumb">{getCategoryLabel(business.category, language)} / {business.city?.name}</span>
      </div>

      {/* Cover + gallery */}
      <div className="bd-cover-wrap">
        {allImages.length > 0 ? (
          <>
            <div className="bd-cover-main">
              <SafeImage
                src={allImages[activeImage]}
                alt={business.name}
                fallback={<Icon name="store" size={56} className="bd-cover-fallback" />}
              />
            </div>
            {allImages.length > 1 && (
              <div className="bd-thumbs">
                {allImages.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    className={`bd-thumb ${i === activeImage ? 'active' : ''}`}
                    onClick={() => setActiveImage(i)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="bd-cover-placeholder">
            <Icon name="store" size={56} className="bd-cover-fallback" />
          </div>
        )}
      </div>

      {/* Header */}
      <div className="bd-header">
        <div className="bd-header-inner">
          <div className="bd-header-left">
            <SafeImage src={business.logo} alt="" className="bd-logo" fallback={null} />
            <div>
              <div className="bd-title-row">
                <h1 className="bd-title">{business.name}</h1>
              </div>
              <div className="bd-meta-row">
                <span className="bd-cat-badge">{getCategoryLabel(business.category, language)}</span>
                <span className="bd-city"><Icon name="pin" size={14} /> {business.address}, {business.city?.name}</span>
                <div className="bd-rating-summary">
                  <StarRating rating={business.averageRating || 0} size="sm" />
                  <span className="bd-rating-num">{(business.averageRating || 0).toFixed(1)}</span>
                  <span className="bd-rating-count">({business.reviewCount || 0} {t('reviewsCount')})</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bd-header-actions">
            <button
              className={`bd-fav-btn ${isFavorite ? 'active' : ''}`}
              onClick={handleFavorite}
              title={isFavorite ? t('removeFavorite') : t('addFavorite')}
            >
              <Icon name="heart" size={20} />
            </button>
            {business.phone && (
              <a href={`tel:${business.phone}`} className="bd-contact-btn bd-phone">
                <Icon name="phone" size={15} /> {t('call')}
              </a>
            )}
            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bd-contact-btn bd-whatsapp"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bd-tabs">
        <div className="bd-tabs-inner">
          {['info', 'recensioni', 'mappa'].map(tab => (
            <button
              key={tab}
              className={`bd-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'info' && t('tabInfo')}
              {tab === 'recensioni' && `${t('tabReviews')} (${business.reviewCount || 0})`}
              {tab === 'mappa' && t('tabMap')}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="bd-content">

        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div className="bd-tab-content">
            <div className="bd-info-grid">
              <div className="bd-info-main">
                <section className="bd-section">
                  <h2>{t('about')}</h2>
                  <p className="bd-description">{business.description}</p>
                  {/* Sharing: essential for word-of-mouth reach */}
                  <ShareButtons business={business} />
                </section>

                {/* Social */}
                {(business.facebook || business.instagram || business.twitter || business.tiktok || business.website) && (
                  <section className="bd-section">
                    <h2>{t('followUs')}</h2>
                    <div className="bd-socials">
                      {business.website && (
                        <a href={business.website} target="_blank" rel="noopener noreferrer" className="bd-social-link web">
                          <Icon name="globe" size={15} /> {t('websiteLink')}
                        </a>
                      )}
                      {business.instagram && (
                        <a href={`https://instagram.com/${business.instagram}`} target="_blank" rel="noopener noreferrer" className="bd-social-link insta">
                          Instagram
                        </a>
                      )}
                      {business.facebook && (
                        <a href={business.facebook} target="_blank" rel="noopener noreferrer" className="bd-social-link fb">
                          Facebook
                        </a>
                      )}
                      {business.tiktok && (
                        <a href={`https://tiktok.com/@${business.tiktok}`} target="_blank" rel="noopener noreferrer" className="bd-social-link tiktok">
                          TikTok
                        </a>
                      )}
                    </div>
                  </section>
                )}
              </div>

              <div className="bd-info-sidebar">
                {/* Contact card */}
                <div className="bd-sidebar-card">
                  <h3>{t('contacts')}</h3>
                  {business.phone && (
                    <div className="bd-contact-row">
                      <span><Icon name="phone" size={16} /></span>
                      <a href={`tel:${business.phone}`}>{business.phone}</a>
                    </div>
                  )}
                  {business.email && (
                    <div className="bd-contact-row">
                      <span><Icon name="mail" size={16} /></span>
                      <a href={`mailto:${business.email}`}>{business.email}</a>
                    </div>
                  )}
                  {business.address && (
                    <div className="bd-contact-row">
                      <span><Icon name="pin" size={16} /></span>
                      <span>{business.address}, {business.city?.name}</span>
                    </div>
                  )}
                </div>

                {/* Hours */}
                {business.hours && (
                  <div className="bd-sidebar-card">
                    <h3>{t('hours')}</h3>
                    <div className="bd-hours">
                      {Object.entries(business.hours).map(([day, times]) => (
                        <div key={day} className="bd-hours-row">
                          <span className="bd-hours-day">{DAY_KEYS.includes(day) ? t(day) : day}</span>
                          <span className="bd-hours-time">
                            {times?.open && times?.close
                              ? `${times.open} – ${times.close}`
                              : <em className="bd-closed">{t('closed')}</em>
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* REVIEWS TAB */}
        {activeTab === 'recensioni' && (
          <div className="bd-tab-content">
            {/* Rating summary */}
            <div className="bd-reviews-summary">
              <div className="bd-avg-score">{(business.averageRating || 0).toFixed(1)}</div>
              <div>
                <StarRating rating={business.averageRating || 0} size="lg" />
                <p className="bd-review-total">{business.reviewCount || 0} {t('reviewsCount')}</p>
              </div>
            </div>

            {/* Write review */}
            {isAuthenticated && !userHasReviewed && (
              <div className="bd-write-review">
                {!showReviewForm ? (
                  <button className="bd-write-btn" onClick={() => setShowReviewForm(true)}>
                    <Icon name="pen" size={15} /> {t('writeReview')}
                  </button>
                ) : (
                  <form className="bd-review-form" onSubmit={handleSubmitReview}>
                    <h3>{t('yourReview')}</h3>
                    <div className="bd-review-form-rating">
                      <label>{t('rating')}</label>
                      <StarPicker value={reviewRating} onChange={setReviewRating} />
                    </div>
                    <textarea
                      className="bd-review-textarea"
                      placeholder={t('reviewPlaceholder')}
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      rows={4}
                      required
                    />
                    {reviewError && <p className="bd-form-error">{reviewError}</p>}
                    {reviewSuccess && <p className="bd-form-success">{reviewSuccess}</p>}
                    <div className="bd-review-form-actions">
                      <button type="button" className="bd-cancel-btn" onClick={() => setShowReviewForm(false)}>
                        {t('cancel')}
                      </button>
                      <button type="submit" className="bd-submit-btn" disabled={submittingReview}>
                        {submittingReview ? t('publishing') : t('publish')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {!isAuthenticated && (
              <div className="bd-login-prompt">
                <p>
                  <button className="bd-login-link" onClick={goToLogin}>{t('login')}</button>
                  {' '}{t('loginToReview')}
                </p>
              </div>
            )}

            {reviewSuccess && <p className="bd-form-success bd-success-top">{reviewSuccess}</p>}

            {/* Reviews list */}
            {reviews.length === 0 ? (
              <div className="bd-no-reviews">
                <p>{t('noReviews')}</p>
              </div>
            ) : (
              <div className="bd-reviews-list">
                {reviews.map(review => (
                  <div key={review.id} className="bd-review-card">
                    <div className="bd-review-header">
                      <div className="bd-reviewer-avatar">
                        {review.user?.avatar
                          ? <img src={review.user.avatar} alt="" />
                          : <span>{(review.user?.firstName?.[0] || '?').toUpperCase()}</span>
                        }
                      </div>
                      <div className="bd-reviewer-info">
                        <strong>{review.user?.firstName} {review.user?.lastName}</strong>
                        <span className="bd-review-date">
                          {new Date(review.createdAt).toLocaleDateString('it-IT', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="bd-review-stars">
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                    </div>
                    <p className="bd-review-comment">{review.comment}</p>
                    {review.response && (
                      <div className="bd-owner-response">
                        <strong>{t('ownerResponse')}</strong>
                        <p>{review.response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MAP TAB */}
        {activeTab === 'mappa' && (
          <div className="bd-tab-content">
            <div className="bd-map-info">
              <p><Icon name="pin" size={15} /> <strong>{business.address}</strong>, {business.city?.name}</p>
            </div>
            {hasCoords ? (
              <div className="bd-map-container">
                <MapContainer
                  center={[business.latitude, business.longitude]}
                  zoom={15}
                  style={{ width: '100%', height: '450px', borderRadius: '12px' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[business.latitude, business.longitude]}>
                    <Popup>
                      <strong>{business.name}</strong><br />
                      {business.address}<br />
                      {business.city?.name}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            ) : (
              <div className="bd-no-map">
                <p><Icon name="map" size={16} /> {t('noCoords')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessDetail;
