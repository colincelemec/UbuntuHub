// ============================================
// SafeImage — an image with a fallback when loading fails
//
// A hand-typed URL may point at a web page, a local file or a
// private link: the browser then shows its ugly "broken image"
// icon. Here we switch cleanly to the replacement element
// provided instead (a category icon, and so on).
//
// Usage:
//   <SafeImage src={b.coverImage} alt={b.name}
//              fallback={<Icon name="store" size={40} />} />
// ============================================

import React, { useState, useEffect } from 'react';

const SafeImage = ({ src, alt = '', className = '', fallback = null, ...rest }) => {
  const [failed, setFailed] = useState(false);

  // A new URL deserves a fresh attempt
  useEffect(() => { setFailed(false); }, [src]);

  if (!src || failed) return fallback;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
};

export default SafeImage;
