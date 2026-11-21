import React from 'react';
import { MAP_IDLE } from '@/lib/gameEngine';
import { ratingFor } from '@/lib/downballot';
import { labelInk } from '@/lib/marginColors';

export default function SplitDistricts({
  districts,
  selected,
  onSelect,
  showExact,
  unreported,
  colorMode = 'margin',
}) {
  const dark = new Set(unreported || []);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="label-xs mr-1">Split votes</span>
      {districts.map((d) => {
        const active = selected === d.id;
        const isDark = dark.has(d.parent);
        const fill = isDark ? MAP_IDLE : colorMode === 'winner' ? d.winnerColor || d.color : d.color;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect && onSelect(d.id)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-extrabold transition-transform hover:-translate-y-[1px]"
            style={{
              backgroundColor: fill,
              border: active ? '2px solid #F7C145' : '1px solid rgba(255,255,255,0.28)',
              color: isDark ? '#D7E2F5' : labelInk(fill),
            }}
          >
            <span style={{ fontFamily: 'var(--font-display)' }}>{d.short}</span>
            <span className="opacity-80">
              {isDark ? '—' : d.shares ? ratingFor(d.winner, d.lead, showExact) : ratingFor(d.margin >= 0 ? 'dem' : 'rep', Math.abs(d.margin), showExact)}
            </span>
          </button>
        );
      })}
    </div>
  );
}