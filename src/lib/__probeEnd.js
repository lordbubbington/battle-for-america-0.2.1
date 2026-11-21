import {
  createGame,
  startTurn,
  advanceWeek,
  opponentTurn,
  resultSnapshot,
  senateSnapshot,
  houseSnapshot,
  nationalPoll,
} from '@/lib/gameEngine';
import { genericAverage } from '@/lib/environment';
import { NATIONAL_CARDS } from '@/data/nationalNews';

const games = [];
for (let i = 0; i < 6; i++) {
  let g = startTurn(
    createGame({
      party: i % 2 ? 'rep' : 'dem',
      candidateId: i % 2 ? 'vance' : 'shapiro',
      opponentId: i % 2 ? 'shapiro' : 'vance',
      difficultyId: ['cupcake', 'easy', 'medium', 'hard', 'brutal', 'nightmare'][i],
      startId: 'aug',
    })
  );
  while (!g.finished) g = advanceWeek(opponentTurn(g));
  const result = resultSnapshot(g);
  const senate = senateSnapshot(g, true);
  const house = houseSnapshot(g, true);
  games.push({
    difficulty: g.difficultyId,
    party: g.party,
    ev: [result.evBy.dem, result.evBy.rep, result.evBy.lib, result.evBy.grn, result.evBy.ind],
    evSum: Object.values(result.evBy).reduce((a, b) => a + b, 0),
    nationalPoll: +nationalPoll(g).toFixed(2),
    generic: genericAverage(g),
    track: g.track,
    natGeneric: g.natGeneric,
    senate: [senate.dem, senate.rep],
    house: house.total || house.seats || 'n/a',
    pollMissFinite: isFinite(g.pollMiss?.state?.PA ?? 0),
    newsSeen: (g.natNewsLog || []).length,
  });
}
console.log(JSON.stringify(games, null, 1));
console.log('deck', NATIONAL_CARDS.length);