import { build40PolicyEvidence, build40RivalEvidence } from '@/lib/build40Reports';
import { STATE_BY_ABBR } from '@/data/states';
import { ENDORSEMENT_LEADERS } from '@/lib/campaignOperations';
import { queueIncidentResponse } from '@/lib/incidentResponses';
import { RIVAL_INTERRUPTION_ONCE_KEY } from '@/lib/rivalInterruptionRules';

const KEEP_RECEIPTS = 150;

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function stateForIncident(next, context, payload) {
  if (context.type === 'ad') return next.lastAd?.abbr || context.abbr || context.abbrs?.[0] || null;
  if (context.type === 'opponent') {
    return [
      payload.neglectedStateMove?.abbr,
      payload.promiseAttack?.abbr,
      context.abbr,
      payload.moves?.find((move) => ['ground', 'volunteers'].includes(move.type))?.state,
    ].find((abbr) => Object.hasOwn(STATE_BY_ABBR, abbr)) || null;
  }
  return context.abbr || context.abbrs?.[0] || payload.stateId || null;
}

function sourceFor(game, next, context) {
  if (context.payload) return { sourceType: context.type, sourceId: context.sourceId || context.payload.headlineId || context.type };
  if (context.type === 'choice') return { sourceType: 'event-choice', sourceId: game.currentEventData?.id || game.currentEventId || 'campaign-event' };
  if (context.type === 'opponent') return { sourceType: 'opponent-plan', sourceId: next.lastOpponent?.eventTitle || 'weekly-plan' };
  if (context.type === 'debate') return { sourceType: 'debate-answer', sourceId: next.debate?.id || 'debate' };
  if (context.type === 'ad') return { sourceType: 'advertisement', sourceId: next.lastAd?.typeId || next.lastAd?.issueId || 'ad-buy' };
  if (context.type === 'promise') return { sourceType: 'campaign-promise', sourceId: context.issueId || 'promise' };
  if (context.type === 'endorsement') return { sourceType: 'endorsement-request', sourceId: context.leaderId || 'endorsement' };
  if (context.type === 'townhall') return { sourceType: 'campaign-action', sourceId: 'townhall' };
  if (context.type === 'action') return { sourceType: 'campaign-action', sourceId: context.actionId || 'action' };
  if (context.type === "faction-milestone") return { sourceType: "faction-milestone", sourceId: `${context.party || game.party}:${context.factionId || "faction"}:${context.threshold}` };
  if (context.type === 'stance') return { sourceType: 'policy-position', sourceId: context.issueId || 'policy' };
  if (context.type === 'spin') return { sourceType: 'press-action', sourceId: next.lastSpin?.storyId || 'press' };
  return { sourceType: context.type || 'campaign-update', sourceId: 'campaign' };
}

function payloadFor(game, next, context) {
  const payload = { type: context.type || 'campaign-update' };
  if (context.payload) return { ...payload, ...context.payload };
  if (context.type === 'choice') {
    payload.eventId = game.currentEventData?.id || game.currentEventId || null;
    payload.candidateId = game.currentEventData?.context?.candidateId || null;
    payload.actingParty = game.currentEventData?.context?.actingParty || game.party;
    payload.eventTitle = game.currentEventData?.title || null;
    payload.eventText = game.currentEventData?.text || null;
    payload.choice = next.outcome?.label || null;
    payload.choiceId = next.outcome?.choiceId || null;
    payload.stateId = next.outcome?.sourceStateId || null;
    payload.storyId = game.currentEventData?.context?.storyId || null;
    payload.issueId = game.currentEventData?.issueId || null;
    payload.text = next.outcome?.text || null;
    payload.scandal = next.outcome?.scandal || null;
    payload.randomizedOutcome = !!next.outcome?.roll;
    if (payload.eventId === 'leak') payload.memoApproval = { line: 'The communications office approved the message change.', verified: true };
    if (game.currentEventData?.type === 'ballot-measure') {
      payload.measureId = game.currentEventData.measureId || null;
      payload.measureState = game.currentEventData.state || null;
      payload.issueId = game.currentEventData.issueId || null;
    }
  } else if (context.type === 'debate') {
    const pick = next.debate?.picks?.at(-1) || null;
    payload.debateId = next.debate?.id || null;
    payload.question = pick?.question || null;
    payload.answer = pick?.answer || pick?.label || null;
    payload.reply = pick?.reply || null;
    payload.scandal = pick?.scandal || null;
    payload.verdict = next.debate?.verdict || null;
    payload.answerScore = pick?.mom ?? null;
    payload.evasive = pick?.evasive === true;
    payload.clip = pick?.clip || null;
    payload.promise = pick?.promise || null;
    payload.promiseLedgerId = pick?.promise?.id || null;
    payload.groupShifts = pick?.groupShifts || null;
    payload.factCheck = pick?.factCheck || null;
    payload.briefingConflict = pick?.briefingConflict || null;
    payload.rivalAnswer = pick?.rivalAnswer || null;
    payload.ticketReadinessQuestion = pick?.ticketReadinessQuestion || null;
    const moderateFaction = game.party === 'dem' ? 'suburbs' : game.party === 'rep' ? 'business' : 'officials';
    payload.moderateApproval = moderateFaction ? (next.factions?.[moderateFaction] || 0) - (game.factions?.[moderateFaction] || 0) : 0;
    if (payload.moderateApproval > 0) payload.factionId = moderateFaction;
    payload.bestExchange = next.debate?.done ? next.debate.picks.slice().sort((a, b) => b.mom - a.mom)[0] : null;
  } else if (context.type === 'action' && context.actionId === 'visit') {
    payload.rally = next.lastRally || null;
    payload.actionReceipt = next.lastActionEvidence?.actionId === 'visit' ? next.lastActionEvidence : null;
  } else if (context.type === 'ad') {
    payload.issueId = context.issueId || null;
    payload.kind = context.kind || null;
    payload.language = context.language || next.lastAd?.language || 'en';
    payload.states = (context.abbrs || []).filter(Boolean);
    payload.result = next.lastAd || null;
    payload.factCheck = payload.result?.factCheck || null;
    payload.results = next.lastAds?.length ? next.lastAds : next.lastAd ? [next.lastAd] : [];
  } else if (context.type === 'promise') {
    payload.issueId = context.issueId || null;
    payload.stance = context.stance ?? null;
    payload.result = next.lastPromise || null;
  } else if (context.type === 'endorsement') {
    payload.leaderId = context.leaderId || null;
    payload.status = next.endorsements?.[context.leaderId]?.status || null;
    payload.favor = next.endorsements?.[context.leaderId]?.favor ?? null;
    payload.leaderName = ENDORSEMENT_LEADERS.find((leader) => leader.id === context.leaderId)?.label || null;
    payload.endorsementRequest = next.lastEndorsementRequest?.leaderId === context.leaderId
      ? next.lastEndorsementRequest
      : null;
  } else if (context.type === 'faction-milestone') {
    payload.party = context.party || game.party;
    payload.factionId = context.factionId || null;
    payload.factionLabel = context.factionLabel || null;
    payload.threshold = context.threshold;
    payload.milestone = context.milestone || null;
  } else if (context.type === 'opponent') {
    payload.moves = (next.oppMoves || []).map((move) => ({ type: move.type, state: move.abbr || null, text: move.text || null }));
    payload.eventTitle = next.lastOpponent?.eventTitle || null;
    payload.choice = next.lastOpponent?.choice || null;
    payload.rivalNewsIncident = next.lastOpponent?.rivalNewsIncident || null;
    payload.promiseAttack = next.lastOpponent?.promiseAttack || null;
    payload.neglectedStateMove = next.lastOpponent?.neglectedStateMove || null;
    Object.assign(payload, build40RivalEvidence(game, next));
  } else if (context.type === 'spin') {
    payload.storySpin = next.lastSpin || null;
    payload.sourceCheck = next.lastSpin?.sourceCheck || null;
    payload.factCheck = payload.sourceCheck;
    payload.correction = payload.sourceCheck?.correction ? { claim: payload.sourceCheck.claim, text: payload.sourceCheck.correction } : null;
    payload.salience = next.lastSpin?.salienceAfter ?? null;
  } else {
    const actionId = context.actionId || (context.type === 'townhall' ? 'townhall' : null);
    payload.actionId = actionId;
    if (actionId === 'ops') payload.levels = Object.fromEntries((context.abbrs || []).map((abbr) => [abbr, next.ops[abbr]]));
    if (actionId === 'volunteers') Object.assign(payload, next.lastVolunteerEvidence, { volunteerReport: next.lastVolunteerReport || null });
    payload.issueId = context.issueId || null;
    payload.result = next.lastAction || null;
    payload.actionReceipt = next.lastActionEvidence?.actionId === actionId
      && next.lastActionEvidence?.abbr === context.abbr
      ? next.lastActionEvidence
      : null;
  }
  if (context.type === 'stance') {
    Object.assign(payload, build40PolicyEvidence(next, context));
    payload.previousStance = Number.isFinite(context.from) ? context.from : null;
    payload.newStance = Number.isFinite(context.to) ? context.to : null;
    const priorIds = new Set((game.promiseLedger || []).filter((promise) => promise.broken).map((promise) => promise.id));
    const broken = (next.promiseLedger || []).find((promise) => promise.broken && !priorIds.has(promise.id));
    if (broken) {
      payload.brokenPromise = true;
      payload.issueId = broken.issueId || context.issueId || null;
      payload.promisedStance = broken.stance;
      payload.newStance = context.to ?? null;
      payload.promiseId = broken.id;
    }
  }
  return payload;
}

/** Store a factual, compact receipt for future event follow-ups and post-game review. */
export function recordIncident(previous, next, context = {}) {
  if (context.type === 'endorsement' || (['choice', 'debate'].includes(context.type) && previous?.build40?.version === 1 && next?.incidentSequence !== previous?.incidentSequence)) return next;
  if (!previous || !next || next === previous) return next;
  const source = sourceFor(previous, next, context);
  const sequence = Math.max(Number(previous.incidentSequence) || 0, (previous.incidentLedger || []).length) + 1;
  const payload = payloadFor(previous, next, context);
  const abbr = stateForIncident(next, context, payload);
  const surrogateRecap = payload.surrogateClaim ? 'Rival surrogate: “' + payload.surrogateClaim.claim + '” Previous correction: ' + payload.surrogateClaim.correction : null;
  const debateRecap = payload.verdict && payload.bestExchange ? payload.verdict.label + '. Best exchange: “' + payload.bestExchange.reply + '”' : null;
  const recap = context.recap || surrogateRecap || debateRecap || payload.attendance?.localCoverage || payload.staffDeparture?.publicExplanation
    || payload.organizationResponse?.criticism || (context.type === 'choice'
    ? `${source.sourceId}: ${payload.choice || 'campaign response'}`
    : context.type === 'opponent'
      ? `${payload.eventTitle || 'Rival campaign'}: ${payload.choice || 'weekly plan'}`
      : next.lastAction || `${source.sourceType} recorded`);
  const baseReceipt = {
    id: `w${previous.week || 0}-${source.sourceType}-${sequence}`,
    incidentId: `w${previous.week || 0}-${source.sourceType}-${sequence}`,
    sourceReceiptId: `w${previous.week || 0}-${source.sourceType}-${sequence}`,
    campaignId: previous.build34CampaignId || previous.campaignId || `legacy:${previous.candidateId || 'campaign'}:${previous.startId || 'unknown'}`,
    provenanceVersion: 2,
    triggerEligible: !(context.type === 'choice' && previous.currentEventData?.legacyWithoutProvenance === true),
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    week: previous.week || 0,
    state: STATE_BY_ABBR[abbr] ? abbr : null,
    stateId: STATE_BY_ABBR[abbr] ? abbr : null,
    region: STATE_BY_ABBR[abbr]?.region || null,
    payload: safeObject(payload),
    recap,
    eligibleFollowUpIds: (next.followUps || []).map((item) => item.id).filter(Boolean),
  };
  // This receipt records what the resolver actually did. Triggered-event
  // producers may inspect it, but never decorate it with a simulated incident.
  const receipt = baseReceipt;
  const recorded = {
    ...next,
    incidentLedger: [...(previous.incidentLedger || []), receipt].slice(-KEEP_RECEIPTS),
    pendingInterrupts: Array.isArray(next.pendingInterrupts) ? next.pendingInterrupts : [],
    incidentSequence: sequence,
  };
  recorded.followUps = (recorded.followUps || []).map((followUp) =>
    followUp.chainId && followUp.queuedWeek === receipt.week &&
      followUp.starterEventId === payload.eventId && followUp.starterChoiceId === payload.choiceId
      ? { ...followUp, starterReceiptId: receipt.id }
      : followUp);
  if (recorded.build40?.version === 1) return recorded;
  recorded.pendingInterrupts = queueIncidentResponse(receipt, recorded.pendingInterrupts, recorded);
  recorded.triggeredEventOnceKeys = [...new Set([
    ...(recorded.triggeredEventOnceKeys || []),
    ...recorded.pendingInterrupts.filter((item) => item.receiptKey === receipt.id)
      .map((item) => item.onceKey || item.event?.onceKey).filter((key) => key && key !== RIVAL_INTERRUPTION_ONCE_KEY),
  ])];
  return recorded;
}
