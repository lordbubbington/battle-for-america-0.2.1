// The living local news cycle.
//
// A story lives in one state, is worth a small number of margin points while it
// is loud, decays as the press pack moves on, can turn on you halfway through,
// and crosses into neighbouring states when it gets big enough. Campaign actions
// put stories into the cycle; money can push one up or bury one.

import { STATE_BY_ABBR, STATE_LIST } from '@/data/states';
import { NEIGHBORS } from '@/data/neighbors';
import { mediaEnvironment } from '@/data/media';
import { LOCAL_NEWS_GENERIC, addGeneric } from '@/lib/environment';

export const STORY_CAP = 24;
// A story has to be at least this loud before it crosses a state line.
const SPREAD_FLOOR = 58;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const round1 = (v) => Math.round(v * 10) / 10;

const HEADLINES = {
  good: [
    '{state} likes what it heard',
    'A better week than expected in {state}',
    'The room was with you in {state}',
    '{state} gives you the benefit of the doubt',
  ],
  bad: [
    '{state} is not convinced',
    'Doubt creeps into {state}',
    'The {state} press pack turns',
    'Questions you did not want, in {state}',
  ],
};

function headlineFor(tone, stateName, topic) {
  const pool = HEADLINES[tone] || HEADLINES.bad;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick.replace('{state}', stateName).replace('{topic}', topic || 'the campaign');
}

function newId(game, abbr) {
  return `n${game?.week ?? 0}-${abbr}-${Math.random().toString(36).slice(2, 7)}`;
}

export function makeStory(game, { abbr, tone, topic, weight, salience, life, origin, from, headline, factCheck = null }) {
  const state = STATE_BY_ABBR[abbr];
  if (!state) return null;
  return {
    id: newId(game, abbr),
    abbr,
    headline: headline || headlineFor(tone, state.name, topic),
    ...(factCheck ? { factCheck } : {}),
    tone,
    topic: topic || 'the campaign',
    weight: round1(weight),
    salience: clamp(Math.round(salience), 0, 100),
    life: life ?? 3,
    origin: origin || 'campaign',
    from: from || null,
    echoes: 0,
    mutated: 0,
    week: game?.week ?? 0,
  };
}

// Which stories are yours — the ones the campaign actually made.
export const YOUR_ORIGINS = [
  'visit',
  'townhall',
  'promise',
  'oppo',
  'volunteers',
  'fundraise',
  'ad',
  'adBackfire',
  'scandal',
];

export function isYourStory(story) {
  return !!story && YOUR_ORIGINS.includes(story.origin);
}

export function pushStory(game, spec) {
  const story = makeStory(game, spec);
  if (!story) return game;
  const list = game.stories || [];
  // A state carries one running version of the same story: going back to Ohio
  // again refreshes the story there instead of printing a second copy of it.
  const existing = list.find((s) => s.abbr === story.abbr && s.origin === story.origin && s.tone === story.tone);
  if (existing) {
    game.stories = list.map((s) =>
      s === existing
        ? {
            ...s,
            salience: Math.min(100, s.salience + Math.round(story.salience * 0.35)),
            life: Math.max(s.life || 2, 3),
            week: story.week,
          }
        : s
    );
    return existing;
  }
  game.stories = [story, ...list].slice(0, STORY_CAP);
  return story;
}

// The world keeps making local news whether or not the campaign is in town.
const AMBIENT = [
  { tone: 'bad', topic: 'the plant', weight: 0.22, headline: '{state}: the plant cuts a shift' },
  { tone: 'good', topic: 'the plant', weight: 0.22, headline: '{state} lands the plant expansion' },
  { tone: 'bad', topic: 'the roads', weight: 0.18, headline: '{state} loses its road money' },
  { tone: 'good', topic: 'the roads', weight: 0.18, headline: '{state} finally gets the highway bill' },
  { tone: 'bad', topic: 'health care', weight: 0.2, headline: 'The {state} hospital closes its maternity ward' },
  { tone: 'good', topic: 'health care', weight: 0.2, headline: '{state} hospital adds a hundred beds' },
  { tone: 'bad', topic: 'the weather', weight: 0.16, headline: 'The storm takes {state} by surprise' },
  { tone: 'good', topic: 'the schools', weight: 0.16, headline: '{state} test scores jump, and nobody knows why' },
];

export function ambientStory(game, abbr) {
  const state = STATE_BY_ABBR[abbr];
  if (!state) return null;
  const pick = AMBIENT[Math.floor(Math.random() * AMBIENT.length)];
  return pushStory(game, {
    abbr,
    tone: pick.tone,
    topic: pick.topic,
    weight: pick.weight,
    salience: 38 + Math.round(Math.random() * 22),
    life: 2,
    origin: `ambient-${pick.topic}`,
    headline: pick.headline.replace('{state}', state.name),
  });
}

// The other campaign had a week too, and it is not good news for you.
export function opponentStory(game, abbr) {
  const state = STATE_BY_ABBR[abbr];
  if (!state) return null;
  return pushStory(game, {
    abbr,
    tone: 'bad',
    topic: 'the other campaign',
    weight: 0.4,
    salience: 60,
    life: 3,
    origin: 'opponent',
    headline: `The other campaign takes ${state.name} seriously`,
  });
}

// A third party stops being a novelty and starts being a story — but only once
// it is polling well enough to be worth a camera.
export function thirdPartyStory(game, abbr, label) {
  const state = STATE_BY_ABBR[abbr];
  if (!state) return null;
  return pushStory(game, {
    abbr,
    tone: 'bad',
    topic: 'the third party',
    weight: 0.3,
    salience: 50,
    life: 2,
    origin: 'thirdparty',
    headline: `${label || 'The third party'} gets a hearing in ${state.name}`,
  });
}

export function storiesIn(game, abbr) {
  return (game?.stories || [])
    .filter((s) => s.abbr === abbr)
    .slice()
    .sort((a, b) => b.salience - a.salience);
}

export function topStories(game, count = 4) {
  return (game?.stories || [])
    .slice()
    .sort((a, b) => b.salience - a.salience)
    .slice(0, count);
}

export function isTalkingAbout(game, abbr) {
  const lead = storiesIn(game, abbr)[0];
  return lead ? lead.topic : null;
}

// ---------------------------------------------------------------------------
// Money: a press call, priced by the state's media market.
// ---------------------------------------------------------------------------

export function spinCost(game, abbr, mode = 'amplify') {
  const env = mediaEnvironment(abbr);
  if (!env) return 0;
  const used = game?.spins?.[abbr] || 0;
  const base = (0.14 + env.outlets * 0.09) * env.costMul;
  const price = base * Math.pow(1.6, used) * (mode === 'bury' ? 1.2 : 1);
  return Math.max(0.1, Math.round(price * 10) / 10);
}

export function spinsUsed(game, abbr) {
  return game?.spins?.[abbr] || 0;
}

// Two ways to work the refs, both cheap and both capable of going wrong: push a
// story until it is the only thing anyone is talking about, or lean on the local
// desk until it goes away. Either can become the story itself.
export function spinStory(game, abbr, storyId, mode) {
  const stories = game.stories || [];
  const story = stories.find((s) => s.id === storyId);
  if (!story || story.abbr !== abbr || !['amplify', 'bury'].includes(mode)) return game;
  const cost = spinCost(game, abbr, mode);
  if (cost > game.funds) return game;

  const stateName = STATE_BY_ABBR[abbr]?.name || abbr;
  const next = {
    ...game,
    stories: stories.map((s) => ({ ...s })),
    spins: { ...(game.spins || {}) },
    weekLog: [...(game.weekLog || [])],
  };
  const target = next.stories.find((s) => s.id === storyId);
  const salienceBefore = target.salience;
  const backfire = Math.random() < (mode === 'amplify' ? 0.14 : 0.22);
  const salienceChange = mode === 'amplify' ? 26 : -42;
  let note = '';
  target.campaignResponses = (target.campaignResponses || 0) + 1;

  if (mode === 'amplify') {
    if (backfire) {
      target.tone = target.tone === 'good' ? 'bad' : 'good';
      target.salience = clamp(target.salience + 14, 0, 100);
      target.mutated = (target.mutated || 0) + 1;
      note = `Pushed the story in ${stateName} and the push became the story — it turned on you`;
    } else {
      target.salience = clamp(target.salience + salienceChange, 0, 100);
      target.life = Math.max(target.life || 2, 3);
      note = `Bought a week of airtime in ${stateName} — the story is everywhere now`;
    }
  } else if (backfire) {
    target.salience = clamp(target.salience + 16, 0, 100);
    note = `Leaned on ${stateName} to drop the story. The call got reported instead`;
  } else if (target.salience + salienceChange <= 12) {
    next.stories = next.stories.filter((s) => s.id !== storyId);
    note = `The story is gone in ${stateName} — nobody is asking anymore`;
  } else {
    target.salience = target.salience + salienceChange;
    note = `Buried it in ${stateName} — the story loses the front page`;
  }

  next.funds = Math.max(0, round1(next.funds - cost));
  next.spins = { ...next.spins, [abbr]: (next.spins[abbr] || 0) + 1 };
  const factCheck = target.factCheck || (target.origin === 'adBackfire' && game.lastAd?.abbr === abbr ? game.lastAd.factCheck : null);
  next.lastSpin = {
    claim: factCheck?.claim || null,
    sourceCheck: factCheck || null,
    abbr,
    mode,
    cost,
    backfire,
    note,
    week: game.week,
    storyId,
    storyHeadline: target.headline,
    salienceBefore,
    salienceAfter: target.salience,
    storyUpdates: Number(target.updates) || 0,
    responseCount: target.campaignResponses,
    remainsProminent: next.stories.some((story) => story.id === storyId && story.salience >= 60),
  };
  next.lastAction = note;
  next.weekLog = [...next.weekLog, note];
  return next;
}

// ---------------------------------------------------------------------------
// The week: every story pays out, fades, possibly turns, and possibly travels.
// ---------------------------------------------------------------------------

function neighbourFor(game, story, spoken) {
  const ring = NEIGHBORS[story.abbr] || [];
  const pool = ring.length
    ? ring
    : STATE_LIST.filter((s) => s.region === STATE_BY_ABBR[story.abbr]?.region).map((s) => s.abbr);
  const free = pool.filter((a) => !spoken.has(a) && !(game.stories || []).some((s) => s.abbr === a && s.from === story.id));
  if (!free.length) return null;
  return free[Math.floor(Math.random() * free.length)];
}

export function advanceNews(game) {
  const pov = game.party === 'rep' ? -1 : 1;
  const kept = [];
  const born = [];
  const spoken = new Set();

  (game.stories || []).forEach((story) => {
    const state = STATE_BY_ABBR[story.abbr];
    if (!state) return;
    const env = mediaEnvironment(story.abbr);
    const salience = clamp(story.salience, 0, 100);
    const sign = story.tone === 'good' ? 1 : -1;

    // It moves the state while it is loud, and less as it fades.
    const strength = story.weight * (salience / 100);
    const regMul = (sign > 0 && (game.build40?.modeId === 'regional-parties' || game.build39?.scenario?.id === 'regional-parties')) ? 10 : 1;
    game.stateMods[story.abbr] = (game.stateMods[story.abbr] || 0) + strength * sign * pov * regMul;
    // The local news moves the whole ballot in that state, not just the top of
    // it — and it moves the generic ballot harder than any rally does.
    addGeneric(game, story.abbr, strength * sign * pov * LOCAL_NEWS_GENERIC);
    // The news changes minds. It does not change who shows up — that is the
    // campaign's own work, and turnout is tracked party by party elsewhere.

    const attention = env?.attention ?? 1;
    const spread = env?.spread ?? 0.4;
    let nextSalience = salience - Math.round(22 / attention);
    let life = (story.life ?? 2) - 1;
    let tone = story.tone;
    let headline = story.headline;
    let mutated = story.mutated || 0;

    // Halfway through its life a campaign story can flip: the follow-up lands,
    // the clip gets a second reading, the detail stops being flattering. A
    // closing plant does not change its mind.
    const canTurn = isYourStory(story) || story.origin === 'opponent';
    if (canTurn && nextSalience > 18 && nextSalience < 62 && Math.random() < 0.22) {
      tone = tone === 'good' ? 'bad' : 'good';
      mutated += 1;
      headline = headlineFor(tone, state.name, story.topic);
    }

    // Loud stories cross a state line — small states export their news.
    if (nextSalience >= SPREAD_FLOOR && Math.random() < spread && (story.echoes || 0) < 3) {
      const to = neighbourFor(game, story, spoken);
      if (to) {
        spoken.add(to);
        born.push({
          ...story,
          id: newId(game, to),
          abbr: to,
          headline: `${headline} — ${state.name} story travels`,
          weight: round1(story.weight * 0.45),
          salience: 55,
          life: 2,
          from: story.id,
          echoes: 0,
          mutated: 0,
          spin: undefined,
        });
      }
    }

    if (nextSalience > 12 && life > 0) {
      kept.push({ ...story, salience: nextSalience, life, tone, headline, mutated, updates: (Number(story.updates) || 0) + 1 });
    }
  });

  game.stories = [...kept, ...born].slice(0, STORY_CAP);
  return game;
}

// ---------------------------------------------------------------------------
// Stories the campaign makes. Actions put them in the cycle; events can too.
// ---------------------------------------------------------------------------

const ACTION_STORY = {
  visit: { good: { weight: 0.4, salience: 58, topic: 'the stump speech' }, bad: { weight: 0.4, salience: 58, topic: 'the campaign' } },
  townhall: { good: { weight: 0.55, salience: 62, topic: 'the town hall' }, bad: { weight: 0.5, salience: 66, topic: 'the gaffe' } },
  promise: { good: { weight: 0.55, salience: 60, topic: 'the promise' }, bad: { weight: 0.5, salience: 64, topic: 'the promise' } },
  oppo: { good: { weight: 0.5, salience: 64, topic: 'the oppo file' }, bad: { weight: 0.5, salience: 64, topic: 'the oppo file' } },
  ad: { good: { weight: 0.4, salience: 56, topic: 'the ad' }, bad: { weight: 0.55, salience: 68, topic: 'the ad' } },
  volunteers: { good: { weight: 0.25, salience: 45, topic: 'the field operation' } },
  fundraise: { good: { weight: 0.3, salience: 48, topic: 'the money' } },
  adBackfire: { bad: { weight: 0.65, salience: 72, topic: 'the ad' } },
  scandal: { bad: { weight: 0.75, salience: 78, topic: 'the scandal' } },
};

// `kind` is the story source, `good` says which way it reads for you.
export function storyFrom(game, abbr, kind, good, topic) {
  const spec = ACTION_STORY[kind]?.[good ? 'good' : 'bad'];
  if (!spec || !abbr) return null;
  return {
    abbr,
    tone: good ? 'good' : 'bad',
    topic: topic || spec.topic,
    weight: spec.weight,
    salience: spec.salience,
    life: 3,
    origin: kind,
  };
}
