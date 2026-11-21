import { TRADITIONAL_STAFF_BY_ID, validateTraditionalStaffRoster } from '@/data/traditionalStaffRoster';
import { buildNativeStaffBriefing } from '@/lib/traditionalStaffNativeAdapter';
import {
  appendStaffBriefHistory, applyTraditionalStaffNativePayload, buildStaffDebrief,
  buildStaffBriefing, createStaffAgenda,
  planStaffAgendaEffect, recordStaffAgendaResolution,
} from '@/lib/traditionalStaffRules';
import {
  createNonTraditionalStaffState, planNonTraditionalStaffEffect, planNonTraditionalStaffUpkeep, sampleNonTraditionalSelectionPool,
} from '@/lib/nonTraditionalStaffRules';
import { ruralShare } from '@/data/states';
import { turnoutOf } from '@/lib/turnout';
import { applyNonTraditionalResolverInputs } from '@/lib/nonTraditionalStaffEffects';
import { NONTRADITIONAL_STAFF_BY_ID } from '@/data/nonTraditionalStaffRoster';

const traditionalCatalogErrors = validateTraditionalStaffRoster();
const duplicateStaffIds = Object.keys(TRADITIONAL_STAFF_BY_ID).filter((id) => Object.hasOwn(NONTRADITIONAL_STAFF_BY_ID, id));
if (traditionalCatalogErrors.length || duplicateStaffIds.length) {
  throw new Error('Invalid Build 36 staff catalog: ' + [...traditionalCatalogErrors, ...duplicateStaffIds].join(', '));
}
const LIVE_TRADITIONAL_EFFECTS = ['field', 'base-liaison', 'communications', 'policy', 'social-media', 'media', 'fundraising']
  .map((id) => TRADITIONAL_STAFF_BY_ID[id].effect.id);

export const LIVE_NONTRADITIONAL_EFFECTS = Object.freeze(['etsy-witch', 'asmr-streamer', 'wrestling-promoter', 'astrology-consultant', 'bigfoot-tracker', 'survivalist-prepper', 'carnival-barker', 'haunted-sign-blacksmith']);
const cents = (amount) => Math.round(amount * 100) / 100;
const array = (value) => Array.isArray(value) ? value : [];

export function initialBuild36Staff(campaignId) {
  return createNonTraditionalStaffState(sampleNonTraditionalSelectionPool(campaignId));
}

function nativeStaffEffectsAvailable(game) {
  return game.staffing?.initialSelectionComplete === true &&
    (game.staffNativeEffectsFromWeek == null || game.week >= game.staffNativeEffectsFromWeek);
}

export function build35StaffBriefing(game) {
  return buildNativeStaffBriefing(game, { enabledNativeEffectIds: nativeStaffEffectsAvailable(game) ? LIVE_TRADITIONAL_EFFECTS : [] });
}

const taken = (game, option) => array(game.staffActionReceipts).some((receipt) =>
  receipt.actionId === option.actionId && receipt.targetId === option.targetId);

export function build35AgendaAlternatives(game, briefing = build35StaffBriefing(game)) {
  const agenda = game.staffing.agendaByWeek?.[game.week];
  if (!nativeStaffEffectsAvailable(game) || agenda?.status !== 'unconsumed' || !['volunteers', 'fundraise'].includes(agenda.actionId) ||
      !game.staffing.nonTraditionalActiveIds.includes('astrology-consultant') || taken(game, agenda) ||
      array(game.staffContractEffectReceiptIds).some((id) =>
        id.startsWith(game.build34CampaignId + ':week-' + game.week + ':') && id.includes(':astrology-consultant:'))) return [];
  return (briefing.native?.options || []).filter((option) => option.actionId === agenda.actionId &&
    option.targetId !== agenda.targetId && option.supportedStaffEffectIds?.includes(agenda.effectId) && !taken(game, option))
    .map((option) => ({ id: 'alternative:' + option.optionId, targetName: option.targetName }));
}

export function setBuild35Agenda(game, recommendationId) {
  const briefing = build35StaffBriefing(game);
  const currentAgenda = game.staffing.agendaByWeek?.[game.week];
  const alternatives = build35AgendaAlternatives(game, briefing);
  const alternative = alternatives.find(({ id }) => id === recommendationId);
  const chosenOption = alternative && briefing.native?.options.find((item) => 'alternative:' + item.optionId === alternative.id);
  const recommendation = chosenOption
    ? buildStaffBriefing(game, { legalActionOptions: [chosenOption] }).recommendations.find((item) => item.staffId === currentAgenda.staffId)
    : briefing.recommendations.find(({ id }) => id === recommendationId);
  const actionsTakenThisWeek = Math.max(0, 7 - game.actionsLeft);
  const next = { ...game };
  const reroute = chosenOption && recommendation && applyBuild35Contract(game, next, 'astrology-consultant', {
    actionId: currentAgenda.actionId, receiptType: 'agenda-selection',
    evidence: { agendaUnconsumed: true, originalActionUntaken: true, alternativeActionUntaken: true, actionsCompatible: true,
      agendaId: currentAgenda.recommendationId, alternativeActionId: recommendation.id },
  }, { reassignExistingAgendaBonus: false }).reassignExistingAgendaBonus;
  if (alternative && !reroute) return game;
  const result = createStaffAgenda(recommendation, game.staffing, briefing.native?.options || [], { currentAgenda, actionsTakenThisWeek: reroute ? 0 : actionsTakenThisWeek });
  if (!result.ok) return game;
  return {
    ...game,
    staffContractEffectReceiptIds: next.staffContractEffectReceiptIds,
    staffing: { ...game.staffing, agendaByWeek: { ...game.staffing.agendaByWeek, [game.week]: { ...result.agenda, title: recommendation.title } } },
    staffBriefingRecommendations: briefing.recommendations,
  };
}

/** Call from the native resolver after legality is established, before applying its payload. */
export function applyBuild35Agenda(game, next, target, payload, { existingStaffMultiplier = 1 } = {}) {
  const agenda = game.staffing.agendaByWeek?.[game.week];
  if (!nativeStaffEffectsAvailable(game) || agenda?.status !== 'unconsumed' || agenda.actionId !== target.actionId || agenda.targetId !== target.targetId) return payload;
  const native = build35StaffBriefing(game).native;
  const action = native?.options.find((option) => option.actionId === target.actionId && option.targetId === target.targetId &&
    ['issueId', 'adTypeId', 'adKind', 'storyId', 'spinMode'].every((key) => (option[key] || null) === (target[key] || null)));
  if (!action) return payload;
  const actionReceiptId = `${game.build34CampaignId}:staff-action:${game.week}:${game.incidentSequence || 0}:${(game.weekLog || []).length}`;
  const plan = planStaffAgendaEffect(agenda, action, game.staffing, { legal: true, actionReceiptId });
  if (plan.status !== 'ready') return payload;
  const application = applyTraditionalStaffNativePayload(plan.command, action, payload, { existingStaffMultiplier });
  const resolution = recordStaffAgendaResolution(agenda, { ...action, completed: true }, { actionReceiptId, application });
  if (resolution.status !== 'consumed') return payload;
  next.staffing = { ...game.staffing, agendaByWeek: { ...game.staffing.agendaByWeek, [game.week]: resolution.agenda } };
  return application.payload;
}

export function recordBuild35StaffAction(previous, next, context) {
  if (next === previous) return next;
  const actionId = context.actionId || context.type;
  const targets = context.type === 'ad' ? array(next.lastAds).map((ad) => ad.abbr)
    : context.actionId === 'ops' && context.abbrs ? context.abbrs : [context.leaderId || context.abbr];
  const agenda = next.staffing.agendaByWeek?.[next.week];
  const effectApplied = agenda?.status === 'consumed' && previous.staffing.agendaByWeek?.[previous.week]?.status === 'unconsumed';
  const incidentId = next.incidentLedger?.at(-1)?.id;
  const records = targets.filter(Boolean).map((targetId) => ({
    week: previous.week, actionId, targetId, issueId: context.issueId || null,
    adTypeId: context.adTypeId || null, adKind: context.kind || null, storyId: context.storyId || null, spinMode: context.spinMode || null,
    receiptId: effectApplied && targetId === agenda.targetId ? agenda.actionReceiptId : incidentId,
    staffAgendaEffectReceiptId: effectApplied && targetId === agenda.targetId ? agenda.effectReceiptId : null,
    outcomeSummary: next.lastAction || null,
  }));
  return records.length ? { ...next, staffActionReceipts: [...array(next.staffActionReceipts), ...records].slice(-70) } : next;
}

export function fileBuild35StaffDebrief(previous, next) {
  const agenda = previous.staffing.agendaByWeek?.[previous.week];
  const debrief = buildStaffDebrief(agenda, array(previous.staffActionReceipts), {
    receiptWindowComplete: true, party: previous.party, otherRecommendations: previous.staffBriefingRecommendations,
  });
  next.staffing = { ...next.staffing, briefingHistory: appendStaffBriefHistory(previous.staffing.briefingHistory, debrief) };
  next.staffActionReceipts = [];
  next.staffBriefingRecommendations = [];
}

export function build35ContractUpkeep(game) {
  if (!game.staffing?.nonTraditionalActiveIds?.length) return null;
  const plan = planNonTraditionalStaffUpkeep({
    staffState: game.staffing, campaignId: game.build34CampaignId, week: game.week + 1,
    appliedReceiptIds: array(game.staffUpkeepReceiptIds),
  });
  return plan.ok ? plan : null;
}

/** The caller supplies evidence produced by the action and commits the returned inputs with the result. */
export function applyBuild35Contract(game, next, staffId, source, nativeInputs) {
  if (!nativeStaffEffectsAvailable(game) || !game.staffing.nonTraditionalActiveIds.includes(staffId)) return nativeInputs;
  const { actionId, receiptType, evidence } = source;
  const campaignId = game.build34CampaignId;
  const receiptId = `${campaignId}:staff-source:${game.week}:${game.incidentSequence || 0}:${actionId}`;
  const plan = planNonTraditionalStaffEffect({
    staffState: game.staffing, staffId, campaignId, week: game.week,
    sourceReceipt: { receiptId, campaignId, week: game.week, receiptType, actionId, evidence, committed: true },
    appliedEffectReceiptIds: array(next.staffContractEffectReceiptIds),
  });
  if (!plan.ok) return nativeInputs;
  const modified = applyNonTraditionalResolverInputs(nativeInputs, plan.command);
  if (Object.keys(nativeInputs).some((key) => modified[key] !== nativeInputs[key])) {
    next.staffContractEffectReceiptIds = [...array(next.staffContractEffectReceiptIds), plan.command.receiptId];
  }
  return modified;
}

export function build35QualityRoll(game, next, actionId, qualityRoll, actor = 'player') {
  return applyBuild35Contract(game, next, 'etsy-witch', {
    actionId, receiptType: actor === 'rival' ? 'rival-action' : 'campaign-action',
    evidence: { actor, naturalRandomRoll: true, firstRollForActor: true },
  }, { qualityRoll }).qualityRoll;
}

export function build35Attendance(game, next, actionId, state, turnout, fatigue) {
  const result = applyBuild35Contract(game, next, 'wrestling-promoter', {
    actionId, receiptType: 'campaign-action',
    evidence: { scheduledRallyOrTownHall: true, eventId: `${game.build34CampaignId}:appearance:${game.week}:${state}:${game.actionsLeft}` },
  }, { eventAttendance: turnout, volunteerConversion: 1, candidateFatigue: fatigue });
  return { turnout: result.eventAttendance, candidateFatigue: result.candidateFatigue };
}

export function build35FieldConversion(game, next, state, actionId, nativeTurnout) {
  const ruralPercent = ruralShare(state);
  const knownTurnout = turnoutOf(game, state, game.party);
  const isRuralLowTurnout = ruralPercent >= 30 && Number.isFinite(knownTurnout) && knownTurnout < 65;
  let turnout = nativeTurnout;
  if (isRuralLowTurnout) {
    const eligibleFieldConversion = nativeTurnout * ruralPercent / 100;
    for (const staffId of ['bigfoot-tracker', 'survivalist-prepper']) {
      const effect = applyBuild35Contract(game, next, staffId, {
        actionId, receiptType: 'campaign-action',
        evidence: { ruralTarget: true, existingLowTurnoutData: true, turnoutGapRecorded: true, state },
      }, { eligibleFieldConversion });
      if (effect.eligibleFieldConversion > eligibleFieldConversion) {
        turnout += effect.eligibleFieldConversion - eligibleFieldConversion;
        break;
      }
    }
  }
  if (actionId === 'volunteers') {
    const result = applyBuild35Contract(game, next, 'carnival-barker', {
      actionId, receiptType: 'campaign-action',
      evidence: { volunteerDrive: true, attendanceRecorded: nativeTurnout > 0,
        eventId: game.build34CampaignId + ':drive:' + game.week + ':' + state + ':' + game.actionsLeft },
    }, { volunteerConversion: turnout });
    turnout = result.volunteerConversion;
  }
  return Math.min(turnout, nativeTurnout * 1.1);
}

export function build35SignageCost(game, next, state, nativeCost) {
  if (!(nativeCost > 0)) return nativeCost;
  return cents(applyBuild35Contract(game, next, 'haunted-sign-blacksmith', {
    actionId: 'ground-game', receiptType: 'campaign-action',
    evidence: { eligibleSignOrGroundAction: true, state },
  }, { signageCost: nativeCost }).signageCost);
}
