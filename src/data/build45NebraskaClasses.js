// Official primary statutory class input only. This does not establish holders,
// vacancies, special elections, or partisan affiliation in a nonpartisan chamber.
export const BUILD45_NEBRASKA_CLASS_SOURCE = Object.freeze({
  title: 'Nebraska Revised Statute 32-508',
  url: 'https://nebraskalegislature.gov/laws/statutes.php?statute=32-508',
  retrievedOn: '2026-11-17',
  provenance: 'official-state-statute',
  status: 'regular-classes-only-specials-and-current-holders-open',
});
export const BUILD45_NEBRASKA_CLASSES = Object.freeze(Array.from({ length: 49 }, (_, index) => Object.freeze({
  state: 'NE', chamber: 'upper', districtId: String(index + 1),
  seatId: 'NE:upper:seat-' + String(index + 1).padStart(3, '0'),
  seatUpIn2028: (index + 1) % 2 === 1,
  electionYear: (index + 1) % 2 === 1 ? 2028 : 2030,
  ballotPartisan: false, source: BUILD45_NEBRASKA_CLASS_SOURCE,
})));
