// ============================================
// Admin panel
// Tabs: Overview · Businesses · Users · Reviews
// Every action goes through adminService (ADMIN routes).
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import adminService from '../services/adminService';
import useAuthStore from '../stores/authStore';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../locales/translations';
import usePageMeta from '../hooks/usePageMeta';
import { getCategoryLabel } from '../utils/categoryLabel';
import Icon from '../components/common/Icon';
import ConfirmDialog from '../components/common/ConfirmDialog';
import '../styles/Admin.css';

// ── Business status → badge colour and icon ──
const STATUS_META = {
  PENDING:   { cls: 'pending',  icon: 'clock' },
  VERIFIED:  { cls: 'verified', icon: 'check' },
  REJECTED:  { cls: 'rejected', icon: 'ban' },
  SUSPENDED: { cls: 'suspended', icon: 'alert' },
};

const ROLE_META = {
  USER:     'user',
  BUSINESS: 'business',
  ADMIN:    'admin',
};

const Admin = () => {
  const { user } = useAuthStore();
  const { language } = useLanguage();
  const t = (path) => getTranslation(path, language);

  usePageMeta({ title: t('app.nav.admin'), noIndex: true });

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Business and user filters
  const [bizStatus, setBizStatus] = useState('');
  const [bizSearch, setBizSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Generic confirmation dialog
  const [dialog, setDialog] = useState(null); // { title, message, onConfirm }

  // ── Loaders ──
  const loadStats = useCallback(async () => {
    try {
      const res = await adminService.getStats();
      setStats(res.data?.stats || null);
    } catch (e) { setError(e.message); }
  }, []);

  const loadBusinesses = useCallback(async () => {
    try {
      const params = {};
      if (bizStatus) params.status = bizStatus;
      if (bizSearch) params.search = bizSearch;
      const res = await adminService.getBusinesses(params);
      setBusinesses(res.data?.businesses || []);
    } catch (e) { setError(e.message); }
  }, [bizStatus, bizSearch]);

  const loadUsers = useCallback(async () => {
    try {
      const params = {};
      if (userSearch) params.search = userSearch;
      const res = await adminService.getUsers(params);
      setUsers(res.data?.users || []);
    } catch (e) { setError(e.message); }
  }, [userSearch]);

  const loadReviews = useCallback(async () => {
    try {
      const res = await adminService.getReportedReviews();
      setReviews(res.data?.reviews || []);
    } catch (e) { setError(e.message); }
  }, []);

  // Load the data on first render
  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.allSettled([loadStats(), loadBusinesses(), loadUsers(), loadReviews()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload the businesses when the filters change
  useEffect(() => { loadBusinesses(); }, [loadBusinesses]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── Business actions ──
  const changeBusinessStatus = async (id, status) => {
    try {
      await adminService.updateBusinessStatus(id, status);
      await Promise.all([loadBusinesses(), loadStats()]);
    } catch (e) { setError(e.message); }
  };

  // ── User actions ──
  const changeUserRole = async (id, role) => {
    try {
      await adminService.updateUserRole(id, role);
      await loadUsers();
    } catch (e) { setError(e.message); }
  };

  const askDeleteUser = (u) => setDialog({
    title: t('app.admin.confirmDeleteUserTitle'),
    message: `${t('app.admin.confirmDeleteUserMsg')} ${u.email}`,
    onConfirm: async () => {
      setDialog(null);
      try {
        await adminService.deleteUser(u.id);
        await Promise.all([loadUsers(), loadStats()]);
      } catch (e) { setError(e.message); }
    },
  });

  // ── Review actions ──
  const askDeleteReview = (r) => setDialog({
    title: t('app.admin.confirmDeleteReviewTitle'),
    message: t('app.admin.confirmDeleteReviewMsg'),
    onConfirm: async () => {
      setDialog(null);
      try {
        await adminService.deleteReview(r.id);
        await Promise.all([loadReviews(), loadStats()]);
      } catch (e) { setError(e.message); }
    },
  });

  // ── Helpers ──
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString(language) : '—';
  const fullName = (p) => [p?.firstName, p?.lastName].filter(Boolean).join(' ') || p?.email || '—';

  const TABS = [
    { id: 'overview',   label: t('app.admin.tabOverview'),   icon: 'chart' },
    { id: 'businesses', label: t('app.admin.tabBusinesses'), icon: 'store', count: businesses.length },
    { id: 'users',      label: t('app.admin.tabUsers'),      icon: 'users', count: users.length },
    { id: 'reviews',    label: t('app.admin.tabReviews'),    icon: 'flag',  count: reviews.length },
  ];

  // ════════ OVERVIEW ════════
  const renderOverview = () => {
    if (!stats) return <div className="ad-empty"><p>{t('app.admin.noData')}</p></div>;
    const cards = [
      { label: t('app.admin.statUsers'),     value: stats.users?.total ?? 0,         icon: 'users',  tone: 'blue' },
      { label: t('app.admin.statBusinesses'), value: stats.businesses?.total ?? 0,   icon: 'store',  tone: 'green' },
      { label: t('app.admin.statPending'),   value: stats.businesses?.pending ?? 0,  icon: 'clock',  tone: 'amber' },
      { label: t('app.admin.statVerified'),  value: stats.businesses?.verified ?? 0, icon: 'check',  tone: 'green' },
      { label: t('app.admin.statReviews'),   value: stats.reviews?.total ?? 0,       icon: 'pen',    tone: 'blue' },
      { label: t('app.admin.statReported'),  value: stats.reviews?.reported ?? 0,    icon: 'flag',   tone: 'red' },
      { label: t('app.admin.statCities'),    value: stats.cities ?? 0,               icon: 'pin',    tone: 'gray' },
      { label: t('app.admin.statCategories'), value: stats.categories ?? 0,          icon: 'grid',   tone: 'gray' },
    ];
    return (
      <>
        <div className="ad-cards">
          {cards.map((c, i) => (
            <div key={i} className={`ad-card ad-card--${c.tone}`}>
              <div className="ad-card__icon"><Icon name={c.icon} size={22} /></div>
              <div className="ad-card__body">
                <span className="ad-card__value">{c.value}</span>
                <span className="ad-card__label">{c.label}</span>
              </div>
            </div>
          ))}
        </div>
        {stats.businesses?.recent != null && (
          <p className="ad-note">
            <Icon name="clock" size={14} /> {stats.businesses.recent} {t('app.admin.recentNote')}
          </p>
        )}
      </>
    );
  };

  // ════════ BUSINESSES ════════
  const renderBusinesses = () => (
    <>
      <div className="ad-toolbar">
        <div className="ad-search">
          <Icon name="search" size={15} />
          <input
            type="text"
            placeholder={t('app.admin.searchBusiness')}
            value={bizSearch}
            onChange={(e) => setBizSearch(e.target.value)}
          />
        </div>
        <div className="ad-filters">
          {['', 'PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map(s => (
            <button
              key={s || 'ALL'}
              className={`ad-chip ${bizStatus === s ? 'ad-chip--on' : ''}`}
              onClick={() => setBizStatus(s)}
            >
              {s ? t(`app.admin.status_${s}`) : t('app.admin.statusAll')}
            </button>
          ))}
        </div>
      </div>

      {businesses.length === 0 ? (
        <div className="ad-empty"><Icon name="store" size={32} /><p>{t('app.admin.noBusinesses')}</p></div>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>{t('app.admin.colName')}</th>
                <th>{t('app.admin.colOwner')}</th>
                <th>{t('app.admin.colLocation')}</th>
                <th>{t('app.admin.colStatus')}</th>
                <th>{t('app.admin.colCreated')}</th>
                <th className="ad-th-actions">{t('app.admin.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map(b => {
                const meta = STATUS_META[b.status] || STATUS_META.PENDING;
                return (
                  <tr key={b.id}>
                    <td data-label={t('app.admin.colName')}>
                      <strong>{b.name}</strong>
                      <span className="ad-sub">{getCategoryLabel(b.category, language)}</span>
                    </td>
                    <td data-label={t('app.admin.colOwner')}>
                      {fullName(b.owner)}
                      <span className="ad-sub">{b.owner?.email}</span>
                    </td>
                    <td data-label={t('app.admin.colLocation')}>{b.city?.name || '—'}</td>
                    <td data-label={t('app.admin.colStatus')}>
                      <span className={`ad-badge ad-badge--${meta.cls}`}>
                        <Icon name={meta.icon} size={12} /> {t(`app.admin.status_${b.status}`)}
                      </span>
                      {/* Published but not yet checked: it is publicly
                          visible and merely awaits the badge. */}
                      {b.status === 'VERIFIED' && !b.isVerified && (
                        <span className="ad-badge ad-badge--tocheck">
                          <Icon name="clock" size={12} /> {t('app.admin.toCheck')}
                        </span>
                      )}
                    </td>
                    <td data-label={t('app.admin.colCreated')}>{fmtDate(b.createdAt)}</td>
                    <td data-label={t('app.admin.colActions')} className="ad-actions">
                      {b.status !== 'VERIFIED' && (
                        <button className="ad-btn ad-btn--ok" title={t('app.admin.actVerify')}
                          onClick={() => changeBusinessStatus(b.id, 'VERIFIED')}>
                          <Icon name="check" size={14} />
                        </button>
                      )}
                      {b.status !== 'REJECTED' && (
                        <button className="ad-btn ad-btn--danger" title={t('app.admin.actReject')}
                          onClick={() => changeBusinessStatus(b.id, 'REJECTED')}>
                          <Icon name="ban" size={14} />
                        </button>
                      )}
                      {b.status !== 'SUSPENDED' && (
                        <button className="ad-btn ad-btn--warn" title={t('app.admin.actSuspend')}
                          onClick={() => changeBusinessStatus(b.id, 'SUSPENDED')}>
                          <Icon name="alert" size={14} />
                        </button>
                      )}
                      {b.status !== 'PENDING' && (
                        <button className="ad-btn" title={t('app.admin.actPending')}
                          onClick={() => changeBusinessStatus(b.id, 'PENDING')}>
                          <Icon name="clock" size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  // ════════ USERS ════════
  const renderUsers = () => (
    <>
      <div className="ad-toolbar">
        <div className="ad-search">
          <Icon name="search" size={15} />
          <input
            type="text"
            placeholder={t('app.admin.searchUser')}
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
        </div>
      </div>

      {users.length === 0 ? (
        <div className="ad-empty"><Icon name="users" size={32} /><p>{t('app.admin.noUsers')}</p></div>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>{t('app.admin.colUser')}</th>
                <th>{t('app.admin.colRole')}</th>
                <th>{t('app.admin.colActivity')}</th>
                <th>{t('app.admin.colCreated')}</th>
                <th className="ad-th-actions">{t('app.admin.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isSelf = u.id === user?.id;
                return (
                  <tr key={u.id}>
                    <td data-label={t('app.admin.colUser')}>
                      <strong>{fullName(u)}{isSelf && <span className="ad-you"> ({t('app.admin.you')})</span>}</strong>
                      <span className="ad-sub">{u.email}</span>
                    </td>
                    <td data-label={t('app.admin.colRole')}>
                      <span className={`ad-role ad-role--${ROLE_META[u.role] || 'user'}`}>{u.role}</span>
                    </td>
                    <td data-label={t('app.admin.colActivity')}>
                      <span className="ad-sub">
                        {(u._count?.businesses ?? 0)} {t('app.admin.miniBiz')} · {(u._count?.reviews ?? 0)} {t('app.admin.miniRev')}
                      </span>
                    </td>
                    <td data-label={t('app.admin.colCreated')}>{fmtDate(u.createdAt)}</td>
                    <td data-label={t('app.admin.colActions')} className="ad-actions">
                      <select
                        className="ad-select"
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) => changeUserRole(u.id, e.target.value)}
                        title={t('app.admin.actChangeRole')}
                      >
                        <option value="USER">USER</option>
                        <option value="BUSINESS">BUSINESS</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      <button
                        className="ad-btn ad-btn--danger"
                        title={t('app.admin.actDeleteUser')}
                        disabled={isSelf}
                        onClick={() => askDeleteUser(u)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  // ════════ REPORTED REVIEWS ════════
  const renderReviews = () => (
    reviews.length === 0 ? (
      <div className="ad-empty"><Icon name="check" size={32} /><p>{t('app.admin.noReported')}</p></div>
    ) : (
      <ul className="ad-reviews">
        {reviews.map(r => (
          <li key={r.id} className="ad-review">
            <div className="ad-review__main">
              <div className="ad-review__head">
                <strong>{r.business?.name || '—'}</strong>
                <span className="ad-badge ad-badge--rejected"><Icon name="flag" size={12} /> {t('app.admin.reported')}</span>
              </div>
              <p className="ad-review__text">“{r.comment}”</p>
              <span className="ad-sub">
                {fullName(r.user)} · {r.user?.email} · {fmtDate(r.createdAt)}
              </span>
            </div>
            <button className="ad-btn ad-btn--danger" title={t('app.admin.actDeleteReview')}
              onClick={() => askDeleteReview(r)}>
              <Icon name="trash" size={14} />
            </button>
          </li>
        ))}
      </ul>
    )
  );

  return (
    <div className="ad">
      {/* ════════ HERO ════════ */}
      <header className="ad-hero">
        <div className="ad-container">
          <h1><Icon name="shield" size={26} /> {t('app.admin.title')}</h1>
          <p>{t('app.admin.subtitle')}</p>
        </div>
      </header>

      <div className="ad-container">
        {error && (
          <div className="ad-alert">
            <Icon name="alert" size={16} /> {error}
            <button onClick={() => setError(null)}><Icon name="close" size={14} /></button>
          </div>
        )}

        {/* ════════ TABS ════════ */}
        <nav className="ad-tabs" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`ad-tab ${activeTab === tab.id ? 'ad-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon name={tab.icon} size={15} /> {tab.label}
              {tab.count != null && !loading && <span className="ad-tab__count">{tab.count}</span>}
            </button>
          ))}
        </nav>

        <section className="ad-panel">
          {loading ? (
            <div className="ad-loading">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="ad-skeleton" />)}
            </div>
          ) : activeTab === 'overview' ? renderOverview()
            : activeTab === 'businesses' ? renderBusinesses()
            : activeTab === 'users' ? renderUsers()
            : renderReviews()}
        </section>
      </div>

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.title}
        message={dialog?.message}
        yesLabel={t('app.admin.confirmYes')}
        cancelLabel={t('app.admin.confirmCancel')}
        onConfirm={dialog?.onConfirm}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
};

export default Admin;
