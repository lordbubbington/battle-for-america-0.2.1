// The coalition: the voting groups a campaign is actually assembled out of.
//
// Every group carries a baseline — where it starts with each party before the
// nominee touches it — a pull (how badly it wants ideological purity rather than
// moderation), and an axis (-1 progressive … +1 right) that decides which answer
// on an issue it likes.
//
// Support is never stored twice. It is the baseline, plus whatever the nominee's
// own ideology is worth, plus the group modifiers the campaign has piled up in
// `game.demographicMods` — the same numbers that already move the state map
// through `stateGroupShift`. There is one copy of the truth, and the panel reads
// it, so the coalition can never disagree with the map.

import { VOTER_COMPOSITION } from '@/lib/build38Runtime';
import { ideoFor } from '@/data/platform';
import { STATES } from '@/data/states';
import { STATE_DEMOGRAPHICS } from '@/data/demographics';
import { modeledGroupIssueFit, modeledGroupSupport } from '@/lib/syntheticElectorate';
import { factionGroupBonuses } from '@/lib/factions';

const B = (dem, rep, lib, grn) => ({ dem, rep, lib, grn });

export const COALITION_GROUPS = [
  { id: 'black', label: 'Black voters', short: 'Black', axis: -0.6, pull: 0.2, color: '#B07A4E', base: B(85, 12, 6, 10) },
  { id: 'hispanic', label: 'Hispanic voters', short: 'Hispanic', axis: -0.2, pull: 0, color: '#F0A45C', base: B(57, 41, 14, 12) },
  { id: 'asian', label: 'Asian voters', short: 'Asian', axis: 0, pull: 0, color: '#4FBFA8', base: B(60, 38, 8, 10) },
  { id: 'white', label: 'White voters', short: 'White', axis: 0.6, pull: -0.2, color: '#DCD6C8', base: B(42, 57, 10, 4) },
  { id: 'evangelical', label: 'Evangelical voters', short: 'Evangelical', axis: 0.8, pull: 0.6, color: '#C25E5E', base: B(22, 76, 8, 3) },
  { id: 'catholic', label: 'Catholic voters', short: 'Catholic', axis: 0.2, pull: 0, color: '#C9A227', base: B(47, 52, 10, 5) },
  { id: 'irreligious', label: 'Irreligious voters', short: 'Irreligious', axis: -0.8, pull: 0.4, color: '#9AA7B8', base: B(68, 30, 24, 26) },
  { id: 'far left', label: 'Progressive left', short: 'Progressive', axis: -1, pull: 0.9, color: '#3DDC97', base: B(84, 5, 10, 78) },
  { id: 'moderate', label: 'Moderate voters', short: 'Moderate', axis: 0, pull: -0.7, color: '#A0AEC0', base: B(54, 46, 12, 8) },
  { id: 'conservative', label: 'Traditional Republicans', short: 'GOP base', axis: 0.7, pull: 0.3, color: '#DA3621', base: B(10, 84, 26, 3) },
  { id: 'populistright', label: 'MAGA base', short: 'MAGA', axis: 0.9, pull: 0.8, color: '#BB590A', base: B(5, 80, 22, 3) },
  { id: 'libertarian', label: 'Libertarians', short: 'Libertarian', axis: 0.4, pull: 0.1, color: '#C8DB18', base: B(20, 55, 62, 8) },
];

const BUILD38_EXTRA_GROUPS = [
  { id: 'populistleft', label: 'Bernie Bros', short: 'Bernie Bros', axis: -0.8, pull: 0.7, color: '#9427AA', base: B(70, 10, 12, 55) },
  { id: 'religiousleft', label: 'Religious Left', short: 'Religious Left', axis: -0.5, pull: 0.3, color: '#697EDB', base: B(68, 25, 8, 24) },
  { id: 'liberal', label: 'Traditional Democrats', short: 'Traditional Dems', axis: -0.45, pull: 0.25, color: '#5274B8', base: B(79, 18, 10, 20) },
  { id: 'religiousright', label: 'Religious Right', short: 'Religious Right', axis: 0.75, pull: 0.55, color: '#A14858', base: B(22, 75, 10, 3) },
];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const povOf = (party) => (party === 'rep' ? -1 : 1);

// How much of a group's vote a shift is worth nationally, by electoral weight.
export const GROUP_SHARE = (() => {
  const totalEV = STATES.reduce((sum, s) => sum + s.ev, 0) || 1;
  const out = {};
  COALITION_GROUPS.forEach((g) => {
    out[g.id] =
      STATES.reduce((sum, s) => sum + (STATE_DEMOGRAPHICS[s.abbr]?.share?.[g.id] || 0) * s.ev, 0) / totalEV;
  });
  return out;
})();

// +1 is the party's own wing, -1 the middle of the road.
export function purityOf(party, candidateId) {
  const ideo = ideoFor(candidateId);
  return party === 'rep' ? ideo : -ideo;
}

function candidateShift(party, candidateId, group) {
  if (!group.pull) return 0;
  return Math.round(purityOf(party, candidateId) * group.pull * 60) / 10;
}

function tagFor(support, share) {
  if (support >= 58) return 'Strong';
  if (support >= 45) return share >= 4 ? 'Pivotal' : 'Leaning';
  if (support >= 36) return 'Vulnerable';
  return 'Hostile';
}

// Supports a bare subject too — `{ party, candidateId }` — so the setup screen
// can preview a coalition before a campaign exists.
export function coalitionRows(subject) {
  const party = subject?.party || 'dem';
  const pov = povOf(party);
  const mods = subject?.demographicMods || {};
  const eventGroupMods = subject?.build40?.groupEffectsByParty?.[party] || {};
  const factionBonuses = factionGroupBonuses(subject);
  const build38 = subject?.build38?.openingModel;
  const groups = build38 ? [...COALITION_GROUPS, ...BUILD38_EXTRA_GROUPS] : COALITION_GROUPS;
  return groups.map((g) => {
    const share = (build38 ? VOTER_COMPOSITION.nationalShares[g.id] : undefined) ?? GROUP_SHARE[g.id] ?? 0;
    const moved = Math.round(((mods[g.id] || 0) * pov + (factionBonuses[g.id] || 0) + (eventGroupMods[g.id] || 0)) * 10) / 10;
    const modeledDem = modeledGroupSupport(g.id);
    const baseline = modeledDem == null
      ? (g.base[party] ?? g.base.dem)
      : party === 'dem'
        ? modeledDem
        : party === 'rep'
          ? 100 - modeledDem
          : (g.base[party] ?? g.base.dem);
    const groupBonus = (subject?.build38?.groupEffects || []).filter((item) => item.party === party && item.groupId === g.id)
      .reduce((total, item) => total + item.sharePoints, 0);
    const raw = (build38 && g.id === 'moderate' && ['dem','rep'].includes(party) ? 50 : baseline)
      + candidateShift(party, subject?.candidateId, g) + moved + groupBonus;
    const support = Math.round(clamp(raw, 2, 98) * 10) / 10;
    return { ...g, moved, support, share, tag: tagFor(support, share) };
  });
}

export function coalitionSummary(rows) {
  const weight = rows.reduce((sum, g) => sum + g.share, 0) || 1;
  const average = rows.reduce((sum, g) => sum + g.support * g.share, 0) / weight;
  return {
    withYou: rows.filter((g) => g.support >= 50).length,
    total: rows.length,
    average: Math.round(average * 10) / 10,
  };
}

// Which answer on an issue a group wants: its axis is its natural home, so the
// far left wants the first answer and the religious right the last.
export function groupPreferredStance(group) {
  return clamp(Math.round(group.axis + 1), 0, 2);
}

// What one stance is worth to every group, in coalition points, written from
// YOUR side. Pleasing some groups while annoying others is the whole trade.
export function stanceGroupShifts(rows, stance, issueId = null, fromStance = 1) {
  const out = {};
  rows.forEach((g) => {
    const nextFit = issueId ? modeledGroupIssueFit(g.id, issueId, stance) : null;
    const previousFit = issueId ? modeledGroupIssueFit(g.id, issueId, fromStance) : null;
    const delta = Number.isFinite(nextFit) && Number.isFinite(previousFit)
      ? Math.round((nextFit - previousFit) * 30 * 10) / 10
      : Math.round(((1 - Math.abs(groupPreferredStance(g) - stance) / 2) - 0.55) * 24) / 10;
    if (delta) out[g.id] = delta;
  });
  return out;
}

// A rally fires up the people already with you and grates on the ones who are not.
export function rallyGroupShifts(rows) {
  const out = {};
  rows.forEach((g) => {
    out[g.id] = g.support >= 55 ? 0.5 : g.support <= 42 ? -0.22 : 0.14;
  });
  return out;
}

// A town hall is aimed at the persuadable middle of the coalition, and it lands
// there or it does not.
export function townhallGroupShifts(rows, good) {
  const out = {};
  rows.forEach((g) => {
    const middle = g.support >= 42 && g.support <= 60;
    out[g.id] = good ? (middle ? 0.7 : 0.15) : middle ? -0.7 : -0.15;
  });
  return out;
}

export function volunteerGroupShifts(rows) {
  const out = {};
  rows.forEach((g) => {
    if (g.support >= 55) out[g.id] = 0.3;
  });
  return out;
}
