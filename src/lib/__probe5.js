import { createGame, startTurn, pollMargin, resultMargin, advanceWeek } from '@/lib/gameEngine';
import { STATES } from '@/data/states';

function report(label, g) {
  const drift = STATES.map((s) => ({
    abbr: s.abbr,
    lean: g.leans[s.abbr],
    poll: +pollMargin(s.abbr, g).toFixed(1),
    d: +Math.abs(pollMargin(s.abbr, g) - g.leans[s.abbr]).toFixed(1),
  })).sort((a, b) => b.d - a.d);
  const avg = drift.reduce((a, b) => a + b.d, 0) / drift.length;
  console.log(label, 'avg drift from lean', avg.toFixed(2), 'worst', JSON.stringify(drift.slice(0, 5)));
}

const g0 = createGame({
  party: 'dem',
  candidateId: 'harris',
  opponentId: 'vance',
  difficultyId: 'medium',
  runningMateId: null,
  weighted: true,
});
report('createGame', g0);
const g = startTurn(g0);
report('week 1', g);
console.log('pollMiss at start:', g.pollMiss);

// Run the whole campaign with no actions and see what election night does.
let cur = g;
let guard = 0;
while (!cur.finished && guard++ < 60) cur = advanceWeek(cur);
console.log('finished', cur.finished, 'pollMiss nat/scaled', cur.pollMiss?.nat?.toFixed(2), (cur.pollMiss?.nat * cur.pollMiss?.scale).toFixed(2));
console.log('sample result margins', ['PA', 'MI', 'GA'].map((a) => `${a} poll ${pollMargin(a, cur).toFixed(1)} result ${resultMargin(a, cur).toFixed(1)}`).join(' | '));