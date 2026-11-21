import React from 'react';
import { isTossup, ratingFor, TOSSUP_COLOR } from '@/lib/downballot';
import { pollPartiesFor, nationalShares } from '@/lib/polling';

export default function PollPanel({ snap, row, label, ev, showExact, scenarioId = 'standard' }) {
  const shares = row ? row.shares || {} : nationalShares(snap.rows);
  const PARTIES = pollPartiesFor(scenarioId, shares);
  const ranked = Object.entries(shares).sort((a, b) => b[1] - a[1]);
  const leader = row ? row.winner : ranked[0]?.[0];
  const lead = row ? row.lead : (ranked[0]?.[1] || 0) - (ranked[1]?.[1] || 0);

  return (
    <div className="panel-lite mt-2 px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="label-xs">{row ? `${label} polling` : 'National polling'}</p>
        <p className="text-[10.5px] font-bold text-slate-500">
          {ev ? `${ev} EV · ` : ''}
          <span
            className="num"
            style={{
              color: isTossup(lead) ? TOSSUP_COLOR : PARTIES.find((p) => p.id === leader)?.color,
            }}
          >
            {ratingFor(leader, lead, showExact)}
          </span>
        </p>
      </div>

      <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full border border-white/15">
        {PARTIES.map((p) => (
          <div
            key={p.id}
            style={{ width: `${shares[p.id] || 0}%`, backgroundColor: p.color }}
            title={`${p.label} ${(shares[p.id] || 0).toFixed(1)}%`}
          />
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-4">
        {PARTIES.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-1">
            <span className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400">
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: p.color }} />
              {p.label}
            </span>
            <span className="num text-[12px] font-extrabold" style={{ color: p.color }}>
              {(shares[p.id] || 0).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}