import { createSeededRandom, weightedPick } from './seededRandom.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export const PROXY_STOP_EFFECT_MULTIPLIER = 0.4;

/** Required real starting surrogates for the major-party campaigns. */
export function startingProxyForParty(party) {
  if (party === 'dem') {
    return { id: 'proxy:barack-obama', personId: 'barack-obama', party, isRealFigure: true, unlockedWeek: 0, availableFromWeek: 0 };
  }
  if (party === 'rep') {
    return { id: 'proxy:donald-trump', personId: 'donald-trump', party, isRealFigure: true, unlockedWeek: 0, availableFromWeek: 0 };
  }
  return null;
}

/** A proxy unlock is valid only when its real political endorser backed this campaign. */
export function unlockProxyFromEndorsement({ endorsement, endorser, party, week, unavailablePersonIds = [] }) {
  const personId = endorser?.personId;
  if (!endorsement || !endorser?.id || !personId || endorser.isRealFigure !== true) return null;
  if (endorsement.endorserId !== endorser.id || !endorsement.candidateId) return null;
  if (endorsement.party && endorsement.party !== party) return null;
  if (unavailablePersonIds.includes(personId)) return null;
  return {
    id: `proxy:${personId}`,
    personId,
    sourceEndorsementId: endorsement.endorserId,
    party,
    isRealFigure: true,
    unlockedWeek: week,
    availableFromWeek: Number(week) + 1,
  };
}

function targetWeight(proxy, state, sameWeekStateVisits, priorStateVisits) {
  const margin = Math.abs(Number(state.marginToTarget) || 0);
  const competitiveness = clamp(state.competitiveness ?? (1 / (1 + margin / 5)), 0, 1);
  const issueFit = clamp(state.issueFit ?? 0.5, 0, 1);
  const geography = Math.max(0, Number(proxy.regionWeights?.[state.region] ?? 1) || 0);
  const localAffinity = Math.max(0, Number(state.proxyAffinity?.[proxy.personId] ?? 1) || 0);
  const weeklyDiversity = 1 / (1 + (sameWeekStateVisits[state.id] || 0) * 2.5);
  const recentVisitDiversity = 1 / (1 + (priorStateVisits[state.id] || 0) * 0.15);
  const closeStateWeight = margin <= 10 ? 2.25 : 1;
  return competitiveness * Math.max(0.1, issueFit) * geography * localAffinity *
    weeklyDiversity * recentVisitDiversity * closeStateWeight;
}

/** Assign one seeded, competitive-state visit per eligible real proxy. */
export function scheduleProxyVisits({
  campaignId,
  week,
  activeProxies = [],
  eligibleStates = [],
  priorStateVisits = {},
  alreadyVisitedProxyIds = [],
  unavailablePersonIds = [],
}) {
  const visits = [];
  const sameWeekStateVisits = {};
  const visited = new Set(alreadyVisitedProxyIds);
  const unavailable = new Set(unavailablePersonIds);
  const scheduledPeople = new Set();
  const proxies = [...activeProxies]
    .sort((a, b) => String(a?.id).localeCompare(String(b?.id)))
    .filter((proxy) => {
      if (!proxy?.personId || proxy.isRealFigure !== true || visited.has(proxy.id) || unavailable.has(proxy.personId)) return false;
      if (scheduledPeople.has(proxy.personId)) return false;
      scheduledPeople.add(proxy.personId);
      return true;
    })
    .filter((proxy) => Number(proxy.availableFromWeek ?? 0) <= Number(week));
  const states = [...eligibleStates].filter((state) => state?.id).sort((a, b) => String(a.id).localeCompare(String(b.id)));

  for (const proxy of proxies) {
    const random = createSeededRandom(`${campaignId}:${week}:proxy:${proxy.id}`);
    const state = weightedPick(
      states,
      (candidate) => targetWeight(proxy, candidate, sameWeekStateVisits, priorStateVisits),
      random,
    );
    if (!state) continue;
    sameWeekStateVisits[state.id] = (sameWeekStateVisits[state.id] || 0) + 1;
    visits.push({
      visitId: `${campaignId}:${week}:${proxy.id}`,
      proxyId: proxy.id,
      personId: proxy.personId,
      party: proxy.party,
      stateId: state.id,
      week,
      effectMultiplier: PROXY_STOP_EFFECT_MULTIPLIER,
      fatigueMultiplier: PROXY_STOP_EFFECT_MULTIPLIER,
      persuasionLanded: random() < 0.1,
      seedKey: `${campaignId}:${week}:proxy:${proxy.id}`,
      reasonTags: [
        Math.abs(Number(state.marginToTarget) || 0) <= 10 ? 'close-state' : 'competitive-map',
        proxy.regionWeights?.[state.region] ? 'regional-fit' : 'receptive-audience',
      ],
    });
  }

  return { visits, sameWeekStateVisits };
}
