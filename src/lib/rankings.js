// End-of-campaign rankings.
//
// A finished run is scored on the result, the Senate it dragged in, and the
// difficulty it was won on, then filed in a local career table — so a Nightmare
// win outranks a comfortable afternoon on Easy.

import { DIFFICULTIES, EV_TO_WIN } from '@/lib/gameEngine';

const STORAGE_KEY = 'election2028.runs.v1';
const MAX_RUNS = 20;

export const RANKS = [
  {
    min: 660,
    name: 'Political legend',
    blurb: 'They will teach this campaign for forty years, and the other side will still dispute it.',
    color: '#F7C145',
  },
  {
    min: 530,
    name: 'Realigning figure',
    blurb: 'You did not just win an election — you moved a generation and took the Senate with it.',
    color: '#FFD97A',
  },
  {
    min: 430,
    name: 'Landslide artist',
    blurb: 'The map stopped being a map and started being a single colour.',
    color: '#6EE7B7',
  },
  {
    min: 340,
    name: 'Coalition builder',
    blurb: 'Rust Belt, Sun Belt, suburbs — all of it, in the same night, on the same margin.',
    color: '#7FB4FF',
  },
  {
    min: 260,
    name: 'Credible contender',
    blurb: 'You made it a race. Nobody in the spin room called it a fluke.',
    color: '#A8B6D0',
  },
  {
    min: 120,
    name: 'Also-ran',
    blurb: 'A campaign with a beginning, a middle, and an obituary.',
    color: '#FDA4AF',
  },
  {
    min: -Infinity,
    name: 'Footnote',
    blurb: 'Six weeks from now, someone will get your name slightly wrong on a panel show.',
    color: '#9AA7BF',
  },
];

export function rankFor(score) {
  return RANKS.find((r) => score >= r.min) || RANKS[RANKS.length - 1];
}

// Past twenty points of shuffle the map is a sandbox, not a forecast, so a
// finished campaign is not scored at all.
export const SCORING_SHUFFLE_LIMIT = 20;

export function scoringEnabled(game) {
  return (game?.randomness || 0) <= SCORING_SHUFFLE_LIMIT;
}

export function campaignScore(game, result, senate, decidedWinner) {
  const yourEV = game.party === 'dem' ? result.demEV : result.repEV;
  const yourPct = game.party === 'dem' ? result.demPct : result.repPct;
  const senateNet = game.party === 'dem' ? senate.net : -senate.net;
  const mul = DIFFICULTIES[game.difficultyId]?.scoreMul ?? 1;
  // Whoever the rules actually awarded the presidency to — the College, the
  // popular vote, or the House — not just whoever cleared 270.
  const won = decidedWinner ? (decidedWinner === game.party ? 12 : 0) : yourEV >= EV_TO_WIN ? 12 : 0;
  return Math.round((yourEV + senateNet * 4 + (yourPct - 50) * 12 + won) * mul);
}

export function loadRuns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function writeRuns(runs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch (e) {
    /* storage blocked — the result still shows on screen */
  }
}

// Files a finished campaign and reports where it landed.
export function fileRun({ game, result, senate, you, them, decision }) {
  const score = campaignScore(game, result, senate, decision?.winner);
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
    name: you.short,
    opponent: them.short,
    party: game.party,
    difficultyId: game.difficultyId,
    difficultyLabel: DIFFICULTIES[game.difficultyId]?.label ?? 'Medium',
    ev: game.party === 'dem' ? result.demEV : result.repEV,
    oppEv: game.party === 'dem' ? result.repEV : result.demEV,
    pct: game.party === 'dem' ? result.demPct : result.repPct,
    senateNet: game.party === 'dem' ? senate.net : -senate.net,
    score,
  };

  // Re-mounting a finished save must not file the same campaign twice.
  const fingerprint = `${game.candidateId}|${game.opponentId}|${game.difficultyId}|${entry.ev}|${entry.senateNet}|${score}`;
  const existing = loadRuns();
  const already = existing.find((r) => r.fingerprint === fingerprint);

  const runs = already
    ? existing
    : [...existing, { ...entry, fingerprint }].sort((a, b) => b.score - a.score).slice(0, MAX_RUNS);
  if (!already) writeRuns(runs);
  const filedId = already ? already.id : entry.id;
  const position = runs.findIndex((r) => r.id === filedId) + 1;

  return {
    entry: already || entry,
    runs: runs.map((r) => ({ ...r, current: r.id === filedId })),
    position: position || runs.length + 1,
  };
}

export function clearRuns() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* ignore */
  }
}