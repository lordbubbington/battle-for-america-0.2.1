import { createGame, startTurn, applyAction, pollMargin, downballotTight, makePromise, changeStance } from '@/lib/gameEngine';

function fresh() {
  return startTurn(
    createGame({ party: 'dem', candidateId: 'shapiro', opponentId: 'vance', difficultyId: 'easy', startId: 'aug' })
  );
}

const rows = [];
['PA', 'MI', 'CA', 'WY', 'TX', 'NH', 'FL', 'OH', 'VT', 'AL'].forEach((abbr) => {
  const g = fresh();
  const tight = downballotTight(g, abbr);
  const genBefore = g.stateGeneric?.[abbr] || 0;
  const presBefore = pollMargin(abbr, g);
  const after = applyAction(g, 'visit', abbr);
  const presAfter = pollMargin(abbr, after);
  const genAfter = after.stateGeneric?.[abbr] || 0;
  rows.push({
    abbr,
    tight,
    presDelta: +(presAfter - presBefore).toFixed(2),
    genDelta: +(genAfter - genBefore).toFixed(2),
    ratio: +((genAfter - genBefore) / (presAfter - presBefore)).toFixed(3),
  });
});
console.table(rows);

// Promise path
const g2 = fresh();
const genB = g2.stateGeneric?.('PA') || 0;
const before2 = pollMargin('PA', g2);
const p2 = makePromise(g2, 'PA', 'economy');
console.log('promise', {
  tight: downballotTight(g2, 'PA'),
  pres: +(pollMargin('PA', p2) - before2).toFixed(2),
  gen: +((p2.stateGeneric?.['PA'] || 0) - genB).toFixed(2),
});