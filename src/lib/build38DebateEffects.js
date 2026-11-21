import { PARTY_FACTIONS } from '../data/partyFactions.js';
import { BUILD38_DEBATE_CHOICES } from '../data/build38DebateChoices.js';

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

/** Resolve one selected ideological answer to bounded native faction approval changes. */
/** @param {{debateId?:string, questionId?:string, choiceId?:string, party?:string, factionStandings?:Record<string,number|string>}} [options] */
export function debateChoiceEffects({ debateId, questionId, choiceId, party, factionStandings = {} } = {}) {
  const currentStandings = factionStandings && typeof factionStandings === 'object' ? factionStandings : {};
  if (!PARTY_FACTIONS[party]) return { status: 'unavailable', reason: `faction-roster-unavailable-for-party:${party || 'unknown'}`, factionDeltas: [] };
  const choices = BUILD38_DEBATE_CHOICES[debateId]?.[questionId];
  const choice = choices?.find((item) => item.id === choiceId);
  if (!choice) return { status: 'unavailable', reason: 'debate-choice-missing', factionDeltas: [] };

  const result = [];
  for (const { factionId, approvalPoints } of choice.factionDeltasByParty[party] || []) {
    if (!(PARTY_FACTIONS[party] || []).some((item) => item.id === factionId)) {
      return { status: 'unavailable', reason: `faction-mapping-invalid:${party}:${factionId}`, factionDeltas: [] };
    }
    const rawCurrent = currentStandings[factionId];
    const current = rawCurrent != null && rawCurrent !== '' && Number.isFinite(Number(rawCurrent)) ? Number(rawCurrent) : 50;
    const bounded = clamp(clamp(current) + approvalPoints) - clamp(current);
    if (bounded) result.push({ factionId, approvalPoints: bounded });
  }
  return { status: 'ready', factionDeltas: result };
}
