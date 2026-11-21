import React from 'react';
import { STATES } from '@/data/states';
import { pollMargin } from '@/lib/gameEngine';

// Airtime can go up in more than one state at once. The closest races come
// first, because that is where the money usually goes.
export default function AdStatePicker({ game, selected, onToggle, accent }) {
  const rows = STATES.map((s) => ({ ...s, margin: pollMargin(s.abbr, game) })).sort(
    (a, b) => Math.abs(a.margin) - Math.abs(b.margin)
  );

  return (
    <div className="grid max-h-[184px] grid-cols-2 gap-1 overflow-y-auto pr-1">
      {rows.map((s) => {
        const active = selected.includes(s.abbr);
        return (
          <button
            key={s.abbr}
            type="button"
            data-testid={`ad-state-${s.abbr}`}
            onClick={() => onToggle(s.abbr)}
            className="panel-lite flex items-center justify-between gap-1 px-2 py-1 text-left transition-colors hover:bg-white/10"
            style={active ? { borderColor: accent, backgroundColor: `${accent}26` } : undefined}
          >
            <span className="truncate text-[10.5px] font-extrabold text-white">{s.name}</span>
            <span className="num shrink-0 text-[9.5px] font-bold text-slate-400">
              {s.ev}
              {active ? ' ✓' : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}