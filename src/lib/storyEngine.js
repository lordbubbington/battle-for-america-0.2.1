// The story engine: which card shows up this week, and why.
//
// Cards that are not drawn at random come from two places. A due follow-up is
// one the player set in motion two weeks ago by choosing something. A derived
// card is one the current state of the game has earned — a state that has taken
// too much of the candidate's time, a scandal with no replacement story, a
// faction about to walk. Both carry a sentence explaining the cause, which is
// what makes a surprise feel connected instead of random.

import { EVENT_BY_ID } from '@/data/events';
import { mainGameEventCatalog } from '@/lib/endorsementRemoval.mjs';
import { DERIVED_EVENTS } from '@/data/derivedEvents';
import { STATE_BY_ABBR } from '@/data/states';
import { coalitionRows } from '@/lib/coalition';
import { factionStandings, factionsFor } from '@/lib/factions';
import { isYourStory } from '@/lib/news';
import { vanceSuccessionEventFor } from '@/data/vanceSuccession';

// How often a card the world earned wins the week over a random draw.
const DERIVED_CHANCE = 0.72;

export function readSignals(game) {
  if (!game) return null;
  // Where the campaign itself has spent its own attention — the rival's stops in
  // a state do not tire anybody of you.
  const mine = game.fatigue?.[game.party] || {};
  const mineByState = Object.entries(mine).map(([abbr, entry]) => [
    abbr,
    Object.values(entry || {}).reduce((a, b) => a + b, 0),
  ]);
  const hotEntry = mineByState.sort((a, b) => b[1] - a[1])[0];
  const hot = hotEntry
    ? { abbr: hotEntry[0], points: hotEntry[1], name: STATE_BY_ABBR[hotEntry[0]]?.name || hotEntry[0] }
    : null;

  // Only stories the campaign made can earn the campaign a card.
  const topStory =
    (game.stories || [])
      .filter((s) => isYourStory(s))
      .slice()
      .sort((a, b) => b.salience - a.salience)[0] || null;

  const scandals = game.scandals || [];
  const lastScandal = scandals.length ? scandals[scandals.length - 1] : null;
  const freshScandal = lastScandal && game.week - lastScandal.week <= 1 ? lastScandal : null;

  const standings = factionStandings(game);
  const factionList = factionsFor(game.party).map((f) => ({ ...f, standing: standings[f.id] ?? 50 }));
  const worstFaction = factionList.slice().sort((a, b) => a.standing - b.standing)[0] || null;

  const groupRows = coalitionRows(game);
  const weakestGroup = groupRows.slice().sort((a, b) => a.support - b.support)[0] || null;
  // A crack in the coalition is a group that has *left*: plenty of groups never
  // liked you in the first place, and that is not news.
  const slid = groupRows.slice().sort((a, b) => a.moved - b.moved)[0] || null;
  const slidingGroup = slid && slid.moved <= -10 && slid.support >= 20 ? slid : null;

  return {
    week: game.week || 0,
    hot,
    topStory,
    topStoryState: topStory ? STATE_BY_ABBR[topStory.abbr] : null,
    stateName: topStory ? STATE_BY_ABBR[topStory.abbr]?.name || topStory.abbr : null,
    freshScandal,
    worstFaction,
    weakestGroup,
    slidingGroup,
    spins: Object.values(game.spins || {}).reduce((a, b) => a + b, 0),
    flips: game.flips || 0,
  };
}

// A card with a state in it, so `heat` can be aimed at the right place.
export function resolveEventFor(game, event, signals) {
  if (!event) return event;
  const hot = signals?.hot?.abbr || signals?.topStory?.abbr || null;
  if (!hot) return event;
  const choices = event.choices.map((c) => {
    const eff = c.effects || {};
    const next = { ...eff, states: { ...(eff.states || {}) } };
    if (eff.heat === 'hot') next.heat = { [hot]: -3 };
    else if (eff.heat === 'hot-negative') next.heat = { [hot]: 2 };
    else if (!eff.heat) next.heat = {};
    return { ...c, effects: next };
  });
  return { ...event, choices };
}

// Returns { event, why, followUps } — event is null when the week falls back to
// the random deck.
export function takeScriptedEvent(game, { random = Math.random, excludedEventIds = [] } = {}) {
  const followUps = (game.followUps || []).slice();
  const excluded = new Set(excludedEventIds);
  const dueIndex = followUps.findIndex((f) => f.week <= (game.week || 0) && EVENT_BY_ID[f.id] && !excluded.has(f.id) && mainGameEventCatalog([EVENT_BY_ID[f.id]]).length);
  if (dueIndex >= 0) {
    const due = followUps[dueIndex];
    const signals = readSignals(game);
    let event = resolveEventFor(game, mainGameEventCatalog([EVENT_BY_ID[due.id]])[0], signals);
    if (due.chainId) {
      event = {
        ...event,
        chainId: due.chainId,
        starterEventId: due.starterEventId || event.starterEventId,
        starterReceiptId: due.starterReceiptId || null,
        starterChoiceId: due.starterChoiceId || null,
        starterStateId: due.starterStateId || null,
        starterIssueId: due.starterIssueId || null,
      };
    }
    if (due.id === 'bribe_ad_viral_followup') {
      const regionName = ({ northeast: 'the Northeast', south: 'the South', midwest: 'the Midwest', west: 'the West' })[due.region] || 'the region';
      const campaignName = due.party === game.party ? 'Your campaign' : 'The rival campaign';
      event = {
        ...event,
        title: due.party === game.party ? 'The Ad They Couldn’t Buy' : 'The Rival’s Refusal Goes Viral',
        text: `${campaignName}’s anti-corruption ad is spreading across ${regionName}. Voters are sharing the moment the campaign refused a donor’s attempt to buy a policy change.`,
        choices: event.choices.map((choice) => ({
          ...choice,
          effects: { ...(choice.effects || {}), viralGroundGame: { region: due.region, party: due.party } },
          outcome: `${campaignName}’s message becomes a regional symbol. Volunteer teams form across ${regionName}, adding one ground-game level in every state there with no weekly maintenance cost.`,
        })),
      };
    }
    return {
      event,
      why: due.why || 'A thread from an earlier week comes back around.',
      followUps: followUps.filter((_, i) => i !== dueIndex),
    };
  }

  const succession = vanceSuccessionEventFor(game);
  if (succession && !excluded.has(succession.id)) return { event: succession, why: 'A five-part fictional alternate-history succession story is unfolding one card per week.', followUps };

  const signals = readSignals(game);
  const used = game.usedEvents || [];
  const pool = DERIVED_EVENTS.filter((e) => !e.chain && !used.includes(e.id) && e.when(signals));
  if (!pool.length) return { event: null, why: null, followUps };
  if (random() > DERIVED_CHANCE) return { event: null, why: null, followUps };

  const total = pool.reduce((sum, e) => sum + (e.priority || 1), 0);
  let r = random() * total;
  let chosen = pool[pool.length - 1];
  for (const e of pool) {
    r -= e.priority || 1;
    if (r <= 0) {
      chosen = e;
      break;
    }
  }
  return { event: resolveEventFor(game, chosen, signals), why: chosen.why(signals), followUps };
}
