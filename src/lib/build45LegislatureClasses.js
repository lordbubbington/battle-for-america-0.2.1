import { BUILD45_LEGISLATURE_CLASSES, BUILD45_LEGISLATURE_CLASS_SPECS } from '../data/build45LegislatureClasses.js';

export const BUILD45_LEGISLATURE_CLASS_REVISION = 'official-2028-classes-v1';
const byId = new Map(BUILD45_LEGISLATURE_CLASSES.map((row) => [row.seatId, row]));
const byChamber = new Map(BUILD45_LEGISLATURE_CLASS_SPECS.map((row) => [row.state + ':' + row.chamber, row]));
export const hasBuild45LegislatureClasses = (game) => game?.build45?.version === 1 && game.build45.legislatureClassRevision === BUILD45_LEGISLATURE_CLASS_REVISION;

export function effectiveLegislatureSeats(seats, game) {
  if (!hasBuild45LegislatureClasses(game)) return seats;
  return seats.map((seat) => {
    const official = byId.get(seat.seatId);
    if (!official) return seat;
    return { ...seat, districtId: official.districtId, seatUpIn2028: official.seatUpIn2028,
      seatUpStatus: official.seatUpStatus, seatUpSource: official.seatUpSource,
      originalSeatUpIn2028: seat.seatUpIn2028, classRevision: BUILD45_LEGISLATURE_CLASS_REVISION,
      identityStatus: seat.districtId ? seat.identityStatus : 'modeled-stable-slot-join-to-official-district-structure; holder-join-unverified',
      ballotPartisan: official.ballotPartisan,
      // This is not a source for an intervening winner or appointment.
      currentHolderVerification: 'unchanged; existing-source-status-applies' };
  });
}

export function effectiveLegislatureSchedules(schedules, game) {
  if (!hasBuild45LegislatureClasses(game)) return schedules;
  return schedules.map((state) => ({ ...state, chambers: state.chambers.map((chamber) => {
    const spec = byChamber.get(state.abbr + ':' + chamber.chamber);
    if (!spec) return chamber;
    const up = BUILD45_LEGISLATURE_CLASSES.filter((row) => row.state === state.abbr && row.chamber === chamber.chamber && row.seatUpIn2028).length;
    return { ...chamber, seatsUp2028: up, nextRegularElection: up ? 2028 : chamber.nextRegularElection,
      districtCycleStatus: 'official-regular-class-list', regularClassSource: spec.source,
      originalSeatsUp2028: chamber.seatsUp2028, classRevision: BUILD45_LEGISLATURE_CLASS_REVISION,
      specialElectionStatus: 'no-unsourced-specials-added; future-orders-and-vacancies-separate' };
  }) }));
}
