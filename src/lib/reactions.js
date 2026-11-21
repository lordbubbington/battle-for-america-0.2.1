// One place where a decision is scored: what the coalition did, and how the
// party's own factions took it.
//
// Everything is read off the state the engine returned — the group modifiers it
// already wrote, the money and momentum it already moved — so the panel can
// never disagree with the map.

import { coalitionRows, coalitionSummary, povOf } from '@/lib/coalition';
import { factionMilestoneFor, factionStandings, factionsFor, applyFactionReactions, repairedFactionCrises } from '@/lib/factions';
import { addTurnoutState } from '@/lib/turnout';
import { recordIncident } from '@/lib/incidentLedger';

function applyFactionCrisis(next, milestone) {
  const pov = povOf(next.party);
  next.stateMods = { ...(next.stateMods || {}) };
  next.demographicMods = { ...(next.demographicMods || {}) };
  next.turnout = { ...(next.turnout || {}) };
  (milestone.groupIds || []).forEach((id) => {
    next.demographicMods[id] = (next.demographicMods[id] || 0) - (milestone.groupPenalty || 0) * pov;
  });
  (milestone.states || []).forEach((abbr) => {
    if (milestone.statePenalty) next.stateMods[abbr] = (next.stateMods[abbr] || 0) - milestone.statePenalty * pov;
    if (milestone.turnoutPenalty) addTurnoutState(next, next.party, abbr, -milestone.turnoutPenalty);
  });
  if (milestone.cashPenalty) next.funds = Math.max(0, Math.round(((next.funds || 0) - milestone.cashPenalty) * 10) / 10);
  if (milestone.momentumPenalty) next.momentum = Math.max(0, (next.momentum || 0) - milestone.momentumPenalty);
  return next;
}

export function withReactionSummary(prev, next, context = { type: 'none' }) {
  if (!prev || !next || next === prev) return next;

  const pov = povOf(next.party);
  const before = prev.demographicMods || {};
  const after = next.demographicMods || {};

  const groups = [];
  Object.keys(after).forEach((id) => {
    const delta = Math.round(((after[id] || 0) - (before[id] || 0)) * pov * 10) / 10;
    if (Math.abs(delta) >= 0.05) groups.push({ id, delta });
  });

  const diff = {
    groups: Math.round(groups.reduce((sum, g) => sum + g.delta, 0) * 10) / 10,
    funds: Math.round((next.funds - prev.funds) * 10) / 10,
    momentum: Math.round((next.momentum - prev.momentum) * 10) / 10,
    scandals: (next.scandals?.length || 0) - (prev.scandals?.length || 0),
  };

  const { game, deltas } = applyFactionReactions(next, context, diff);
  let reacted = game;
  const priorStandings = factionStandings(prev);
  const nextStandings = factionStandings(game);
  const fired = new Set(Array.isArray(game.factionMilestones) ? game.factionMilestones : []);
  let crises = { ...(game.factionCrises || {}) };

  factionsFor(game.party).forEach((faction) => {
    const beforeStanding = priorStandings[faction.id] ?? 50;
    const afterStanding = nextStandings[faction.id] ?? 50;
    const threshold = beforeStanding > 0 && afterStanding <= 0 ? 0
      : beforeStanding < 100 && afterStanding >= 100 ? 100
        : null;
    if (threshold == null) return;
    const key = `${game.party}:${faction.id}:${threshold}`;
    if (fired.has(key)) return;
    const milestone = factionMilestoneFor(game.party, faction.id, threshold);
    if (!milestone) return;

    fired.add(key);
    if (threshold === 0) {
      crises[faction.id] = true;
      reacted = applyFactionCrisis({ ...reacted, factionCrises: crises }, milestone);
    }
    reacted = { ...reacted, factionMilestones: [...fired], factionCrises: crises };
    reacted = recordIncident(reacted, { ...reacted }, {
      type: 'faction-milestone',
      party: game.party,
      factionId: faction.id,
      factionLabel: faction.label,
      threshold,
      milestone,
    });
  });

  reacted = { ...reacted, factionCrises: repairedFactionCrises(reacted) };
  const factions = Object.entries(deltas).map(([id, delta]) => ({ id, delta }));

  return {
    ...reacted,
    lastShift: {
      week: reacted.week,
      groups: groups.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 4),
      factions,
      summary: coalitionSummary(coalitionRows(reacted)),
    },
  };
}