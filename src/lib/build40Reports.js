import { ISSUE_BY_ID, stanceLabel } from '@/data/platform';
import { STATE_BY_ABBR } from '@/data/states';
import { createSeededRandom } from '@/lib/seededRandom';
import { recordIncident } from '@/lib/incidentLedger';
import { build45FactionCommitments } from '@/lib/build45FactionCommitments';

function file(game, type, sourceId, recap, payload, abbr = null) {
  return recordIncident(game, { ...game }, { type, sourceId, recap, payload, abbr });
}

function rng(game, channel, stateId) {
  return createSeededRandom([game.build34CampaignId, game.week, game.incidentSequence, channel, stateId].join(':'));
}

export function build40FieldEvidence(game, actionId, stateId, report, districtId) {
  if (actionId !== 'volunteers' || !report) return {};
  const random = rng(game, 'field-evidence', stateId);
  const evidence = {};
  if (report.signups > report.expected) {
    const threshold = 1000;
    const shares = Math.round(report.signups * (6 + random() * 12));
    evidence.organicVideo = { posted: true, paid: false, shares, threshold };
  }
  if (districtId && random() < 0.22) {
    evidence.canvassReport = { districtId, affectedAddresses: 12 + Math.floor(random() * 63) };
  }
  return evidence;
}

export function build40PolicyEvidence(next, context) {
  if (!['rep', 'maga'].includes(next.party) || !['abortion', 'trans', 'birthrate', 'immigration'].includes(context.issueId) || context.to >= context.from) return {};
  const label = ISSUE_BY_ID[context.issueId]?.label || 'the issue';
  return { organizationResponse: {
    sector: 'faith', factionId: 'religious',
    criticism: 'The simulated Faith and Family Coalition criticized the change on ' + label + '.',
  } };
}

export function build40RivalEvidence(game, next) {
  const stop = next.oppMoves?.find((move) => move.type === 'stop' && move.abbr);
  const ad = next.oppMoves?.find((move) => move.mediaBuys?.length);
  const policy = (game.incidentLedger || []).findLast((receipt) =>
    receipt.sourceType === 'policy-position' && receipt.week < game.week && ISSUE_BY_ID[receipt.payload?.issueId]);
  const random = rng(game, 'rival-evidence', stop?.abbr);
  const evidence = {};
  if (stop && random() < 0.24) {
    const expected = 300 + STATE_BY_ABBR[stop.abbr].ev * 30;
    const observed = Math.round(expected * (0.65 + random() * 0.3));
    evidence.attendance = { expected, observed, stateId: stop.abbr, localCoverage: 'Local coverage counted ' + observed + ' people at the rival stop, below the venue estimate of ' + expected + '.' };
  }
  if (ad && next.lastOpponent?.promiseAttack?.pledgedPosition) {
    const attack = next.lastOpponent.promiseAttack;
    const placedBuy = ad.mediaBuys.find(({ abbr }) => STATE_BY_ABBR[abbr]);
    if (placedBuy) evidence.archiveAd = { statement: attack.pledgedPosition, stateId: placedBuy.abbr, reach: Math.round((ad.spend || 0) * 80000) };
  }
  if (policy) {
    const { issueId, newStance } = policy.payload;
    const issue = ISSUE_BY_ID[issueId];
    const playerPlan = stanceLabel(issue, newStance);
    const rivalStance = next.oppStances?.[issueId];
    if (Number.isInteger(rivalStance) && Number.isInteger(newStance)) {
      const rivalPlan = stanceLabel(issue, rivalStance);
      evidence.policyAnnouncement = { issueId, samePolicy: rivalStance === newStance, playerPublishedWeek: policy.week,
        rivalPublishedWeek: game.week, playerPlan, counterproposal: rivalStance !== newStance ? rivalPlan : null };
    }
  }
  if (game.week >= 5 && next.lastOpponent?.eventTitle && random() < 0.12
    && !(game.incidentLedger || []).some((receipt) => receipt.payload?.staffDeparture)) {
    evidence.staffDeparture = { role: 'Senior adviser', publicExplanation: 'The simulated rival adviser said the campaign was moving away from its cost-of-living message.' };
  }
  const prior = (game.incidentLedger || []).findLast((item) => item.sourceType === 'news-acknowledgement' && item.payload.correction?.claim && item.payload.correction?.text);
  if (prior && next.oppMoves?.some((move) => move.type === 'surrogate') && random() < 0.2) {
    evidence.surrogateClaim = { claim: prior.payload.correction.claim, correction: prior.payload.correction.text, priorCorrectionId: prior.id };
  }
  return evidence;
}

export function build40DebateEvidence(game, questionId, choiceId) {
  if (questionId === 'debate2-q2' && choiceId === 'choice-1') {
    const source = 'The briefing did not verify which actor carried out the strike.';
    return { factCheck: { statistic: 'Attribution confidence stated as certain', status: 'unsupported', correction: source } };
  }
  if (questionId === 'debate3-q1' && choiceId === 'choice-2' && game.promiseLedger?.length) {
    const pledge = game.promiseLedger.findLast((item) => item.issueId === 'economy');
    if (pledge) return { briefingConflict: { detail: 'The full pledge was presented as funded.', savedPosition: 'The saved pledge does not authorize a funding source.', promiseId: pledge.id } };
  }
  return {};
}

export function build40CampaignFactCheck(game, { abbr, issue, backfire, typeId, kind }) {
  if (!backfire || !issue || kind !== 'attack') return null;
  const random = rng(game, 'ad-fact-check', abbr);
  if (random() >= 0.45) return null;
  return { status: 'partly-false', claim: 'The ad attributed the entire ' + issue.label.toLowerCase() + ' policy to the rival.',
    correction: 'The simulated policy record shows the rival supported only one provision.', typeId };
}

export function build40RecordedFollowUp(game, event, receipt) {
  const sourceId = receipt.id;
  const stateId = receipt.stateId;
  let next = game;
  if (event.id === 'donor_ultimatum' && receipt.payload.choiceId === 'choice-1') {
    next = { ...next, campaignPerks: { ...next.campaignPerks, corruptionAd: true } };
  }
  if (event.id === 'm1_donor_price') {
    const condition = 'Use the contributor’s cost-of-living message in the next mailing.';
    next = file(next, 'donor-offer', sourceId, 'The simulated donor memo ties in-kind mail production to a script. ' + condition,
      { contribution: { inKind: 'Mail production', condition }, eventChoiceId: sourceId }, stateId);
  }
  if (event.id === 'surrogate_speech') {
    const briefing = 'Describe the existing household-cost platform.';
    const statement = 'The campaign will cover a local pilot before the first budget.';
    next = file(next, 'surrogate-report', sourceId, 'The simulated surrogate interview departed from the briefing. On the record: “' + statement + '”',
      { interview: { statement, briefing }, pledge: { text: statement, absentFromPlatform: true }, eventChoiceId: sourceId }, stateId);
  }
  if (event.id === 'vp_shortlist' && game.runningMateId) {
    next = { ...next, build40: { ...next.build40, ticketAnnounced: true } };
  }
  return next;
}

export function build40PolicyReview(game, prior) {
  const policy = prior.find((item) => item.sourceType === 'policy-position' && game.week === item.week + 1);
  if (!policy) return game;
  const { issueId, previousStance, newStance } = policy.payload;
  const issue = ISSUE_BY_ID[issueId];
  if (!issue || !Number.isInteger(previousStance) || !Number.isInteger(newStance)) return game;
  let next = game;
  const pledge = game.promiseLedger?.findLast((entry) => entry.issueId === issueId && entry.broken);
  if (pledge) {
    const entries = [stanceLabel(issue, pledge.stance), stanceLabel(issue, newStance)];
    if (entries[0] !== entries[1]) next = file(next, 'policy-review', policy.id + ':platform', 'The public promise ledger and the current ' + issue.label.toLowerCase() + ' platform carry different commitments.',
      { conflictingPlatformEntries: entries, promiseId: pledge.id });
  }
  if (Math.abs(newStance - previousStance) >= 2) {
    const baseCost = 10 + issue.weight * 2;
    const estimates = [{ label: 'Campaign baseline', cost: baseCost }, { label: 'Full implementation', cost: baseCost * 1.2 }];
    next = file(next, 'policy-review', policy.id + ':estimates', 'The simulated policy costing for ' + issue.label.toLowerCase() + ' lists estimates of $' + baseCost + 'M and $' + baseCost * 1.2 + 'M with different implementation assumptions.',
      { estimates, issueId, sourceDecisionId: policy.id });
  }
  if (next.party === 'dem' && ['health', 'abortion', 'energy'].includes(issueId) && newStance > previousStance) {
    next = file(next, 'civic-forum-report', policy.id + ':forum', 'The simulated Neighborhood Policy Forum paused its ' + issue.label.toLowerCase() + ' appearance after reviewing the position change.',
      { organization: 'Neighborhood Policy Forum', issueId, paused: true, sourceDecisionId: policy.id });
  }
  return next;
}

export function build40RunningMateFollowUps(game, prior, calendarWeek) {
  const candidateId = game.runningMateId;
  if (!candidateId) return game;
  const random = rng(game, 'running-mate-report', candidateId);
  let next = game;
  const campaignStop = prior.find((receipt) => receipt.sourceType === 'campaign-action' && receipt.payload?.rally && receipt.week === game.week - 1);
  if (calendarWeek === 4 && campaignStop && random() < 0.6) {
    const place = STATE_BY_ABBR[campaignStop.stateId]?.name;
    if (place) {
      const correction = 'The simulated airport interview named the wrong venue. The campaign confirmed the scheduled ' + place + ' appearance in the transcript.';
      next = file(next, 'running-mate-report', 'travel-clip:' + candidateId, correction, { travelClip: { correction, clip: 'Venue correction at the airport' } }, campaignStop.stateId);
    }
  }
  const issueUpdate = prior.find((receipt) => receipt.sourceType === 'policy-position' && receipt.week === game.week - 1);
  if (issueUpdate && random() < 0.35) {
    const issue = ISSUE_BY_ID[issueUpdate.payload?.issueId];
    const { previousStance, newStance } = issueUpdate.payload;
    if (issue && Number.isInteger(previousStance) && Number.isInteger(newStance) && previousStance !== newStance) {
      const statement = stanceLabel(issue, previousStance);
      const platform = stanceLabel(issue, newStance);
      const recap = 'The running mate’s simulated interview quoted the earlier position on ' + issue.label.toLowerCase()
        + ' (“' + statement + '”). The campaign platform now says “' + platform + '”.';
      next = file(next, 'running-mate-report', issueUpdate.id + ':vp-position', recap, { positionConflict: { statement, platform, issueId: issue.id } });
      if (calendarWeek >= 7 && random() < 0.45) {
        const officialStatement = platform;
        next = file(next, 'running-mate-report', issueUpdate.id + ':vp-officeholder',
          'At a separate simulated appearance, an allied governor backed the new position: “' + officialStatement + '”. The running mate had said “' + statement + '”.',
          { electedOfficialConflict: { officialStatement, runningMateStatement: statement, issueId: issue.id } });
      }
    }
  }
  return next;
}

export function build40FactionCalendar(game, prior, factions) {
  if (factions.length < 2) return game;
  const commitments = build45FactionCommitments(game, prior);
  if (commitments.length < 2 || commitments[0].payload.issueId === commitments[1].payload.issueId) return game;
  const leaders = factions.filter((faction) => ['wing', 'activists'].includes(faction.role)).slice(0, 2);
  if (leaders.length < 2) return game;
  const commitmentIds = commitments.slice(0, 2).map(({ id }) => id);
  const id = commitmentIds.join(':');
  if (prior.some((receipt) => receipt.sourceId === id)) return game;
  const random = rng(game, 'faction-calendar', id);
  if (random() > 0.4) return game;
  return file(game, 'faction-schedule', id, leaders.map(({ label }) => label).join(' and ') + ' booked the same simulated campaign time after two recorded promises.',
    { conflictingDates: true, commitmentIds, factionId: leaders[0].id });
}

export function build40SimulatedElectionNotices(game, stateIds, date, daysRemaining) {
  const stateId = stateIds[0];
  if (!stateId || !STATE_BY_ABBR[stateId]) return game;
  const name = STATE_BY_ABBR[stateId].name;
  const dateKey = date.toISOString().slice(0, 10);
  const once = (current, id, kind, recap, payload) => current.incidentLedger?.some((r) => r.sourceId === id)
    ? current : file(current, 'election-update', id, recap, { kind, date: dateKey, simulated: true, ...payload }, stateId);
  let next = game;
  if (!['dem', 'rep'].includes(game.party) && game.week > 0 && daysRemaining >= 49 && daysRemaining <= 55) {
    const threshold = 1500 + 100 * STATE_BY_ABBR[stateId].ev;
    const signatures = Math.round(threshold * (0.85 + 0.045 * (game.ops?.[stateId] || 0)));
    const id = 'simulation:petition:' + stateId;
    next = once(next, id, 'petition', 'Simulated election update for ' + name + ' (' + dateKey + '): the campaign filed ' + signatures + ' signatures against a modeled threshold of ' + threshold + '.', { party: game.party, signatures, threshold });
    if (signatures < threshold) {
      const claim = 'The filing does not meet the simulated district signature threshold.';
      next = once(next, id + ':challenge', 'petition-challenge', 'Simulated legal challenge in ' + name + ': ' + claim, { filingId: id, claim });
    }
  }
  if (daysRemaining <= 10) {
    const officialNoticeId = 'simulation:precinct:' + stateId;
    const precinctId = stateId + '-SIM-01';
    next = once(next, officialNoticeId, 'polling-place-change', 'Simulated official notice for ' + name + ' (' + dateKey + '): precinct ' + precinctId + ' has moved to the model county civic center.', { officialNoticeId, precinctId });
    const random = rng(game, 'local-election-rumor', stateId);
    if (random() < 0.45) {
      const falseClaim = 'The former polling location is still open.';
      const localStoryId = officialNoticeId + ':local-report';
      next = once(next, localStoryId, 'local-voting-report', 'Simulated local report in ' + name + ': “' + falseClaim + '”', { falseClaim });
      next = once(next, officialNoticeId + ':correction', 'administration-correction', 'Simulated official correction for ' + name + ': ' + falseClaim + ' The official notice lists the new location.', { officialNoticeId, localStoryId, falseClaim });
    }
  }
  return next;
}
