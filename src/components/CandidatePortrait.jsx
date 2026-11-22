import React, { useEffect, useMemo, useState } from 'react';

const normalizePublicPath = (path) => {
  if (typeof path !== 'string' || !path.trim()) return '';
  if (/^(https?:|data:|blob:|bfa-mod:)/i.test(path)) return path;
  const trimmed = path.trim().replace(/\\/g, '/').replace(/^\.\//, '/');
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};
const identityUrlResolver = (path) => path;

/** Resolve both role surfaces from one canonical person/portrait record. */
export function resolveCandidatePortrait(person, variant = 'campaign', assetUrlResolver = identityUrlResolver) {
  if (!person) return { src: '', canonicalSrc: '' };
  const canonical = normalizePublicPath(person.portraitPath || person.portrait);
  const selection = normalizePublicPath(person.selectionThumbnailPath || person.selectionThumbnail);
  const source = variant === 'selection' && selection ? selection : canonical;
  return {
    src: source ? assetUrlResolver(source) : '',
    canonicalSrc: canonical ? assetUrlResolver(canonical) : '',
  };
}

/**
 * Portrait-only image primitive. It intentionally has no icon SVG, border,
 * shadow, round mask, or decorative line overlay. Caller owns the frame.
 */
export default function CandidatePortrait({
  person,
  variant = 'campaign',
  assetUrlResolver = identityUrlResolver,
  className = '',
  style = {},
}) {
  const sources = useMemo(
    () => resolveCandidatePortrait(person, variant, assetUrlResolver),
    [person, variant, assetUrlResolver],
  );
  const [failedSource, setFailedSource] = useState('');
  useEffect(() => setFailedSource(''), [sources.src, sources.canonicalSrc]);

  if (!sources.src) return <span className={className} aria-hidden="true">{person?.name?.slice(0, 1) || '?'}</span>;
  const currentSrc = failedSource === sources.src
    ? (sources.src !== sources.canonicalSrc ? sources.canonicalSrc : '')
    : sources.src;
  if (!currentSrc) return <span className={className} aria-hidden="true">{person?.name?.slice(0, 1) || '?'}</span>;

  return (
    <img
      className={className}
      src={currentSrc}
      alt={person?.name || ''}
      draggable="false"
      decoding="async"
      onError={() => setFailedSource(currentSrc)}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: variant === 'selection' ? 'cover' : 'contain',
        objectPosition: 'center',
        imageRendering: 'auto',
        ...style,
      }}
    />
  );
}
