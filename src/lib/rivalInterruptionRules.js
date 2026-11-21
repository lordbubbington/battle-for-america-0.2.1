import { STATE_BY_ABBR } from '../data/states.js';

export const RIVAL_INTERRUPTION_EVENT_ID = 'interrupt-072-opponent-enters-state';
export const RIVAL_INTERRUPTION_ONCE_KEY = 'triggered-event:' + RIVAL_INTERRUPTION_EVENT_ID;

const isText = (value) => typeof value === 'string' && value.trim().length > 0;
export function isRivalInterruptionMarginEligible(margin) {
  return Number.isFinite(margin) && Math.abs(margin) <= 10;
}

export function rivalInterruptionCommand(sourceReceipt) {
  return {
    receiptId: sourceReceipt.campaignId + ':rival-interruption:072',
    sourceReceiptId: sourceReceipt.id,
    stateId: sourceReceipt.payload.neglectedStateMove.abbr,
    sourceWeek: Number(sourceReceipt.week) + 1,
    points: 5,
  };
}

function matchesMovement(proof, command) {
  return proof?.receiptId === command.receiptId
    && proof.stateId === command.stateId
    && proof.sourceWeek === command.sourceWeek
    && proof.points === command.points
    && isRivalInterruptionMarginEligible(proof.before)
    && Number.isFinite(proof.after)
    && Math.abs((proof.before - proof.after) - command.points) < 0.00001;
}

export function legacyRivalInterruptionApplied(receipt, game) {
  const proof = receipt?.payload?.neglectedStateMove?.persuasion;
  const persisted = game?.build35RivalInterruptionEffect;
  if (!proof || !persisted || !receipt?.campaignId || Number(receipt.week) + 1 < 10) return false;
  const command = rivalInterruptionCommand(receipt);
  return matchesMovement(proof, command)
    && matchesMovement(persisted, command)
    && persisted.before === proof.before && persisted.after === proof.after;
}

export function validRivalInterruptionSource(receipt, game) {
  const move = receipt?.payload?.neglectedStateMove;
  const sourceWeek = Number(receipt?.week) + 1;
  if (receipt?.sourceType !== 'opponent-plan' || !Number.isInteger(sourceWeek) || sourceWeek < 10 ||
      !move || !['stop', 'ad', 'issue-ad'].includes(move.type) ||
      !Object.hasOwn(STATE_BY_ABBR, move.abbr) || move.abbr !== (receipt.stateId || receipt.state) ||
      !isText(move.stateName) || !isText(move.moveText) || move.effectApplied !== true ||
      !Number.isFinite(move.effectMagnitude) || move.effectMagnitude <= 0 ||
      !Number.isFinite(move.playerAttention) || move.playerAttention < 0 || move.playerAttention >= 0.15) return false;

  if (move.persuasion) return move.effectMagnitude === 5 && legacyRivalInterruptionApplied(receipt, game);
  return isRivalInterruptionMarginEligible(move.sourceMargin)
    && Array.isArray(receipt.payload.moves)
    && receipt.payload.moves.some((item) => item?.type === move.type && item.state === move.abbr);
}

export function validRivalInterruptionDispatchProof(proof, command, maximumWeek) {
  return matchesMovement(proof, command)
    && proof.sourceReceiptId === command.sourceReceiptId
    && Number.isInteger(proof.appliedWeek)
    && proof.appliedWeek >= command.sourceWeek
    && proof.appliedWeek <= maximumWeek;
}
