import React from 'react';
import { EV_TOTAL, EV_TO_WIN } from '@/data/states';
import { REGIONAL_PARTY_IDS, SCENARIO_PARTIES } from '@/data/build39Scenarios';
import { POLL_PARTIES, partyColorOf } from '@/lib/polling';
import { TOSSUP_COLOR } from '@/lib/marginColors';

// Every party keeps its own colour on the electoral bar, including all 10
// regional parties and any split EVs (R05).
const BASE_ORDER = ['dem', 'rep', 'lib', 'grn', 'ind', ...REGIONAL_PARTY_IDS, 'progressive', 'maga', 'conservation'];
const EXTRA = {
  ind: { label: 'Independent', short: 'I' },
};

function metaOf(party) {
  const found = POLL_PARTIES.find((p) => p.id === party);
  const scenario = SCENARIO_PARTIES[party];
  return {
    name: found?.label || scenario?.label || EXTRA[party]?.label || party,
    short: found?.short || scenario?.short || EXTRA[party]?.short || party.toUpperCase(),
  };
}

export function evSegments(evBy, you, them, accent, oppAccent) {
  const at = (party) => evBy?.[party] || 0;
  const colorOf = (party) => (party === you ? accent : party === them ? oppAccent : partyColorOf(party));
  const allParties = [...new Set([...BASE_ORDER, ...Object.keys(evBy || {})])];
  const middle = allParties.filter((party) => party !== you && party !== them && (at(party) > 0 || ['lib', 'grn', 'ind'].includes(party)));
  return [you, ...middle, them].map((party) => ({
    party,
    ev: at(party),
    color: colorOf(party),
    ...metaOf(party),
  }));
}

// Everyone on the ballot who is not you and not your opponent.
export function otherPartySlices(segments, you, them) {
  return segments.filter((s) => s.party !== you && s.party !== them);
}

export default function EvBar({ evBy, you, them, accent, oppAccent, tossup = 0, className = '' }) {
  const segments = evSegments(evBy, you, them, accent, oppAccent);
  const ordered = [
    segments.find((s) => s.party === you),
    { party: '__tossup', ev: tossup, color: TOSSUP_COLOR, name: 'Tossup', short: 'Tossup' },
    ...otherPartySlices(segments, you, them),
    segments.find((s) => s.party === them),
  ].filter(Boolean);

  return (
    <div className={`relative flex w-full overflow-hidden rounded-full border border-white/15 bg-white/5 ${className}`}>
      {ordered.map((s) =>
        s.ev > 0 ? (
          <div
            key={s.party}
            className="transition-all duration-700"
            style={{
              width: `${(s.ev / EV_TOTAL) * 100}%`,
              backgroundColor: s.color,
              opacity: s.party === '__tossup' ? 0.85 : 1,
            }}
            title={`${s.ev} electoral votes · ${s.name}`}
          />
        ) : null
      )}
      <div className="flex-1" />
      <div
        className="absolute inset-y-0 w-[2px] bg-white/70"
        style={{ left: `${(EV_TO_WIN / EV_TOTAL) * 100}%` }}
      />
    </div>
  );
}