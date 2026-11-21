// The 2028 Senate map — Class 3, the 34 seats last elected in 2022. Everything
// here is fiction built on the real map: which party holds the seat, whether an
// incumbent is running, and how much that state's Senate vote usually diverges
// from its presidential vote (`mod`, in Democratic-minus-Republican points).
//
// Senate races ride the state's presidential polling, damped — voters split
// tickets downballot — and then add their own local error on election night.

// The Senate outside this cycle. Sixty-six seats are not on the ballot in 2028:
// 40 held by Democrats and 26 by Republicans. The 34 Class 3 races below decide
// the other third, so the chamber reads straight off that base plus the results.
export const SENATE_BASE = { dem: 40, rep: 26 };
export const SENATE_START = SENATE_BASE;

// Kept for older saves and the setup screen: the base no longer rolls, because
// 40–26 is the number this game starts from.
export function rollSenateStart() {
  return { ...SENATE_BASE, swing: 0 };
}

export const SENATE_RACES = [
  // Republican-held
  { state: 'AL', defending: 'rep', incumbent: 'Tuberville', mod: 1.0 },
  { state: 'AK', defending: 'rep', incumbent: null, note: 'Open seat · ranked-choice', mod: 0.0 },
  { state: 'AR', defending: 'rep', incumbent: 'Cotton', mod: 1.5 },
  { state: 'FL', defending: 'rep', incumbent: null, note: 'Open seat', mod: -1.5 },
  { state: 'ID', defending: 'rep', incumbent: 'Risch', mod: 2.0 },
  { state: 'IN', defending: 'rep', incumbent: 'Young', mod: 0.0 },
  { state: 'IA', defending: 'rep', incumbent: 'Ernst', mod: -1.5 },
  { state: 'KS', defending: 'rep', incumbent: 'Marshall', mod: 1.0 },
  { state: 'KY', defending: 'rep', incumbent: 'Paul', mod: 1.5 },
  { state: 'LA', defending: 'rep', incumbent: 'Kennedy', mod: 1.0 },
  { state: 'MO', defending: 'rep', incumbent: 'Hawley', mod: 0.5 },
  { state: 'NC', defending: 'rep', incumbent: 'Budd', mod: 0.0 },
  { state: 'ND', defending: 'rep', incumbent: 'Hoeven', mod: 2.0 },
  { state: 'OH', defending: 'rep', incumbent: null, note: 'Open seat · appointed since 2024', mod: -2.5 },
  { state: 'OK', defending: 'rep', incumbent: 'Mullin', mod: 2.0 },
  { state: 'SC', defending: 'rep', incumbent: 'Graham', mod: 0.5 },
  { state: 'SD', defending: 'rep', incumbent: 'Rounds', mod: 2.0 },
  { state: 'UT', defending: 'rep', incumbent: 'Lee', mod: 2.0 },
  { state: 'WI', defending: 'rep', incumbent: null, note: 'Open seat · retirement', mod: -2.5 },

  // Democratic-held
  { state: 'AZ', defending: 'dem', incumbent: 'Kelly', mod: 1.5 },
  { state: 'CA', defending: 'dem', incumbent: 'Padilla', mod: 4.0 },
  { state: 'CO', defending: 'dem', incumbent: 'Bennet', mod: 2.0 },
  { state: 'CT', defending: 'dem', incumbent: 'Blumenthal', mod: 3.0 },
  { state: 'GA', defending: 'dem', incumbent: 'Warnock', mod: 1.0 },
  { state: 'HI', defending: 'dem', incumbent: 'Schatz', mod: 4.0 },
  { state: 'IL', defending: 'dem', incumbent: 'Duckworth', mod: 2.0 },
  { state: 'MD', defending: 'dem', incumbent: 'Van Hollen', mod: 4.0 },
  { state: 'NV', defending: 'dem', incumbent: 'Cortez Masto', mod: 1.0 },
  { state: 'NH', defending: 'dem', incumbent: 'Hassan', mod: 1.5 },
  { state: 'NY', defending: 'dem', incumbent: 'Schumer', mod: 3.0 },
  { state: 'OR', defending: 'dem', incumbent: 'Wyden', mod: 2.5 },
  { state: 'PA', defending: 'dem', incumbent: 'Fetterman', mod: 0.5 },
  { state: 'VT', defending: 'dem', incumbent: 'Welch', mod: 4.0 },
  { state: 'WA', defending: 'dem', incumbent: 'Murray', mod: 2.5 },
];

export const SENATE_RACE_BY_STATE = SENATE_RACES.reduce((acc, r) => {
  acc[r.state] = r;
  return acc;
}, {});

// Seats the player is defending (their own party's) versus seats they can take.
export function racesFor(party) {
  return {
    defend: SENATE_RACES.filter((r) => r.defending === party),
    target: SENATE_RACES.filter((r) => r.defending !== party),
  };
}