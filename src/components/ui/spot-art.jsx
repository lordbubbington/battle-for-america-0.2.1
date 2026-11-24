import React from 'react';
import { publicAssetUrl } from '@/lib/publicAssetUrl';

const ASSET_IDS = new Set([
  'agriculture', 'affordability', 'ai-chip', 'award', 'ballot', 'book', 'brain', 'business', 'civic-building',
  'coin', 'communication', 'community', 'computer', 'data', 'difficulty-brutal', 'difficulty-cupcake', 'difficulty-easy', 'difficulty-hard', 'difficulty-medium', 'difficulty-nightmare', 'entertainment', 'globe',
  'corruption', 'data-center', 'district-map', 'economy', 'family', 'governors', 'health', 'house', 'housing', 'iran', 'justice', 'media', 'mystery', 'plant', 'power', 'president', 'ranked-choice', 'rights', 'satellite', 'senate', 'shield',
  'star', 'target', 'tools', 'trade', 'transit', 'water', 'weather', 'week-calendar',
]);

export function SpotGlyph({ symbol, className = 'h-5 w-5', title = undefined }) {
  const assetId = ASSET_IDS.has(symbol) ? symbol : 'star';
  return (
    <img
      src={publicAssetUrl(`/art/ui-icons/${assetId}.png`)}
      alt={title || ''}
      draggable="false"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`${className} shrink-0 object-contain`}
      
    />
  );
}

export default function SpotArt({ symbol, className = 'h-5 w-5', title = undefined }) {
  const isPortrait = typeof symbol === 'string' && (symbol.startsWith('/art/candidates/') || symbol.startsWith('./art/candidates/'));
  const assetId = ASSET_IDS.has(symbol) ? symbol : 'star';
  const src = publicAssetUrl(isPortrait ? symbol : `/art/ui-icons/${assetId}.png`);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center text-primary ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M20 2.8 35 11.4v17.2L20 37.2 5 28.6V11.4L20 2.8Z" stroke="currentColor" strokeOpacity=".38" strokeWidth="1.15" />
        <path d="M8.3 13.3 20 6.6l11.7 6.7v13.4L20 33.4 8.3 26.7V13.3Z" stroke="currentColor" strokeOpacity=".22" strokeWidth=".8" />
        <path d="M4 7.2h4M32 32.8h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
      </svg>
      <img
        src={src}
        alt=""
        draggable="false"
        aria-hidden="true"
        className={isPortrait ? 'relative h-[78%] w-[78%] rounded-full object-contain' : 'relative h-[68%] w-[68%] object-contain'}
        
      />
    </span>
  );
}



