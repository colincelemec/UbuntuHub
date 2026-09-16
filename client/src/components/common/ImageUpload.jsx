// ============================================
// ImageUpload — pick an image from the device
//
// The owner selects a photo, it goes straight to Cloudinary and
// the resulting URL fills the field.
//
// When the server has no image service configured, we fall back
// automatically to a plain URL field: the form stays usable in
// every circumstance.
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { uploadImage, validateFile, isUploadAvailable, MAX_SIZE_MB } from '../../services/uploadService';
import Icon from './Icon';
import './ImageUpload.css';

const ImageUpload = ({
  value,                 // current URL (or empty)
  onChange,              // (url: string) => void
  folder,                // 'ubuntuhub/logos' | 'ubuntuhub/covers'
  label,
  t,                     // translation function supplied by the parent
}) => {
  const [available, setAvailable] = useState(null); // null = not known yet
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  // Does the server offer file upload?
  useEffect(() => {
    let active = true;
    isUploadAvailable().then((ok) => { if (active) setAvailable(ok); });
    return () => { active = false; };
  }, []);

  const handleFile = useCallback(async (file) => {
    setError('');
    const problem = validateFile(file, {
      type: t('imageTypeError'),
      size: t('imageSizeError').replace('{max}', MAX_SIZE_MB),
    });
    if (problem) { setError(problem); return; }

    setUploading(true);
    setProgress(0);
    try {
      const url = await uploadImage(file, folder, setProgress);
      onChange(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [folder, onChange, t]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // ── Fallback: the server has no image service ──
  if (available === false) {
    return (
      <div className="iu">
        <label className="iu__label">{label}</label>
        <input
          type="url"
          className="as-input"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
        />
        <span className="iu__hint">{t('imageUrlFallback')}</span>
      </div>
    );
  }

  return (
    <div className="iu">
      <label className="iu__label">{label}</label>

      {/* An image is already selected */}
      {value && !uploading ? (
        <div className="iu__preview">
          <img src={value} alt="" onError={(e) => { e.currentTarget.style.opacity = 0.15; }} />
          <div className="iu__preview-actions">
            <button type="button" onClick={() => inputRef.current?.click()}>
              {t('imageReplace')}
            </button>
            <button type="button" className="iu__remove" onClick={() => onChange('')}>
              {t('imageRemove')}
            </button>
          </div>
        </div>
      ) : (
        /* Drop zone */
        <button
          type="button"
          className={`iu__drop ${dragging ? 'is-dragging' : ''} ${uploading ? 'is-uploading' : ''}`}
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <span className="iu__bar"><span style={{ width: `${progress}%` }} /></span>
              <span className="iu__drop-text">{t('imageUploading')} {progress}%</span>
            </>
          ) : (
            <>
              <Icon name="store" size={26} className="iu__drop-icon" />
              <span className="iu__drop-text">{t('imageChoose')}</span>
              <span className="iu__drop-hint">
                {t('imageFormats').replace('{max}', MAX_SIZE_MB)}
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ''; // allows picking the same file again
        }}
      />

      {error && <span className="iu__error"><Icon name="alert" size={14} /> {error}</span>}
    </div>
  );
};

export default ImageUpload;
