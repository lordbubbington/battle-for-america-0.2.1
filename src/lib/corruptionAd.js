import { STATE_BY_ABBR, STATE_LIST } from '@/data/states';
import { bumpTurnoutState } from '@/lib/turnout';

// Resolves the free anti-corruption spot earned by refusing a PAC policy deal.
// Margins are stored D-minus-R; the same event works for either campaign.
export function runCorruptionAd(game, party, abbr) {
  const region = STATE_BY_ABBR[abbr]?.region;
  if (!region) return { game, outcome: 'nothing' };
  const roll = Math.random();
  const outcome = roll < 0.5 ? 'nothing' : roll < 0.9 ? 'successful' : 'viral';
  const sign = party === 'dem' ? 1 : -1;
  game.stateMods = { ...(game.stateMods || {}) };
  if (outcome !== 'nothing') {
    game.stateMods[abbr] = (game.stateMods[abbr] || 0) + sign * 5;
  }
  if (outcome === 'viral') {
    bumpTurnoutState(game, party, abbr, 5);
    STATE_LIST.filter((state) => state.region === region).forEach((state) => {
      game.stateMods[state.abbr] = (game.stateMods[state.abbr] || 0) + sign;
    });
    if (!game.build40?.version) game.followUps = [
      ...(game.followUps || []),
      {
        id: 'bribe_ad_viral_followup',
        week: (game.week || 0) + 1,
        region,
        party,
        origin: abbr,
        why: 'The anti-corruption ad you released after refusing the PAC money has gone viral.',
        teaser: 'Your refusal is spreading through the region.',
      },
    ];
  }
  return { game, outcome, region };
}
