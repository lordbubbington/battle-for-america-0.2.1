import { STATE_BY_ABBR } from '@/data/states';
import { isCommittedIncidentReceipt } from '@/lib/triggeredEventProducers';
import { build45ReceiptDependentEvent, build45ReceiptWindow } from '@/lib/build45ReceiptEvidence';

export const auditedReceiptEvent = build45ReceiptDependentEvent;

export function selectionEvidence(receipt) {
  if (!receipt) return null;
  return JSON.parse(JSON.stringify({ id: receipt.id, campaignId: receipt.campaignId,
    sourceType: receipt.sourceType, sourceId: receipt.sourceId, week: receipt.week,
    stateId: receipt.stateId || receipt.state, payload: receipt.payload }));
}

const canonical = (value) => JSON.stringify(value, function (_key, item) {
  return item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item;
});

/** Draw and restore/apply share exactly the same native evidence checks. */
export function validSelectionReceipt(game, id, receipt, { selectionWeek = game.week, stateId = null, evidence = null } = {}) {
  if (!auditedReceiptEvent(id)) return true;
  if (!build45ReceiptWindow(game, id, receipt, { selectionWeek, stateId, evidence })) return false;
  if (!/^interrupt-(038|072)-/.test(id)) return true;
  if (!isCommittedIncidentReceipt(receipt, game) || !Number.isInteger(selectionWeek)
    || !Number.isInteger(receipt.week) || receipt.week > selectionWeek || selectionWeek - receipt.week > 1) return false;
  const state = receipt.stateId || receipt.state;
  if (!STATE_BY_ABBR[state] || (receipt.state && receipt.state !== state) || (stateId && stateId !== state)) return false;
  if (evidence && canonical(selectionEvidence(receipt)) !== canonical(evidence)) return false;
  const payload = receipt.payload;
  if (id.startsWith('interrupt-038-')) {
    const report = payload.canvassReport;
    return receipt.sourceType === 'campaign-action' && receipt.sourceId === 'volunteers'
      && payload.type === 'action' && payload.actionId === 'volunteers'
      && typeof report?.districtId === 'string' && report.districtId.startsWith(state + '-')
      && Number.isInteger(report.affectedAddresses) && report.affectedAddresses > 0;
  }
  const move = payload.neglectedStateMove;
  const appliedPlan = (Array.isArray(game.build34AiPlanReceipts) ? game.build34AiPlanReceipts : []).some((plan) => {
    if (!plan || typeof plan !== 'object') return false;
    const decision = plan.selectedDecision;
    const schedule = decision?.payloadSnapshot?.schedule;
    return plan.campaignId === receipt.campaignId && Number(plan.week) === receipt.week + 1
      && plan.status === 'applied' && Array.isArray(game.build34AppliedDecisionReceiptIds) && game.build34AppliedDecisionReceiptIds.includes(plan.decisionReceiptId)
      && decision?.kind === 'campaign-action' && decision.category === 'weekly-schedule'
      && Array.isArray(schedule?.moves) && schedule.moves.some((item) => item?.abbr === state && item.type === move?.type)
      && Number.isFinite(schedule?.deltas?.[state])
      && Math.round(Math.abs(schedule.deltas[state]) * 10) / 10 === move?.effectMagnitude;
  });
  return receipt.sourceType === 'opponent-plan' && payload.type === 'opponent'
    && appliedPlan
    && move?.abbr === state && move.effectApplied === true
    && ['stop', 'ad', 'issue-ad'].includes(move.type)
    && Number.isFinite(move.playerAttention) && move.playerAttention >= 0 && move.playerAttention < 0.15
    && Number.isFinite(move.effectMagnitude) && move.effectMagnitude > 0
    && Array.isArray(payload.moves) && payload.moves.some((item) => item?.state === state && item.type === move.type);
}

export function validPendingReceipt(game, event) {
  if (!auditedReceiptEvent(event?.id)) return true;
  const context = event.context;
  if (!context || !STATE_BY_ABBR[context.stateId] || !context.evidence
    || context.sourceReceiptId !== event.sourceReceiptId || !Number.isInteger(context.selectionWeek)) return false;
  const receipt = Array.isArray(game.incidentLedger) ? game.incidentLedger.find((item) => item?.id === context.sourceReceiptId) : null;
  return validSelectionReceipt(game, event.id, receipt, context);
}
