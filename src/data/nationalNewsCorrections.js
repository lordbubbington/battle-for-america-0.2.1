/** Corrections from the Build 34 event/news audit; sign is Democratic minus Republican. */

export const NATIONAL_NEWS_SIGN_CONVENTION = 'democratic-minus-republican';

export const NATIONAL_NEWS_BALANCE_CORRECTIONS = Object.freeze({
  slump_confirmed: { environmentShift: 0.75, reason: 'recession-harms-the-party-claiming-strength' },
  slump_deepens: { environmentShift: 0.5, reason: 'recession-arc-democratic-lift' },
  slump_eases: { environmentShift: -0.5, reason: 'recovery-helps-republican-incumbent-scenario' },
  shutdown_starts2: { environmentShift: 0.5, reason: 'report-says-voters-blame-republicans' },
  debt_upgrade: { tone: 'hope', environmentShift: -2.5, reason: 'republican-favoring-good-economic-news' },
});

/** Incumbent-sensitive sign for the current debt-downgrade story. */
export function debtDowngradeEnvironmentShift(incumbentParty = 'rep') {
  return incumbentParty === 'dem' ? -1.5 : 1.5;
}

/** Keep a shutdown-deal story neutral unless its linked coverage records blame. */
export function shutdownDealEnvironmentShift(priorBlameParty) {
  if (priorBlameParty === 'rep') return 0.5;
  if (priorBlameParty === 'dem') return -0.5;
  return 0;
}

/** Return fresh records with the audit's corrections; preserve other content.
 * @param {Array<Record<string, any>>} records
 * @param {{ incumbentParty?: string, priorShutdownBlameParty?: string | null }} context
 */
export function applyNationalNewsBalanceCorrections(records, context = {}) {
  const { incumbentParty = 'rep', priorShutdownBlameParty } = context;
  const applyShift = (record, shift, reason) => {
    const corrected = { ...record, balanceReason: reason };
    const hasNat = Object.prototype.hasOwnProperty.call(record, 'nat');
    const hasEnvironmentShift = Object.prototype.hasOwnProperty.call(record, 'environmentShift');
    if (hasNat || !hasEnvironmentShift) corrected.nat = shift;
    if (hasEnvironmentShift) corrected.environmentShift = shift;
    if (Object.prototype.hasOwnProperty.call(record, 'gen')) {
      corrected.gen = Math.round(shift * 1.6 * 100) / 100;
    }
    return corrected;
  };

  return (records || []).map((record) => {
    if (record.id === 'debt_downgrade') {
      return applyShift(record, debtDowngradeEnvironmentShift(incumbentParty), 'incumbent-sensitive-downgrade');
    }
    if (record.id === 'shutdown_deal') {
      return applyShift(record, shutdownDealEnvironmentShift(priorShutdownBlameParty), 'inherits-linked-shutdown-blame');
    }
    const correction = NATIONAL_NEWS_BALANCE_CORRECTIONS[record.id];
    if (!correction) return record;
    const { environmentShift, reason, ...otherCorrections } = correction;
    const corrected = { ...record, ...otherCorrections, balanceReason: reason };
    if (Number.isFinite(Number(environmentShift))) {
      return applyShift(corrected, Number(environmentShift), reason);
    }
    return corrected;
  });
}

/** Verify corrected cards use the runtime's actual environment and generic fields.
 * @param {Array<Record<string, any>>} records
 * @param {{ incumbentParty?: string, priorShutdownBlameParty?: string | null }} context
 */
export function validateNationalNewsBalanceCorrections(records, context = {}) {
  const errors = [];
  const requiredIds = [...Object.keys(NATIONAL_NEWS_BALANCE_CORRECTIONS), 'debt_downgrade', 'shutdown_deal'];
  const corrected = applyNationalNewsBalanceCorrections(records, context);
  const cardsById = new Map(corrected.filter((card) => card?.id).map((card) => [card.id, card]));
  for (const id of requiredIds) {
    if (!cardsById.has(id)) errors.push(`Missing national news card required for sign audit: ${id}`);
  }
  for (const [id, correction] of Object.entries(NATIONAL_NEWS_BALANCE_CORRECTIONS)) {
    const card = cardsById.get(id);
    if (!card) continue;
    const appliedShift = Object.prototype.hasOwnProperty.call(card, 'nat') ? card.nat : card.environmentShift;
    if (Number(appliedShift) !== Number(correction.environmentShift)) {
      errors.push(`${id} did not receive its configured national sign correction`);
    }
    if (Number.isFinite(Number(card.gen)) && Number(card.gen) !== Math.round(Number(correction.environmentShift) * 1.6 * 100) / 100) {
      errors.push(`${id} generic-ballot shift does not match its corrected national direction`);
    }
  }
  const checkDynamicShift = (id, expected, message) => {
    const card = cardsById.get(id);
    if (!card) return;
    const actual = Object.prototype.hasOwnProperty.call(card, 'nat') ? card.nat : card.environmentShift;
    if (Number(actual) !== expected) errors.push(message);
    if (Number.isFinite(Number(card.gen)) && Number(card.gen) !== Math.round(expected * 1.6 * 100) / 100) {
      errors.push(`${id} generic-ballot shift does not match its linked context`);
    }
    if (Object.prototype.hasOwnProperty.call(card, 'nat') && Object.prototype.hasOwnProperty.call(card, 'environmentShift') &&
        Number(card.nat) !== Number(card.environmentShift)) {
      errors.push(`${id} national shift fields disagree`);
    }
  };
  checkDynamicShift(
    'debt_downgrade',
    debtDowngradeEnvironmentShift(context.incumbentParty || 'rep'),
    'debt_downgrade does not match the governing party',
  );
  checkDynamicShift(
    'shutdown_deal',
    shutdownDealEnvironmentShift(context.priorShutdownBlameParty),
    'shutdown_deal does not inherit recorded shutdown blame',
  );
  if (cardsById.get('debt_upgrade')?.tone !== 'hope') errors.push('debt_upgrade tone must be hope');
  return { valid: errors.length === 0, errors, requiredCount: requiredIds.length };
}
