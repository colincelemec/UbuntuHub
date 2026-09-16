// ============================================
// AddService — the form used to publish a business
// Available to any authenticated user.
// The data is stored as a business, published straight away.
// ============================================

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import businessService from '../services/businessService';
import { geocodeAddress, cancelGeocoding } from '../services/geocodingService';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../locales/translations';
import Icon from '../components/common/Icon';
import CitySelect from '../components/common/CitySelect';
import { getCategoryLabel } from '../utils/categoryLabel';
import ImageUpload from '../components/common/ImageUpload';
import '../styles/AddService.css';

// Leaflet icon fix (the default paths break with bundlers)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ITALY_CENTER = [42.5, 12.5];

// Moves the map view when the centre changes (e.g. a city is picked)
const Recenter = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom ?? map.getZoom());
  }, [center, zoom, map]);
  return null;
};

// Drops the pin where the map is clicked
const LocationPicker = ({ position, onChange }) => {
  useMapEvents({
    click(e) { onChange([e.latlng.lat, e.latlng.lng]); },
  });
  return position ? (
    <Marker
      position={position}
      draggable
      eventHandlers={{ dragend: (e) => { const m = e.target.getLatLng(); onChange([m.lat, m.lng]); } }}
    />
  ) : null;
};

const AddService = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEdit = Boolean(id);
  const { language } = useLanguage();
  const t = (path) => getTranslation(path, language);

  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    cityId: '',
    address: '',
    description: '',
    website: '',
    phone: '',
    email: '',
    whatsapp: '',
    logo: '',
    coverImage: '',
  });
  const [position, setPosition] = useState(null); // [lat, lng]
  // State of the automatic address lookup:
  // 'idle' | 'searching' | 'found' | 'notfound' | 'error'
  const [geoStatus, setGeoStatus] = useState('idle');
  // If the user moves the pin by hand we never overwrite it until
  // they edit the address again.
  const pinMovedManually = useRef(false);
  // Edit mode: skip the first lookup so the saved position is kept
  const skipNextGeocode = useRef(isEdit);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Load cities and categories
  useEffect(() => {
    (async () => {
      try {
        const [cRes, catRes] = await Promise.all([
          businessService.getCities(),
          businessService.getCategories(),
        ]);
        setCities(cRes.data?.cities || []);
        setCategories(catRes.data?.categories || []);
      } catch (e) {
        setServerError(e.message);
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, []);

  // Edit mode: prefill from the existing business
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        let biz = location.state?.business;
        if (!biz) {
          // Fallback: no routing state (e.g. after a refresh) → look in my own businesses
          const res = await businessService.getMyBusinesses();
          biz = (res.data || []).find(b => b.id === id);
        }
        if (!biz) { setServerError(t('app.addService.notFound')); return; }
        setForm({
          name: biz.name || '',
          categoryId: biz.categoryId || '',
          cityId: biz.cityId || '',
          address: biz.address || '',
          description: biz.description || '',
          website: biz.website || '',
          phone: biz.phone || '',
          email: biz.email || '',
          whatsapp: biz.whatsapp || '',
          logo: biz.logo || '',
          coverImage: biz.coverImage || '',
        });
        if (biz.latitude != null && biz.longitude != null) {
          setPosition([biz.latitude, biz.longitude]);
        }
      } catch (e) {
        setServerError(e.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  // Map centre: the chosen city, otherwise the middle of Italy
  const selectedCity = useMemo(
    () => cities.find(c => c.id === form.cityId),
    [cities, form.cityId]
  );
  const mapCenter = position
    || (selectedCity ? [selectedCity.latitude, selectedCity.longitude] : ITALY_CENTER);
  const mapZoom = position ? 16 : (selectedCity ? 12 : 6);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    setServerError(null);
    // Editing the address re-enables the automatic lookup
    if (name === 'address') pinMovedManually.current = false;
  };

  // Pin moved or clicked by hand: the automatic lookup leaves it alone
  const handlePinChange = useCallback((coords) => {
    pinMovedManually.current = true;
    setGeoStatus('idle');
    setPosition(coords);
  }, []);

  // ── Automatic address lookup (debounced) ──
  // When the address or the city changes, look up the coordinates and move the pin.
  const address = form.address;
  const cityName = selectedCity?.name;

  useEffect(() => {
    // In edit mode, do not overwrite the saved position on first render
    if (skipNextGeocode.current) {
      skipNextGeocode.current = false;
      return;
    }
    // The pin was placed by hand: respect the user's choice
    if (pinMovedManually.current) return;

    const street = (address || '').trim();
    if (!street || !cityName) {
      setGeoStatus('idle');
      return;
    }
    // Below 3 characters a lookup is meaningless
    if (street.length < 3) {
      setGeoStatus('idle');
      return;
    }

    let cancelled = false;
    setGeoStatus('searching');

    // Debounce: respects Nominatim's ~1 request per second limit
    const timer = setTimeout(async () => {
      try {
        const result = await geocodeAddress(street, cityName);
        if (cancelled) return;
        if (result) {
          setPosition([result.lat, result.lng]);
          setGeoStatus('found');
        } else {
          setGeoStatus('notfound');
        }
      } catch (err) {
        if (cancelled || err.name === 'AbortError') return;
        setGeoStatus('error');
      }
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [address, cityName]);

  // Abort any in-flight request when unmounting
  useEffect(() => () => cancelGeocoding(), []);

  const validate = () => {
    const err = {};
    if (!form.name.trim()) err.name = t('app.addService.errRequired');
    else if (form.name.trim().length < 2) err.name = t('app.addService.errNameShort');
    if (!form.categoryId) err.categoryId = t('app.addService.errRequired');
    if (!form.cityId) err.cityId = t('app.addService.errRequired');
    if (!form.address.trim()) err.address = t('app.addService.errRequired');
    if (!form.description.trim()) err.description = t('app.addService.errRequired');
    else if (form.description.trim().length < 20) err.description = t('app.addService.errDescShort');
    // Requires a complete domain (mysite.it), with or without http(s)://
    if (form.website && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(form.website.trim())) {
      err.website = t('app.addService.errUrl');
    }
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) err.email = t('app.addService.errEmail');
    // Shape check only; the real validation happens on the server
    const phoneOk = (v) => /^\+?[\d\s().-]{6,25}$/.test(v.trim());
    if (form.phone && !phoneOk(form.phone)) err.phone = t('app.addService.errPhone');
    if (form.whatsapp && !phoneOk(form.whatsapp)) err.whatsapp = t('app.addService.errPhone');
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Coordinates: the chosen pin, or the city centre (the backend also falls back)
      const coords = position || (selectedCity ? [selectedCity.latitude, selectedCity.longitude] : null);
      const payload = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        cityId: form.cityId,
        address: form.address.trim(),
        description: form.description.trim(),
        website: form.website.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp.trim(),
        logo: form.logo.trim(),
        coverImage: form.coverImage.trim(),
      };
      if (coords) { payload.latitude = coords[0]; payload.longitude = coords[1]; }

      if (isEdit) {
        await businessService.updateBusiness(id, payload);
      } else {
        await businessService.createBusiness(payload);
      }
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1600);
    } catch (err) {
      setServerError(err.message);
      // The server reports which fields are at fault: we highlight them
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...err.fieldErrors }));
        // Scroll up to the first faulty field so the user can see it
        const first = Object.keys(err.fieldErrors)[0];
        document.getElementById(first)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="as">
        <div className="as-container as-success">
          <div className="as-success__icon"><Icon name="check" size={40} /></div>
          <h2>{isEdit ? t('app.addService.successEditTitle') : t('app.addService.successTitle')}</h2>
          <p>{isEdit ? t('app.addService.successEditMsg') : t('app.addService.successMsg')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="as">
      <header className="as-hero">
        <div className="as-container">
          <h1><Icon name={isEdit ? 'pen' : 'store'} size={24} /> {isEdit ? t('app.addService.editTitle') : t('app.addService.title')}</h1>
          <p>{isEdit ? t('app.addService.editSubtitle') : t('app.addService.subtitle')}</p>
        </div>
      </header>

      <div className="as-container">
        {serverError && (
          <div className="as-alert">
            <Icon name="alert" size={16} /> {serverError}
            <button type="button" onClick={() => setServerError(null)}><Icon name="close" size={14} /></button>
          </div>
        )}

        <form className="as-form" onSubmit={handleSubmit} noValidate>
          {/* ── Main details ── */}
          <section className="as-card">
            <h3 className="as-card__title">{t('app.addService.sectionMain')}</h3>

            <div className="as-field">
              <label htmlFor="name">{t('app.addService.name')} *</label>
              <input id="name" name="name" type="text" value={form.name}
                onChange={handleChange} className={errors.name ? 'as-input as-input--err' : 'as-input'}
                placeholder={t('app.addService.namePh')} />
              {errors.name && <span className="as-err">{errors.name}</span>}
            </div>

            <div className="as-row">
              <div className="as-field">
                <label htmlFor="categoryId">{t('app.addService.category')} *</label>
                <select id="categoryId" name="categoryId" value={form.categoryId}
                  onChange={handleChange} disabled={loadingMeta}
                  className={errors.categoryId ? 'as-input as-input--err' : 'as-input'}>
                  <option value="">{loadingMeta ? t('app.addService.loading') : t('app.addService.selectCategory')}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{getCategoryLabel(c, language)}</option>)}
                </select>
                {errors.categoryId && <span className="as-err">{errors.categoryId}</span>}
              </div>

              <div className="as-field">
                <label htmlFor="cityId">{t('app.addService.city')} *</label>
                <CitySelect
                  id="cityId"
                  cities={cities}
                  value={form.cityId}
                  onChange={(cityId) => {
                    setForm(prev => ({ ...prev, cityId }));
                    if (errors.cityId) setErrors(prev => ({ ...prev, cityId: '' }));
                    setServerError(null);
                  }}
                  loading={loadingMeta}
                  error={!!errors.cityId}
                  placeholder={t('app.addService.selectCity')}
                  loadingLabel={t('app.addService.loading')}
                  emptyLabel={t('app.addService.noCityFound')}
                  clearLabel={t('app.activities.a11yClearSearch')}
                />
                {errors.cityId && <span className="as-err">{errors.cityId}</span>}
              </div>
            </div>

            <div className="as-field">
              <label htmlFor="address">{t('app.addService.address')} *</label>
              <input id="address" name="address" type="text" value={form.address}
                onChange={handleChange} className={errors.address ? 'as-input as-input--err' : 'as-input'}
                placeholder={t('app.addService.addressPh')} />
              {errors.address && <span className="as-err">{errors.address}</span>}
            </div>

            <div className="as-field">
              <label htmlFor="description">{t('app.addService.description')} *</label>
              <textarea id="description" name="description" rows={4} value={form.description}
                onChange={handleChange} className={errors.description ? 'as-input as-input--err' : 'as-input'}
                placeholder={t('app.addService.descriptionPh')} />
              <span className="as-hint">{form.description.trim().length}/20 {t('app.addService.minChars')}</span>
              {errors.description && <span className="as-err">{errors.description}</span>}
            </div>
          </section>

          {/* ── Position on the map ── */}
          <section className="as-card">
            <h3 className="as-card__title">{t('app.addService.sectionLocation')}</h3>
            <p className="as-hint as-hint--block">{t('app.addService.mapHelp')}</p>
            {/* State of the automatic address lookup */}
            {geoStatus !== 'idle' && (
              <div className={`as-geo as-geo--${geoStatus}`} role="status" aria-live="polite">
                {geoStatus === 'searching' && (
                  <><span className="as-geo__spinner" aria-hidden="true" /> {t('app.addService.geoSearching')}</>
                )}
                {geoStatus === 'found' && (
                  <><Icon name="check" size={15} /> {t('app.addService.geoFound')}</>
                )}
                {geoStatus === 'notfound' && (
                  <><Icon name="alert" size={15} /> {t('app.addService.geoNotFound')}</>
                )}
                {geoStatus === 'error' && (
                  <><Icon name="alert" size={15} /> {t('app.addService.geoError')}</>
                )}
              </div>
            )}
            {geoStatus === 'idle' && form.address.trim().length >= 3 && !selectedCity && (
              <div className="as-geo as-geo--notfound" role="status">
                <Icon name="alert" size={15} /> {t('app.addService.geoSelectCityFirst')}
              </div>
            )}

            <div className="as-map">
              <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Recenter center={mapCenter} zoom={mapZoom} />
                <LocationPicker position={position} onChange={handlePinChange} />
              </MapContainer>
            </div>
            <span className="as-hint">
              {position
                ? `${t('app.addService.coords')}: ${position[0].toFixed(5)}, ${position[1].toFixed(5)}`
                : t('app.addService.coordsDefault')}
            </span>
          </section>

          {/* ── Contact details ── */}
          <section className="as-card">
            <h3 className="as-card__title">{t('app.addService.sectionContact')}</h3>
            <div className="as-row">
              <div className="as-field">
                <label htmlFor="website">{t('app.addService.website')}</label>
                <input id="website" name="website" type="url" value={form.website}
                  onChange={handleChange} className={errors.website ? 'as-input as-input--err' : 'as-input'}
                  placeholder="https://…" />
                {errors.website && <span className="as-err">{errors.website}</span>}
              </div>
              <div className="as-field">
                <label htmlFor="phone">{t('app.addService.phone')}</label>
                <input id="phone" name="phone" type="tel" value={form.phone}
                  onChange={handleChange} className={errors.phone ? 'as-input as-input--err' : 'as-input'}
                  placeholder="+39 333 123 4567" />
                {errors.phone && <span className="as-err">{errors.phone}</span>}
              </div>
            </div>
            <div className="as-row">
              <div className="as-field">
                <label htmlFor="email">{t('app.addService.email')}</label>
                <input id="email" name="email" type="email" value={form.email}
                  onChange={handleChange} className={errors.email ? 'as-input as-input--err' : 'as-input'}
                  placeholder="contatto@…" />
                {errors.email && <span className="as-err">{errors.email}</span>}
              </div>
              <div className="as-field">
                <label htmlFor="whatsapp">{t('app.addService.whatsapp')}</label>
                <input id="whatsapp" name="whatsapp" type="tel" value={form.whatsapp}
                  onChange={handleChange} className={errors.whatsapp ? 'as-input as-input--err' : 'as-input'}
                  placeholder="+39 333 123 4567" />
                {errors.whatsapp && <span className="as-err">{errors.whatsapp}</span>}
              </div>
            </div>
          </section>

          {/* ── Images (optional) ── */}
          <section className="as-card">
            <h3 className="as-card__title">{t('app.addService.sectionImages')}</h3>
            <p className="as-hint as-hint--block">{t('app.addService.imagesHelp')}</p>
            <div className="as-row">
              <ImageUpload
                value={form.logo}
                onChange={(url) => setForm(p => ({ ...p, logo: url }))}
                folder="ubuntuhub/logos"
                label={t('app.addService.logo')}
                t={(k) => t(`app.addService.${k}`)}
              />
              <ImageUpload
                value={form.coverImage}
                onChange={(url) => setForm(p => ({ ...p, coverImage: url }))}
                folder="ubuntuhub/covers"
                label={t('app.addService.cover')}
                t={(k) => t(`app.addService.${k}`)}
              />
            </div>
          </section>

          <div className="as-actions">
            <button type="button" className="as-btn as-btn--ghost" onClick={() => navigate('/dashboard')}>
              {t('app.addService.cancel')}
            </button>
            <button type="submit" className="as-btn as-btn--primary" disabled={submitting || loadingMeta}>
              {submitting
                ? (isEdit ? t('app.addService.saving') : t('app.addService.submitting'))
                : (isEdit ? t('app.addService.save') : t('app.addService.submit'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddService;
