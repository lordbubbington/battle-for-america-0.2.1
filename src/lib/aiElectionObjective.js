/** Compose planner utility from outcomes calculated by the shared election model. */

export const DEFAULT_MAJOR_PARTY_OBJECTIVE_WEIGHTS = Object.freeze({
  presidential: 0.7,
  congressional: 0.2,
  subnational: 0.1,
  partySystem: 0,
});

export const DEFAULT_MINOR_PARTY_OBJECTIVE_WEIGHTS = Object.freeze({
  presidential: 0.45,
  congressional: 0.1,
  subnational: 0.05,
  partySystem: 0.4,
});

/**
 * Calculate a campaign plan's strategic utility without reimplementing any
 * election forecast or seat allocator. `outcomes` must be produced by the
 * shared forecast using the currently selected House/EC rules.
 *
 * `partySystem` combines the adapter's normalized vote-threshold qualification
 * probability and party-specific seat/elector opportunity for PR/MMP/third
 * party objectives. It is a planner reward only; this function grants no seats.
 * @param {{ party: string, outcomes?: Record<string, number>, weights?: Record<string, number>, isMinorParty?: boolean, activeRuleKey?: string, forecastRuleKey?: string, unmodeledComponents?: string[] }} input
 */
export function campaignObjectiveUtility({
  party,
  outcomes = {},
  weights,
  isMinorParty = false,
  activeRuleKey,
  forecastRuleKey,
  unmodeledComponents = [],
}) {
  if (activeRuleKey && forecastRuleKey !== activeRuleKey) {
    throw new Error(`AI forecast rules mismatch: active=${activeRuleKey}, forecast=${forecastRuleKey || 'missing'}`);
  }
  if (!outcomes || typeof outcomes !== 'object' || Array.isArray(outcomes)) {
    throw new Error('AI campaign objective needs a shared-forecast outcomes object');
  }
  if (!Array.isArray(unmodeledComponents)) throw new Error('Unmodeled AI objective components must be an array');
  const selectedWeights = weights || (isMinorParty
    ? DEFAULT_MINOR_PARTY_OBJECTIVE_WEIGHTS
    : DEFAULT_MAJOR_PARTY_OBJECTIVE_WEIGHTS);
  if (!selectedWeights || typeof selectedWeights !== 'object' || Array.isArray(selectedWeights)) {
    throw new Error('AI campaign objective weights must be a component-weight object');
  }
  const explicitlyUnmodeled = new Set(unmodeledComponents);
  const terms = {
    presidential: outcomes.presidentialWinProbability,
    congressional: outcomes.congressionalOutcomeValue,
    subnational: outcomes.subnationalOutcomeValue,
    partySystem: outcomes.partySystemOpportunityValue,
  };
  const unsupportedWeights = Object.keys(selectedWeights).filter((key) => !Object.hasOwn(terms, key));
  if (unsupportedWeights.length) {
    throw new Error(`Unknown AI campaign objective weights: ${unsupportedWeights.join(', ')}`);
  }
  const unsupportedOmissions = [...explicitlyUnmodeled].filter((key) => !Object.hasOwn(terms, key));
  if (unsupportedOmissions.length) {
    throw new Error(`Unknown unmodeled AI objective component: ${unsupportedOmissions.join(', ')}`);
  }
  let weighted = 0;
  let totalWeight = 0;
  const components = {};
  for (const [key, value] of Object.entries(terms)) {
    const rawWeight = Object.hasOwn(selectedWeights, key) ? selectedWeights[key] : undefined;
    if (rawWeight !== undefined && (typeof rawWeight !== 'number' || !Number.isFinite(rawWeight) || rawWeight < 0)) {
      throw new Error(`AI campaign objective weight for ${key} must be a finite nonnegative number`);
    }
    const weight = rawWeight ?? 0;
    if (weight === 0) continue;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      if (explicitlyUnmodeled.has(key)) continue;
      throw new Error(`AI shared forecast is missing numeric ${key} outcome; mark it unmodeled explicitly only when the scenario truly lacks it`);
    }
    if (value < 0 || value > 1) throw new Error(`AI shared forecast ${key} outcome must be normalized from 0 to 1`);
    const normalized = value;
    components[key] = normalized;
    weighted += normalized * weight;
    totalWeight += weight;
  }
  if (totalWeight <= 0) throw new Error('AI campaign objective has no modeled component with positive weight');
  return {
    party,
    utility: weighted / totalWeight,
    components,
    weights: selectedWeights,
    unmodeledComponents: [...explicitlyUnmodeled],
    ruleKey: forecastRuleKey || activeRuleKey || null,
  };
}

/** Difference of two same-ruleset forecasts, in normalized objective points. */
export function marginalCampaignObjective(before, after) {
  if (!before?.ruleKey || !after?.ruleKey) {
    throw new Error('Cannot compare campaign objectives without rule-tagged forecasts');
  }
  if (before.ruleKey !== after.ruleKey) {
    throw new Error(`Cannot compare forecasts from different rules: ${before.ruleKey} vs ${after.ruleKey}`);
  }
  if (typeof before.utility !== 'number' || !Number.isFinite(before.utility) ||
      typeof after.utility !== 'number' || !Number.isFinite(after.utility)) {
    throw new Error('Cannot compare campaign objectives without finite numeric utility');
  }
  return after.utility - before.utility;
}

const quantile = (values, fraction) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
};

/**
 * Nick Bronze projection summary from forecast samples.
 * @param {{ samples?: { ruleKey: string, seatsByParty: Record<string, number> }[], partyId?: string, totalSeats?: number, activeRuleKey?: string | null }} [input]
 */
export function summarizeControlForecast({ samples = [], partyId, totalSeats, activeRuleKey = null } = {}) {
  const seatTotal = Number(totalSeats);
  if (!partyId || !Number.isInteger(seatTotal) || seatTotal < 1) {
    throw new Error('Control forecast needs a party ID and chamber seat count');
  }
  if (!Array.isArray(samples) || samples.length === 0) throw new Error('Control forecast has no seat-count samples');
  const ruleKey = activeRuleKey || samples[0]?.ruleKey;
  if (!ruleKey) throw new Error('Control forecast samples must identify the active election rule set');
  const seatCounts = samples.map((sample, index) => {
    if (!sample || typeof sample !== 'object' || sample.ruleKey !== ruleKey) {
      throw new Error(`Control forecast sample ${index + 1} is missing or mismatches rule key ${ruleKey}`);
    }
    const seatsByParty = sample.seatsByParty;
    if (!seatsByParty || typeof seatsByParty !== 'object' || Array.isArray(seatsByParty)) {
      throw new Error(`Control forecast sample ${index + 1} has no party seat allocation`);
    }
    const partyCounts = Object.values(seatsByParty);
    if (!partyCounts.length || partyCounts.some((seats) => !Number.isInteger(seats) || seats < 0) ||
        partyCounts.reduce((sum, seats) => sum + seats, 0) !== seatTotal) {
      throw new Error(`Control forecast sample ${index + 1} does not allocate exactly ${seatTotal} seats`);
    }
    const targetSeats = seatsByParty[partyId];
    if (!Number.isInteger(targetSeats) || targetSeats < 0 || targetSeats > seatTotal) {
      throw new Error(`Control forecast sample ${index + 1} has an invalid ${partyId} seat count`);
    }
    return targetSeats;
  });
  const majority = Math.floor(seatTotal / 2) + 1;
  return {
    kind: 'forecast',
    partyId,
    controlProbability: seatCounts.filter((seats) => seats >= majority).length / seatCounts.length,
    expectedSeats: seatCounts.reduce((sum, seats) => sum + seats, 0) / seatCounts.length,
    seatRange: { low: quantile(seatCounts, 0.1), high: quantile(seatCounts, 0.9) },
    sampleCount: seatCounts.length,
    ruleKey,
  };
}

/**
 * Election Night counts only called races.
 * @param {{ calledRaces?: { id: string, winner: string, seats: number }[], allRaceIds?: string[], partyId?: string, totalSeats?: number }} [input]
 */
export function summarizeElectionNightCalls({ calledRaces = [], allRaceIds = [], partyId, totalSeats } = {}) {
  const seatTotal = Number(totalSeats);
  if (!partyId || !Number.isInteger(seatTotal) || seatTotal < 1) {
    throw new Error('Election Night summary needs a party ID and positive integer chamber size');
  }
  if (!Array.isArray(allRaceIds) || allRaceIds.length === 0 ||
      allRaceIds.some((id) => typeof id !== 'string' || !id.trim()) ||
      new Set(allRaceIds).size !== allRaceIds.length) {
    throw new Error('Election Night summary needs a complete list of unique race IDs');
  }
  if (!Array.isArray(calledRaces)) throw new Error('Election Night calls must be an array');
  const seen = new Set();
  const seatsByWinner = new Map();
  let calledSeatTotal = 0;
  for (const race of calledRaces || []) {
    if (typeof race?.id !== 'string' || !race.id.trim() || seen.has(race.id)) {
      throw new Error(`Missing or duplicate Election Night call: ${race?.id}`);
    }
    if (!allRaceIds.includes(race.id)) throw new Error(`Election Night called unknown race ${race.id}`);
    if (typeof race.winner !== 'string' || !race.winner.trim() || !Number.isInteger(race.seats) || race.seats < 1) {
      throw new Error(`Election Night call ${race.id} needs winner and positive seat count`);
    }
    seen.add(race.id);
    seatsByWinner.set(race.winner, (seatsByWinner.get(race.winner) || 0) + race.seats);
    calledSeatTotal += race.seats;
  }
  if (calledSeatTotal > seatTotal) throw new Error(`Election Night calls exceed the chamber's ${seatTotal} seats`);
  const majority = Math.floor(seatTotal / 2) + 1;
  const calledSeatCounts = Object.fromEntries(seatsByWinner);
  const heldByParty = seatsByWinner.get(partyId) || 0;
  const calledRacesRemaining = Math.max(0, allRaceIds.length - seen.size);
  return {
    kind: 'election-night-count',
    partyId,
    calledSeatCounts,
    calledSeatTotal,
    heldByParty,
    majority,
    calledRacesRemaining,
    controlCalled: heldByParty >= majority ? partyId : null,
    range: null,
    probability: null,
  };
}
