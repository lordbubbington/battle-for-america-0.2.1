// Dealing the world's news.
//
// Every state gets two to four stories a week out of the three hundred in
// '@/data/worldNews'. None of them are about the campaign: they are the things
// that happen to a country on its own schedule. Each one does two jobs in the
// state it lands in —
//
//   * it makes one stance on one issue more attractive, so the vote there drifts
//     toward whichever candidate already holds that stance;
//   * it raises that issue's salience in the state for a few weeks, which changes
//     what the state's voters are actually voting on.
//
// Both fade: a state that spent a fortnight arguing about the hospital is not
// still arguing about it in October.

import { BASE_LEANS, STATES, STATE_BY_ABBR } from '@/data/states';
import { stateIssueAlignment } from '@/data/platform';
import { mediaEnvironment } from '@/data/media';
import { WORLD_BY_ID, WORLD_STORIES } from '@/data/worldNews';
import { mainGameWorldStories } from '@/lib/endorsementRemoval.mjs';

const round2 = (v) => Math.round(v * 100) / 100;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// How much of last week's noise is still in the air.
const SHIFT_DECAY = 0.5;
const SALIENCE_DECAY = 0.7;
const RECENT_MEMORY = 120;
const DOWNBALLOT_NEWS_DECAY = 0.62;

const ISSUE_RACE_RELEVANCE = {
  affordability: { senate: 0.22, house: 0.3, gov: 0.32 },
  economy: { senate: 0.2, house: 0.3, gov: 0.34 },
  health: { senate: 0.28, house: 0.34, gov: 0.42 },
  iran: { senate: 0.12, house: 0.08, gov: 0.1 },
  corruption: { senate: 0.38, house: 0.28, gov: 0.42 },
  prices: { senate: 0.22, house: 0.3, gov: 0.32 },
  immigration: { senate: 0.28, house: 0.25, gov: 0.3 },
  inequality: { senate: 0.22, house: 0.3, gov: 0.28 },
  abortion: { senate: 0.32, house: 0.34, gov: 0.42 },
  rent: { senate: 0.18, house: 0.32, gov: 0.34 },
  tariffs: { senate: 0.22, house: 0.26, gov: 0.28 },
  gerrymandering: { senate: 0.34, house: 0.45, gov: 0.36 },
  israel: { senate: 0.15, house: 0.1, gov: 0.12 },
  crime: { senate: 0.26, house: 0.3, gov: 0.38 },
  datacenters: { senate: 0.18, house: 0.32, gov: 0.34 },
  energy: { senate: 0.22, house: 0.3, gov: 0.38 },
  ai: { senate: 0.15, house: 0.25, gov: 0.3 },
  trans: { senate: 0.22, house: 0.3, gov: 0.36 },
  birthrate: { senate: 0.15, house: 0.2, gov: 0.28 },
};

const tagCache = {};

// What kind of state this is, for matching a story to somewhere it would land.
export function stateTags(abbr) {
  if (tagCache[abbr]) return tagCache[abbr];
  const state = STATE_BY_ABBR[abbr];
  if (!state) return [];
  const lean = BASE_LEANS[abbr] ?? 0;
  const tags = [state.region];
  tags.push(state.ev >= 20 ? 'big' : state.ev <= 6 ? 'small' : 'medium');
  tags.push(lean <= -5 ? 'blue' : lean >= 5 ? 'red' : 'purple');
  tagCache[abbr] = tags;
  return tags;
}

function fit(story, tags) {
  let weight = 1;
  story.tags.forEach((t) => {
    if (tags.includes(t)) weight += 0.9;
  });
  return weight;
}

function pickStory(tags, exclude) {
  const pool = mainGameWorldStories(WORLD_STORIES);
  let total = 0;
  const weights = pool.map((s) => {
    if (exclude.has(s.id)) return 0;
    const w = fit(s, tags);
    total += w;
    return w;
  });
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// How well a stance answers what the story just made popular: 1 for holding it,
// a half for holding the one next door, almost nothing for the far end.
function match(stance, lean) {
  return 1 - Math.abs(stance - lean) / 2;
}

// What one story does in one state.
export function storyEffect(game, abbr, story) {
  const env = mediaEnvironment(abbr);
  const attention = env?.attention ?? 1;
  const pov = game.party === 'rep' ? -1 : 1;

  const mine = game.stances?.[story.issue] ?? 1;
  const theirs = game.oppStances?.[story.issue] ?? 1;
  // The state's appetite for the stance that just gained ground: a hawkish story
  // moves a hawkish state much more than a dove one.
  const appetite = stateIssueAlignment(abbr, story.issue, story.lean);
  const gap = match(mine, story.lean) - match(theirs, story.lean);

  return {
    // In Democratic-minus-Republican margin points, which is how the map is read.
    shift: round2(appetite * gap * story.mag * 0.5 * attention * pov),
    salience: round2(story.mag * 0.2 * attention),
  };
}

export function issueSalience(game, abbr, issueId) {
  return game?.salience?.[abbr]?.[issueId] || 1;
}

// Deal the week: which stories ran where, what they moved, and how worked up
// every state now is about which issue.
export function rollWorldNews(game) {
  const shifts = {};
  const salience = {};
  const downballotNews = { senate: {}, house: {}, gov: {} };

  // Last week's news fades before this week's is dealt.
  Object.entries(game.worldShift || {}).forEach(([abbr, value]) => {
    const next = round2(value * SHIFT_DECAY);
    if (Math.abs(next) >= 0.05) shifts[abbr] = next;
  });
  Object.entries(game.salience || {}).forEach(([abbr, map]) => {
    const kept = {};
    Object.entries(map).forEach(([issueId, value]) => {
      const next = round2(1 + (value - 1) * SALIENCE_DECAY);
      if (next >= 1.03) kept[issueId] = next;
    });
    if (Object.keys(kept).length) salience[abbr] = kept;
  });
  Object.keys(downballotNews).forEach((kind) => {
    Object.entries(game.downballotNews?.[kind] || {}).forEach(([abbr, value]) => {
      const faded = round2(value * DOWNBALLOT_NEWS_DECAY);
      if (Math.abs(faded) >= 0.03) downballotNews[kind][abbr] = faded;
    });
  });

  const recent = new Set((game.worldRecent || []).slice(-RECENT_MEMORY));
  const cards = {};
  const dealt = [];

  STATES.forEach((state) => {
    const tags = stateTags(state.abbr);
    // Two to four stories, most weeks three.
    const count = 2 + (Math.random() < 0.55 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
    const taken = new Set();
    const mine = [];

    for (let i = 0; i < count; i++) {
      const story = pickStory(tags, new Set([...taken, ...recent]));
      if (!story) break;
      taken.add(story.id);
      mine.push(story.id);
      dealt.push(story.id);

      const eff = storyEffect(game, state.abbr, story);
      shifts[state.abbr] = round2((shifts[state.abbr] || 0) + eff.shift);
      const raceFit = ISSUE_RACE_RELEVANCE[story.issue] || { senate: 0.18, house: 0.24, gov: 0.28 };
      Object.entries(raceFit).forEach(([kind, weight]) => {
        const value = clamp((downballotNews[kind][state.abbr] || 0) + eff.shift * weight, -2.5, 2.5);
        downballotNews[kind][state.abbr] = round2(value);
      });
      const map = salience[state.abbr] || {};
      map[story.issue] = clamp(round2((map[story.issue] || 1) + eff.salience), 1, 3);
      salience[state.abbr] = map;
    }

    if (mine.length) cards[state.abbr] = mine;
  });

  return {
    cards,
    shifts,
    salience,
    downballotNews,
    recent: [...(game.worldRecent || []), ...dealt].slice(-RECENT_MEMORY),
  };
}

// This week's stories in one state, ready for the panel.
export function worldNewsIn(game, abbr) {
  return (game?.worldNews?.[abbr] || []).map((id) => WORLD_BY_ID[id]).filter(Boolean);
}
