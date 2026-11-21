/** Shared, engine-agnostic boundary for Build 34 campaign effects. */

const CHANNEL_BY_TYPE = Object.freeze({
  'national-momentum': 'momentum',
  momentum: 'momentum',
  'opponent-momentum': 'momentum',
  'local-persuasion': 'voter-response',
  'voter-group-fit': 'voter-response',
  'candidate-voter-group-fit': 'voter-response',
  'candidate-group-fit': 'voter-response',
  'issue-reception': 'voter-response',
  credibility: 'reputation',
  turnout: 'turnout',
  'turnout-capacity': 'turnout',
  donation: 'finance',
  cash: 'finance',
  'one-time-donation': 'finance',
  'next-week-donor-income': 'finance',
  'ground-game-level': 'ground-game',
  'ground-game-capacity': 'ground-game',
  'weekly-upkeep': 'ground-game',
  'issue-ad-credit': 'advertising',
  'issue-ad-capacity': 'advertising',
  'super-pac-ad': 'advertising',
  'proxy-stop': 'field-operations',
  'scandal-risk': 'risk',
  'ballot-access': 'ballot-access',
  'ballot-measure-petition-effort': 'ballot-measures',
  'resolve-ballot-measure-through-voter-model': 'ballot-measures',
});

const FORBIDDEN_DIRECT_OUTCOMES = new Set([
  'poll',
  'polling',
  'state-poll',
  'national-poll',
  'state-margin',
  'flat-polling-bonus',
  'seat',
  'seats',
  'house-seats',
  'senate-seats',
  'electoral-votes',
  'award-seats',
]);

/** Check a registered content catalog before its effects reach campaign state. */
export function validateBuild34CommandTypeCoverage(commandTypes = []) {
  if (!Array.isArray(commandTypes)) throw new Error('Build 34 command type coverage expects an array');
  const uniqueTypes = [...new Set(commandTypes)];
  const invalidTypes = uniqueTypes.filter((type) => typeof type !== 'string' || !type.trim());
  const forbiddenTypes = uniqueTypes.filter((type) => typeof type === 'string' && FORBIDDEN_DIRECT_OUTCOMES.has(type));
  const unsupportedTypes = uniqueTypes.filter((type) =>
    typeof type === 'string' && type.trim() && !FORBIDDEN_DIRECT_OUTCOMES.has(type) && !Object.hasOwn(CHANNEL_BY_TYPE, type));
  const routedTypes = uniqueTypes
    .filter((type) => typeof type === 'string' && Object.hasOwn(CHANNEL_BY_TYPE, type))
    .sort()
    .map((type) => ({ type, channel: CHANNEL_BY_TYPE[type] }));
  return {
    valid: invalidTypes.length === 0 && forbiddenTypes.length === 0 && unsupportedTypes.length === 0,
    routedTypes,
    invalidTypes,
    forbiddenTypes,
    unsupportedTypes,
  };
}

function normalizedCommand(command, { campaignId, week, sourceId, sourceType, index }) {
  if (typeof command?.type !== 'string' || !command.type.trim()) {
    throw new Error('Build 34 effect command is missing its string type');
  }
  if (FORBIDDEN_DIRECT_OUTCOMES.has(command.type)) {
    throw new Error(`Build 34 effects cannot directly grant ${command.type}`);
  }
  if (!Object.hasOwn(CHANNEL_BY_TYPE, command.type)) {
    throw new Error(`No Build 34 resolver channel for effect ${command.type}`);
  }
  const channel = CHANNEL_BY_TYPE[command.type];
  const stableSource = command.sourceId || command.sourceEventId || command.source || sourceId || 'unspecified';
  const stableId = command.receiptId || command.adId || command.visitId ||
    `${campaignId}:${week}:${stableSource}:${command.type}:${index}`;
  return {
    ...command,
    campaignId,
    week,
    sourceId: stableSource,
    sourceType: command.sourceType || sourceType,
    receiptId: stableId,
    channel,
  };
}

/**
 * Normalize effects into existing resolver channels and stamp stable receipts.
 * This does not simulate voters, alter campaign state, or execute callbacks;
 * the Build 33 adapter owns those operations and persists receiptIds.
 * @param {{campaignId?: string, week?: number, sourceId?: string, sourceType?: string,
 * commands?: any[], proxyVisits?: any[], superPacAggregates?: any[], appliedReceiptIds?: string[]}} [input]
 */
export function build34CampaignEffectBatch({
  campaignId,
  week,
  sourceId,
  sourceType = 'campaign-event',
  commands = [],
  proxyVisits = [],
  superPacAggregates = [],
  appliedReceiptIds = [],
} = {}) {
  if (!campaignId || !Number.isInteger(Number(week)) || Number(week) < 1) {
    throw new Error('Build 34 effect batch needs campaignId and positive integer week');
  }
  const needsBatchSource = (commands || []).some((command) =>
    !command?.sourceId && !command?.sourceEventId && !command?.source && !command?.receiptId && !command?.adId && !command?.visitId);
  if (needsBatchSource && !sourceId) {
    throw new Error('Effects without their own stable source ID need a unique batch sourceId');
  }
  const inputs = [
    ...(commands || []).map((command, index) => ({ command, sourceType, sourceId, index })),
    ...(proxyVisits || []).map((visit, index) => ({
      command: { type: 'proxy-stop', visit, visitId: visit.visitId },
      sourceType: 'proxy-visit',
      sourceId: visit.proxyId,
      index,
    })),
    ...(superPacAggregates || []).map((aggregate, index) => ({
      command: { type: 'super-pac-ad', aggregate, receiptId: aggregate.effectReceiptId || aggregate.placementId },
      sourceType: 'super-pac-ad',
      sourceId: aggregate.pacId,
      index,
    })),
  ];
  const alreadyApplied = new Set(appliedReceiptIds);
  const batchReceiptIds = new Set();
  const routed = [];
  const duplicates = [];
  for (const input of inputs) {
    const result = normalizedCommand(input.command, {
      campaignId,
      week,
      sourceId: input.sourceId,
      sourceType: input.sourceType,
      index: input.index,
    });
    if (batchReceiptIds.has(result.receiptId)) {
      throw new Error(`Duplicate effect receipt ID within one Build 34 batch: ${result.receiptId}`);
    }
    batchReceiptIds.add(result.receiptId);
    if (alreadyApplied.has(result.receiptId)) {
      duplicates.push(result.receiptId);
      continue;
    }
    routed.push(result);
  }
  const byChannel = {};
  for (const command of routed) {
    (byChannel[command.channel] ||= []).push(command);
  }
  return {
    campaignId,
    week,
    commands: routed,
    byChannel,
    appliedReceiptIds: [...alreadyApplied],
    receiptIdsToApply: routed.map((command) => command.receiptId),
    skippedDuplicateReceiptIds: duplicates,
  };
}

/** Route the recurring background activity from a saved weekly receipt. */
export function routeBuild34WeeklyBackground(weeklyReceipt, appliedReceiptIds = []) {
  if (!weeklyReceipt?.campaignId || !weeklyReceipt?.week) {
    throw new Error('A saved Build 34 weekly receipt is required');
  }
  const superPac = weeklyReceipt.superPac;
  const previouslyApplied = superPac?.effectsAlreadyApplied
    ? (superPac.aggregates || []).map((row) => row.effectReceiptId || row.placementId)
    : [];
  return build34CampaignEffectBatch({
    campaignId: weeklyReceipt.campaignId,
    week: weeklyReceipt.week,
    sourceId: weeklyReceipt.receiptKey,
    sourceType: 'weekly-background',
    commands: weeklyReceipt.backgroundEndorsements?.effectCommands || [],
    proxyVisits: weeklyReceipt.proxyVisits || [],
    superPacAggregates: superPac?.aggregates || [],
    appliedReceiptIds: [...new Set([...appliedReceiptIds, ...previouslyApplied])],
  });
}

/**
 * Record one routed effect only after its owning game resolver succeeds.
 * @param {{effectBatch?: ReturnType<typeof build34CampaignEffectBatch>, receiptId?: string, appliedReceiptIds?: string[]}} [input]
 */
export function recordBuild34EffectApplied({
  effectBatch,
  receiptId,
  appliedReceiptIds = effectBatch?.appliedReceiptIds || [],
} = {}) {
  if (!effectBatch || !receiptId) throw new Error('Recording an applied effect needs a batch and receipt ID');
  const applied = new Set(appliedReceiptIds);
  if (applied.has(receiptId)) {
    return {
      appliedReceiptIds: [...applied],
      pendingReceiptIds: (effectBatch.receiptIdsToApply || []).filter((id) => !applied.has(id)),
      recorded: false,
    };
  }
  if (!(effectBatch.receiptIdsToApply || []).includes(receiptId)) {
    throw new Error(`Receipt ${receiptId} is not pending in this Build 34 effect batch`);
  }
  applied.add(receiptId);
  return {
    appliedReceiptIds: [...applied],
    pendingReceiptIds: (effectBatch.receiptIdsToApply || []).filter((id) => !applied.has(id)),
    recorded: true,
  };
}

/** Build the route manifest used by the Build 33 integration adapter. */
export function build34ResolverManifest() {
  return {
    channels: [...new Set(Object.values(CHANNEL_BY_TYPE))].sort(),
    commandTypes: Object.keys(CHANNEL_BY_TYPE).sort(),
    forbiddenDirectOutcomes: [...FORBIDDEN_DIRECT_OUTCOMES].sort(),
    executionOwner: 'Build 33 engine adapter',
  };
}
