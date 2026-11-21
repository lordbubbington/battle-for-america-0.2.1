import { createGame, startTurn, advanceWeek, opponentTurn, snapshot } from '@/lib/gameEngine';
import { dragTowardBaseline } from '@/lib/drag';
import { BASE_LEANS } from '@/data/states';
import { turnoutOf } from '@/lib/turnout';

// --- the drag ladder --------------------------------------------------------
const fake = { baseMargins: { PA: 2, OH: -3, FL: 1 }, dragMods: {}, raceBaseline: {} };
const out = dragTowardBaseline(fake, {
  pollMargin: (a) => ({ PA: -5, OH: 9, FL: 4 })[a],
  raceMargin: () => 0,
});
console.log('drag PA (7 away)', out.dragMods.PA, '| OH (12 away)', out.dragMods.OH, '| FL (3 away)', out.dragMods.FL);

// --- a whole campaign -------------------------------------------------------
let g = startTurn(
  createGame({ party: 'dem', candidateId: 'shapiro', opponentId: 'vance', difficultyId: 'medium', startId: 'aug' })
);
console.log('opening funds', JSON.stringify(g.aiFunds));
console.log('baseMargins are this game, not BASE_LEANS:', g.baseMargins.PA.toFixed(2), 'vs lean', BASE_LEANS.PA);

const weeks = [];
let peakFatigue = { dem: 0, rep: 0 };
while (!g.finished) {
  const before = { ...g.aiFunds };
  const next = advanceWeek(opponentTurn(g));
  const spend = {
    dem: Math.round((before.dem - next.aiFunds.dem) * 10) / 10,
    rep: Math.round((before.rep - next.aiFunds.rep) * 10) / 10,
  };
  weeks.push({ week: g.week, spend, funds: { ...next.aiFunds } });
  ['dem', 'rep'].forEach((p) => {
    Object.values(next.fatigue[p] || {}).forEach((row) => {
      peakFatigue[p] = Math.max(peakFatigue[p], row.ad || 0);
    });
  });
  g = next;
}

const ai = 'rep';
const spends = weeks.map((w) => w.spend[ai]);
console.log('weekly AI spend (rep side):', spends.join(' '), '| funds left', JSON.stringify(g.aiFunds));
console.log('in 1-15 except last:', spends.slice(0, -1).every((s) => s >= 0.9 && s <= 15), '| last week', spends[spends.length - 1]);
console.log('never overdrawn:', weeks.every((w) => w.funds.dem >= 0 && w.funds.rep >= 0));
console.log('peak ad fatigue per party', JSON.stringify(peakFatigue));

// How the buys read in the log, and what they did to the map.
const firstWeekMoves = (g.history[0]?.oppRival?.moves || []).map((m) => m.text);
console.log('opponent moves:', JSON.stringify(firstWeekMoves.slice(-2)));
const airtime = g.history.flatMap((h) => [...(h.oppRival?.moves || []), ...(h.rivals || []).flatMap((r) => r.moves || [])])
  .filter((m) => /airtime/.test(m.text || ''));
console.log('airtime lines logged:', airtime.length, '|', airtime[0]?.text);
const snap = snapshot(g);
const swing = snap.rows.filter((r) => ['PA', 'MI', 'WI', 'NV', 'AZ', 'GA', 'NC', 'MN'].includes(r.abbr));
console.log(
  'swing states (margin / dem turnout / rep turnout):',
  swing
    .map(
      (r) =>
        `${r.abbr} ${r.margin.toFixed(1)} ${turnoutOf(g, r.abbr, 'dem').toFixed(1)}/${turnoutOf(g, r.abbr, 'rep').toFixed(1)}`
    )
    .join(' | ')
);
console.log('evBy', JSON.stringify(snap.evBy));