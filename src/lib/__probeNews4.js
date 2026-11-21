import { createGame, startTurn, advanceWeek, opponentTurn } from '@/lib/gameEngine';
import { genericAverage } from '@/lib/environment';
import { nationalNewsCard } from '@/lib/nationalNews';

let jumps = 0;
let withinRunDupes = 0;
let arcWeeks = 0;
const arcTracks = [];

for (let run = 0; run < 20; run++) {
  let game = startTurn(
    createGame({ party: 'dem', candidateId: 'shapiro', opponentId: 'vance', difficultyId: 'medium', startId: 'aug' })
  );
  const seen = new Set();
  let prev = 0;
  for (let w = 0; w < 13; w++) {
    const card = nationalNewsCard(game);
    if (seen.has(card?.id)) {
      withinRunDupes++;
      console.log('DUP', run, w + 1, card.id);
    }
    seen.add(card?.id);
    if (game.arc) arcWeeks++;
    const now = genericAverage(game);
    if (Math.abs(now - prev) > 1.6) {
      jumps++;
      console.log('JUMP', {
        run,
        week: w + 1,
        card: card?.id,
        gen: card?.gen,
        prevNat: prev,
        now,
        arc: game.arc?.id,
        track: game.track,
      });
    }
    prev = now;
    game = advanceWeek(opponentTurn(game));
  }
  if (game.arc) arcTracks.push(game.arc.id);
}
console.log({ jumps, withinRunDupes, arcWeeks, arcsAliveAtEnd: arcTracks });