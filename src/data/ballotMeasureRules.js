/**
 * Ballot-measure route data is supplied by a scenario after its state-specific
 * legal rules and 2028 deadlines have been verified. This registry is empty by
 * default: the game must not infer that a measure can qualify from a generic
 * national rule or invent a state's signature and approval requirements.
 *
 * A rule record contains:
 * - `id`, `state`, `routeType`, `available`, and supported `issueIds`;
 * - ISO `deadlines` for filing, signatures, qualification, and election day;
 * - `signatureRequirement` with a legally sourced threshold for citizen-initiative
 *   routes; legislative-referral routes may omit it;
 * - `approvalThreshold` with the state's required vote threshold; and
 * - `source` with an official state-government URL and verification date.
 */

export const BALLOT_MEASURE_ISSUES = Object.freeze({
  abortion: Object.freeze({ id: 'abortion', label: 'Abortion', platformIssueId: 'abortion' }),
  'gun-control': Object.freeze({ id: 'gun-control', label: 'Gun control', platformIssueId: 'gun-control' }),
  'marriage-equality': Object.freeze({ id: 'marriage-equality', label: 'Same-sex marriage', platformIssueId: 'marriage-equality' }),
  trans: Object.freeze({ id: 'trans', label: 'Transgender policy', platformIssueId: 'trans' }),
});

export const BALLOT_MEASURE_ISSUE_IDS = Object.freeze(Object.keys(BALLOT_MEASURE_ISSUES));

export const BALLOT_MEASURE_ROUTE_TYPES = Object.freeze([
  'citizen-initiative-statute',
  'citizen-initiative-constitutional-amendment',
  'indirect-initiative-statute',
  'legislative-referral',
]);

export const BALLOT_MEASURE_STATUSES = Object.freeze([
  'proposed',
  'filed',
  'signature-gathering',
  'qualified',
  'certified',
  'withdrawn',
  'rejected',
  'defeated',
  'approved',
]);

export const BALLOT_MEASURE_RULES_VERSION = 1;

// Add only scenario records verified against official state sources. Empty is a
// deliberate safe default until such records are available.
export const BALLOT_MEASURE_RULES = Object.freeze([]);
