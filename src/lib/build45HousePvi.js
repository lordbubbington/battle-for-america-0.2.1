import data from '../data/build45HousePvi.json';

export const BUILD45_HOUSE_PVI_REVISION = 'cook-2026-owner-shifts-v1';
const byId = new Map(data.districts.map((row) => [row.id, Object.freeze(row)]));
const stateMeans = new Map(data.states.map((row) => [row.stateAbbr, row.statewideBaselineLeanDMinusR]));

export function hasBuild45HousePvi(game) {
  return game?.build45?.version === 1 && game.build45.housePviRevision === BUILD45_HOUSE_PVI_REVISION;
}

/** Add a versioned forecast lean; preserve every historical vote/source field. */
export function effectiveHouseDistrictBaseline(district, game) {
  if (!hasBuild45HousePvi(game)) return district;
  const pvi = byId.get(district?.id);
  if (!pvi) return district;
  const stateMean = stateMeans.get(pvi.stateAbbr);
  return {
    ...district,
    originalVoteDerivedLean: district.originalVoteDerivedLean ?? district.districtLeanDMinusR,
    districtLeanDMinusR: pvi.districtLeanDMinusR,
    districtStateBaselineLeanDMinusR: stateMean,
    districtVsStateLeanDMinusR: pvi.districtLeanDMinusR - stateMean,
    leanProvenance: {
      revision: BUILD45_HOUSE_PVI_REVISION,
      type: 'owner-adjusted-Cook-PVI-forecast-baseline',
      label: 'Cook PVI × 2, with owner state adjustments',
      cookPviDMinusR: pvi.cookPviDMinusR,
      ownerShiftDMinusR: pvi.ownerShiftDMinusR,
      sourceUrl: pvi.cookSourceUrl,
      retrievedOn: pvi.retrievedOn,
      artifactSha256: data.artifactSha256,
      ownerSourceThreadId: data.ownerSourceThreadId,
      boundaryVintage: pvi.boundaryVintage,
      originalVoteBoundaryVintage: pvi.originalVoteBoundaryVintage,
      sourceRow: pvi.sourceRow,
      certifiedVoteInputReplaced: false,
    },
  };
}
