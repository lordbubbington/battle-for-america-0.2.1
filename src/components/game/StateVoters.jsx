import React from 'react';
import { BLOC_BY_ID, stateBlocs } from '@/data/platform';

// Who actually lives in the state, bloc by bloc. These shares are what every
// policy stance and every ad buy is graded against.
export default function StateVoters({ abbr }) {
  const blocs = stateBlocs(abbr);
  const rows = Object.entries(blocs).sort((a, b) => b[1] - a[1]);

  return (
    <div className="border-t border-white/10 pt-1.5">
      <p className="label-xs mb-1">Voter identities</p>
      <div className="space-y-1">
        {rows.map(([id, share]) => (
          <div key={id} className="flex items-center gap-2">
            <span className="w-[104px] shrink-0 truncate text-[10px] font-bold text-slate-400">
              {BLOC_BY_ID[id]?.label || id}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, share)}%`, backgroundColor: BLOC_BY_ID[id]?.color }}
              />
            </div>
            <span className="num w-8 shrink-0 text-right text-[10px] font-extrabold text-slate-300">
              {share.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}