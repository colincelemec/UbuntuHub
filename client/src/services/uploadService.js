// ============================================
// Service Upload — envoi direct vers Cloudinary
//
// Notre API signe la demande, puis le navigateur envoie le fichier
// straight to Cloudinary. The server never sees the file:
// no bandwidth consumed, no disk used.
// ============================================

import api from './api';

// Client-side limits: reject before uploading, not after
export const MAX_SIZE_MB = 5;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Is file upload available on this server? */
export async function isUploadAvailable() {
  try {
    const res = await api.get('/uploads/status');
    return Boolean(res.configured);
  } catch {
    return false;
  }
}

/**
 * Validates a file before any upload.
 * @returns {string|null} an error message, or null when the file is fine
 */
export function validateFile(file, messages = {}) {
  if (!file) return null;

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return messages.type || 'Format non accepté (JPG, PNG, WEBP ou GIF).';
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return (messages.size || `Fichier trop lourd (maximum ${MAX_SIZE_MB} Mo).`);
  }
  return null;
}

/**
 * Uploads an image and returns its final URL.
 *
 * @param {File} file
 * @param {string} folder      'ubuntuhub/logos' | 'ubuntuhub/covers'
 * @param {Function} onProgress  receives a percentage (0-100)
 * @returns {Promise<string>}  the image's secure URL
 */
export async function uploadImage(file, folder, onProgress) {
  // 1. Ask our API for a signature
  const res = await api.get('/uploads/signature', { folder });
  const { signature, timestamp, apiKey, uploadUrl, transformation } = res.data;

  // 2. Build the request for Cloudinary
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('signature', signature);
  form.append('folder', folder);
  form.append('transformation', transformation);

  // 3. Send it — XMLHttpRequest rather than fetch, to report progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
          resolve(body.secure_url);
        } else {
          reject(new Error(body?.error?.message || `Échec de l'envoi (${xhr.status})`));
        }
      } catch {
        reject(new Error('Réponse inattendue du service d\'images.'));
      }
    };

    xhr.onerror = () => reject(new Error('Connexion interrompue pendant l\'envoi.'));
    xhr.send(form);
  });
}

const uploadService = { isUploadAvailable, uploadImage, validateFile, MAX_SIZE_MB, ACCEPTED_TYPES };
export default uploadService;
