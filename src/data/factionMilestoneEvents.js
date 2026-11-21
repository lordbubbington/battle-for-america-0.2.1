/** Adapter for native Build 33 faction milestone content; Build 33 owns receipts. */

export const FACTION_MILESTONE_THRESHOLDS = Object.freeze([0, 100]);

const recordKey = (party, factionId, threshold) => `${party}:${factionId}:${threshold}`;
const nativeSlot = (threshold) => threshold === 0 ? 'atZero' : threshold === 100 ? 'atHundred' : null;
const hasNativePenalty = (record) => {
  if ([record.groupPenalty, record.turnoutPenalty, record.momentumPenalty, record.statePenalty, record.cashPenalty]
    .some((value) => Number(value) > 0)) return true;
  return Object.entries(record.crisis || {}).some(([key, value]) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return false;
    if (key.endsWith('Mul')) return amount >= 0 && amount < 1;
    if (key === 'momentumDrift') return amount < 0;
    return key === 'downballotPenalty' && amount > 0;
  });
};

/** Return the native event only; Build 33 owns its crisis and choice effects. */
/** @param {any} input */
export function factionMilestoneEvent(input = {}) {
  const { party, factionId, threshold, milestoneCatalog, milestoneKey } = input;
  const expectedKey = recordKey(party, factionId, threshold);
  if (!nativeSlot(threshold)) throw new Error(`Unsupported faction milestone threshold: ${threshold}`);
  if (milestoneKey !== expectedKey) throw new Error('Faction milestone key must match party, faction, and threshold');
  const payload = milestoneCatalog?.[party]?.[factionId]?.[nativeSlot(threshold)];
  if (!payload) throw new Error(`Missing native Build 33 milestone for ${party}:${factionId}:${threshold}`);
  const event = {
    party,
    factionId,
    threshold,
    ...payload,
  };
  return { event, milestoneKey, delegatedToBuild33: true };
}

/** Confirm native content gives each party faction both distinct consequences. */
/** @param {Record<string, any>} factionsByParty
 * @param {any} milestoneCatalog
 */
export function validateFactionMilestoneEvents(factionsByParty = {}, milestoneCatalog = null) {
  const errors = [];
  let factionCount = 0;
  for (const [party, factions] of Object.entries(factionsByParty || {})) {
    for (const faction of factions || []) {
      factionCount += 1;
      const milestones = milestoneCatalog?.[party]?.[faction.id];
      const zero = milestones?.atZero;
      const hundred = milestones?.atHundred;
      if (!zero?.title || !zero?.text) errors.push(`Missing native 0 event for ${party}:${faction.id}`);
      if (zero && !hasNativePenalty(zero)) {
        errors.push(`Native 0 event has no bad consequence for ${party}:${faction.id}`);
      }
      if (!hundred?.title || !hundred?.text || !Array.isArray(hundred.options) || hundred.options.length < 2) {
        errors.push(`Missing distinct native 100 choices for ${party}:${faction.id}`);
      } else if (hundred.options.some((option) => !option?.label || !option?.effects)) {
        errors.push(`Incomplete native 100 choice for ${party}:${faction.id}`);
      }
    }
  }
  if (!milestoneCatalog) errors.push('Native Build 33 faction milestone catalog is required');
  return { valid: errors.length === 0, errors, factionCount, milestoneCount: factionCount * 2 };
}
