import React, { useState } from 'react';
import { clockLabel } from '@/data/pollClose';
import { PARTY_COLOR } from '@/lib/downballot';
import { MARGIN_SCALE } from '@/lib/marginColors';

// Every race the desk has called, newest first.
export default function NightCalls({ feed }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = feed.find((call) => call.id === selectedId);
  return (
    <div className="panel p-3">
      <p className="label-xs">Just called</p>
      {feed.length === 0 ? (
        <p className="mt-1 text-[11px] font-semibold text-slate-500">Waiting on the first returns…</p>
      ) : (
        <div className="mt-1.5 max-h-64 space-y-1 overflow-y-auto pr-1">
          {feed.map((call) => (
            <button key={call.id} type="button" aria-expanded={selectedId === call.id}
              onClick={() => setSelectedId((current) => current === call.id ? null : call.id)}
              className="flex w-full animate-pop-in items-center justify-between gap-2 rounded-md bg-white/5 px-2 py-[3px] text-left hover:bg-white/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary">
              <span className="min-w-0 truncate text-[11.5px] font-bold text-slate-200">{call.name}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="num text-[10px] font-extrabold uppercase" style={{ color: call.color || MARGIN_SCALE[call.party]?.dark || PARTY_COLOR[call.party] }}>{call.party}</span>
                <span className="num text-[10px] font-bold text-slate-500">{clockLabel(call.t)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className="mt-2 rounded-md border border-white/10 bg-black/20 p-2 text-[10.5px] leading-relaxed text-slate-300" aria-live="polite">
          <p><strong className="text-white">{selected.name}:</strong> {selected.pct.toFixed(0)}% counted when called.</p>
          {selected.kind === 'legislature' && selected.raceLevel === 'chamber' ? (
            selected.party === 'nonpartisan' ? (
              <p className="mt-1">The nonpartisan {selected.chamber} contest has returned enough ballots to close. {selected.seatsUp} seats were up; candidate labels remain nonpartisan.</p>
            ) : (
              <p className="mt-1">The {selected.chamber} chamber was called under the same state generic-ballot margin used for each seat up. {selected.seatsUp} seats were awarded to {selected.party.toUpperCase()}; {selected.seatsOut} carried seats remain from the 2026 baseline. Projected chamber total: {selected.finalSeats?.dem || 0} D, {selected.finalSeats?.rep || 0} R{selected.finalSeats?.unallocated ? `, ${selected.finalSeats.unallocated} unresolved` : ''}.</p>
            )
          ) : selected.kind === 'house' && selected.raceLevel === 'district' ? (
            <p className="mt-1">{selected.state}: this House district was called under the margin and reporting threshold (at least {selected.rule.at}% reported for this tier). {selected.party.toUpperCase()} led by {selected.liveMargin.toFixed(1)} points when called; projected final margin {selected.party.toUpperCase()} +{Math.abs(selected.finalMargin).toFixed(1)}.</p>
          ) : selected.kind === 'house' && selected.raceLevel === 'list-seats' ? (
            <p className="mt-1">The {selected.state} MMP party vote was safe enough to allocate its compensatory list seats. Final list allocation: {Object.entries(selected.listSeats || {}).map(([party, seats]) => `${seats} ${party.toUpperCase()}`).join(' · ')}.</p>
          ) : selected.kind === 'house' && selected.raceLevel === 'state-allocation' ? (
            <p className="mt-1">The {selected.state} state party vote was called under the game’s reporting threshold (at least {selected.rule.at}% reported for this tier). Final allocation: {selected.demSeats} D, {selected.repSeats} R, {selected.libSeats || 0} L, {selected.grnSeats || 0} G.</p>
          ) : (
            <p className="mt-1">{selected.party.toUpperCase()} led by {selected.liveMargin.toFixed(1)} points at the call. Final simulated margin: {selected.party.toUpperCase()} +{Math.abs(selected.finalMargin).toFixed(1)}. This tier requires at least {selected.rule.at}% reported{selected.rule.lead ? ' and the eventual winner to be leading' : ''}. Remaining ballots settle toward the precomputed result; individual ballots are not modeled.</p>
          )}
        </div>
      )}
    </div>
  );
}
