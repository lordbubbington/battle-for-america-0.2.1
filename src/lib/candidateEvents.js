import { BASE_SCENARIO_PARTIES, FAVORITE_BALLOT_ACCESS, REGIONAL_PARTY_STATES, SIX_PARTY_IDS } from '../data/build39Scenarios.js';
import { STATES, STATE_BY_ABBR } from '../data/states.js';
import { createSeededRandom } from './seededRandom.js';

const text = (value) => typeof value === 'string' && value.length > 0;
const list = (value) => Array.isArray(value) ? value : [];
const uniqueStrings = (value) => [...new Set(list(value).filter(text))];
const count = (value) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
const counts = (value) => Object.fromEntries(Object.entries(value && typeof value === 'object' ? value : {})
  .filter(([id]) => text(id)).map(([id, value]) => [id, count(value)]));
const keyOf = ({ candidateId, party, eventId }) => ['candidate-event', candidateId, party, eventId].join(':');
const validEntry = (entry) => entry && text(entry.candidateId) && text(entry.party) && text(entry.eventId);
const entryOf = (entry) => validEntry(entry) ? {
  key: keyOf(entry),
  eventId: entry.eventId, candidateId: entry.candidateId, party: entry.party, week: count(entry.week),
} : null;

function scenarioOf(game) {
  const mode = game?.build40?.modeId;
  return game?.build39?.scenario?.id || (['six-party', 'regional-parties', 'favorite-sons-daughters'].includes(mode) ? mode : 'standard');
}

function ballotStates(game, party) {
  const scenario = scenarioOf(game);
  const parties = scenario === 'six-party' ? SIX_PARTY_IDS
    : scenario === 'regional-parties' ? [...BASE_SCENARIO_PARTIES, ...Object.keys(REGIONAL_PARTY_STATES)]
      : scenario === 'favorite-sons-daughters' ? [...BASE_SCENARIO_PARTIES, ...Object.keys(FAVORITE_BALLOT_ACCESS)]
        : BASE_SCENARIO_PARTIES;
  if (!parties.includes(party) || party === 'ind') return [];
  if (Object.hasOwn(REGIONAL_PARTY_STATES, party)) return REGIONAL_PARTY_STATES[party];
  if (Object.hasOwn(FAVORITE_BALLOT_ACCESS, party)) {
    const { home, neighbors } = FAVORITE_BALLOT_ACCESS[party];
    return [home, ...neighbors];
  }
  return STATES.map(({ abbr }) => abbr);
}

/** Integration supplies active presidential nominees, never the selectable roster. */
export function participatingCandidates(game, nominees = []) {
  const seen = new Set();
  return list(nominees).filter((nominee) => {
    if (!nominee || !text(nominee.candidateId) || !text(nominee.party) || nominee.active === false
      || ['vp', 'vice-president', 'running-mate'].includes(nominee.role)
      || seen.has(nominee.candidateId) || !ballotStates(game, nominee.party).length) return false;
    seen.add(nominee.candidateId);
    return true;
  }).map(({ candidateId, party }) => ({ candidateId, party }));
}

/** Normalize an additive save without mutating it or resetting historical counts. */
export function candidateEventState(saved) {
  const triggeredCounts = counts(saved?.triggeredCounts);
  const resolvedCounts = counts(saved?.resolvedCounts);
  for (const [id, value] of Object.entries(resolvedCounts)) {
    triggeredCounts[id] = Math.max(triggeredCounts[id] || 0, value);
  }
  const resolvedKeys = uniqueStrings(saved?.resolvedKeys);
  const deliveredKeys = [...new Set([...uniqueStrings(saved?.deliveredKeys), ...resolvedKeys])];
  const resolved = new Set(resolvedKeys);
  const seen = new Set();
  const queue = list(saved?.queue).map(entryOf).filter((entry) => {
    if (!entry || resolved.has(entry.key) || resolved.has(keyOf(entry)) || seen.has(keyOf(entry))) return false;
    seen.add(keyOf(entry));
    return true;
  });
  return { version: 1, triggeredCounts, resolvedCounts, queue, deliveredKeys, resolvedKeys };
}

/** Each returned event ID occupies exactly one interval in the normal draw pool. */
export function eligibleCandidateEvents(game, definitions, participants, { actingParty = game?.party, usedIds = [] } = {}) {
  if (game?.finished) return [];
  const state = candidateEventState(game?.candidateEvents);
  const blocked = new Set(usedIds instanceof Set ? usedIds : list(usedIds));
  for (const entry of state.queue) blocked.add(entry.eventId);
  const tickets = participatingCandidates(game, participants).filter(({ party }) => party === actingParty);
  const delivered = new Set([...state.deliveredKeys, ...state.resolvedKeys]);
  const seen = new Set();
  const eligible = [];
  const week = count(game?.week);
  for (const definition of list(definitions)) {
    const trigger = definition?.trigger;
    if (!text(definition?.id) || trigger?.kind !== 'candidate-event' || blocked.has(definition.id) || seen.has(definition.id)) continue;
    const ticket = tickets.find(({ candidateId }) => candidateId === definition.candidateId);
    if (!ticket) continue;
    if (week < count(trigger.minWeek) || (Number.isFinite(trigger.maxWeek) && week > trigger.maxWeek)) continue;
    const scenarios = list(trigger.scenarios);
    if (scenarios.length && !scenarios.includes(scenarioOf(game)) && !scenarios.includes(game?.build40?.modeId)) continue;
    const states = list(trigger.states);
    const ballot = ballotStates(game, ticket.party);
    if (states.length && !states.some((abbr) => STATE_BY_ABBR[abbr] && ballot.includes(abbr))) continue;
    if (delivered.has(keyOf({ ...ticket, eventId: definition.id }))) continue;
    seen.add(definition.id);
    eligible.push({ definition, ...ticket });
  }
  return eligible;
}

/** Append mandatory cards; never consume or replace a regular decision slot. */
export function ensureCandidateGuarantees(game, definitions, participants) {
  const state = candidateEventState(game?.candidateEvents);
  const tickets = participatingCandidates(game, participants);
  state.queue = state.queue.filter((entry) => tickets.some(({ candidateId, party }) => candidateId === entry.candidateId && party === entry.party)
    && list(definitions).some((definition) => definition?.id === entry.eventId && definition.candidateId === entry.candidateId));
  const totalWeeks = Number.isFinite(game?.totalWeeks) && game.totalWeeks > 0 ? Math.floor(game.totalWeeks) : 52;
  const deadline = Math.min(11, totalWeeks - 1);
  const week = count(game?.week);
  if (game?.finished || week < deadline || week >= totalWeeks) return state;
  for (const ticket of tickets) {
    if (state.triggeredCounts[ticket.candidateId] > 0 || state.queue.some((entry) => entry.candidateId === ticket.candidateId)) continue;
    const eligible = eligibleCandidateEvents({ ...game, candidateEvents: state }, definitions, tickets, { actingParty: ticket.party, usedIds: game?.usedEvents || [] })
      .filter(({ candidateId }) => candidateId === ticket.candidateId)
      .sort((a, b) => a.definition.id < b.definition.id ? -1 : a.definition.id > b.definition.id ? 1 : 0);
    if (!eligible.length) continue;
    const random = createSeededRandom(['candidate-guarantee:v1', game?.build34CampaignId || game?.campaignId || '', ticket.candidateId, ticket.party].join(':'));
    const { definition } = eligible[Math.floor(random() * eligible.length)];
    const entry = { eventId: definition.id, ...ticket, week };
    state.queue.push({ key: keyOf(entry), ...entry });
  }
  return state;
}

/** Presentation satisfies the guarantee; pending queue entries remain resumable. */
export function recordCandidateEventPresented(saved, input) {
  const state = candidateEventState(saved);
  const entry = entryOf(input);
  if (!entry || state.deliveredKeys.includes(entry.key) || state.deliveredKeys.includes(keyOf(entry))) return state;
  state.deliveredKeys.push(entry.key);
  state.triggeredCounts[entry.candidateId] = (state.triggeredCounts[entry.candidateId] || 0) + 1;
  return state;
}

/** Integration applies effects only before the first successful resolution. */
export function recordCandidateEventResolved(saved, input) {
  const entry = entryOf(input);
  const state = recordCandidateEventPresented(saved, input);
  if (!entry) return state;
  state.queue = state.queue.filter((queued) => queued.key !== entry.key && keyOf(queued) !== keyOf(entry));
  if (state.resolvedKeys.includes(entry.key) || state.resolvedKeys.includes(keyOf(entry))) return state;
  state.resolvedKeys.push(entry.key);
  state.resolvedCounts[entry.candidateId] = (state.resolvedCounts[entry.candidateId] || 0) + 1;
  return state;
}
