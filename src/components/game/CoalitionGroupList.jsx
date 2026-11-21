import React, { useState } from 'react';

const TAG_COLOR = {
  Strong: '#6EE7B7',
  Pivotal: '#F7C145',
  Leaning: '#9DB8FF',
  Vulnerable: '#FCA5A5',
  Hostile: '#FF8A7A',
};

// Every group is a share of a state's population, so a point of support here is
// only worth the share of the state that lives there.
export default function CoalitionGroupList({ rows, shift }) {
  const [all, setAll] = useState(false);
  const moves = shift?.groups || [];
  const moveOf = (id) => moves.find((m) => m.id === id)?.delta || 0;
  const sorted = rows.slice().sort((a, b) => b.support - a.support);
  const shown = all ? sorted : sorted.slice(0, 7);

  return (
    <div className="mt-2">
      <div className="space-y-1.5">
        {shown.map((g) => {
          const move = moveOf(g.id);
          return (
            <div key={g.id}>
              <div className="flex items-center justify-between gap-1.5 text-[11px] font-bold">
                <span className="flex min-w-0 items-center gap-1">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ backgroundColor: g.color }} />
                  <span className="truncate text-slate-300">{g.label}</span>
                  <span
                    className="shrink-0 text-[8.5px] font-extrabold uppercase tracking-[0.08em]"
                    style={{ color: TAG_COLOR[g.tag] }}
                  >
                    {g.tag}
                  </span>
                </span>
                <span className="flex shrink-0 items-baseline gap-1">
                  {move !== 0 && (
                    <span
                      className="num text-[9.5px] font-extrabold"
                      style={{ color: move > 0 ? '#6EE7B7' : '#FCA5A5' }}
                    >
                      {move > 0 ? '+' : '−'}
                      {Math.abs(move).toFixed(1)}
                    </span>
                  )}
                  <span className="num text-[12px] font-extrabold text-white">{Math.round(g.support)}</span>
                </span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${g.support}%`, backgroundColor: g.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setAll((v) => !v)}
        className="mt-2 w-full rounded-lg border border-white/12 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 hover:bg-white/5"
      >
        {all ? 'Show fewer' : `Show all ${rows.length} groups`}
      </button>

      <p className="mt-2 text-[10px] font-semibold leading-snug text-slate-500">
        A group's swing is worth its share of a state: ten points among voters who are 2% of a state is two tenths of a
        point there.
      </p>
    </div>
  );
}