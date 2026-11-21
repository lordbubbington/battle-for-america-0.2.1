// The parties on the ballot, and the national numbers read off the map.
// One list so every bar, legend and readout uses the same colour for a party.

import { scenarioPartyMeta } from '@/lib/build39Scenarios';
import { SCENARIO_PARTIES } from '@/data/build39Scenarios';
import { COLOR_TOKENS } from '@/lib/marginColors';
import { voteUnits } from '@/lib/turnout';

export const POLL_PARTIES = [
  { id: 'dem', label: 'Democrat', short: 'D', color: COLOR_TOKENS.dem },
  { id: 'rep', label: 'Republican', short: 'R', color: COLOR_TOKENS.rep },
  { id: 'lib', label: 'Libertarian', short: 'L', color: COLOR_TOKENS.lib },
  { id: 'grn', label: 'Green', short: 'G', color: COLOR_TOKENS.grn },
];

export const THIRD_PARTY_COLOR = {
  lib: COLOR_TOKENS.lib,
  grn: COLOR_TOKENS.grn,
  ind: COLOR_TOKENS.independent,
  ...Object.fromEntries(Object.entries(SCENARIO_PARTIES).map(([id, meta]) => [id, meta.color])),
};
export const THIRD_PARTY_SHORT = {
  lib: 'L',
  grn: 'G',
  ind: 'I',
  ...Object.fromEntries(Object.entries(SCENARIO_PARTIES).map(([id, meta]) => [id, meta.short])),
};
export const THIRD_PARTY_NAME = {
  lib: 'Libertarian',
  grn: 'Green',
  ind: 'Independent',
  ...Object.fromEntries(Object.entries(SCENARIO_PARTIES).map(([id, meta]) => [id, meta.label])),
};

export function pollPartiesFor(scenarioId, shares) {
  const known = new Map(POLL_PARTIES.map((party) => [party.id, party]));
  for (const id of Object.keys(shares || {})) {
    const meta = scenarioPartyMeta(scenarioId, id) || SCENARIO_PARTIES[id];
    if (meta) known.set(id, meta);
  }
  return [...known.values()];
}

export function partyColorOf(id) {
  return POLL_PARTIES.find((p) => p.id === id)?.color
    || COLOR_TOKENS[id]
    || THIRD_PARTY_COLOR[id]
    || SCENARIO_PARTIES[id]?.color
    || '#9BA7C0';
}

// R09: Accurate national popular vote share — sum actual modeled votes per
// party across states (including DC and split electoral states once), dividing
// by total valid votes. Never weight by electoral votes.
export function nationalShares(rows) {
  const seen = new Set();
  const totals = { dem: 0, rep: 0, lib: 0, grn: 0 };
  (rows || []).forEach((r) => {
    const key = r.abbr || r.state;
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    const shares = r.shares || {};
    const cast = Number.isFinite(r.cast) && r.cast > 0 ? r.cast : voteUnits(key);
    const parties = new Set([...Object.keys(totals), ...Object.keys(shares), ...Object.keys(r.votes || {})]);
    parties.forEach((id) => {
      const v = r.votes && Number.isFinite(r.votes[id])
        ? r.votes[id]
        : (Number(shares[id] || 0) / 100) * cast;
      totals[id] = (totals[id] || 0) + Math.max(0, v);
    });
  });
  const totalVotes = Object.values(totals).reduce((sum, v) => sum + v, 0) || 1;
  return Object.fromEntries(Object.entries(totals).map(([id, v]) => [id, (v / totalVotes) * 100]));
}

export function environmentLabel(v) {
  return `${v >= 0 ? 'D' : 'R'}+${Math.abs(v).toFixed(1)}`;
}
