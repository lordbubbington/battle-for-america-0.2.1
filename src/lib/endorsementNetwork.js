import { ENDORSER_ROSTER } from '@/data/endorserRoster';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export function endorserPolicyFit(group, stances = {}) {
  const positions = Object.entries(group?.positionByIssue || {});
  if (!positions.length) return 0.5;
  const fit = positions.reduce((sum, [issueId, preferred]) => {
    const stance = Number.isFinite(Number(stances[issueId])) ? Number(stances[issueId]) : 1;
    return sum + 1 - Math.abs(preferred - stance) / 2;
  }, 0);
  return clamp(fit / positions.length, 0, 1);
}

function relationshipFromCampaign(group, stances, factionStandings) {
  const standing = clamp(factionStandings[group.factionId], 0, 100);
  const fit = endorserPolicyFit(group, stances);
  return clamp(50 + (standing - 50) * 0.35 + (fit - 0.5) * 16, 0, 100);
}

export function initialEndorserRelationships({ party, stances = {}, factionStandings = {} }) {
  return Object.fromEntries(ENDORSER_ROSTER
    .filter((group) => group.party === party)
    .map((group) => [group.id, relationshipFromCampaign(group, stances, factionStandings)]));
}

export function updateEndorserPolicyRelationships({
  party,
  issueId,
  oldStance,
  newStance,
  relationships = {},
  memories = {},
  week = 0,
}) {
  const nextRelationships = { ...relationships };
  const nextMemories = { ...memories };
  for (const group of ENDORSER_ROSTER) {
    const preferred = group.party === party ? group.positionByIssue?.[issueId] : undefined;
    if (!Number.isFinite(preferred)) continue;
    const oldFit = 1 - Math.abs(preferred - Number(oldStance ?? 1)) / 2;
    const newFit = 1 - Math.abs(preferred - Number(newStance)) / 2;
    const change = Math.round((newFit - oldFit) * 12 * 10) / 10;
    if (!change) continue;
    nextRelationships[group.id] = clamp(Number(nextRelationships[group.id] ?? 50) + change, 0, 100);
    nextMemories[group.id] = [...(nextMemories[group.id] || []), {
      week,
      issueId,
      stance: newStance,
      reaction: change > 0 ? 'approval' : 'concern',
      relationshipChange: change,
    }].slice(-6);
  }
  return { relationships: nextRelationships, memories: nextMemories };
}

export function endorsementBenefitValues(group, states, week) {
  const turnoutByState = {};
  if (group.level === 'state' && group.state) {
    turnoutByState[group.state] = 3;
  } else if (group.level === 'national' || group.level === 'candidate') {
    (states || []).forEach((state) => { turnoutByState[state.abbr] = 1; });
  }
  return {
    turnoutByState,
    persuasion: group.level === 'state' ? 1 : 0,
    momentum: 0.5,
    moneyM: group.type === 'donor' ? 2 : 1,
    adExpiryWeek: Number(week) + 4,
  };
}

export function endorserFactionGroupId(group) {
  return group?.demographicGroupId || null;
}
