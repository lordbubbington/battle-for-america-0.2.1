import { BUILD40_EVENTS } from '@/data/build40EventCatalog';
import { STATE_BY_ABBR } from '@/data/states';
import { FACTION_CONFLICT_EVENTS } from '@/data/factionConflicts';
import { TRIGGERED_EVENT_BY_ID } from '@/data/triggeredEvents';
import { vanceSuccessionEventFor } from '@/data/vanceSuccession';
import { isCommittedIncidentReceipt } from '@/lib/triggeredEventProducers';
import { factionsFor } from '@/lib/factions';
import { readSignals } from '@/lib/storyEngine';
import { build40ModeOf } from '@/lib/build40DecisionRuntime';
import { auditedReceiptEvent, validSelectionReceipt } from '@/lib/build44ReceiptEvidence';

const match = (sourceType, test) => (receipt, game) => receipt.sourceType === sourceType && test(receipt.payload, receipt, game);
const answer = (test) => match('debate-answer', test);
const eventChoice = (test) => match('event-choice', test);
const ad = (test) => match('advertisement', test);
const press = (test) => match('press-action', test);
const rival = (test) => match('opponent-plan', test);
const action = (test) => match('campaign-action', test);

const incidentRules = {
  '002': answer((p) => p.factCheck?.statistic && p.factCheck.status === 'unsupported'),
  '004': answer((p) => p.rivalAnswer?.claim && p.rivalAnswer?.correction),
  '010': answer((p) => ['win', 'edge'].includes(p.verdict?.tier) && p.bestExchange?.label),
  '015': action((p) => p.actionReceipt?.publicStopMoment?.clipShown && p.actionReceipt.publicStopMoment.answers?.length > 0),
  '008': answer((p) => p.debateId === 'vp-debate' && (p.scandal || p.factCheck?.correction)),
  '009': answer((p) => p.briefingConflict?.detail && p.briefingConflict?.savedPosition),
  '012': press((p) => p.storySpin?.claim && p.sourceCheck?.status),
  '014': (r) => ['advertisement', 'campaign-action', 'press-action'].includes(r.sourceType)
    && ['partly-false', 'false'].includes(r.payload.factCheck?.status),
  '020': (r) => ['news-acknowledgement', 'press-action'].includes(r.sourceType) && r.payload.correction?.claim && r.payload.salience >= 68,
  '026': ad((p) => p.result?.rapidResponse === true && ['unsupported', 'partly-false'].includes(p.factCheck?.status)),
  '029': action((p) => p.organicVideo?.posted && p.organicVideo.shares >= p.organicVideo.threshold && !p.organicVideo.paid),
  '032': action((p) => p.volunteerReport?.signups > p.volunteerReport?.expected),
  '033': action((p) => p.rally?.attendance < p.rally?.expectedAttendance),
  '034': action((p) => p.rally?.attendance > p.rally?.venueCapacity && p.rally?.overflow > 0),
  '038': action((p) => p.canvassReport?.districtId && p.canvassReport?.affectedAddresses > 0),
  '039': match('election-update', (p) => p.kind === 'early-vote' && p.reportedVotes > p.projectedVotes),
  '042': match('policy-position', (p) => p.organizationResponse?.sector === 'faith' && p.organizationResponse?.criticism),
  '013': eventChoice((p) => p.eventId === 'leak' && p.memoApproval?.line && p.memoApproval?.verified),
  '044': answer((p) => p.moderateApproval > 0 && p.groupShifts?.moderate > 0),
  '048': match('election-update', (p) => p.kind === 'petition' && p.party === 'grn' && p.signatures < p.threshold),
  '049': match('faction-schedule', (p) => p.conflictingDates && p.commitmentIds?.length === 2),
  '061': match('policy-review', (p) => p.promiseId && p.costWarning),
  '065': match('policy-review', (p) => p.estimates?.length === 2 && p.estimates[0]?.cost !== p.estimates[1]?.cost),
  '068': match('policy-review', (p) => p.conflictingPlatformEntries?.length === 2),
  '073': rival((p, receipt, game) => p.rivalNewsIncident?.claim && p.rivalNewsIncident?.correction
    && game.rivalIncidentNewsCard?.receiptId === receipt.id && game.rivalIncidentNewsCard?.effectApplied === true),
  '072': rival((p) => p.neglectedStateMove?.effectApplied && ['stop', 'ad', 'issue-ad'].includes(p.neglectedStateMove.type) && p.neglectedStateMove.playerAttention < 0.15 && p.neglectedStateMove.effectMagnitude > 0),
  '071': rival((p) => p.archiveAd?.statement && p.archiveAd?.reach > 0),
  '074': rival((p) => p.policyAnnouncement?.samePolicy && p.policyAnnouncement?.playerPublishedWeek < p.policyAnnouncement?.rivalPublishedWeek),
  '075': rival((p) => p.staffDeparture?.role && p.staffDeparture?.publicExplanation),
  '076': rival((p) => p.policyAnnouncement?.playerPlan && p.policyAnnouncement?.counterproposal),
  '077': rival((p) => p.surrogateClaim?.claim && p.surrogateClaim?.correction && p.surrogateClaim?.priorCorrectionId),
  '078': answer((p) => p.rivalAnswer?.score >= 3 && p.rivalAnswer.snapPollGain > 0),
  '028': ad((p) => p.result?.typeId === 'digital' && p.result?.audience?.unexpected && p.result?.audience?.comments > 0),
  '079': rival((p) => p.attendance?.observed < p.attendance?.expected && p.attendance?.localCoverage),
  '081': match('running-mate-report', (p) => p.travelClip?.correction),
  '082': answer((p) => p.debateId === 'vp-debate' && p.answerScore >= 4 && p.clip?.status === 'widely-shared'),
  '083': match('running-mate-report', (p) => p.positionConflict?.statement && p.positionConflict?.platform),
  '084': match('surrogate-report', (p) => p.interview?.statement && p.interview?.briefing && p.interview.statement !== p.interview.briefing),
  '086': match('running-mate-report', (p) => p.electedOfficialConflict?.officialStatement && p.electedOfficialConflict?.runningMateStatement),
  '087': match('surrogate-report', (p) => p.pledge?.text && p.pledge?.absentFromPlatform),
  '088': match('running-mate-report', (p) => p.vetting?.publicSource && p.vetting?.candidateId),
  '090': answer((p) => p.ticketReadinessQuestion?.text),
  '093': match('civic-forum-report', (p) => p.organization && p.issueId && p.paused === true),
  '094': match('donor-offer', (p) => p.contribution?.inKind && p.contribution?.condition),
  '095': match('finance-report', (p) => p.filed && p.flaggedLine?.label && Number.isFinite(p.flaggedLine?.amount)),
  '096': match('election-update', (p) => p.kind === 'petition' && !['dem', 'rep'].includes(p.party) && p.signatures < p.threshold),
  '097': match('election-update', (p) => p.kind === 'petition-challenge' && p.filingId && p.claim),
  '098': match('election-update', (p) => p.kind === 'early-vote' && p.reportedVotes < p.fieldTarget),
  '099': match('election-update', (p) => p.kind === 'polling-place-change' && p.precinctId && p.officialNoticeId),
  '100': match('election-update', (p) => p.kind === 'administration-correction' && p.officialNoticeId && p.localStoryId && p.falseClaim),
};

export function build40Notice(id, week, recap, extra = {}) {
  return { id: id + ':' + week, sourceId: id, week, recap, ...extra };
}

function linkedDecision(game, event, receipts) {
  const titles = [...event.triggerText.matchAll(/“([^”]+)”/g)].map((match) => match[1]);
  const starters = BUILD40_EVENTS.filter((entry) => (event.id === 'derived_housing_permit_count' && entry.id === 'm2_housing') || titles.includes(entry.title) || entry.designNotes?.some((note) =>
    note.startsWith('Previous title. ') && titles.includes(note.slice('Previous title. '.length))));
  const validSource = event.triggerText.includes('Four Parties mode.') ? 'news-acknowledgement' : 'event-choice';
  return receipts.find((receipt) => receipt.sourceType === validSource && receipt.week + 1 === game.week
    && (titles.includes(receipt.payload.eventTitle || receipt.payload.headline)
      || starters.some((entry) => entry.id === receipt.payload.eventId))) || null;
}

const signals = {
  signal_coalition_crack: (s) => s.slidingGroup && {
    key: s.slidingGroup.id, groupId: s.slidingGroup.id, recap: s.slidingGroup.label + ' has recorded a sustained decline.',
  },
  signal_donor_revolt: (s) => s.worstFaction?.id === 'donors' && s.worstFaction.standing < 42 && {
    key: 'donors', factionId: 'donors', recap: s.worstFaction.label + ' is the least supportive faction at ' + Math.round(s.worstFaction.standing) + '.',
  },
  signal_field_revolt: (s) => s.worstFaction?.id === 'activists' && s.worstFaction.standing < 42 && {
    key: 'activists', factionId: 'activists', recap: s.worstFaction.label + ' is the least supportive faction at ' + Math.round(s.worstFaction.standing) + '.',
  },
  signal_scandal_followup: (s) => s.freshScandal && {
    key: s.freshScandal.week, recap: 'The campaign log records a ' + s.freshScandal.level + ' scandal.',
  },
  signal_story_boom: (s) => s.topStory?.salience >= 68 && {
    key: s.topStory.id, storyId: s.topStory.id, stateId: s.topStory.abbr, recap: s.topStory.headline + ' reached ' + Math.round(s.topStory.salience) + ' attention.',
  },
  signal_overexposure: (s) => s.hot?.points >= 9 && {
    key: s.hot.abbr, stateId: s.hot.abbr, recap: s.hot.name + ' reached ' + Math.round(s.hot.points) + ' campaign exposure points.',
  },
};

const extraRules = {
  m1_debate_moment: answer((p) => p.evasive && p.clip?.status === 'widely-shared'),
  debate: answer((p) => p.debateId === 'debate1' && p.verdict),
  debate_vp: answer((p) => p.debateId === 'vp-debate' && p.verdict && p.exchangeUnderReview),
  m2_vp_debate: answer((p) => p.debateId === 'vp-debate' && p.clip?.status === 'widely-shared'),
  signal_story_backlash: eventChoice((p) => p.eventId === 'signal_story_boom' && p.storyId && p.choiceId === 'choice-1'),
  signal_scandal_oath: match('hearing-request', (p) => p.eventId === 'signal_scandal_followup' && p.sourceDecisionId && p.requestedTestimony),
  party_infight: match('faction-schedule', (p) => p.cancelled && p.approval <= 45 && p.leastSupportive),
  bribe_ad_viral_followup: ad((p) => p.result?.corruption?.declinedCondition && p.result?.corruption?.viral),
  convention: match('campaign-briefing', (p) => p.kind === 'convention' && p.delayedOpeningBroadcast),
};

export function build40DecisionEligibility(game, event, { actingParty = game.party, onlyDraw = false, read = null, receipts = [] } = {}) {
  const bucket = event.bucket.toLowerCase();
  const text = event.triggerText;
  if (bucket.includes('republican') && actingParty !== 'rep') return false;
  if (bucket.includes('democrat') && actingParty !== 'dem') return false;
  const factionConflict = FACTION_CONFLICT_EVENTS.find((conflict) => conflict.id === event.id);
  if (factionConflict && (actingParty !== factionConflict.partyOnly
    || !factionConflict.factionConflict.factions.every((id) => factionsFor(actingParty).some((faction) => faction.id === id)))) return false;
  if (/Four Parties mode\./i.test(text) && !['four-party', 'four-parties'].includes(build40ModeOf(game))) return false;
  if (bucket !== 'campaign specific') {
    if (event.id === 'interrupt-069-ballot-measure-conflict') return { recap: 'This fictional ballot-measure incident takes place in the selected state.' };
    if (event.id === 'interrupt-050-faction-policy-trade') return { id: event.id + ':draw:' + game.week, factionId: 'labor', recap: 'The report identifies the labor faction.' };
    if (event.id === 'gaffe') return { id: event.id + ':draw:' + game.week, recap: 'A simulated local broadcast logged the venue and the mistaken town name.' };
    if (event.id === 'interrupt-028-streaming-audience') return { id: event.id + ':draw:' + game.week, groupId: 'moderate', recap: 'The simulated placement report identifies moderate voters as the unexpected audience.' };
    return null;
  }
  if (onlyDraw || event.trigger.kind === 'debate-question') return false;
  if (factionConflict) return build40Notice(event.id, game.week, 'Both factions named in the conflict are active.');
  if (event.id.startsWith('derived_')) return linkedDecision(game, event, receipts) || false;
  if (event.id.startsWith('vance_succession_')) {
    return vanceSuccessionEventFor(game)?.id === event.id
      ? build40Notice(event.id, game.week, 'The fictional Republican succession is in progress.')
      : false;
  }
  if (signals[event.id]) {
    const detail = signals[event.id](read || readSignals(game));
    return detail ? { ...detail, id: event.id + ':' + detail.key, week: game.week } : false;
  }
  const number = event.id.match(/^interrupt-(\d+)-/)?.[1];
  if (number) {
    const rule = incidentRules[number];
    const legacy = TRIGGERED_EVENT_BY_ID[event.id];
    if (!rule && !legacy?.enabled) return false;
    const source = receipts.find((receipt) => validSelectionReceipt(game, event.id, receipt)
      && (rule ? rule(receipt, game) : legacy.when(receipt, game)));
    if (!source) return false;
    const shifts = Object.entries(source.payload.groupShifts || {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const reported = source.payload;
    const recap = number === '073' ? game.rivalIncidentNewsCard?.body
      : number === '078' ? 'Rival debate answer: “' + reported.rivalAnswer.text + '” Immediate modeled polling gain: ' + reported.rivalAnswer.snapPollGain + ' points.'
        : source.recap;
    return { ...source, recap: recap || source.recap,
      groupId: source.payload.groupId || source.payload.result?.groupId || shifts[0]?.[0],
      factionId: source.payload.factionId || source.payload.organizationResponse?.factionId };
  }
  if (extraRules[event.id]) {
    const source = receipts.find((r) => extraRules[event.id](r, game));
    return source ? { ...source, factionId: source.payload.factionId || null } : false;
  }
  if (event.id === 'm1_ballot_initiative') return receipts.find((r) => r.sourceType === 'election-update' && r.payload.kind === 'measure-briefing' && r.payload.verified && game.week - r.week <= 1) || false;
  if (event.id === 'vp_shortlist') return receipts.find((r) => r.sourceType === 'campaign-briefing' && r.payload.kind === 'ticket-announcement') || false;
  if (event.id === 'campaign_briefing') return receipts.find((r) => r.sourceType === 'campaign-briefing' && r.payload.kind === 'unfilled-shifts') || false;
  if (event.id === 'fourth_debate') return receipts.find((r) => r.sourceType === 'campaign-briefing' && r.payload.kind === 'extra-debate-invitation') || false;
  if (event.id === 'm2_final_ad_war') return receipts.find((r) => r.sourceType === 'campaign-briefing' && r.payload.kind === 'ad-inventory' && r.payload.constrained) || false;
  if (event.id === 'signal_message_discipline') {
    const reversals = receipts.filter((r) => r.sourceType === 'policy-position' && game.week - r.week <= 2 && r.payload.previousStance !== r.payload.newStance);
    if (reversals.length < 2) return false;
    return { ...reversals[0], recap: 'The policy ledger records ' + reversals.length + ' recent position changes.' };
  }
  if (event.id === 'signal_press_scrutiny') {
    const spins = receipts.filter((r) => r.sourceType === 'press-action' && r.week === game.week);
    if (spins.length < 2) return false;
    return { ...spins[0], recap: 'The campaign spun local coverage ' + spins.length + ' times this week.' };
  }
  return false;
}

export function build40IncidentSources(game) {
  return [...(game.incidentLedger || [])].reverse().filter((r) => isCommittedIncidentReceipt(r, game));
}

export function build40ActingParty(game, definition) {
  return definition.id.startsWith('vance_succession_') ? 'rep' : game.party;
}

export function build40ReportState(incident, eventId = null) {
  if (auditedReceiptEvent(eventId)) return incident?.stateId || incident?.state || null;
  const valid = (state) => STATE_BY_ABBR[state];
  return [incident?.payload?.attendance?.stateId, incident?.payload?.archiveAd?.stateId, incident?.payload?.neglectedStateMove?.abbr, incident?.payload?.result?.abbr, incident?.stateId, incident?.state].find(valid) || null;
}

