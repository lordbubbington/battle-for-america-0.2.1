// How a party gains voters: never out of thin air, always off somebody else.
//
// The two major parties mostly take from the third party that sits next to them
// on the spectrum (Democrats from the Greens, Republicans from the
// Libertarians) for as long as that party is worth taking from in that state.
// Whatever is left over comes off the other major party. Third parties live off
// the majors in fixed proportions: 75/25 Republican to Democratic for the
// Libertarians, 90/10 the other way for the Greens.
//
// Every threshold is read state by state — a Green vote in Vermont and a Green
// vote in Alabama are not the same pile of votes.

export const GREEN_FLOOR = 0.5;
export const LIB_FLOOR = 1;

// Share of a Democratic gain that comes out of the Greens, by how strong the
// Greens are in that state.
export function greenTakeRate(grn) {
  if (grn > 20) return 0.8;
  if (grn > 10) return 0.65;
  if (grn > 5) return 0.5;
  if (grn > 0.5) return 0.35;
  return 0;
}

// The same ladder for a Republican gain out of the Libertarian column.
export function libTakeRate(lib) {
  if (lib > 20) return 0.85;
  if (lib > 10) return 0.7;
  if (lib > 5) return 0.4;
  if (lib > 1) return 0.25;
  return 0;
}

// Where a third party's own gains come from.
export const DONORS = {
  lib: { rep: 0.75, dem: 0.25 },
  grn: { dem: 0.9, rep: 0.1 },
};

// shares: a state's dem/rep/lib/grn before any transfers.
// gain: Democratic share points won since that state's opening position — a
//       negative gain is a Republican gain.
// boost: { party: 'lib' | 'grn', points } for a third-party campaign's own gains.
export function flowShares(shares, gain = 0, boost = null) {
  const out = { ...shares };
  const libStart = out.lib;
  const grnStart = out.grn;

  if (gain > 0) {
    // Democrats gain. The Greens pay first, but never down past their floor;
    // the rest of the gain is a Republican loss, which is already in the raw
    // numbers, so the Republicans only get back what the Greens did not pay.
    const take = Math.min(gain * greenTakeRate(grnStart), Math.max(0, grnStart - GREEN_FLOOR));
    out.grn -= take;
    out.rep += take;
  } else if (gain < 0) {
    const take = Math.min(-gain * libTakeRate(libStart), Math.max(0, libStart - LIB_FLOOR));
    out.lib -= take;
    out.dem += take;
  }

  if (boost && DONORS[boost.party]) {
    const donors = DONORS[boost.party];
    out[boost.party] += boost.points;
    out.rep -= boost.points * donors.rep;
    out.dem -= boost.points * donors.dem;
  }

  return out;
}