import { createSeededRandom, weightedPick } from './seededRandom.js';
import { stateIssueAlignment } from '@/data/platform';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export const SUPER_PAC_EFFECT_MULTIPLIER = 0.2;
export const SUPER_PAC_GENERAL_FATIGUE_PER_AD = 1;
export const SUPER_PAC_AGGREGATE_SCHEMA_VERSION = 2;
// Four pressure points at the existing 0.2 multiplier cap one aggregate at
// 0.8 campaign-ad equivalents, even when many placements collapse together.
export const SUPER_PAC_GROUP_PRESSURE_CAP = 4;

/**
 * Preserve the 50 PAC identities while changing only their scenario alignment.
 * Transfer the top ten progressive D PACs to Green and top ten libertarian R
 * PACs to Libertarian in four-party mode.
 */
export function assignSuperPacsForMode(roster = [], mode = 'standard', campaignParty = null) {
  if (!Array.isArray(roster)) throw new Error('Super PAC roster must be an array');
  const unique = new Set();
  for (const pac of roster || []) {
    if (!pac?.id || unique.has(pac.id)) throw new Error(`Invalid or duplicate Super PAC id: ${pac?.id}`);
    if (!(pac.issueIds?.length || Object.keys(pac.issueWeights || {}).length)) {
      throw new Error(`Super PAC ${pac.id} has no issue focus`);
    }
    unique.add(pac.id);
  }
  if (unique.size !== 50) throw new Error(`Expected 50 Super PACs, found ${unique.size}`);

  const democrats = roster.filter((pac) => pac.alignment === 'dem')
    .sort((a, b) => (Number(b.progressiveRank) || 0) - (Number(a.progressiveRank) || 0) || a.id.localeCompare(b.id));
  const republicans = roster.filter((pac) => pac.alignment === 'rep')
    .sort((a, b) => (Number(b.libertarianRank) || 0) - (Number(a.libertarianRank) || 0) || a.id.localeCompare(b.id));
  const persuadable = roster.filter((pac) => pac.alignment === 'persuadable')
    .sort((a, b) => a.id.localeCompare(b.id));
  if (democrats.length !== 20 || republicans.length !== 20 || persuadable.length !== 10) {
    throw new Error(`Invalid standard PAC roster: D=${democrats.length}, R=${republicans.length}, persuadable=${persuadable.length}`);
  }
  if (democrats.some((pac) => !Number.isFinite(Number(pac.progressiveRank)))) {
    throw new Error('Every Democratic PAC needs a progressiveRank for four-party allocation');
  }
  if (republicans.some((pac) => !Number.isFinite(Number(pac.libertarianRank)))) {
    throw new Error('Every Republican PAC needs a libertarianRank for four-party allocation');
  }

  const withScenarioFaction = (pac, scenarioAlignment) => {
    const factionParty = scenarioAlignment === 'persuadable' ? campaignParty : scenarioAlignment;
    return {
      ...pac,
      scenarioAlignment,
      scenarioFactionId: pac.factionByParty?.[factionParty] ||
        (factionParty === pac.alignment ? pac.factionId || null : null),
    };
  };
  if (mode !== 'four-party') {
    return roster.map((pac) => withScenarioFaction(pac, pac.alignment));
  }
  const green = democrats.slice(0, 10);
  const libertarians = republicans.slice(0, 10);
  const aligned = [
    ...democrats.slice(10).map((pac) => withScenarioFaction(pac, 'dem')),
    ...republicans.slice(10).map((pac) => withScenarioFaction(pac, 'rep')),
    ...green.map((pac) => withScenarioFaction(pac, 'grn')),
    ...libertarians.map((pac) => withScenarioFaction(pac, 'lib')),
    ...persuadable.map((pac) => withScenarioFaction(pac, 'persuadable')),
  ];
  return aligned.sort((a, b) => a.id.localeCompare(b.id));
}

/** Validate the complete versioned PAC catalog against live issue/faction IDs. */
export function validateSuperPacRoster(roster = [], {
  validIssueIds = [],
  factionIdsByParty = {},
} = {}) {
  const errors = [];
  let assigned;
  try {
    assigned = assignSuperPacsForMode(roster, 'four-party');
  } catch (error) {
    errors.push(error.message);
  }
  const issueIds = new Set(validIssueIds);
  const allowedAskTypes = new Set(['pledge', 'debate-line', 'appointment']);

  for (const pac of roster || []) {
    if (!String(pac?.name || '').trim()) errors.push(`Super PAC ${pac?.id || '(missing ID)'} needs a display name`);
    if (!Number.isFinite(Number(pac.supportThreshold)) || pac.supportThreshold < 0 || pac.supportThreshold > 1) {
      errors.push(`Super PAC ${pac.id} has an invalid candidate-support threshold`);
    }
    if (!Number.isFinite(Number(pac.factionThreshold)) || pac.factionThreshold < 0 || pac.factionThreshold > 100) {
      errors.push(`Super PAC ${pac.id} has an invalid faction threshold`);
    }
    for (const issueId of pac.issueIds || []) {
      if (issueIds.size && !issueIds.has(issueId)) errors.push(`Unknown issue ${issueId} on Super PAC ${pac.id}`);
      if (!(Number(pac.issueWeights?.[issueId]) > 0)) errors.push(`Super PAC ${pac.id} has no positive weight for ${issueId}`);
    }
    for (const [issueId, weight] of Object.entries(pac.issueWeights || {})) {
      if (issueIds.size && !issueIds.has(issueId)) errors.push(`Unknown weighted issue ${issueId} on Super PAC ${pac.id}`);
      if (!Number.isFinite(Number(weight)) || Number(weight) <= 0) errors.push(`Invalid issue weight on Super PAC ${pac.id}/${issueId}`);
    }
    for (const [party, factionId] of Object.entries(pac.factionByParty || {})) {
      const validFactionIds = factionIdsByParty[party];
      if (validFactionIds && !validFactionIds.includes(factionId)) {
        errors.push(`Unknown ${party} faction ${factionId} on Super PAC ${pac.id}`);
      }
    }
    for (const [region, weight] of Object.entries(pac.regionWeights || {})) {
      if (!['midwest', 'northeast', 'south', 'west'].includes(region) || !Number.isFinite(Number(weight)) || Number(weight) < 0) {
        errors.push(`Invalid regional preference on Super PAC ${pac.id}/${region}`);
      }
    }
    if (!Array.isArray(pac.asks) || pac.asks.length === 0) {
      errors.push(`Super PAC ${pac.id} needs at least one request`);
      continue;
    }
    const askIds = new Set();
    for (const ask of pac.asks) {
      if (!ask?.id || askIds.has(ask.id)) errors.push(`Missing or duplicate request ID on Super PAC ${pac.id}`);
      askIds.add(ask?.id);
      if (!allowedAskTypes.has(ask?.type)) errors.push(`Invalid request type on Super PAC ${pac.id}/${ask?.id}`);
      if (issueIds.size && !issueIds.has(ask?.issueId)) errors.push(`Unknown request issue ${ask?.issueId} on Super PAC ${pac.id}`);
      if (!Number.isFinite(Number(ask?.preferredStance)) || ask.preferredStance < 0 || ask.preferredStance > 2) {
        errors.push(`Invalid requested stance on Super PAC ${pac.id}/${ask?.id}`);
      }
      if (!String(ask?.request || '').trim()) errors.push(`Super PAC ${pac.id}/${ask?.id} needs request copy`);
    }
  }

  if (assigned) {
    for (const pac of assigned) {
      const party = pac.scenarioAlignment;
      const validFactionIds = factionIdsByParty[party];
      if (validFactionIds && (!pac.scenarioFactionId || !validFactionIds.includes(pac.scenarioFactionId))) {
        errors.push(`Super PAC ${pac.id} has no valid ${party} faction in ${party} mode`);
      }
    }
  }
  for (const [alignment, field] of [['dem', 'progressiveRank'], ['rep', 'libertarianRank']]) {
    const ranks = (roster || []).filter((pac) => pac.alignment === alignment).map((pac) => Number(pac[field])).sort((a, b) => a - b);
    if (ranks.length && (ranks.length !== 20 || ranks.some((rank, index) => rank !== index + 1))) {
      errors.push(`${alignment} PACs need unique ${field} values from 1 through 20`);
    }
  }
  return { valid: errors.length === 0, errors, total: (roster || []).length };
}

export function superPacAdsThisWeek(weekNumber, totalWeeks) {
  const total = Math.max(1, Math.floor(Number(totalWeeks) || 1));
  const week = clamp(Math.floor(Number(weekNumber) || 1), 1, total);
  if (week === total) return 20;
  if (total <= 2) return 3;
  const progress = (week - 1) / (total - 2);
  return Math.round(3 + 12 * progress);
}

function issueWeight(pac, issueId) {
  const weight = pac.issueWeights?.[issueId];
  return Math.max(0, Number(weight ?? (pac.issueIds?.includes(issueId) ? 1 : 0)) || 0);
}

function targetWeight(pac, issueId, state) {
  const margin = Math.abs(Number(state.marginByParty?.[pac.beneficiaryParty] ?? state.marginToPacPreferredCandidate) || 0);
  const issueFit = clamp(
    stateIssueAlignment(state.id, issueId, pac.stances?.[issueId] ?? pac.preferredStance ?? 1) ??
    state.issueAgreementById?.[issueId] ?? 0.5,
    0,
    1,
  );
  const regionFit = Math.max(0, Number(pac.regionWeights?.[state.region] ?? 1) || 0);
  const competition = 1 / (1 + margin / 7);
  const closeBonus = margin <= 10 ? 2.5 : 1;
  return Math.max(0.02, issueFit) * Math.max(0.02, competition) * closeBonus * regionFit;
}

function targetCandidateForPlacement(pac, adType, state) {
  if (adType === 'pro') return pac.targetCandidateId || pac.candidateId || null;
  const party = pac.beneficiaryParty || pac.scenarioAlignment || pac.alignment;
  const targetParty = state.attackTargetPartyByParty?.[party] || state.opponentPartyByParty?.[party] || null;
  return pac.attackTargetCandidateId
    || pac.targetCandidateByParty?.[party]
    || (targetParty ? state.candidateIdByParty?.[targetParty] : null)
    || null;
}

function round4(value) {
  return Math.round((Number(value) || 0) * 10000) / 10000;
}

function aggregateGroupKey(placement) {
  return JSON.stringify([
    placement.pacId,
    placement.stateId,
    placement.issueId,
    placement.adType,
    placement.targetCandidateId || null,
  ]);
}

function placementQualityWeight(placement, groupIndex) {
  const requestedWeight = Number(placement.qualityWeight);
  if (Number.isFinite(requestedWeight) && requestedWeight > 0) return requestedWeight;
  return 1 / Math.sqrt(groupIndex + 1);
}

/**
 * Group deterministic placement samples by PAC/state/issue/type/target.
 * `meanQuality` is weighted by diminishing attention (1/sqrt(order within the group+1));
 * `totalEffectivePressure` sums quality under those weights and caps each group
 * at four before the existing 0.2 multiplier (at most 0.8 campaign-ad units).
 */
export function aggregateSuperPacPlacements(placements = [], { campaignId = 'campaign', weekNumber = 1 } = {}) {
  const groups = new Map();
  for (const placement of placements || []) {
    if (!placement?.pacId || !placement.stateId || !placement.issueId || !['attack', 'pro'].includes(placement.adType)) continue;
    const key = aggregateGroupKey(placement);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(placement);
  }

  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, group]) => {
    const first = group[0];
    const weightedQuality = group.reduce((sum, item, index) => {
      const quality = clamp(item.quality, 0, 1.5);
      return sum + quality * placementQualityWeight(item, index);
    }, 0);
    const totalWeight = group.reduce((sum, item, index) => sum + placementQualityWeight(item, index), 0);
    const meanQuality = totalWeight > 0 ? weightedQuality / totalWeight : 0;
    const totalEffectivePressure = Math.min(SUPER_PAC_GROUP_PRESSURE_CAP, weightedQuality);
    const fatiguePoints = group.reduce((sum, item) =>
      sum + Math.max(0, Number(item.fatiguePoints ?? SUPER_PAC_GENERAL_FATIGUE_PER_AD) || 0), 0);
    const week = Number(first.week ?? weekNumber) || weekNumber;
    const targetCandidateId = first.targetCandidateId || null;
    const placementId = `${campaignId}:${week}:${first.pacId}:${first.stateId}:${first.issueId}:${first.adType}:${targetCandidateId || 'unresolved-target'}`;
    const recordedEffects = Object.fromEntries(['realizedEffect', 'turnoutPoints']
      .filter((field) => group.every((item) => Number.isFinite(item[field])))
      .map((field) => [field, round4(group.reduce((sum, item) => sum + item[field], 0))]));
    return {
      schemaVersion: SUPER_PAC_AGGREGATE_SCHEMA_VERSION,
      placementId,
      effectReceiptId: placementId,
      pacId: first.pacId,
      week,
      stateId: first.stateId,
      issueId: first.issueId,
      adType: first.adType,
      targetCandidateId,
      placementCount: group.length,
      meanQuality: round4(meanQuality),
      totalEffectivePressure: round4(totalEffectivePressure),
      effectMultiplier: SUPER_PAC_EFFECT_MULTIPLIER,
      fatigueChannel: 'general',
      totalGeneralFatiguePoints: round4(fatiguePoints),
      alignment: first.alignment || first.beneficiaryParty || null,
      beneficiaryParty: first.beneficiaryParty || first.alignment || null,
      factionId: first.factionId || null,
      candidateId: first.candidateId || null,
      ...recordedEffects,
    };
  });
}

/** Aggregate general fatigue once per PAC/state/week before routing. */
export function aggregateSuperPacFatigue(aggregates = []) {
  const byPacState = new Map();
  for (const aggregate of aggregates || []) {
    const key = JSON.stringify([aggregate.pacId, aggregate.stateId, aggregate.week]);
    const current = byPacState.get(key) || {
      pacId: aggregate.pacId,
      stateId: aggregate.stateId,
      week: aggregate.week,
      fatigueChannel: 'general',
      placementCount: 0,
      totalGeneralFatiguePoints: 0,
      effectReceiptIds: [],
    };
    current.placementCount += Number(aggregate.placementCount) || 0;
    current.totalGeneralFatiguePoints += Number(aggregate.totalGeneralFatiguePoints) || 0;
    current.effectReceiptIds.push(aggregate.effectReceiptId || aggregate.placementId);
    byPacState.set(key, current);
  }
  return [...byPacState.values()].sort((a, b) =>
    String(a.pacId).localeCompare(String(b.pacId)) || String(a.stateId).localeCompare(String(b.stateId)))
    .map((item) => ({ ...item, totalGeneralFatiguePoints: round4(item.totalGeneralFatiguePoints) }));
}

/** Deterministic weekly schedule; only the compact grouped rows leave this function. */
export function scheduleSuperPacAggregates({
  campaignId,
  weekNumber,
  totalWeeks,
  pac,
  states = [],
}) {
  if (!campaignId || !pac?.id) throw new Error('Super PAC schedule requires campaignId and a stable pac.id');
  const seedKey = `${campaignId}:${weekNumber}:super-pac:${pac.id}`;
  const random = createSeededRandom(seedKey);
  const count = superPacAdsThisWeek(weekNumber, totalWeeks);
  const issueIds = [...new Set([...(pac.issueIds || []), ...Object.keys(pac.issueWeights || {})])].sort();
  const targetStates = [...states].filter((state) => state?.id).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const used = new Set();
  const placements = [];

  for (let index = 0; index < count; index += 1) {
    const issueId = weightedPick(issueIds, (id) => issueWeight(pac, id), random);
    if (!issueId) break;
    const adType = random() < 0.8 ? 'attack' : 'pro';
    const eligibleStates = targetStates.filter((state) => !used.has(`${state.id}:${adType}`));
    const state = weightedPick(eligibleStates, (candidate) => targetWeight(pac, issueId, candidate), random);
    if (!state) break;
    used.add(`${state.id}:${adType}`);
    const quality = random() < 0.2
      ? 0.15 + random() * 0.3
      : random() > 0.86
        ? 1.05 + random() * 0.35
        : 0.55 + random() * 0.45;
    const alignment = pac.beneficiaryParty || pac.scenarioAlignment || pac.alignment;
    placements.push({
      pacId: pac.id,
      week: weekNumber,
      issueId,
      stateId: state.id,
      adType,
      alignment,
      beneficiaryParty: alignment,
      factionId: pac.scenarioFactionId || pac.factionId || null,
      candidateId: pac.candidateId || null,
      targetCandidateId: targetCandidateForPlacement(pac, adType, state),
      quality,
      placementIndex: index,
      fatiguePoints: Math.max(0, Number(pac.generalFatiguePerAd ?? SUPER_PAC_GENERAL_FATIGUE_PER_AD) || 0),
    });
  }
  const aggregates = aggregateSuperPacPlacements(placements, { campaignId, weekNumber });
  return {
    pacId: pac.id,
    aggregates,
    requestedCount: count,
    scheduledCount: placements.length,
    shortfall: count - placements.length,
    seedKey,
  };
}

/** @deprecated The compatibility name now returns grouped aggregate rows. */
export const scheduleSuperPacAds = scheduleSuperPacAggregates;

/** One compact weekly log receipt plus grouped detail, never the raw draws. */
export function summarizeSuperPacWeek(batch, weekNumber) {
  const aggregates = Array.isArray(batch)
    ? batch
    : (batch?.aggregates || batch?.placements || batch?.ads || []);
  const byAlignment = {};
  const byState = {};
  const byPac = {};
  const byIssue = {};
  let attackAds = 0;
  let proAds = 0;
  let totalPlacements = 0;
  let generalFatiguePoints = 0;
  let aggregateEffectStrength = 0;
  for (const aggregate of aggregates || []) {
    const count = Math.max(0, Number(aggregate.placementCount) || 0);
    totalPlacements += count;
    if (aggregate.adType === 'attack') attackAds += count;
    else proAds += count;
    const alignment = aggregate.beneficiaryParty || aggregate.alignment || 'unknown';
    byAlignment[alignment] = (byAlignment[alignment] || 0) + count;
    byState[aggregate.stateId] = (byState[aggregate.stateId] || 0) + count;
    byPac[aggregate.pacId] = (byPac[aggregate.pacId] || 0) + count;
    byIssue[aggregate.issueId] = (byIssue[aggregate.issueId] || 0) + count;
    generalFatiguePoints += Math.max(0, Number(aggregate.totalGeneralFatiguePoints ?? aggregate.fatiguePoints) || 0);
    aggregateEffectStrength += Math.max(0, Number(aggregate.totalEffectivePressure) || 0) * SUPER_PAC_EFFECT_MULTIPLIER;
  }
  const requestedCount = Array.isArray(batch)
    ? totalPlacements
    : Number(batch?.requestedCount ?? batch?.requestedAds ?? totalPlacements) || 0;
  return {
    schemaVersion: SUPER_PAC_AGGREGATE_SCHEMA_VERSION,
    eventId: `super-pac-week-${weekNumber}`,
    week: weekNumber,
    totalPlacements,
    totalAds: totalPlacements,
    aggregateCount: aggregates.length,
    requestedCount,
    requestedAds: requestedCount,
    shortfall: Array.isArray(batch) ? 0 : (Number(batch?.shortfall) || 0),
    attackAds,
    proAds,
    activePacCount: new Set(aggregates.map((item) => item.pacId)).size,
    stateCount: new Set(aggregates.map((item) => item.stateId)).size,
    issueThemes: Object.keys(byIssue).sort(),
    aggregateEffectStrength: round4(aggregateEffectStrength),
    generalFatiguePoints: round4(generalFatiguePoints),
    adFatiguePoints: 0,
    byAlignment,
    byState,
    byPac,
    byIssue,
  };
}

/** Schedule the active roster and produce one saved, versioned weekly receipt. */
export function resolveSuperPacWeek({ campaignId, weekNumber, totalWeeks, pacs = [], states = [] }) {
  const batches = [...pacs]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((pac) => scheduleSuperPacAggregates({ campaignId, weekNumber, totalWeeks, pac, states }));
  const aggregates = batches.flatMap((batch) => batch.aggregates);
  const requestedCount = batches.reduce((sum, batch) => sum + batch.requestedCount, 0);
  const shortfall = batches.reduce((sum, batch) => sum + batch.shortfall, 0);
  const fatigueAggregates = aggregateSuperPacFatigue(aggregates);
  const digest = summarizeSuperPacWeek({ aggregates, requestedCount, shortfall }, weekNumber);
  const week = {
    schemaVersion: SUPER_PAC_AGGREGATE_SCHEMA_VERSION,
    campaignId,
    week: weekNumber,
    seedVersion: 1,
    pacScheduleSummaries: batches.map((batch) => ({
      pacId: batch.pacId,
      seedKey: batch.seedKey,
      requestedCount: batch.requestedCount,
      scheduledCount: batch.scheduledCount,
      shortfall: batch.shortfall,
    })),
    aggregates,
    fatigueAggregates,
    effectReceiptIds: aggregates.map((item) => item.effectReceiptId),
    digest,
  };
  // The prior router can read grouped rows in memory until it uses aggregates.
  // Serialization, spreading, and history all see only the canonical key.
  return Object.defineProperty(week, 'ads', { value: aggregates, enumerable: false });
}

/** Reduce a numeric campaign-ad result to one fifth for outside-group ads. */
export function scaleSuperPacAdEffect(campaignAdEffect) {
  if (typeof campaignAdEffect === 'number') return campaignAdEffect * SUPER_PAC_EFFECT_MULTIPLIER;
  if (Array.isArray(campaignAdEffect)) return campaignAdEffect.map(scaleSuperPacAdEffect);
  if (campaignAdEffect && typeof campaignAdEffect === 'object') {
    return Object.fromEntries(Object.entries(campaignAdEffect).map(([key, value]) => [
      key,
      scaleSuperPacAdEffect(value),
    ]));
  }
  return campaignAdEffect;
}

function legacyPlacement(ad, index, weekNumber) {
  return {
    pacId: ad.pacId || 'legacy-unknown-pac',
    week: Number(ad.week) || weekNumber,
    stateId: ad.stateId || ad.abbr || 'unknown-state',
    issueId: ad.issueId || 'unknown-issue',
    adType: ad.adType === 'attack' ? 'attack' : 'pro',
    targetCandidateId: ad.targetCandidateId || null,
    alignment: ad.beneficiaryParty || ad.alignment || 'unknown',
    beneficiaryParty: ad.beneficiaryParty || ad.alignment || 'unknown',
    factionId: ad.factionId || null,
    candidateId: ad.candidateId || null,
    quality: Number.isFinite(Number(ad.meanQuality)) ? Number(ad.meanQuality) : Number(ad.quality) || 0,
    qualityWeight: 1,
    placementIndex: index,
    fatiguePoints: Math.max(0, Number(ad.totalGeneralFatiguePoints ?? ad.generalFatigueApplied ?? ad.fatiguePoints) || 0),
    realizedEffect: ad.realizedEffect,
    turnoutPoints: ad.turnoutPoints,
  };
}

function canonicalSavedAggregate(group) {
  const { adId, quality, fatiguePoints, seedKey: _seedKey, ...details } = group;
  const placementId = details.placementId || details.effectReceiptId || adId;
  return {
    ...details,
    schemaVersion: SUPER_PAC_AGGREGATE_SCHEMA_VERSION,
    placementId,
    effectReceiptId: details.effectReceiptId || placementId,
    totalEffectivePressure: details.totalEffectivePressure ?? quality ?? 0,
    totalGeneralFatiguePoints: details.totalGeneralFatiguePoints ?? fatiguePoints ?? 0,
  };
}

/**
 * Convert an already-saved active-week individual-ad receipt to grouped form.
 * Every legacy ad ID is marked applied; the returned receipt has no pending
 * effect commands, so migration cannot replay voter or fatigue effects.
 */
export function convertLegacySuperPacWeekReceipt(receipt, {
  campaignId = receipt?.campaignId || 'legacy-campaign',
  weekNumber = Number(receipt?.week) || 1,
  appliedReceiptIds = receipt?.appliedReceiptIds || [],
} = {}) {
  if (!receipt || typeof receipt !== 'object') throw new Error('A saved PAC weekly receipt is required');
  if (receipt.schemaVersion === SUPER_PAC_AGGREGATE_SCHEMA_VERSION
    && Array.isArray(receipt.aggregates)
    && !Object.prototype.propertyIsEnumerable.call(receipt, 'ads')
    && receipt.effectsAlreadyApplied === true) return receipt;

  const oldAds = receipt.ads || receipt.superPac?.ads || receipt.digest?.ads || [];
  const legacyAds = Array.isArray(oldAds) ? oldAds : [];
  const grouped = Array.isArray(receipt.aggregates) ? receipt.aggregates : receipt.superPac?.aggregates;
  const aggregates = Array.isArray(grouped)
    ? grouped.filter(Boolean).map(canonicalSavedAggregate)
    : aggregateSuperPacPlacements(
      legacyAds.map((ad, index) => legacyPlacement(ad || {}, index, weekNumber)),
      { campaignId, weekNumber },
    );
  const effectReceiptIds = aggregates.map((item) => item.effectReceiptId);
  const alreadyApplied = new Set([
    ...(Array.isArray(appliedReceiptIds) ? appliedReceiptIds : []),
    ...effectReceiptIds,
    ...legacyAds.map((ad) => ad?.adId).filter(Boolean),
  ]);
  const digest = {
    ...summarizeSuperPacWeek({
      aggregates,
      requestedCount: receipt.digest?.requestedCount ?? receipt.digest?.requestedAds,
      shortfall: receipt.digest?.shortfall || 0,
    }, weekNumber),
    ...(receipt.digest || {}),
    schemaVersion: SUPER_PAC_AGGREGATE_SCHEMA_VERSION,
    migratedLegacyReceipt: true,
  };
  delete digest.ads;
  return {
    schemaVersion: SUPER_PAC_AGGREGATE_SCHEMA_VERSION,
    migratedFromSchemaVersion: receipt.schemaVersion || 0,
    campaignId,
    week: weekNumber,
    seedVersion: receipt.seedVersion || 0,
    digest,
    aggregates,
    fatigueAggregates: aggregateSuperPacFatigue(aggregates),
    appliedReceiptIds: [...alreadyApplied].sort(),
    effectReceiptIds,
    effectsAlreadyApplied: true,
    pendingEffectReceiptIds: [],
  };
}
