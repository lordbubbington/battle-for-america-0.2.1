import React, { useState } from 'react';
import { UserRound } from 'lucide-react';
import { NONTRADITIONAL_STAFF_BY_ID } from '@/data/nonTraditionalStaffRoster';
import { publicAssetUrl } from '@/lib/publicAssetUrl';

export function staffPortraitPath(portraitId) {
  if (/^traditional-generic-(0[1-9]|1[0-4])$/.test(portraitId || '')) {
    return publicAssetUrl('/art/staff/traditional-generic/' + portraitId + '.png');
  }
  return Object.hasOwn(NONTRADITIONAL_STAFF_BY_ID, portraitId || '')
    ? publicAssetUrl('/art/staff/nontraditional/' + portraitId + '.png')
    : null;
}

export default function StaffPortrait({ portraitId, alt, size = 'card' }) {
  const path = staffPortraitPath(portraitId);
  const [failedPath, setFailedPath] = useState(null);
  if (!path) return null;
  const sizeClass = size === 'compact' ? 'h-7 w-7 rounded-md' : 'h-12 w-12 rounded-lg';
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/15 bg-slate-900 align-middle ${sizeClass}`}>
      {failedPath === path
        ? <UserRound className="h-1/2 w-1/2 text-slate-400" aria-label={alt} role="img" />
        : <img key={path} src={path} alt={alt} className="h-full w-full object-contain"
            style={{ imageRendering: 'pixelated' }} onError={() => setFailedPath(path)} />}
    </span>
  );
}
