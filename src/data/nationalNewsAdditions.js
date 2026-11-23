/** Scenario-only national news cards added for the Build 34 deck. */

import {
  applyNationalNewsBalanceCorrections,
  validateNationalNewsBalanceCorrections,
} from './nationalNewsCorrections.js';

const round2 = (value) => Math.round(value * 100) / 100;

/** @type {Array<[string, string, string, string, string, number, { issue?: string, tone?: string, swing?: boolean, weight?: number }]>} */
const rawCards = [
  ['b34_tariff_receipts', 'Economy', 'business', 'Tariff costs show up on household bills', 'Retailers say the new import fees are showing up in appliance and clothing prices. President Donald Trump says domestic production will bring costs down, but the White House has not given a timeline.', 0.35, { issue: 'affordability', tone: 'crisis', weight: 0.65 }],
  ['b34_shutdown_paychecks', 'Washington', 'civic-building', 'Federal workers miss another paycheck', 'A budget fight led by Republican leaders keeps agencies closed into a second week. President Donald Trump blames Democrats, while furloughed workers ask when they will be paid.', 0.45, { issue: 'economy', tone: 'crisis', weight: 0.7 }],
  ['b34_pardon_access', 'Washington', 'justice', 'A pardon renews questions about political access', 'President Donald Trump pardons a business figure whose company donated to a political group backing him. No evidence shows a deal, but lawmakers ask what access the donor received.', 0.5, { issue: 'corruption', tone: 'scandal', weight: 0.55 }],
  ['b34_border_timeline', 'Washington', 'shield', 'A court filing disputes the border timeline', 'New records in a court case conflict with the administration’s account of when a border policy took effect. The White House says its summary was accurate.', 0.35, { issue: 'immigration', tone: 'scandal', weight: 0.6 }],
  ['b34_disaster_funds', 'Climate', 'weather', 'Local officials wait for disaster reimbursements', 'Several states say federal recovery payments have not arrived after a major storm. The administration says the requests are under review as residents return to damaged homes.', 0.35, { issue: 'energy', tone: 'crisis', swing: true, weight: 0.6 }],
  ['b34_health_plan_detail', 'Health', 'health', 'Budget details complicate a health-care promise', 'A federal budget appendix projects lower payments to some rural hospitals than the campaign had described. The White House says the figures do not account for its proposed savings.', 0.4, { issue: 'health', tone: 'crisis', weight: 0.65 }],
  ['b34_factory_delay', 'Economy', 'tools', 'A promised factory project misses its start date', 'The company says it is still waiting on federal permits and grant terms for a plant promoted by President Donald Trump. Local leaders say the delay leaves hiring plans uncertain.', 0.3, { issue: 'economy', swing: true, weight: 0.6 }],
  ['b34_ethics_calendar', 'Washington', 'data', 'An ethics report lists undisclosed donor meetings', 'A new oversight report says senior officials met with industry donors before a key rule changed. The administration disputes the report’s account of the meeting schedule.', 0.45, { issue: 'corruption', tone: 'scandal', weight: 0.6 }],
  ['b34_border_bill_split', 'Washington', 'shield', 'Republicans split over the White House border bill', 'Several Republican lawmakers oppose the latest enforcement bill, while President Donald Trump demands a tougher version. The dispute delays a vote and leaves the policy unclear.', 0.3, { issue: 'immigration', weight: 0.7 }],
  ['b34_farm_retaliation', 'Trade', 'transit', 'Trade partners answer the new farm tariffs', 'Two trading partners announce fees on American grain and meat. Farm groups warn that contracts could move overseas before the next harvest.', 0.4, { issue: 'tariffs', tone: 'crisis', swing: true, weight: 0.7 }],
  ['b34_housing_plan_delay', 'Economy', 'civic-building', 'The housing plan is delayed again', 'The White House promised a plan to lower housing costs but has postponed its release twice. Builders say they still do not know which rules will change.', 0.3, { issue: 'rent', weight: 0.55 }],
  ['b34_debate_claim_check', 'The Campaign', 'data', 'A debate claim fails a basic fact-check', 'Independent reviewers find that a figure President Donald Trump repeated on stage leaves out a large cost in the published budget. His campaign says the comparison uses the wrong baseline.', 0.3, { issue: 'economy', tone: 'scandal', weight: 0.65 }],
  ['b34_school_order_blocked', 'Courts', 'justice', 'A judge blocks the new school-funding order', 'A federal judge pauses the administration’s school-funding directive while states challenge its authority. The White House says it will appeal.', 0.3, { issue: 'corruption', tone: 'nation', weight: 0.55 }],
  ['b34_power_grid_waiver', 'Energy', 'power', 'A power-plant waiver draws new scrutiny', 'The administration grants a waiver to several aging plants after promising lower utility bills. State regulators say the move may keep repair costs on customers longer.', 0.3, { issue: 'energy', weight: 0.55 }],
  ['b34_factory_remark', 'The Campaign', 'media', 'A recorded remark unsettles factory towns', 'At a private event, President Donald Trump calls a promised factory program temporary. The clip spreads in manufacturing states, where local officials had cited the plan in hiring announcements.', 0.4, { issue: 'economy', tone: 'scandal', swing: true, weight: 0.6 }],
  ['b34_tax_draft', 'Washington', 'coin', 'A tax draft favors high earners more than expected', 'A draft Republican tax plan offers a larger break to top earners than to middle-income households. Party leaders say the proposal is not final.', 0.4, { issue: 'inequality', weight: 0.65 }],
  ['b34_court_deadline', 'Courts', 'justice', 'The administration misses a court deadline', 'The Justice Department files its response after a judge’s deadline in a high-profile case. Officials blame a document-processing delay and say the case remains on track.', 0.3, { issue: 'corruption', tone: 'nation', weight: 0.55 }],
  ['b34_abortion_bill_split', 'Washington', 'health', 'Republicans divide over a national abortion bill', 'A bill backed by some Republican leaders faces resistance from members who fear it goes too far. The debate reopens questions the party hoped to settle before November.', 0.35, { issue: 'abortion', weight: 0.7 }],
  ['b34_transit_grant_reversal', 'Economy', 'transit', 'A transit grant changes after construction begins', 'Federal officials revise a grant after local crews have started work. City leaders say the new terms could leave taxpayers with a half-finished project.', 0.3, { issue: 'economy', swing: true, weight: 0.55 }],
  ['b34_staffing_report', 'Washington', 'data', 'An inspector general links staffing cuts to long delays', 'A public report says federal offices took longer to process benefits after staffing was reduced. The administration says the backlog is falling and the report uses older data.', 0.35, { issue: 'health', tone: 'crisis', weight: 0.6 }],
];

export const DEMOCRATIC_FAVORING_NATIONAL_NEWS = Object.freeze(rawCards.map(([
  id, desk, icon, headline, body, nat, options = {},
]) => Object.freeze({
  id,
  desk,
  icon,
  headline,
  body,
  nat,
  gen: round2(nat * 1.6),
  mom: 0,
  swing: Boolean(options.swing),
  issue: options.issue || null,
  states: null,
  arc: null,
  end: null,
  follow: null,
  tone: options.tone || null,
  weight: Number(options.weight) || 0.65,
})));

/** Merge corrected base cards with the isolated Build 34 scenario additions. */
export function extendBuild34NationalNewsCatalog(records, correctionContext = {}) {
  const { validIssueIds = [], ...balanceContext } = correctionContext || {};
  const correctionValidation = validateNationalNewsBalanceCorrections(records, balanceContext);
  if (!correctionValidation.valid) {
    throw new Error(`Build 34 national news corrections failed validation: ${correctionValidation.errors.join('; ')}`);
  }
  const additionValidation = validateBuild34NationalNewsAdditions(validIssueIds);
  if (!additionValidation.valid) {
    throw new Error(`Build 34 national news additions failed validation: ${additionValidation.errors.join('; ')}`);
  }
  const correctedBase = applyNationalNewsBalanceCorrections(records, balanceContext);
  const ids = new Set();
  for (const card of correctedBase) {
    if (!card?.id || ids.has(card.id)) throw new Error(`Missing or duplicate base national news ID: ${card?.id}`);
    ids.add(card.id);
  }
  for (const card of DEMOCRATIC_FAVORING_NATIONAL_NEWS) {
    if (ids.has(card.id)) throw new Error(`Build 34 national news ID conflicts with the base catalog: ${card.id}`);
    ids.add(card.id);
  }
  return [...correctedBase, ...DEMOCRATIC_FAVORING_NATIONAL_NEWS];
}

/** Catch wrong-sign content and invalid issue references before catalog merge. */
export function validateBuild34NationalNewsAdditions(validIssueIds = []) {
  const errors = [];
  const ids = new Set();
  const knownIssues = new Set(validIssueIds);
  const tones = new Set(['crisis', 'hope', 'scandal', 'chaos', 'wild', 'nation']);
  for (const card of DEMOCRATIC_FAVORING_NATIONAL_NEWS) {
    if (!card.id.startsWith('b34_') || ids.has(card.id)) errors.push(`Invalid or duplicate Build 34 news id: ${card.id}`);
    ids.add(card.id);
    if (!(card.nat > 0) || !(card.gen > 0)) errors.push(`${card.id} must move both national measures toward Democrats`);
    if (!card.headline || !card.body || !card.desk || !card.icon || !(card.weight > 0)) {
      errors.push(`${card.id} is missing required news-card content`);
    }
    const sentenceCount = String(card.body || '').split(/[.!?]+/).filter((sentence) => sentence.trim()).length;
    if (sentenceCount < 1 || sentenceCount > 3) errors.push(`${card.id} body must contain one to three sentences`);
    if (!card.issue) errors.push(`${card.id} needs a tracked issue for salience and balance reporting`);
    if (card.tone && !tones.has(card.tone)) errors.push(`${card.id} has unsupported tone ${card.tone}`);
    if (knownIssues.size && card.issue && !knownIssues.has(card.issue)) {
      errors.push(`${card.id} references unknown issue ${card.issue}`);
    }
  }
  if (DEMOCRATIC_FAVORING_NATIONAL_NEWS.length !== 20) {
    errors.push(`Expected 20 Democratic-favoring news cards, found ${DEMOCRATIC_FAVORING_NATIONAL_NEWS.length}`);
  }
  return { valid: errors.length === 0, errors, count: DEMOCRATIC_FAVORING_NATIONAL_NEWS.length };
}
