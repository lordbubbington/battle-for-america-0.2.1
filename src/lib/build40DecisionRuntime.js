import { NEIGHBORS } from '@/data/neighbors';
import { STATES, STATE_BY_ABBR } from '@/data/states';
import { createSeededRandom } from '@/lib/seededRandom';
import { auditedReceiptEvent, selectionEvidence } from '@/lib/build44ReceiptEvidence';

const islandNeighbors = { AK: 'WA', HI: 'CA' };
const pointBorders = new Set(['AZ:CO', 'CO:AZ', 'NM:UT', 'UT:NM']);

function seeded(game, id, purpose) {
  return createSeededRandom([game.build34CampaignId || game.campaignId, id, purpose].join(':'));
}

export function build40EventId(id) {
  if (typeof id !== 'string') return null;
  return id.replace(/^response-(.+?)-w\d+-.+$/, '$1');
}

export function build40ModeOf(game) {
  if (game.build40?.modeId) return game.build40.modeId;
  const id = game.build39?.scenario?.id;
  if (id && id !== 'standard') return id;
  return game.thirdMode === 'surge' ? 'four-parties' : 'two-parties';
}

function weightedState(random, states) {
  let remaining = random() * states.reduce((sum, state) => sum + state.ev, 0);
  return states.find((state) => (remaining -= state.ev) < 0)?.abbr || states.at(-1)?.abbr || null;
}

export function build40DecisionContext(game, definition, incident, actingParty = game.party) {
  const sourceReceiptId = incident?.id || null;
  const instanceId = [definition.id, actingParty, sourceReceiptId || game.week].join(':');
  const random = seeded(game, instanceId, 'target');
  const namedState = definition.triggerText.match(/(?:^|\n)State target\. ([A-Z][a-z]+(?: [A-Z][a-z]+)?)\s*$/)?.[1];
  const explicitState = STATES.find(({ name }) => name === namedState)?.abbr || null;
  const explicitStates = definition.id === 'water_cuts' ? ['AZ', 'CA', 'NV'] : null;
  const needsRecordedState = /(?:^|\n)State target\. Use/i.test(definition.triggerText);
  const recorded = incident?.stateId || incident?.state;
  const mayEstablishIncident = definition.trigger.kind === 'general-draw';
  const stateId = explicitState || (STATE_BY_ABBR[recorded] ? recorded : null)
    || (needsRecordedState && !mayEstablishIncident ? null : weightedState(random, explicitStates ? STATES.filter(({ abbr }) => explicitStates.includes(abbr)) : STATES));
  if (!stateId && needsRecordedState) return null;
  const neighbors = (NEIGHBORS[stateId] || []).filter((state) => STATE_BY_ABBR[state] && !pointBorders.has(stateId + ':' + state)).slice().sort();
  const neighborId = neighbors[Math.floor(random() * neighbors.length)] || islandNeighbors[stateId] || null;
  return {
    instanceId, actingParty, stateId, neighborId, sourceReceiptId, explicitStates,
    selectionWeek: game.week,
    ...(auditedReceiptEvent(definition.id) ? { evidence: selectionEvidence(incident) } : {}),
    region: STATE_BY_ABBR[stateId]?.region || null,
    groupId: incident?.groupId || incident?.payload?.groupId || null,
    factionId: incident?.factionId || incident?.payload?.factionId || null,
    storyId: incident?.storyId || incident?.payload?.storyId || null,
    recap: incident?.recap || null,
  };
}

function branchesOf(choice) {
  return choice.branches || [];
}

export function build40ChoiceCost(choice) {
  return Math.max(0, ...branchesOf(choice).map(({ effects }) => -effects.reduce((sum, effect) =>
    sum + (effect.kind === 'cash' && effect.target?.side !== 'opponent' && effect.amount < 0 ? effect.amount * (effect.scalable ? 1.2 : 1) : 0), 0)));
}

export function build40ChoiceValue(choice) {
  return branchesOf(choice).reduce((value, branch) => value + branch.probability * branch.effects.reduce((sum, effect) => {
    const side = effect.target?.side === 'opponent' ? -1 : 1;
    if (effect.kind === 'scandal') return sum - side * 5 * (effect.probability ?? effect.risk ?? 1);
    return sum + side * (effect.amount || 0);
  }, 0), 0);
}

export function materializeBuild40Decision(definition, context, funds) {
  const choices = definition.choices.map((choice) => {
    const costM = build40ChoiceCost(choice);
    return {
      id: choice.id, label: choice.label, detail: choice.preview || choice.previewText || null,
      costM, unavailable: funds < costM ? 'Insufficient campaign funds.' : null, build40Score: build40ChoiceValue(choice),
    };
  });
  return {
    id: definition.id, title: definition.title, text: definition.flavor, tone: 'wild',
    kicker: 'Campaign decision', icon: 'news', context, why: context.recap,
    sourceReceiptId: context.sourceReceiptId, choices,
  };
}

export function resolveBuild40Roll(game, context, choice) {
  const random = seeded(game, context.instanceId, choice.id);
  const branches = branchesOf(choice);
  if (!branches.length) return null;
  let threshold = random();
  const branchIndex = branches.findIndex((branch) => (threshold -= branch.probability) < 0);
  const branch = branches[branchIndex] || branches.at(-1);
  const effects = branch.effects.map((effect) => {
    if (!effect.scalable) return effect;
    const roll = random();
    const multiplier = roll < 0.3 ? 1 : roll < 0.65 ? 0.8 : 1.2;
    const amount = effect.amount * multiplier;
    return { ...effect, amount: Math.round(amount * 1000) / 1000 };
  });
  return { effects, branchIndex: Math.max(0, branchIndex), random, randomized: branches.length > 1 };
}

export function build40EffectStates(target, context) {
  if (target.scope === 'national') return STATES.map(({ abbr }) => abbr);
  if (target.scope === 'region') return STATES.filter(({ region }) => region === (target.region || context.region)).map(({ abbr }) => abbr);
  if (Array.isArray(target.states)) return [...new Set(target.states)].filter((state) => STATE_BY_ABBR[state]);
  if (context.explicitStates && ['primary-state', 'state-and-house'].includes(target.scope)) return context.explicitStates;
  if (target.stateId && STATE_BY_ABBR[target.stateId]) return [target.stateId];
  if (!STATE_BY_ABBR[context.stateId]) return [];
  const expand = target.scope === 'primary-and-neighbor'
    || (['primary-state', 'state-and-house'].includes(target.scope) && STATE_BY_ABBR[context.stateId].ev < 5);
  return expand && context.neighborId ? [context.stateId, context.neighborId] : [context.stateId];
}

