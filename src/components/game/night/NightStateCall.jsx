import React from 'react';
import { PARTY_COLOR, PARTY_NAME } from '@/lib/downballot';

const partyName = (call, partyLabels) => partyLabels?.[call.party] || PARTY_NAME[call.party] || String(call.party || 'Unknown');

/** Screen-reader friendly emphasis for a confirmed result. */
export default function NightStateCall({ call, partyLabels = {}, reducedMotion = false }) {
  if (!call || call.called !== true) return null;
  const name = call.name || call.abbr || call.state || 'Race';
  const winner = partyName(call, partyLabels);
  const color = call.color || PARTY_COLOR[call.party] || '#9BA7C0';
  const isPresidentialState = call.kind === 'pres';
  const isSplit = isPresidentialState && call.evAwards
    && Object.keys(call.evAwards).filter((party) => call.evAwards[party] > 0).length > 1;
  const allocated = isPresidentialState && call.evAwards
    ? Object.entries(call.evAwards).filter(([, ev]) => ev > 0).map(([party, ev]) => `${partyLabels[party] || PARTY_NAME[party] || party}: ${ev} electors`).join(' · ')
    : null;
  const description = call.kind === 'legislature'
    ? `${call.raceLevel === 'chamber' ? 'Chamber' : 'legislative race'} called`
    : call.kind === 'pres'
      ? 'Presidential state result confirmed'
      : `${call.kind || 'Race'} result confirmed`;

  return (
    <section
      className={`relative overflow-hidden rounded-xl border border-white/15 bg-slate-950/70 p-3 shadow-lg ${reducedMotion ? '' : 'animate-pop-in'}`}
      style={{ borderLeftWidth: 5, borderLeftColor: color }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="night-state-call"
    >
      <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-primary">Confirmed call</p>
      <h3 className="mt-1 font-heading text-lg leading-tight text-white">{name}</h3>
      <p className="mt-1 text-sm font-bold" style={{ color }}>{winner} wins</p>
      {isPresidentialState && Number.isFinite(call.ev) && !isSplit && (
        <p className="mt-1 text-[11px] font-semibold text-slate-200">{call.ev} electoral votes awarded</p>
      )}
      {allocated && <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-200">{allocated}</p>}
      {Number.isFinite(call.pct) && (
        <p className="mt-1 text-[10px] text-slate-400">Called with {Math.round(call.pct)}% counted</p>
      )}
      <span className="sr-only">{description}</span>
    </section>
  );
}

