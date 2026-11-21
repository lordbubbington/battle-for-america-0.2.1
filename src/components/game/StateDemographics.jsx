import React from 'react';
import { STATE_DEMOGRAPHICS } from '@/data/demographics';

const BLOCKS = [
  { key: 'ethnic', label: 'Ethnicity' },
  { key: 'religion', label: 'Religion' },
  { key: 'ideology', label: 'Ideology' },
];

function Row({ group, mod }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-[74px] shrink-0 truncate text-[9.5px] font-bold text-slate-400">{group.short}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(1.5, group.share)}%`, backgroundColor: group.color }}
        />
      </div>
      <span className="num w-7 shrink-0 text-right text-[9.5px] font-extrabold text-slate-300">
        {group.share.toFixed(0)}%
      </span>
      {mod ? (
        <span
          className="num w-8 shrink-0 text-right text-[9.5px] font-extrabold"
          style={{ color: mod > 0 ? '#6EE7B7' : '#FDA4AF' }}
        >
          {mod > 0 ? '+' : ''}
          {mod}
        </span>
      ) : null}
    </div>
  );
}

// Who lives in the state, ethnic group by ethnic group, faith by faith — and how
// far each group has been pushed toward or away from you this campaign.
export default function StateDemographics({ abbr, mods }) {
  const demo = STATE_DEMOGRAPHICS[abbr];
  if (!demo) return null;
  return (
    <div className="border-t border-white/10 pt-1.5">
      <p className="label-xs mb-1">
        Voter demographics {mods && Object.keys(mods).length ? '· shifts shown right' : ''}
      </p>
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
        {BLOCKS.map((b) => (
          <div key={b.key} className="space-y-[3px]">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{b.label}</p>
            {demo[b.key].map((g) => (
              <Row key={g.id} group={g} mod={mods ? Math.round(mods[g.id] || 0) : 0} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}