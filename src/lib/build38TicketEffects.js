import { PARTY_FACTIONS } from '../data/partyFactions.js';
import { BUILD38_IDEOLOGY_GROUP_IDS, BUILD38_TICKET_PROFILES } from '../data/build38TicketProfiles.js';

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const validFaction = (party, factionId) => (PARTY_FACTIONS[party] || []).some((item) => item.id === factionId);

function unavailable(reason, extra = {}) {
  return { status: 'unavailable', reason, factionOverrides: {}, factionDeltas: [], groupEffects: [], ...extra };
}

/**
 * Resolve presidential opening faction relationships and VP ticket effects.
 * `factionDeltas` are ordered: president secondary, VP affinity, VP opposition.
 */
/** @param {{candidateId?:string, vpId?:string, party?:string, factionStandings?:Record<string,number|string>, activeVoterGroupIds?:readonly string[]}} [options] */
export function ticketEffects({ candidateId, vpId, party, factionStandings = {}, activeVoterGroupIds = [] } = {}) {
  const currentStandings = factionStandings && typeof factionStandings === 'object' ? factionStandings : {};
  const president = BUILD38_TICKET_PROFILES[candidateId];
  if (!PARTY_FACTIONS[party]) return unavailable(`faction-roster-unavailable-for-party:${party || 'unknown'}`);
  if (!president) return unavailable(`presidential-profile-missing:${candidateId || 'unknown'}`);
  if (president.party !== party) return unavailable(`presidential-party-mismatch:${candidateId}`);
  if (president.status !== 'ready' || !validFaction(party, president.primaryFactionId) || !validFaction(party, president.secondaryFactionId)) {
    return unavailable(president.reason || `presidential-faction-mapping-invalid:${candidateId}`);
  }

  let vp = null;
  if (vpId) {
    vp = BUILD38_TICKET_PROFILES[vpId];
    if (!vp) return unavailable(`vp-profile-missing:${vpId}`);
    if (vp.party !== party) return unavailable(`vp-party-mismatch:${vpId}`);
    if (vp.status !== 'ready' || !validFaction(party, vp.vpBoostFactionId) || !validFaction(party, vp.vpPenaltyFactionId)) {
      return unavailable(vp.reason || `vp-faction-mapping-invalid:${vpId}`);
    }
  }

  const standings = Object.fromEntries((PARTY_FACTIONS[party] || []).map(({ id }) => [
    id,
    clamp(currentStandings[id] != null && currentStandings[id] !== '' && Number.isFinite(Number(currentStandings[id]))
      ? Number(currentStandings[id])
      : 50),
  ]));
  const factionOverrides = { [president.primaryFactionId]: president.primaryApproval };
  standings[president.primaryFactionId] = president.primaryApproval;
  const factionDeltas = [];
  const applyDelta = (factionId, requestedPoints, source) => {
    const before = standings[factionId];
    const after = clamp(before + requestedPoints);
    const approvalPoints = after - before;
    standings[factionId] = after;
    factionDeltas.push({ party, factionId, approvalPoints, source });
  };

  applyDelta(president.secondaryFactionId, -10, 'president-secondary');
  if (vp) {
    applyDelta(vp.vpBoostFactionId, 10, 'vp-affinity');
    applyDelta(vp.vpPenaltyFactionId, -10, 'vp-opposition');
  }

  const activeGroups = new Set(Array.isArray(activeVoterGroupIds) ? activeVoterGroupIds : []);
  const groupEffects = vp && activeGroups.has(vp.vpGroupId) && BUILD38_IDEOLOGY_GROUP_IDS.includes(vp.vpGroupId)
    ? [{ party, groupId: vp.vpGroupId, sharePoints: 2 }]
    : [];

  return { status: 'ready', factionOverrides, factionDeltas, groupEffects };
}
