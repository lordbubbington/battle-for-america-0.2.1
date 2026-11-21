export const VOTING_RULES_VERSION = 1;
export const VOTING_RULES = Object.freeze([
  Object.freeze({ id: 'current', label: 'Current', description: 'Use the current election rules. Voter ID requirements vary by state.' }),
  Object.freeze({ id: 'automatic-registration', label: 'Automatic voter registration', description: 'Eligible voters are registered through an opt-out system, expanding the registered pool.' }),
  Object.freeze({ id: 'same-day-registration', label: 'Same-day registration', description: 'Eligible voters can register while voting; field mobilization can reach more of them.' }),
  Object.freeze({ id: 'mandatory-voter-id', label: 'Mandatory voter ID', description: 'Require voter identification. Turnout falls by 3 percentage points, with 2 additional points for non-white voters.' }),
  Object.freeze({ id: 'mandatory-turnout', label: 'Mandatory turnout', description: 'Voting is compulsory and nonvoters face a substantial fine. State turnout is at least 95% and averages 98% nationally.' }),
]);
export const VOTING_RULE_BY_ID = Object.freeze(Object.fromEntries(VOTING_RULES.map((rule) => [rule.id, rule])));
export const VOTING_RULE_TUNING = Object.freeze({ baseRegisteredFraction: 0.9, automaticRegistrationPoints: 0.05, sameDayRegistrationPoints: 0.03, idReductionWhite: 0.03, idReductionNonwhite: 0.05, compulsoryFloor: 0.95, compulsoryNationalTarget: 0.98, compulsoryVariationScale: 0.15 });
