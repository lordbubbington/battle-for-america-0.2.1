import { createGame, startTurn, applyChoice, snapshot, forceEvent } from '@/lib/gameEngine';
import { EVENTS, EVENT_BY_ID, drawEvent } from '@/data/events';

const mk = (party = 'rep') =>
  startTurn(
    createGame({
      party,
      candidateId: party === 'rep' ? 'vance' : 'harris',
      opponentId: party === 'rep' ? 'harris' : 'vance',
      difficultyId: 'medium',
      weighted: true,
    })
  );

const g = mk('rep');
const alien = EVENT_BY_ID.egg_alien_endorsement;
let natWins = 0;
let swaps = 0;
let swapSample = null;
for (let i = 0; i < 200; i++) {
  const after = applyChoice(forceEvent(mk('rep'), 'egg_alien_endorsement'), alien.choices[0]);
  if (after.libSwap) {
    swaps++;
    if (!swapSample) swapSample = after;
  } else natWins++;
}
const swapSnap = snapshot(swapSample);
const forced = forceEvent(g, 'egg_alien_endorsement');
const eggIds = EVENTS.filter((e) => e.easterEgg).map((e) => e.id);
const demDraws = new Set();
for (let i = 0; i < 4000; i++) demDraws.add(drawEvent([], 1, 'dem').id);

console.log(
  JSON.stringify(
    {
      eggCount: eggIds.length,
      eggIds,
      forcedEvent: forced.currentEventId,
      natBranches: natWins,
      swapBranches: swaps,
      swapStateWinners: swapSnap.rows.filter((r) => r.winner === 'lib').length,
      swapEvBy: swapSnap.evBy,
      demDrawSeesEgg: eggIds.some((id) => demDraws.has(id)),
      demDrawSample: [...demDraws].filter((id) => id.startsWith('egg_')),
    },
    null,
    2
  )
);