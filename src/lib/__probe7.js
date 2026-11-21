import { createGame, startTurn, advanceWeek, pollMargin, DIFFICULTIES } from '@/lib/gameEngine';
import { STATES } from '@/data/states';

const mk = (difficultyId) =>
  startTurn(
    createGame({
      party: 'dem',
      candidateId: 'harris',
      opponentId: 'vance',
      difficultyId,
      runningMateId: 'kelly',
      weighted: true,
    })
  );

// Every state's weekly move should be exactly the drift, or drift + swing drift.
let bad = 0;
['hard', 'brutal', 'nightmare'].forEach((d) => {
  const diff = DIFFICULTIES[d];
  for (let run = 0; run < 40; run++) {
    const base = mk(d);
    const next = advanceWeek(base);
    STATES.forEach((s) => {
      const swing = Math.abs(pollMargin(s.abbr, { ...base })) <= 5;
      const want = -(diff.drift + (swing ? diff.swingDrift : 0));
      const got = Math.round((next.stateMods[s.abbr] - base.stateMods[s.abbr]) * 100) / 100;
      if (Math.abs(got - want) > 0.001) {
        bad++;
        if (bad < 6) console.log('MISMATCH', d, s.abbr, 'want', want, 'got', got);
      }
    });
  }
});
console.log('mismatches', bad);