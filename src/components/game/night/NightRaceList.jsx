import React from 'react';
import { PARTY_COLOR } from '@/lib/downballot';

// The count itself, race by race: how much is in, and who it is helping.
export default function NightRaceList({ kind, night }) {
  const list =
    kind === 'pres'
      ? night.rows
      : kind === 'senate'
        ? night.senate.races
        : kind === 'gov'
          ? night.gov.races
          : kind === 'legislatures'
            ? night.stateLegislatures.races
            : night.house.rule === 'pr' ? night.house.states : night.house.districts;

  const rows = list
    .filter((r) => r.reporting)
    .sort((a, b) => Math.abs(a.lead ?? a.margin) - Math.abs(b.lead ?? b.margin));

  return (
    <div className="panel p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="label-xs">The count</p>
        <p className="text-[10px] font-bold text-slate-500">closest first</p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-1 text-[11px] font-semibold text-slate-500">No polls have closed yet.</p>
      ) : (
        <div className="mt-1.5 max-h-[264px] space-y-[3px] overflow-y-auto pr-1">
          {rows.map((r) => {
            const name = r.name || r.abbr || r.state;
            const party = r.called ? r.winner : r.leader;
            const ink = party ? PARTY_COLOR[party] || '#9BA7C0' : '#6B7A99';
            const margin = Math.abs(r.lead ?? r.margin ?? 0);
            return (
              <div key={r.id || r.abbr || r.state} className="flex items-center gap-2">
                <span className="num w-12 shrink-0 text-[9px] font-extrabold text-slate-500">
                  {r.id || r.abbr || r.state}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11.5px] font-bold text-slate-200">{name}</span>
                    <span className="num shrink-0 text-[10.5px] font-extrabold" style={{ color: ink }}>
                      {r.nonpartisan ? `${r.seatsUp} nonpartisan seats` : party ? `${party.toUpperCase()} +${margin.toFixed(1)}` : '—'}
                    </span>
                  </span>
                  <span className="mt-0.5 block h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(1, r.pct)}%`, backgroundColor: ink }}
                    />
                  </span>
                </span>
                <span className="w-9 shrink-0 text-right">
                  {r.called ? (
                    <span className="text-[9px] font-extrabold uppercase tracking-wide text-primary">called</span>
                  ) : (
                    <span className="num text-[9.5px] font-bold text-slate-500">{r.pct.toFixed(0)}%</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
