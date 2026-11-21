import { ALL_CANDIDATES } from '@/data/candidates';
import { STATE_LIST } from '@/data/states';
import { ISSUES } from '@/data/platform';
import { FACTION_MILESTONES } from '@/data/factionMilestones';
import { FACTION_SETS } from '@/lib/factions';
import { ENDORSER_CANDIDATES, ENDORSER_STATES, validateBuild34EndorserRoster } from '@/data/endorserRoster';
import { validateBuild34FactionContent } from '@/data/partyFactions';
import { STATE_LEGISLATURE_2028, validateBuild34StateLegislatureCatalog } from '@/data/stateLegislature2028';
import { SUPER_PAC_ROSTER } from '@/data/superPacRoster';
import { validateSuperPacRoster } from '@/lib/superPacRules';

const liveEndorserFactionIdsByParty = Object.fromEntries(
  Object.entries(FACTION_SETS).map(([party, factions]) => [party, factions.map(({ id }) => ({ id }))]),
);
const liveFactionIdsByParty = Object.fromEntries(
  Object.entries(FACTION_SETS).map(([party, factions]) => [party, factions.map(({ id }) => id)]),
);
const issueIds = ISSUES.map(({ id }) => id);
const stateIds = STATE_LIST.filter(({ abbr }) => abbr !== 'DC').map(({ abbr }) => abbr);

let cachedValidation = null;

/** Fail early when portable Build 34 catalogs drift from live Build 33 IDs. */
export function validateBuild34RuntimeCatalogs() {
  const factions = validateBuild34FactionContent({
    milestoneCatalog: FACTION_MILESTONES,
    candidates: ALL_CANDIDATES,
  });
  const endorsers = validateBuild34EndorserRoster({
    states: ENDORSER_STATES,
    candidates: ENDORSER_CANDIDATES,
    factionIdsByParty: liveEndorserFactionIdsByParty,
    validIssueIds: issueIds,
  });
  const pacs = validateSuperPacRoster([...SUPER_PAC_ROSTER], {
    validIssueIds: issueIds,
    factionIdsByParty: liveFactionIdsByParty,
  });
  const legislatures = validateBuild34StateLegislatureCatalog({ expectedStateIds: stateIds });
  const errors = [
    ...factions.errors.map((error) => `Faction catalog: ${error}`),
    ...endorsers.errors.map((error) => `Endorser catalog: ${error}`),
    ...pacs.errors.map((error) => `Super PAC catalog: ${error}`),
    ...legislatures.errors.map((error) => `State legislature catalog: ${error}`),
  ];
  if (errors.length) throw new Error(`Build 34 compatibility check failed:\n${errors.join('\n')}`);
  return {
    valid: true,
    candidateCount: ALL_CANDIDATES.length,
    endorserCount: endorsers.counts.total,
    superPacCount: SUPER_PAC_ROSTER.length,
    legislatureStateCount: STATE_LEGISLATURE_2028.length,
    issueCount: issueIds.length,
  };
}

/** New-game simulations call createGame repeatedly; validate immutable content once. */
export function ensureBuild34RuntimeCatalogs() {
  if (!cachedValidation) cachedValidation = validateBuild34RuntimeCatalogs();
  return cachedValidation;
}
