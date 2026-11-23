// Every state argues with itself in a different room.
//
// A small state has one dominant outlet: a single story can run the front page
// for a week and be across the border by Tuesday. A megastate has a dozen
// competing markets, so nothing breaks through quickly and nothing dies either.
// Spin costs scale the same way — cheapest where there is one desk to call.

import { STATE_BY_ABBR } from '@/data/states';

const FLAVOR = {
  IA: { label: 'The Des Moines bubble', note: 'One paper, four hundred stringers, and a State Fair that decides the mood.' },
  NH: { label: 'The Union Leader problem', note: 'One front page still sets what the state argues about for a fortnight.' },
  SC: { label: 'One paper, one dial', note: 'A single editor and two talk-radio hosts can make or unmake a week.' },
  NV: { label: 'Two markets and a lot of desert', note: 'Las Vegas decides everything, and it decides it late.' },
  OH: { label: 'Seven markets, one conversation', note: 'Cleveland, Columbus and Cincinnati all think they are the state.' },
  VT: { label: 'The smallest press corps in America', note: 'One reporter covers the whole state, and she is very well informed.' },
  WY: { label: 'One newsroom, statewide', note: 'A story here is either the only story or no story at all.' },
  PA: { label: 'Two cities that never agree', note: 'Philadelphia and Pittsburgh run separate news cycles and a shared suspicion of everything between them.' },
  TX: { label: 'Twelve markets in a trench coat', note: 'Houston, Dallas and Austin might as well be different countries.' },
  CA: { label: 'A fractured megamarket', note: 'Nobody dominates. A story has to be everywhere at once to be anywhere.' },
  FL: { label: 'The retirement-belt wire', note: 'Three markets, one enormous shared audience, and a very long memory.' },
  ME: { label: 'One paper, owned out of state', note: 'The Portland paper covers Augusta and the entire coast, thinly.' },
  AZ: { label: 'The fastest-growing press pack', note: 'New outlets every cycle, all fighting over Maricopa County.' },
  WI: { label: 'Three markets, no majority', note: 'Milwaukee, Madison and the Fox Valley each hear a different campaign.' },
};

export function mediaEnvironment(abbr) {
  const state = STATE_BY_ABBR[abbr];
  if (!state) return null;
  const ev = state.ev ?? 10;
  const flavor = FLAVOR[abbr];
  const outlets = Math.min(5, Math.max(1, Math.round(1 + ev / 12)));
  // A story lives longer where there is more airtime to fill...
  const attention = Math.round((0.8 + Math.min(0.6, ev / 60)) * 100) / 100;
  // ...and travels further where there is less of it to go around.
  const spread = Math.round((0.75 - Math.min(0.5, ev / 60)) * 100) / 100;
  const costMul = Math.round((0.75 + Math.min(0.8, ev / 45)) * 100) / 100;
  const label =
    flavor?.label ||
    (outlets <= 1
      ? 'One dominant station'
      : outlets === 2
        ? 'A two-paper state'
        : outlets === 3
          ? 'Three outlets, one argument'
          : outlets === 4
            ? 'A crowded dial'
            : 'A fragmented market');
  const note =
    flavor?.note ||
    (outlets <= 2
      ? 'Thin press corps: local stories break quickly, spill into neighboring states, and fade within two weeks.'
      : 'Enough outlets to keep a story alive for weeks, and enough noise that it is hard to start one.');
  return { abbr, name: state.name, label, note, outlets, attention, spread, costMul };
}