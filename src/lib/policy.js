// The policy term: how much a state's voters actually agree with each candidate.
// Split out of the game engine so the heavy issue maths lives in one place.

import {
  ISSUES,
  ISSUES_BY_WEIGHT,
  POLICY_SCALE,
  stanceLabel,
  stateIssueAlignment,
} from '@/data/platform';
import { issueSalience } from '@/lib/worldNews';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Returns the margin from the Democratic candidate's point of view, whichever
// side the player is on: the whole map is read D-minus-R, so a Republican run
// must not flip this term's sign (that shrank every margin on day one).
export function rawPolicyMargin(abbr, game) {
  const pov = game.party === 'rep' ? -1 : 1;
  let sum = 0;
  let weightSum = 0;
  ISSUES.forEach((issue) => {
    const mine = stateIssueAlignment(abbr, issue.id, game.stances?.[issue.id] ?? 1);
    const theirs = stateIssueAlignment(abbr, issue.id, game.oppStances?.[issue.id] ?? 1);
    const edge = (game.issueEdge?.[issue.id] || 0) * 0.35;
    // What the state is actually arguing about this week: a story that made an
    // issue important here makes it count for more of this state's answer.
    const weight = issue.weight * issueSalience(game, abbr, issue.id);
    sum += weight * (mine - theirs + edge) * pov;
    weightSum += weight;
  });
  if (!weightSum) return 0;
  return clamp((sum / weightSum) * POLICY_SCALE, -17, 17);
}

// On day one the map is the map the scenario files describe: whatever the two
// platforms' own differences are worth is banked at creation and subtracted, so
// a platform only moves a state once the campaign actually changes something —
// a stance, a promise, an argument the news cycle picked up.
export function policyMargin(abbr, game) {
  const base = game?.policyBase?.[abbr] || 0;
  return rawPolicyMargin(abbr, game) - base;
}

export function issueBreakdown(abbr, game) {
  return ISSUES_BY_WEIGHT.map((issue) => {
    const stance = game.stances?.[issue.id] ?? 1;
    return {
      id: issue.id,
      label: issue.label,
      icon: issue.icon,
      weight: issue.weight,
      stance,
      options: issue.options,
      stanceLabel: stanceLabel(issue, stance),
      mine: stateIssueAlignment(abbr, issue.id, stance),
      theirs: stateIssueAlignment(abbr, issue.id, game.oppStances?.[issue.id] ?? 1),
      edge: game.issueEdge?.[issue.id] || 0,
    };
  });
}