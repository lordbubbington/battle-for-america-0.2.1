import { isCommittedIncidentReceipt } from './triggeredEventProducers.js';

/** Read genuine saved debate promises without synthesizing campaign receipts. */
export function build45FactionCommitments(game, prior = []) {
  const seen = new Set();
  const seenIssues = new Set();
  return prior.filter((receipt) => {
    if (!isCommittedIncidentReceipt(receipt, game) || !Number.isInteger(receipt.week)
      || receipt.week > game.week || game.week - receipt.week > 2) return false;
    const promise = receipt.sourceType === 'debate-answer' ? receipt.payload.promise : null;
    const issueId = receipt.sourceType === 'campaign-promise' ? receipt.payload.issueId : promise?.issueId;
    const saved = (game.promiseLedger || []).find((entry) => promise
      ? entry.id === promise.id && entry.issueId === issueId && entry.stance === promise.stance && entry.text === promise.text
      : entry.issueId === issueId && entry.week === receipt.week);
    if (!issueId || !saved || seen.has(saved.id) || seenIssues.has(issueId)) return false;
    seen.add(saved.id);
    seenIssues.add(issueId);
    return true;
  }).map((receipt) => ({ ...receipt, payload: { ...receipt.payload,
    issueId: receipt.payload.issueId || receipt.payload.promise.issueId } }));
}
