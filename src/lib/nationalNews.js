// The national desk.
//
// One card a week, drawn from the hundred in '@/data/nationalNews', before the
// campaign's own card for the week. The country's news is not the player's to
// steer: it lands, it moves the national environment, and some of it keeps
// paying out for weeks (see NATIONAL_ARCS).
//
// Nothing here reads the campaign's choices. That is the point.

import { CARD_BY_ID, NATIONAL_ARCS, NATIONAL_CARDS } from '@/data/nationalNews';
import { mainGameNationalCards } from '@/lib/endorsementRemoval.mjs';
import { applyNationalNewsBalanceCorrections } from '@/data/nationalNewsCorrections';
import { RIVAL_INCIDENT_NEWS } from '@/data/rivalIncidentNews';
import { BUILD40_EVENTS } from '@/data/build40EventCatalog';
import { build40ModeOf } from '@/lib/build40DecisionRuntime';
import { createSeededRandom } from '@/lib/seededRandom';
import { FOUR_PARTY_NEWS_EVENTS } from '@/data/fourPartyNews';
import { STATES } from '@/data/states';
import { addGeneric, applyNationalGenericSwing } from '@/lib/environment';
import { queueIncidentResponse } from '@/lib/incidentResponses';

const round2 = (v) => Math.round(v * 100) / 100;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// How long before a story can run again.
const MEMORY = 40;
export const TRACK_CAP = 14;

export function nationalNewsCard(game) {
  if (game?.fourPartyNationalCard?.id === game.natNews) return game.fourPartyNationalCard;
  if (game?.rivalIncidentNewsCard?.id === game.natNews) return game.rivalIncidentNewsCard;
  const card = game?.natNews ? CARD_BY_ID[game.natNews] || null : null;
  if (!card) return null;
  return applyNationalNewsBalanceCorrections([card], {
    incumbentParty: ['trump', 'vance'].includes(game?.sittingPresidentId) ? 'rep' : 'dem',
    priorShutdownBlameParty: game?.shutdownBlameParty || null,
  })[0];
}

export function arcOf(game) {
  return game?.arc ? NATIONAL_ARCS[game.arc.id] || game.arc : null;
}

// Which story files this week. A follow-up set last week always lands; a story
// that ends a running one only files while that one is running; and a new
// running story waits its turn.
export function drawNationalNews(game) {
  const prev = nationalNewsCard(game);
  const followCard = prev?.follow && CARD_BY_ID[prev.follow] ? mainGameNationalCards([CARD_BY_ID[prev.follow]])[0] : null;
  if (followCard) {
    return applyNationalNewsBalanceCorrections([followCard], {
      incumbentParty: ['trump', 'vance'].includes(game?.sittingPresidentId) ? 'rep' : 'dem',
      priorShutdownBlameParty: game?.shutdownBlameParty || null,
    })[0];
  }

  const publishedReceipts = new Set(game.rivalIncidentNewsReceiptIds || []);
  const storyById = new Map(RIVAL_INCIDENT_NEWS.map((story) => [story.id, story]));
  const pendingReceipt = (game.incidentLedger || []).find((receipt) =>
    receipt.sourceType === 'opponent-plan'
    && (receipt.payload?.rivalNewsIncident?.storyId || receipt.payload?.rivalNewsIncident?.id)
    && !publishedReceipts.has(receipt.id)
  );
  if (pendingReceipt) {
    const incident = pendingReceipt.payload.rivalNewsIncident;
    const storyId = incident.storyId || incident.id;
    const story = storyById.get(storyId);
    if (story) return {
      id: 'rival-news-' + pendingReceipt.id,
      receiptId: pendingReceipt.id,
      rivalStoryId: story.id,
      desk: 'Rival campaign',
      icon: 'news',
      headline: story.headline,
      body: story.body + (incident.claim && incident.correction
        ? ' Recorded claim: “' + incident.claim + '” Correction: ' + incident.correction
        : ' The logged evidence is a ' + incident.evidenceType + ': ' + incident.evidence),
      nat: story.nat,
      gen: round2(story.nat * 1.5),
      issue: story.issue,
      receiptRecap: pendingReceipt.recap,
    };
  }

  const recent = new Set((game.natNewsLog || []).slice(-MEMORY));
  const arc = game.arc;
  const incumbentParty = ['trump', 'vance'].includes(game?.sittingPresidentId) ? 'rep' : 'dem';
  const activeCards = applyNationalNewsBalanceCorrections(mainGameNationalCards(NATIONAL_CARDS), {
    incumbentParty,
    priorShutdownBlameParty: game?.shutdownBlameParty || null,
  });
  const pool = activeCards.filter((c) => {
    if (recent.has(c.id)) return false;
    if (c.arc && arc) return false;
    if (c.end && arc?.id !== c.end) return false;
    return true;
  });
  const list = pool.length ? pool : activeCards;
  const total = list.reduce((sum, c) => sum + c.weight, 0);
  let r = Math.random() * total;
  for (const c of list) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return list[list.length - 1];
}

// A running story pays out every week it survives.
export function tickArc(game) {
  const arc = game.arc;
  if (!arc) return game;
  const weeksLeft = (arc.weeksLeft ?? 1) - 1;
  const next = {
    ...game,
    track: clamp(round2((game.track || 0) + (arc.perWeek || 0)), -TRACK_CAP, TRACK_CAP),
  };
  if (weeksLeft > 0) {
    next.arc = { ...arc, weeksLeft };
  } else {
    next.arc = null;
    next.arcEnded = { id: arc.id, label: arc.label, week: game.week };
  }
  return next;
}

// What one card does to the country. `tight` is the eight closest states, which
// is where a national story actually gets fought over.
export function applyNationalNews(game, card, tight = []) {
  if (!card) return game;
  if (card.receiptId && (game.rivalIncidentNewsReceiptIds || []).includes(card.receiptId)) return game;
  const publishedCount = (game.rivalIncidentNewsReceiptIds || []).length;
  const diminishing = card.receiptId ? 1 / (1 + publishedCount * 0.25) : 1;
  const natShift = round2((card.nat || 0) * diminishing);
  const genericShift = round2((card.gen || 0) * diminishing);
  const appliedCard = card.receiptId ? { ...card, nat: natShift, gen: genericShift, effectApplied: true } : card;

  const next = {
    ...game,
    stateMods: { ...game.stateMods },
    natNews: card.id,
    natNewsSeen: false,
    natNewsLog: [...(game.natNewsLog || []), card.id].slice(-90),
    ...(card.receiptId ? {
      rivalIncidentNewsCard: appliedCard,
      rivalIncidentNewsReceiptIds: [...(game.rivalIncidentNewsReceiptIds || []), card.receiptId],
    } : {}),
  };

  next.track = clamp(round2((game.track || 0) + natShift), -TRACK_CAP, TRACK_CAP);

  if (card.mom) next.momentum = clamp(Math.round((game.momentum || 50) + card.mom), 0, 100);

  // Keep the requested national generic movement exact, then distribute the
  // state changes by electorate size and the campaign's partisan/issue fit.
  if (genericShift) applyNationalGenericSwing(next, genericShift, card.issue || null);

  // The battlegrounds also feel it at the top of the ticket.
  if (card.swing) {
    tight.forEach((abbr) => {
      next.stateMods[abbr] = (next.stateMods[abbr] || 0) + natShift * 0.25;
    });
  }

  if (card.states) {
    Object.entries(card.states).forEach(([abbr, amount]) => {
      next.stateMods[abbr] = (next.stateMods[abbr] || 0) + amount;
      addGeneric(next, abbr, amount * 1.4);
    });
  }

  // Whatever the story is about gets louder where it will be argued about.
  if (card.issue) {
    next.salience = { ...(game.salience || {}) };
    tight.forEach((abbr) => {
      const map = { ...(next.salience[abbr] || {}) };
      map[card.issue] = clamp(round2((map[card.issue] || 1) + 0.35), 1, 3);
      next.salience[abbr] = map;
    });
  }

  if (card.arc && NATIONAL_ARCS[card.arc]) {
    const def = NATIONAL_ARCS[card.arc];
    next.arc = { ...def, weeksLeft: def.weeks, started: game.week };
    next.arcEnded = null;
  }
  if (card.end && next.arc?.id === card.end) {
    next.arcEnded = { id: card.end, label: NATIONAL_ARCS[card.end].label, week: game.week };
    next.arc = null;
  }

  // Older campaigns queue a response when the News Desk publishes a correction.
  // Build 40 reads the published receipt through the catalog at dispatch.
  if (!game.build40?.version && appliedCard?.receiptId && appliedCard.effectApplied) {
    const receipt = (next.incidentLedger || []).find((item) => item.id === appliedCard.receiptId);
    if (receipt) {
      next.pendingInterrupts = queueIncidentResponse(receipt, next.pendingInterrupts || [], next);
      next.triggeredEventOnceKeys = [...new Set([
        ...(next.triggeredEventOnceKeys || []),
        ...next.pendingInterrupts.filter((item) => item.receiptKey === receipt.id)
          .map((item) => item.onceKey || item.event?.onceKey).filter(Boolean),
      ])];
    }
  }

  return next;
}

// The whole desk for one week: the running story pays out, then the new card
// lands.
export function weeklyNationalNews(game, tight = []) {
  // Week one opens on the campaign itself, not on the world: the desk files its
  // first story for week two, and every week after.
  if (!game.week) return { ...game, natNews: null, natNewsSeen: true };
  const ticked = tickArc(game);
  const campaignWeek = (game.week || 0) + 1;
  if ((game.build40?.version ? ['four-parties', 'four-party'].includes(build40ModeOf(game)) : game.thirdMode === 'surge') && campaignWeek % 2 === 0) {
    const evenWeekNumber = campaignWeek / 2;
    const party = evenWeekNumber % 2 === 1 ? 'lib' : 'grn';
    const used = new Set(game.fourPartyNationalNewsLog || []);
    const requiredHeadlines = new Set(BUILD40_EVENTS.filter((event) => event.triggerText.includes('Four Parties mode.'))
      .flatMap((event) => [...event.triggerText.matchAll(/“([^”]+)”/g)].map((match) => match[1])));
    const partyStories = FOUR_PARTY_NEWS_EVENTS.filter((event) =>
      (event.nationalOnly || (game.build40?.version && requiredHeadlines.has(event.title))) && event.newsFavor?.[0] === party
    );
    const available = partyStories.filter((event) => !used.has(event.id));
    const starterStories = available.filter((event) => requiredHeadlines.has(event.title));
    const scheduledStarter = game.build40?.version && campaignWeek >= 4 && evenWeekNumber % 3 !== 0;
    const pool = scheduledStarter && starterStories.length ? starterStories : available.length ? available : partyStories;
    const random = createSeededRandom([game.build34CampaignId, 'four-party-news', game.week].join(':'));
    const story = pool[Math.floor(random() * pool.length)];
    if (story) {
      const points = story.choices[0].effects.fourPartyNews.points;
      const label = party === 'lib' ? 'Libertarian' : 'Green';
      const card = {
        id: story.id,
        desk: `${label} campaign`,
        icon: story.icon,
        headline: story.title,
        body: story.text,
        nat: 0,
        gen: 0,
        fourPartyFavor: { party, points },
      };
      const fourPartyNews = { ...(ticked.fourPartyNews || {}) };
      fourPartyNews[party] = (fourPartyNews[party] || 0) + points;
      return {
        ...ticked,
        fourPartyNews,
        natNews: card.id,
        fourPartyNationalCard: card,
        fourPartyNationalNewsLog: [...(game.fourPartyNationalNewsLog || []), story.id],
        natNewsSeen: false,
        natNewsLog: [...(game.natNewsLog || []), card.id].slice(-90),
      };
    }
  }
  const card = drawNationalNews(ticked);
  return applyNationalNews(ticked, card, tight);
}
