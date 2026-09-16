// ============================================
// ToastContext — transient notifications (toasts)
// Usage: const toast = useToast();  toast.success('...'), toast.error('...')
// Toasts stack in the bottom-right corner and dismiss themselves.
// ============================================

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import Icon from '../components/common/Icon';
import '../styles/Toast.css';

const ToastContext = createContext({
  show: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

const ICONS = { success: 'check', error: 'alert', info: 'chat' };
const DEFAULT_DURATION = 4000;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((message, type = 'info', duration = DEFAULT_DURATION) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  const api = {
    show,
    success: (msg, d) => show(msg, 'success', d),
    error: (msg, d) => show(msg, 'error', d),
    info: (msg, d) => show(msg, 'info', d),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="region" aria-live="polite" aria-label="Notifiche">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast--${t.type}`} role="status">
            <Icon name={ICONS[t.type] || 'chat'} size={18} className="toast__icon" />
            <span className="toast__msg">{t.message}</span>
            <button className="toast__close" onClick={() => remove(t.id)} aria-label="Chiudi">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
