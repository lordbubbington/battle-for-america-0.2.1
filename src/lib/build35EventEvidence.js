import { BUILD38_AD_WORKS_EVENT_ID } from '@/data/build38AdWorksChoices';
import { adWorksChoice } from '@/lib/build38AdWorks';
import { STATE_BY_ABBR } from '@/data/states';
import { responseForReceipt } from '@/lib/incidentResponses';
import { planTriggeredEventDispatch, planTriggeredEventResolution, validateTriggeredEventCandidate, validateTriggeredEventProvenance } from '@/lib/triggeredEventCatalog';
import { isCommittedIncidentReceipt } from '@/lib/triggeredEventProducers';

const sourceReceipt = (game, event) => (game.incidentLedger || []).find((receipt) => receipt.id === event.sourceReceiptId);
const response = (event) => Boolean(event?.receiptKey || event?.id?.startsWith('response-'));

export function hasBuild35EventEvidence(game, event) {
  if (!response(event)) return true;
  const receipt = sourceReceipt(game, event);
  if (event.onceKey) return validateTriggeredEventProvenance(event, receipt, game);
  return isCommittedIncidentReceipt(receipt, game) && event.campaignId === receipt.campaignId
    && event.incidentId === receipt.incidentId && event.receiptKey === receipt.id
    && event.sourceType === receipt.sourceType && event.sourceWeek === receipt.week
    && event.evidenceSnapshot?.recap === receipt.recap && responseForReceipt(receipt)?.id === event.id;
}

export function hasBuild36EventCandidate(game, event) {
  if (!response(event) || !event.onceKey) return hasBuild35EventEvidence(game, event);
  return validateTriggeredEventCandidate(event, sourceReceipt(game, event), game);
}

export function planBuild36EventDispatch(game, event, currentMargin) {
  if (!event.onceKey) return { status: 'ready', event, command: null, reason: null };
  const receipt = sourceReceipt(game, event);
  const plan = planTriggeredEventDispatch({ event, sourceReceipt: receipt, game, currentMargin });
  if (plan.status !== 'ready' || event.onceKey !== 'triggered-event:' + BUILD38_AD_WORKS_EVENT_ID) return plan;
  const choices = plan.event.choices.map((choice) => {
    const effect = adWorksChoice({ choiceId: choice.label, sourceReceipt: receipt });
    if (effect.status !== 'ready') return { ...choice, unavailable: 'The original ad result could not be verified.' };
    const state = STATE_BY_ABBR[effect.stateId].name;
    const movement = 'minPoints' in effect
      ? '−2 to +5 persuasion points (each equally likely)'
      : '+' + effect.points + ' persuasion points';
    return { ...choice, displayLabel: effect.label, build38AdWork: effect,
      detail: state + ': ' + movement + ' · $' + effect.costM + 'M' };
  });
  return { ...plan, event: { ...plan.event, choices } };
}

export function planBuild35EventChoice(game, event, choice) {
  if (!response(event)) return { choice, receiptId: null };
  if (event.legacyWithoutProvenance) {
    const savedChoice = event.choices?.find(({ label }) => label === choice?.label);
    return savedChoice ? { choice: { ...savedChoice, then: null }, receiptId: null } : null;
  }
  if (!hasBuild35EventEvidence(game, event)) return null;
  const receipt = sourceReceipt(game, event);
  const applied = game.build35EventChoiceReceiptIds || [];
  if (event.onceKey) {
    const plan = planTriggeredEventResolution({ event, choice, sourceReceipt: receipt, game, appliedReceiptIds: applied });
    if (!plan.valid || plan.duplicate) return null;
    const saved = event.onceKey === 'triggered-event:' + BUILD38_AD_WORKS_EVENT_ID && event.choices.find((item) => item.label === plan.choice.label);
    if (saved?.unavailable) return null;
    if (!saved?.build38AdWork) return plan;
    const effect = adWorksChoice({ choiceId: plan.choice.label, sourceReceipt: receipt });
    if (effect.status !== 'ready' || effect.version !== saved.build38AdWork.version || game.funds < effect.costM) return null;
    return { ...plan, choice: { ...plan.choice, build38AdWork: effect } };
  }
  const receiptId = `${game.build34CampaignId}:incident-response:${receipt.id}`;
  const canonical = responseForReceipt(receipt)?.choices.find(({ label }) => label === choice?.label);
  return canonical && !applied.includes(receiptId) ? { choice: canonical, receiptId } : null;
}

export function restoreBuild35EventEvidence(game, legacy) {
  const oldIndex = game.eventScheduleIndex;
  const entries = game.eventSchedule.map((entry, index) => index <= oldIndex || hasBuild35EventEvidence(game, entry.event)
    ? entry : { status: 'pending', afterActions: entry.afterActions });
  const event = game.currentEventData;
  if (response(event) && !hasBuild35EventEvidence(game, event)) {
    if ((legacy || event.legacyWithoutProvenance) && Array.isArray(event.choices) && event.choices.length && event.choices.every((choice) => choice.label && choice.effects)) {
      game.currentEventData = { ...event, legacyWithoutProvenance: true };
    } else if (!game.outcome) {
      game.currentEventData = null;
      game.currentEventId = null;
      game.currentInterrupt = null;
      if (entries[oldIndex]?.id === event.id) {
        entries[oldIndex] = { status: 'pending', afterActions: entries[oldIndex].afterActions };
        game.eventScheduleIndex = oldIndex - 1;
        game.decisionEventDispatchedCount = Math.max(0, (game.decisionEventDispatchedCount || 1) - 1);
      }
    }
  }
  game.eventSchedule = entries;
  game.pendingInterrupts = game.pendingInterrupts.filter((entry) => entry?.event && hasBuild36EventCandidate(game, entry.event));
}
