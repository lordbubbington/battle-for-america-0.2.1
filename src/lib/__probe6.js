import { createGame, startTurn, pollMargin, demographicShift } from '@/lib/gameEngine';
import { policyMargin } from '@/lib/policy';
import { STATES } from '@/data/states';

const g = startTurn(
  createGame({
    party: 'dem',
    candidateId: 'harris',
    opponentId: 'vance',
    difficultyId: 'medium',
    runningMateId: null,
    weighted: true,
  })
);

const rows = STATES.map((s) => ({
  abbr: s.abbr,
  policy: +policyMargin(s.abbr, g).toFixed(2),
  noise: +(g.noise[s.abbr] || 0).toFixed(2),
  world: +(g.worldShift?.[s.abbr] || 0).toFixed(2),
  vp: +(g.stateMods?.[s.abbr] || 0).toFixed(2),
  demo: +demographicShift(s.abbr, g).toFixed(2),
  mom: +(((g.momentum || 50) - (g.oppMomentum || 50)) * 0.1).toFixed(2),
}));

const avg = (k) => (rows.reduce((a, b) => a + Math.abs(b[k]), 0) / rows.length).toFixed(2);
console.log('avg |policy|', avg('policy'), '|noise|', avg('noise'), '|world|', avg('world'), '|vp|', avg('vp'), 'mom', rows[0].mom);
console.log('max |policy|', Math.max(...rows.map((r) => Math.abs(r.policy))).toFixed(2));
console.log(rows.slice(0, 6));