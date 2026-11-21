// The four parties on the ballot, and the national numbers read off the map.
// One list so every bar, legend and readout uses the same colour for a party.

import { scenarioPartyMeta } from '@/lib/build39Scenarios';
import { COLOR_TOKENS } from '@/lib/marginColors';

export const POLL_PARTIES = [
  { id: 'dem', label: 'Democrat', short: 'D', color: COLOR_TOKENS.dem },
  { id: 'rep', label: 'Republican', short: 'R', color: COLOR_TOKENS.rep },
  { id: 'lib', label: 'Libertarian', short: 'L', color: COLOR_TOKENS.lib },
  { id: 'grn', label: 'Green', short: 'G', color: COLOR_TOKENS.grn },
];

export const THIRD_PARTY_COLOR = { lib: COLOR_TOKENS.lib, grn: COLOR_TOKENS.grn, ind: COLOR_TOKENS.independent };
export const THIRD_PARTY_SHORT = { lib: 'L', grn: 'G', ind: 'I' };
export const THIRD_PARTY_NAME = { lib: 'Libertarian', grn: 'Green', ind: 'Independent' };

export function pollPartiesFor(scenarioId, shares) {
  const known = new Map(POLL_PARTIES.map((party) => [party.id, party]));
  for (const id of Object.keys(shares || {})) {
    const meta = scenarioPartyMeta(scenarioId, id);
    if (meta) known.set(id, meta);
  }
  return [...known.values()];
}

export function partyColorOf(id) {
  return POLL_PARTIES.find((p) => p.id === id)?.color || THIRD_PARTY_COLOR[id] || '#9BA7C0';
}

// The national share is the state-by-state one, weighted by electoral votes.
export function nationalShares(rows) {
  const weight = rows.reduce((sum, r) => sum + (r.atLarge ?? r.ev), 0) || 1;
  const out = { dem: 0, rep: 0, lib: 0, grn: 0 };
  rows.forEach((r) => {
    const w = (r.atLarge ?? r.ev) / weight;
    for (const [id, share] of Object.entries(r.shares || {})) out[id] = (out[id] || 0) + Number(share) * w;
  });
  return out;
}

export function environmentLabel(v) {
  return `${v >= 0 ? 'D' : 'R'}+${Math.abs(v).toFixed(1)}`;
}
