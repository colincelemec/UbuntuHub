// ============================================
// CitySelect — a searchable city combobox
// With 107 provincial capitals a plain <select> is impractical:
// here you type ("bol" → Bologna, Bolzano) and pick.
// Accessible: combobox role, full keyboard navigation.
// ============================================

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Icon from './Icon';
import './CitySelect.css';

// Normalise for searching: lowercase and accent-free (à→a, è→e…)
const normalize = (s = '') =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const CitySelect = ({
  cities = [],
  value = '',            // id of the selected city
  onChange,              // (cityId) => void
  disabled = false,
  loading = false,
  error = false,
  // Labels arrive already translated from the parent component.
  placeholder = '',
  loadingLabel = '…',
  emptyLabel = '',
  clearLabel = '✕',
  id = 'city-select',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selected = useMemo(
    () => cities.find(c => c.id === value) || null,
    [cities, value]
  );

  // Filter: cities starting with the query come first
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return cities;
    const matches = cities.filter(c =>
      normalize(c.name).includes(q) || normalize(c.region || '').includes(q)
    );
    return matches.sort((a, b) => {
      const aStarts = normalize(a.name).startsWith(q) ? 0 : 1;
      const bStarts = normalize(b.name).startsWith(q) ? 0 : 1;
      return aStarts - bStarts || a.name.localeCompare(b.name);
    });
  }, [cities, query]);

  // Close the dropdown on an outside click
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Keep the active item visible while navigating with the keyboard
  useEffect(() => {
    if (!open || activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIndex];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const openList = useCallback(() => {
    if (disabled || loading) return;
    setOpen(true);
    setActiveIndex(-1);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [disabled, loading]);

  const select = useCallback((city) => {
    onChange?.(city.id);
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
  }, [onChange]);

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) select(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const label = loading
    ? loadingLabel
    : selected
      ? `${selected.name}${selected.region ? ` (${selected.region})` : ''}`
      : placeholder;

  return (
    <div className={`cs ${open ? 'cs--open' : ''}`} ref={wrapRef}>
      {/* Closed field: shows the current selection */}
      {!open && (
        <button
          type="button"
          id={id}
          className={`cs-control ${error ? 'cs-control--err' : ''} ${!selected ? 'cs-control--placeholder' : ''}`}
          onClick={openList}
          onKeyDown={onKeyDown}
          disabled={disabled || loading}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Icon name="pin" size={15} className="cs-control__icon" />
          <span className="cs-control__label">{label}</span>
          <Icon name="arrowDown" size={16} className="cs-control__caret" />
        </button>
      )}

      {/* Open field: search box + list */}
      {open && (
        <>
          <div className={`cs-control cs-control--input ${error ? 'cs-control--err' : ''}`}>
            <Icon name="search" size={15} className="cs-control__icon" />
            <input
              ref={inputRef}
              type="text"
              className="cs-input"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              role="combobox"
              aria-expanded="true"
              aria-controls={`${id}-list`}
              aria-autocomplete="list"
              aria-label={placeholder}
            />
            {query && (
              <button
                type="button"
                className="cs-clear"
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                aria-label={clearLabel}
              >✕</button>
            )}
          </div>

          <ul className="cs-list" id={`${id}-list`} role="listbox" ref={listRef}>
            {filtered.length === 0 ? (
              <li className="cs-empty">{emptyLabel}</li>
            ) : (
              filtered.map((c, i) => (
                <li
                  key={c.id}
                  role="option"
                  aria-selected={c.id === value}
                  className={`cs-option ${i === activeIndex ? 'is-active' : ''} ${c.id === value ? 'is-selected' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); select(c); }}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <span className="cs-option__name">{c.name}</span>
                  {c.region && <span className="cs-option__region">{c.region}</span>}
                  {c.id === value && <Icon name="check" size={15} className="cs-option__check" />}
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
};

export default CitySelect;
