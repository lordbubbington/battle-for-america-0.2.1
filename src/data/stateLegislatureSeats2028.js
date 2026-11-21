import { STATE_LEGISLATURES_2028 } from './stateLegislatureCycles.js';
import {
  STATE_LEGISLATURE_RESULTS_2024_BY_STATE,
  STATE_LEGISLATURE_RESULTS_2024_SOURCE,
} from './stateLegislatureResults2024.js';
import { DELAWARE_2024_SOURCE, DELAWARE_2022_SOURCE, DELAWARE_ELECTION_ARCHIVE_SOURCE, DELAWARE_DISTRICT_SOURCE, DELAWARE_SENATE_DISTRICT_SOURCE, DELAWARE_SENATE_SCHEDULE_SOURCE, DELAWARE_PRESIDENT_2024, DELAWARE_HOUSE_STATEWIDE_2022, DELAWARE_HOUSE_CONTESTED_2022, DELAWARE_SENATE_2022, DELAWARE_HOUSE_2024, DELAWARE_SENATE_2024 } from './stateLegislatureDelaware2024.js';
import { WYOMING_2024_SOURCE, WYOMING_DISTRICT_SOURCE, WYOMING_SCHEDULE_SOURCE, WYOMING_PRESIDENT_2024, WYOMING_HOUSE_2024, WYOMING_SENATE_2024 } from './stateLegislatureWyoming2024.js';
import { NORTH_CAROLINA_SOURCES, NORTH_CAROLINA_DISTRICT_SOURCE, NORTH_CAROLINA_PRESIDENT_2024, NORTH_CAROLINA_HOUSE_2024, NORTH_CAROLINA_SENATE_2024 } from './stateLegislatureNorthCarolina2024.js';
import { WASHINGTON_2024_SOURCE, WASHINGTON_DISTRICT_SOURCE, WASHINGTON_PRESIDENT_SOURCE, WASHINGTON_PRESIDENT_2024, WASHINGTON_HOUSE_2024, WASHINGTON_SENATE_2024, WASHINGTON_SENATE_RECOUNT_SOURCE } from './stateLegislatureWashington2024.js';
import { CALIFORNIA_ASSEMBLY_2024_SOURCE, CALIFORNIA_SENATE_2024_SOURCE, CALIFORNIA_PRESIDENT_2024_SOURCE, CALIFORNIA_DISTRICT_SOURCE, CALIFORNIA_PRESIDENT_2024, CALIFORNIA_LEGISLATURE_2024 } from './stateLegislatureCalifornia2024.js';
import { TENNESSEE_2024_SOURCE, TENNESSEE_DISTRICT_SOURCE, TENNESSEE_PRESIDENT_2024, TENNESSEE_LEGISLATURE_2024 } from './stateLegislatureTennessee2024.js';
import { ARKANSAS_2024_SOURCE, ARKANSAS_DISTRICT_SOURCE, ARKANSAS_PRESIDENT_2024, ARKANSAS_LEGISLATURE_2024 } from './stateLegislatureArkansas2024.js';
import { SOUTH_CAROLINA_2024_SOURCE, SOUTH_CAROLINA_SENATE_2024_SOURCE, SOUTH_CAROLINA_SENATE_PARTY_SOURCE, SOUTH_CAROLINA_DISTRICT_SOURCE, SOUTH_CAROLINA_HOUSE_2024, SOUTH_CAROLINA_SENATE_2024 } from './stateLegislatureSouthCarolina2024.js';
import { KENTUCKY_2024_SOURCE, KENTUCKY_DISTRICT_SOURCE, KENTUCKY_PRESIDENT_2024_SOURCE, KENTUCKY_SENATE_SCHEDULE_SOURCE, KENTUCKY_PRESIDENT_2024, KENTUCKY_HOUSE_2024, KENTUCKY_SENATE_2024 } from './stateLegislatureKentucky2024.js';
import { ARIZONA_2024_SOURCE, ARIZONA_DISTRICT_SOURCE, ARIZONA_PRESIDENT_2024_SOURCE, ARIZONA_PRESIDENT_2024, ARIZONA_HOUSE_2024, ARIZONA_SENATE_2024 } from './stateLegislatureArizona2024.js';
import { ALASKA_2024_SOURCE, ALASKA_HOUSE_CERTIFICATE_SOURCE, ALASKA_SENATE_CERTIFICATE_SOURCE, ALASKA_DISTRICT_SOURCE, ALASKA_HOUSE_2024, ALASKA_SENATE_2024 } from './stateLegislatureAlaska2024.js';
import { IOWA_2024_SOURCE, IOWA_WINNER_LIST_SOURCE, IOWA_DISTRICT_SOURCE, IOWA_HOUSE_2024, IOWA_SENATE_2024 } from './stateLegislatureIowa2024.js';
import { KANSAS_2024_SOURCE, KANSAS_DISTRICT_SOURCE, KANSAS_HOUSE_2024, KANSAS_SENATE_2024 } from './stateLegislatureKansas2024.js';
import { STATE_LEGISLATURE_RESEARCH_2024, STATE_LEGISLATURE_RESEARCH_2024_NAME_SOURCES } from './stateLegislatureResearch2024.js';
import { STATE_LEGISLATURE_PRIOR_CYCLE_RESEARCH, STATE_LEGISLATURE_PRIOR_CYCLE_SOURCES } from './stateLegislaturePriorCycle2024.js';

export const STATE_LEGISLATURE_SEAT_SCHEMA_VERSION = 1;

const OFFICIAL_RESEARCH_SOURCE_KEYS = new Set([
  'GA:ga-sos-enr-2024', 'ME:me-senate-calendar-2024', 'ME:me-sos-recounts-2024',
  'MN:mn-sos-2024', 'NM:nm-electionstats-2024', 'NY:ny-electionstats-2024',
]);
const CROSSCHECKED_RESEARCH_SOURCE_KEYS = new Set([
  'CO:medsl-2024-official', 'CT:medsl-2024-official', 'FL:medsl-2024-official',
  'MA:medsl-2024-official', 'NM:oe-nm-2024', 'VT:medsl-2024-official',
]);

const RESEARCH_2024_SOURCE_BY_KEY = Object.freeze(Object.fromEntries(
  [...new Set(STATE_LEGISLATURE_RESEARCH_2024.map(([state, , , , , , sourceId, mapEra]) => `${state}:${sourceId}:${mapEra || 'unknown'}`))]
    .map((key) => {
      const [state, sourceId, mapEra] = key.split(':');
      const sourceRecordKey = `${state}:${sourceId}`;
      const verification = OFFICIAL_RESEARCH_SOURCE_KEYS.has(sourceRecordKey)
        ? 'official-state-election-result-or-recount-table'
        : CROSSCHECKED_RESEARCH_SOURCE_KEYS.has(sourceRecordKey)
          ? 'candidate-results-crosschecked-against-official-state-database'
          : 'not-independently-checked-against-state-canvass';
      return [key, Object.freeze({
        title: `Election Wrld state-legislature results, 2024 (${state}; ${sourceId})`,
        url: `https://www.electionwrld.com/api/v1/datasets/state-legislature-results/${state.toLowerCase()}`,
        notesUrl: 'https://www.electionwrld.com/data/notes',
        status: 'research-dataset-computed-winner',
        attribution: 'Election Wrld state-legislative results compilation',
        license: 'CC BY 4.0 for the compilation; underlying election records retain their source terms',
        verification,
        sourceId,
        mapEra: mapEra === 'unknown' ? null : mapEra,
        year: 2024,
      })];
    }),
));

const RESEARCH_2024_SEAT_BY_ID = Object.freeze(Object.fromEntries(
  STATE_LEGISLATURE_RESEARCH_2024.map(([state, chamber, seatIndex, districtId, holderParty2024, holderName2024, sourceId, mapEra, seatUpIn2028, nameSourceId]) => {
    const seatId = `${state}:${chamber}:seat-${String(seatIndex).padStart(3, '0')}`;
    const sourceKey = `${state}:${sourceId}:${mapEra || 'unknown'}`;
    const nameSource = nameSourceId ? STATE_LEGISLATURE_RESEARCH_2024_NAME_SOURCES[String(nameSourceId)] : null;
    const verification = RESEARCH_2024_SOURCE_BY_KEY[sourceKey]?.verification;
    const holderStatus = verification === 'official-state-election-result-or-recount-table'
      ? 'official-state-results-computed-2024-winner'
      : verification === 'candidate-results-crosschecked-against-official-state-database'
        ? 'research-dataset-2024-winner-crosschecked-with-state-database'
        : 'research-dataset-computed-2024-winner-unverified-against-state-canvass';
    return [seatId, Object.freeze({
      districtId,
      identityStatus: 'research-dataset-reported-district-label-and-seat-slot',
      boundaryVintage: Number.parseInt(String(mapEra || ''), 10) || null,
      holderParty2024,
      holderName2024,
      holderStatus: holderParty2024 ? holderStatus : `${holderStatus}-party-unresolved`,
      holderSource: RESEARCH_2024_SOURCE_BY_KEY[sourceKey],
      ...(nameSource ? { holderNameSource: nameSource, holderPartySource: nameSource } : {}),
      baselineLeanDMinusR: null,
      leanStatus: 'unavailable-research-dataset-race-margin-not-modeled',
      baselineRaceYear: null,
      baselineStateRaceYear: null,
      leanSource: null,
      stateBaselineSource: null,
      raceVotes: null,
      stateBaselineVotes: null,
      sourceStatus: holderStatus,
      seatUpIn2028,
      seatUpStatus: seatUpIn2028 === true
        ? '2024-general-election-class-returns-in-2028-by-regular-term-cycle'
        : '2028-seat-class-unresolved-research-results-disagree-with-schedule-count',
      seatUpSource: RESEARCH_2024_SOURCE_BY_KEY[sourceKey],
    })];
  }),
));

const PRIOR_CYCLE_SOURCE_BY_KEY = Object.freeze(Object.fromEntries(
  Object.entries(STATE_LEGISLATURE_PRIOR_CYCLE_SOURCES).map(([key, source]) => [key, Object.freeze(source)]),
));

const PRIOR_CYCLE_SEAT_BY_ID = Object.freeze(Object.fromEntries(
  STATE_LEGISLATURE_PRIOR_CYCLE_RESEARCH.map(([state, chamber, seatIndex, districtId, holderParty2024, holderName2024, sourceId, mapEra, electionYear, position, seatUpOverride]) => {
    const seatId = `${state}:${chamber}:seat-${String(seatIndex).padStart(3, '0')}`;
    const sourceKey = `${state}:${sourceId}:${mapEra}`;
    const source = PRIOR_CYCLE_SOURCE_BY_KEY[sourceKey];
    return [seatId, Object.freeze({
      districtId,
      position,
      identityStatus: 'research-dataset-reported-district-and-winner-slot',
      holderParty2024,
      holderName2024,
      holderStatus: `research-dataset-computed-${electionYear}-winner-carried-into-2024-baseline`,
      holderSource: source,
      baselineLeanDMinusR: null,
      leanStatus: 'unavailable-no-same-cycle-seat-level-lean',
      baselineRaceYear: null,
      baselineStateRaceYear: null,
      leanSource: null,
      stateBaselineSource: null,
      raceVotes: null,
      stateBaselineVotes: null,
      sourceStatus: 'research-dataset-computed-winner',
      priorElectionYear: electionYear,
      ...(electionYear === 2022 ? {
        seatUpIn2028: seatUpOverride === null ? null : false,
        seatUpStatus: seatUpOverride === null ? '2022-result-seat-class-unresolved' : '2022-four-year-class-up-in-2026',
        seatUpSource: source,
      } : {}),
    })];
  }),
));

function delawareSeat(chamber, seatIndex) {
  if (chamber.chamber !== 'lower' && chamber.chamber !== 'upper') return null;
  const rows = chamber.chamber === 'lower' ? DELAWARE_HOUSE_2024 : DELAWARE_SENATE_2024;
  const row = rows.find(([district]) => district === seatIndex);
  const priorRows = chamber.chamber === 'lower' ? DELAWARE_HOUSE_CONTESTED_2022 : DELAWARE_SENATE_2022;
  const prior = priorRows.find(([district]) => district === seatIndex);
  const holderRow = row || (chamber.chamber === 'upper' ? prior : null);
  const [district, , , holder, holderName] = holderRow || [seatIndex, null, null, null, null];
  const hasContest = (candidateRow) => candidateRow && Number.isFinite(candidateRow[1]) && Number.isFinite(candidateRow[2]) && Number(candidateRow[1]) + Number(candidateRow[2]) > 0;
  const race = hasContest(row) ? row : hasContest(prior) ? prior : null;
  const raceYear = race ? (race === row ? 2024 : 2022) : null;
  const stateBaseline = raceYear === 2024 ? DELAWARE_PRESIDENT_2024 : DELAWARE_HOUSE_STATEWIDE_2022;
  const baseline = 100 * (stateBaseline.dem - stateBaseline.rep) / (stateBaseline.dem + stateBaseline.rep);
  const lean = race ? 100 * (Number(race[1]) - Number(race[2])) / (Number(race[1]) + Number(race[2])) - baseline : null;
  return {
    districtId: String(district), identityStatus: 'verified-single-member-district',
    boundaryVintage: 2022, boundarySource: chamber.chamber === 'lower' ? DELAWARE_DISTRICT_SOURCE : DELAWARE_SENATE_DISTRICT_SOURCE,
    holderParty2024: holder, holderName2024: holderName,
    holderStatus: row ? 'official-2024-election-winner' : holder ? '2022-winner-carried-to-2024-no-intervening-special' : 'unavailable-seat-level-assignment',
    holderSource: row ? DELAWARE_2024_SOURCE : holder ? DELAWARE_2022_SOURCE : null,
    holderContinuitySource: !row && holder ? DELAWARE_ELECTION_ARCHIVE_SOURCE : null,
    baselineLeanDMinusR: lean, leanStatus: race ? `official-last-contested-race-${raceYear}` : 'unavailable-no-sourced-contested-race',
    baselineRaceYear: raceYear, baselineStateRaceYear: raceYear,
    leanSource: race ? (raceYear === 2024 ? DELAWARE_2024_SOURCE : DELAWARE_2022_SOURCE) : null,
    raceVotes: race ? { dem: Number(race[1]), rep: Number(race[2]) } : null,
    stateBaselineVotes: race ? stateBaseline : null,
    stateBaselineSource: race ? (raceYear === 2024 ? DELAWARE_2024_SOURCE : DELAWARE_2022_SOURCE) : null,
    sourceStatus: holder ? 'official-seat-election' : 'district-only',
    ...(chamber.chamber === 'upper' ? { seatUpIn2028: Boolean(row), seatUpStatus: 'verified-seat-class', seatUpSource: DELAWARE_SENATE_SCHEDULE_SOURCE } : {}),
  };
}

function wyomingSeat(chamber, seatIndex) {
  const rows = chamber.chamber === 'lower' ? WYOMING_HOUSE_2024 : WYOMING_SENATE_2024;
  const row = rows.find(([district]) => district === seatIndex);
  const [district, dem, rep, holder, holderName] = row || [seatIndex, null, null, null, null];
  const contested = Number.isFinite(dem) && Number.isFinite(rep) && (Number(dem) + Number(rep)) > 0;
  const baseline = 100 * (WYOMING_PRESIDENT_2024.dem - WYOMING_PRESIDENT_2024.rep) / (WYOMING_PRESIDENT_2024.dem + WYOMING_PRESIDENT_2024.rep);
  const lean = contested ? 100 * ((Number(dem) - Number(rep))) / ((Number(dem) + Number(rep))) - baseline : null;
  return {
    districtId: String(district), identityStatus: 'verified-single-member-district',
    boundaryVintage: 2022, boundarySource: WYOMING_DISTRICT_SOURCE,
    holderParty2024: holder, holderName2024: holderName,
    holderStatus: holder ? 'official-2024-election-winner' : 'unavailable-seat-level-assignment',
    holderSource: holder ? WYOMING_2024_SOURCE : null,
    baselineLeanDMinusR: lean, leanStatus: contested ? 'official-last-contested-race-2024' : 'unavailable-no-sourced-contested-race',
    baselineRaceYear: contested ? 2024 : null, baselineStateRaceYear: contested ? 2024 : null,
    leanSource: contested ? WYOMING_2024_SOURCE : null,
    raceVotes: contested ? { dem, rep } : null,
    stateBaselineVotes: contested ? WYOMING_PRESIDENT_2024 : null,
    stateBaselineSource: contested ? WYOMING_2024_SOURCE : null,
    sourceStatus: holder ? 'official-seat-election' : 'district-only',
    ...(chamber.chamber === 'upper' ? { seatUpIn2028: seatIndex % 2 === 0, seatUpStatus: 'verified-seat-class', seatUpSource: WYOMING_SCHEDULE_SOURCE } : {}),
  };
}

function northCarolinaSeat(chamber, seatIndex) {
  const rows = chamber.chamber === 'lower' ? NORTH_CAROLINA_HOUSE_2024 : NORTH_CAROLINA_SENATE_2024;
  const row = rows.find(([district]) => district === seatIndex);
  if (!row) throw new Error(`North Carolina ${chamber.chamber} district ${seatIndex} is missing from the verified 2024 source.`);
  const [district, dem, rep, holder, holderName, sourceKey] = row;
  const source = NORTH_CAROLINA_SOURCES[sourceKey];
  if (!source) throw new Error(`North Carolina district ${district} has an unknown source.`);
  const contested = Number.isFinite(dem) && Number.isFinite(rep) && (Number(dem) + Number(rep)) > 0;
  const baseline = 100 * (NORTH_CAROLINA_PRESIDENT_2024.dem - NORTH_CAROLINA_PRESIDENT_2024.rep) / (NORTH_CAROLINA_PRESIDENT_2024.dem + NORTH_CAROLINA_PRESIDENT_2024.rep);
  const lean = contested ? 100 * ((Number(dem) - Number(rep))) / ((Number(dem) + Number(rep))) - baseline : null;
  return {
    districtId: String(district), identityStatus: 'verified-single-member-district',
    boundaryVintage: 2023, boundarySource: NORTH_CAROLINA_DISTRICT_SOURCE,
    holderParty2024: holder, holderName2024: holderName, holderStatus: 'official-2024-election-winner', holderSource: source,
    baselineLeanDMinusR: lean, leanStatus: contested ? 'official-contested-race-2024' : 'unavailable-no-two-party-race',
    baselineRaceYear: contested ? 2024 : null, baselineStateRaceYear: contested ? 2024 : null,
    leanSource: contested ? source : null,
    stateBaselineSource: contested ? NORTH_CAROLINA_SOURCES.certified : null,
    raceVotes: contested ? { dem, rep } : null,
    stateBaselineVotes: contested ? NORTH_CAROLINA_PRESIDENT_2024 : null,
    sourceStatus: source.status,
  };
}

function washingtonSeat(chamber, seatIndex) {
  if (chamber.chamber === 'upper') {
    const row = WASHINGTON_SENATE_2024.find(([district]) => district === seatIndex);
    const raceSource = seatIndex === 18 ? WASHINGTON_SENATE_RECOUNT_SOURCE : WASHINGTON_2024_SOURCE;
    const [, dem, rep, holderParty2024, holderName2024, holderBallotPreference2024] = row || [];
    const contested = Number.isFinite(dem) && Number.isFinite(rep) && (Number(dem) + Number(rep)) > 0;
    const statewideMargin = 100 * (WASHINGTON_PRESIDENT_2024.dem - WASHINGTON_PRESIDENT_2024.rep)
      / (WASHINGTON_PRESIDENT_2024.dem + WASHINGTON_PRESIDENT_2024.rep);
    return {
      districtId: String(seatIndex), identityStatus: 'verified-single-member-district',
      boundaryVintage: 2024, boundarySource: WASHINGTON_DISTRICT_SOURCE,
      holderParty2024: holderParty2024 || null, holderName2024: holderName2024 || null,
      holderBallotPreference2024: holderBallotPreference2024 || null,
      holderStatus: row ? 'official-2024-election-winner-ballot-preference' : 'unavailable-no-2024-senate-election',
      holderSource: row ? raceSource : null,
      baselineLeanDMinusR: contested ? 100 * (Number(dem) - Number(rep)) / (Number(dem) + Number(rep)) - statewideMargin : null,
      leanStatus: contested ? 'official-contested-race-2024-relative-to-state-presidential-vote'
        : row ? 'unavailable-no-two-party-senate-race' : 'unavailable-seat-race-not-in-2024',
      baselineRaceYear: contested ? 2024 : null, baselineStateRaceYear: contested ? 2024 : null,
      leanSource: contested ? raceSource : null,
      stateBaselineSource: contested ? WASHINGTON_PRESIDENT_SOURCE : null,
      raceVotes: contested ? { dem, rep } : null,
      stateBaselineVotes: contested ? WASHINGTON_PRESIDENT_2024 : null,
      sourceStatus: row ? raceSource.status : 'no-2024-senate-election',
      seatUpIn2028: Boolean(row),
      seatUpStatus: row ? 'verified-2024-senate-election-class' : 'verified-2028-non-election-class',
      seatUpSource: WASHINGTON_2024_SOURCE,
    };
  }

  // House positions are distinct elections within each two-seat district.
  if (chamber.chamber !== 'lower') return null;
  const district = Math.ceil(seatIndex / 2);
  const position = (seatIndex - 1) % 2 + 1;
  const row = WASHINGTON_HOUSE_2024.find(([d, p]) => d === district && p === position);
  if (!row) throw new Error(`Washington House district ${district}, position ${position} is missing.`);
  const [, , dem, rep, holder, holderName, preference] = row;
  const contested = Number.isFinite(dem) && Number.isFinite(rep) && (Number(dem) + Number(rep)) > 0;
  const baseline = 100 * (WASHINGTON_PRESIDENT_2024.dem - WASHINGTON_PRESIDENT_2024.rep) / (WASHINGTON_PRESIDENT_2024.dem + WASHINGTON_PRESIDENT_2024.rep);
  return {
    districtId: String(district), position, identityStatus: 'verified-district-and-position',
    boundaryVintage: 2024, boundarySource: WASHINGTON_DISTRICT_SOURCE,
    holderParty2024: holder, holderName2024: holderName, holderBallotPreference2024: preference,
    holderStatus: 'official-2024-election-winner-ballot-preference', holderSource: WASHINGTON_2024_SOURCE,
    baselineLeanDMinusR: contested ? 100 * ((Number(dem) - Number(rep))) / ((Number(dem) + Number(rep))) - baseline : null,
    leanStatus: contested ? 'official-contested-race-2024' : 'unavailable-no-two-party-race',
    baselineRaceYear: contested ? 2024 : null, baselineStateRaceYear: contested ? 2024 : null,
    leanSource: contested ? WASHINGTON_2024_SOURCE : null,
    stateBaselineSource: contested ? WASHINGTON_PRESIDENT_SOURCE : null,
    raceVotes: contested ? { dem, rep } : null,
    stateBaselineVotes: contested ? WASHINGTON_PRESIDENT_2024 : null,
    sourceStatus: WASHINGTON_2024_SOURCE.status,
  };
}

function californiaSeat(chamber, seatIndex) {
  const row = CALIFORNIA_LEGISLATURE_2024.find(([rowChamber, district]) => rowChamber === chamber.chamber && district === seatIndex);
  const source = chamber.chamber === 'lower' ? CALIFORNIA_ASSEMBLY_2024_SOURCE : CALIFORNIA_SENATE_2024_SOURCE;
  const dem = row?.[2] ?? null;
  const rep = row?.[3] ?? null;
  const contested = Number.isFinite(dem) && Number.isFinite(rep) && (Number(dem) + Number(rep)) > 0;
  const statewideMargin = 100 * (CALIFORNIA_PRESIDENT_2024.dem - CALIFORNIA_PRESIDENT_2024.rep)
    / (CALIFORNIA_PRESIDENT_2024.dem + CALIFORNIA_PRESIDENT_2024.rep);
  const contestMargin = contested ? 100 * ((Number(dem) - Number(rep))) / ((Number(dem) + Number(rep))) : null;
  const upIn2028 = chamber.chamber === 'lower' || seatIndex % 2 === 1;
  return {
    districtId: String(seatIndex), identityStatus: 'verified-single-member-district',
    boundaryVintage: 2022, boundarySource: CALIFORNIA_DISTRICT_SOURCE,
    holderParty2024: row?.[4] ?? null, holderName2024: row?.[5] ?? null,
    holderStatus: row ? 'official-certified-2024-general-election-winner' : 'no-2024-general-race-entry-in-certified-SOV',
    holderSource: row ? source : null,
    baselineLeanDMinusR: contested ? contestMargin - statewideMargin : null,
    leanStatus: contested ? 'official-certified-2024-two-party-race-relative-to-state-presidential-vote' : 'unavailable-no-contested-two-party-general-race',
    baselineRaceYear: contested ? 2024 : null, baselineStateRaceYear: contested ? 2024 : null,
    leanSource: contested ? source : null,
    stateBaselineSource: contested ? CALIFORNIA_PRESIDENT_2024_SOURCE : null,
    raceVotes: contested ? { dem, rep } : null,
    stateBaselineVotes: contested ? CALIFORNIA_PRESIDENT_2024 : null,
    sourceStatus: row ? 'official-certified-state-sov' : 'no-general-election-row-in-certified-source',
    ...(chamber.chamber === 'upper' ? {
      seatUpIn2028: upIn2028, seatUpStatus: 'verified-odd-district-four-year-class', seatUpSource: CALIFORNIA_SENATE_2024_SOURCE,
    } : {}),
  };
}

function tennesseeSeat(chamber, seatIndex) {
  const row = TENNESSEE_LEGISLATURE_2024.find(([rowChamber, district]) => rowChamber === chamber.chamber && district === seatIndex);
  const dem = row?.[2] ?? null;
  const rep = row?.[3] ?? null;
  const contested = Number.isFinite(dem) && Number.isFinite(rep) && (Number(dem) + Number(rep)) > 0;
  const upIn2028 = chamber.chamber === 'lower' || seatIndex % 2 === 0;
  return {
    districtId: String(seatIndex), identityStatus: 'verified-single-member-district',
    boundaryVintage: 2022, boundarySource: TENNESSEE_DISTRICT_SOURCE,
    holderParty2024: row?.[4] ?? null, holderName2024: row?.[5] ?? null,
    holderStatus: row ? 'official-certified-2024-general-election-winner' : 'no-2024-general-election-contest',
    holderSource: row ? TENNESSEE_2024_SOURCE : null,
    baselineLeanDMinusR: contested
      ? 100 * ((Number(dem) - Number(rep))) / ((Number(dem) + Number(rep))) - 100 * (TENNESSEE_PRESIDENT_2024.dem - TENNESSEE_PRESIDENT_2024.rep) / (TENNESSEE_PRESIDENT_2024.dem + TENNESSEE_PRESIDENT_2024.rep)
      : null,
    leanStatus: contested ? 'official-certified-2024-two-party-race-relative-to-state-presidential-vote' : 'unavailable-no-two-party-general-race',
    baselineRaceYear: contested ? 2024 : null, baselineStateRaceYear: contested ? 2024 : null,
    leanSource: contested ? TENNESSEE_2024_SOURCE : null,
    stateBaselineSource: contested ? TENNESSEE_2024_SOURCE : null,
    raceVotes: contested ? { dem, rep } : null,
    stateBaselineVotes: contested ? TENNESSEE_PRESIDENT_2024 : null,
    sourceStatus: row ? 'official-certified-state-results' : 'no-2024-general-election-contest',
    ...(chamber.chamber === 'upper' ? {
      seatUpIn2028: upIn2028, seatUpStatus: 'verified-even-district-four-year-class', seatUpSource: TENNESSEE_2024_SOURCE,
    } : {}),
  };
}

function arkansasSeat(chamber, seatIndex) {
  const row = ARKANSAS_LEGISLATURE_2024.find(([rowChamber, district]) => rowChamber === chamber.chamber && district === seatIndex);
  const dem = row?.[2] ?? null;
  const rep = row?.[3] ?? null;
  const contested = Number.isFinite(dem) && Number.isFinite(rep) && (Number(dem) + Number(rep)) > 0;
  const upIn2028 = chamber.chamber === 'lower' || Boolean(row);
  return {
    districtId: String(seatIndex), identityStatus: 'verified-single-member-district',
    boundaryVintage: 2022, boundarySource: ARKANSAS_DISTRICT_SOURCE,
    holderParty2024: row?.[4] ?? null, holderName2024: row?.[5] ?? null,
    holderStatus: row ? 'official-certified-2024-general-election-winner' : 'no-2024-general-election-contest',
    holderSource: row ? ARKANSAS_2024_SOURCE : null,
    baselineLeanDMinusR: contested
      ? 100 * ((Number(dem) - Number(rep))) / ((Number(dem) + Number(rep))) - 100 * (ARKANSAS_PRESIDENT_2024.dem - ARKANSAS_PRESIDENT_2024.rep) / (ARKANSAS_PRESIDENT_2024.dem + ARKANSAS_PRESIDENT_2024.rep)
      : null,
    leanStatus: contested ? 'official-certified-2024-two-party-race-relative-to-state-presidential-vote' : 'unavailable-no-two-party-general-race',
    baselineRaceYear: contested ? 2024 : null, baselineStateRaceYear: contested ? 2024 : null,
    leanSource: contested ? ARKANSAS_2024_SOURCE : null,
    stateBaselineSource: contested ? ARKANSAS_2024_SOURCE : null,
    raceVotes: contested ? { dem, rep } : null,
    stateBaselineVotes: contested ? ARKANSAS_PRESIDENT_2024 : null,
    sourceStatus: row ? 'official-certified-state-results' : 'no-2024-general-election-contest',
    ...(chamber.chamber === 'upper' ? {
      seatUpIn2028: upIn2028, seatUpStatus: row ? 'verified-2024-senate-election-class' : 'verified-2028-non-election-class',
      seatUpSource: ARKANSAS_2024_SOURCE,
    } : {}),
  };
}

function southCarolinaSeat(chamber, seatIndex) {
  if (chamber.chamber === 'upper') {
    const row = SOUTH_CAROLINA_SENATE_2024.find(([district]) => district === seatIndex);
    if (!row) throw new Error(`South Carolina Senate district ${seatIndex} is missing from the certified winner roster.`);
    const [, holderName2024, holderParty2024] = row;
    return {
      districtId: String(seatIndex), identityStatus: 'verified-certified-district-seat',
      boundaryVintage: 2024, boundarySource: SOUTH_CAROLINA_DISTRICT_SOURCE,
      holderParty2024, holderName2024,
      holderStatus: 'official-certified-2024-general-election-winner',
      holderSource: SOUTH_CAROLINA_SENATE_2024_SOURCE,
      holderPartySource: SOUTH_CAROLINA_SENATE_PARTY_SOURCE,
      baselineLeanDMinusR: null, leanStatus: 'unavailable-no-certified-district-vote-totals',
      baselineRaceYear: null, baselineStateRaceYear: null,
      leanSource: null, stateBaselineSource: null, raceVotes: null, stateBaselineVotes: null,
      sourceStatus: 'official-certified-winner-roster-no-vote-totals',
      seatUpIn2028: true, seatUpStatus: 'verified-2024-four-year-class',
      seatUpSource: SOUTH_CAROLINA_SENATE_2024_SOURCE,
    };
  }
  if (chamber.chamber !== 'lower') return null;
  const row = SOUTH_CAROLINA_HOUSE_2024.find(([district]) => district === seatIndex);
  if (!row) throw new Error(`South Carolina House district ${seatIndex} is missing from the certified winner roster.`);
  const [, holder, holderName] = row;
  return {
    districtId: String(seatIndex), identityStatus: 'verified-certified-district-seat',
    boundaryVintage: 2024, boundarySource: SOUTH_CAROLINA_DISTRICT_SOURCE,
    holderParty2024: holder, holderName2024: holderName,
    holderStatus: 'official-certified-2024-general-election-winner', holderSource: SOUTH_CAROLINA_2024_SOURCE,
    baselineLeanDMinusR: null, leanStatus: 'unavailable-no-certified-district-vote-totals',
    baselineRaceYear: null, baselineStateRaceYear: null,
    leanSource: null, stateBaselineSource: null, raceVotes: null, stateBaselineVotes: null,
    sourceStatus: 'official-certified-winner-roster-no-vote-totals',
  };
}

function kentuckySeat(chamber, seatIndex) {
  if (chamber.chamber !== 'lower' && chamber.chamber !== 'upper') return null;
  const isUpper = chamber.chamber === 'upper';
  const rows = isUpper ? KENTUCKY_SENATE_2024 : KENTUCKY_HOUSE_2024;
  const row = rows.find(([district]) => district === seatIndex);
  if (!isUpper && !row) throw new Error(`Kentucky House district ${seatIndex} is missing from the certified 2024 results.`);
  const [, dem, rep, holder, holderName] = row || [seatIndex, null, null, null, null];
  const contested = Number.isFinite(dem) && Number.isFinite(rep) && (Number(dem) + Number(rep)) > 0;
  const upIn2028 = isUpper && seatIndex % 2 === 1;
  return {
    districtId: String(seatIndex), identityStatus: 'verified-single-member-district',
    boundaryVintage: 2022, boundarySource: KENTUCKY_DISTRICT_SOURCE,
    holderParty2024: holder, holderName2024: holderName,
    holderStatus: holder ? (holder === 'other' ? 'official-certified-2024-write-in-vote-leader' : 'official-certified-2024-general-election-winner') : 'no-2024-general-election-contest',
    holderSource: holder ? KENTUCKY_2024_SOURCE : null,
    baselineLeanDMinusR: contested
      ? 100 * ((Number(dem) - Number(rep))) / ((Number(dem) + Number(rep)))
        - 100 * (KENTUCKY_PRESIDENT_2024.dem - KENTUCKY_PRESIDENT_2024.rep) / (KENTUCKY_PRESIDENT_2024.dem + KENTUCKY_PRESIDENT_2024.rep)
      : null,
    leanStatus: contested ? 'official-certified-2024-two-party-race-relative-to-state-presidential-vote' : 'unavailable-no-two-party-general-race',
    baselineRaceYear: contested ? 2024 : null, baselineStateRaceYear: contested ? 2024 : null,
    leanSource: contested ? KENTUCKY_2024_SOURCE : null,
    stateBaselineSource: contested ? KENTUCKY_PRESIDENT_2024_SOURCE : null,
    raceVotes: contested ? { dem, rep } : null,
    stateBaselineVotes: contested ? KENTUCKY_PRESIDENT_2024 : null,
    sourceStatus: holder ? 'official-certified-state-results' : 'no-2024-general-election-contest',
    ...(isUpper ? {
      seatUpIn2028: upIn2028, seatUpStatus: upIn2028 ? 'verified-odd-district-four-year-class' : 'verified-even-district-four-year-class-not-up',
      seatUpSource: KENTUCKY_SENATE_SCHEDULE_SOURCE,
    } : {}),
  };
}

function arizonaSeat(chamber, seatIndex) {
  const baseline = 100 * (ARIZONA_PRESIDENT_2024.dem - ARIZONA_PRESIDENT_2024.rep)
    / (ARIZONA_PRESIDENT_2024.dem + ARIZONA_PRESIDENT_2024.rep);
  if (chamber.chamber === 'lower') {
    const district = Math.ceil(seatIndex / 2);
    const position = (seatIndex - 1) % 2 + 1;
    const row = ARIZONA_HOUSE_2024.find(([rowDistrict, rowPosition]) => rowDistrict === district && rowPosition === position);
    if (!row) throw new Error(`Arizona House district ${district}, canvass slot ${position} is missing.`);
    const [, , holder, holderName] = row;
    return {
      districtId: String(district), position, identityStatus: 'verified-district; block-vote-winner-slot',
      boundaryVintage: 2022, boundarySource: ARIZONA_DISTRICT_SOURCE,
      holderParty2024: holder, holderName2024: holderName,
      holderStatus: 'official-certified-2024-block-vote-winner', holderSource: ARIZONA_2024_SOURCE,
      baselineLeanDMinusR: null, leanStatus: 'unavailable-multi-member-block-vote-seat-has-no-single-seat-two-party-margin',
      baselineRaceYear: null, baselineStateRaceYear: null,
      leanSource: null, stateBaselineSource: null, raceVotes: null, stateBaselineVotes: null,
      sourceStatus: 'official-certified-2024-house-winner; position-follows-canvass-winner-order',
    };
  }
  if (chamber.chamber !== 'upper') return null;
  const row = ARIZONA_SENATE_2024.find(([district]) => district === seatIndex);
  if (!row) throw new Error(`Arizona Senate district ${seatIndex} is missing from the official canvass.`);
  const [district, dem, rep, holder, holderName] = row;
  const contested = Number.isFinite(dem) && Number.isFinite(rep) && (Number(dem) + Number(rep)) > 0;
  return {
    districtId: String(district), identityStatus: 'verified-single-member-district',
    boundaryVintage: 2022, boundarySource: ARIZONA_DISTRICT_SOURCE,
    holderParty2024: holder, holderName2024: holderName,
    holderStatus: 'official-certified-2024-general-election-winner', holderSource: ARIZONA_2024_SOURCE,
    baselineLeanDMinusR: contested ? 100 * ((Number(dem) - Number(rep))) / ((Number(dem) + Number(rep))) - baseline : null,
    leanStatus: contested ? 'official-certified-2024-two-party-race-relative-to-state-presidential-vote' : 'unavailable-no-two-party-general-race',
    baselineRaceYear: contested ? 2024 : null, baselineStateRaceYear: contested ? 2024 : null,
    leanSource: contested ? ARIZONA_2024_SOURCE : null,
    stateBaselineSource: contested ? ARIZONA_PRESIDENT_2024_SOURCE : null,
    raceVotes: contested ? { dem, rep } : null,
    stateBaselineVotes: contested ? ARIZONA_PRESIDENT_2024 : null,
    sourceStatus: 'official-certified-state-results',
    seatUpIn2028: true, seatUpStatus: 'verified-two-year-legislative-cycle',
    seatUpSource: STATE_LEGISLATURE_RESULTS_2024_SOURCE,
  };
}

function alaskaSeat(chamber, seatIndex) {
  const isUpper = chamber.chamber === 'upper';
  const districtId = isUpper ? String.fromCharCode(64 + seatIndex) : String(seatIndex);
  const row = isUpper
    ? ALASKA_SENATE_2024.find(([district]) => district === seatIndex)
    : ALASKA_HOUSE_2024.find(([district]) => district === seatIndex);
  const holderParty2024 = row?.[1] ?? null;
  const holderName2024 = row?.[2] ?? null;
  const isIn2024Class = !isUpper || seatIndex % 2 === 0;
  return {
    districtId,
    identityStatus: isUpper ? 'verified-lettered-single-member-district' : 'verified-single-member-district',
    boundaryVintage: 2022,
    boundarySource: ALASKA_DISTRICT_SOURCE,
    holderParty2024,
    holderName2024,
    holderStatus: holderParty2024
      ? 'official-certified-2024-general-election-winner'
      : isUpper ? '2024-winner-not-in-this-class-holder-unresolved' : 'unavailable-seat-level-assignment',
    holderSource: holderParty2024
      ? isUpper ? ALASKA_SENATE_CERTIFICATE_SOURCE : ALASKA_HOUSE_CERTIFICATE_SOURCE
      : null,
    baselineLeanDMinusR: null,
    leanStatus: 'unavailable-two-party-district-vote-margin-not-modeled',
    baselineRaceYear: null,
    baselineStateRaceYear: null,
    leanSource: null,
    stateBaselineSource: null,
    raceVotes: null,
    stateBaselineVotes: null,
    sourceStatus: holderParty2024
      ? ALASKA_2024_SOURCE.status
      : isUpper ? '2024-class-schedule-verified; prior-class-holder-unresolved' : 'district-only',
    ...(isUpper ? {
      seatUpIn2028: isIn2024Class,
      seatUpStatus: isIn2024Class ? 'verified-2024-four-year-class' : 'verified-2022-four-year-class',
      seatUpSource: ALASKA_SENATE_CERTIFICATE_SOURCE,
    } : {}),
  };
}

function iowaSeat(chamber, seatIndex) {
  const isUpper = chamber.chamber === 'upper';
  const rows = isUpper ? IOWA_SENATE_2024 : IOWA_HOUSE_2024;
  const row = rows.find(([district]) => district === seatIndex);
  const [district, holderParty2024, holderName2024] = row || [seatIndex, null, null];
  const electedIn2024 = !isUpper || seatIndex % 2 === 0;
  return {
    districtId: String(district),
    identityStatus: 'verified-single-member-district',
    boundaryVintage: 2021,
    boundarySource: IOWA_DISTRICT_SOURCE,
    holderParty2024,
    holderName2024,
    holderStatus: holderName2024
      ? 'official-certified-2024-general-election-winner'
      : '2024-winner-not-in-this-class-holder-unresolved',
    holderSource: holderName2024 ? IOWA_2024_SOURCE : null,
    winnerListSource: holderName2024 ? IOWA_WINNER_LIST_SOURCE : null,
    baselineLeanDMinusR: null,
    leanStatus: 'unavailable-district-two-party-margin-not-modeled',
    baselineRaceYear: null,
    baselineStateRaceYear: null,
    leanSource: null,
    stateBaselineSource: null,
    raceVotes: null,
    stateBaselineVotes: null,
    sourceStatus: holderName2024 ? IOWA_2024_SOURCE.status : 'district-only',
    ...(isUpper ? {
      seatUpIn2028: electedIn2024,
      seatUpStatus: electedIn2024 ? 'verified-2024-four-year-class' : 'verified-2022-four-year-class',
      seatUpSource: IOWA_WINNER_LIST_SOURCE,
    } : { seatUpIn2028: true, seatUpStatus: 'verified-two-year-legislative-cycle' }),
  };
}

function kansasSeat(chamber, seatIndex) {
  const isUpper = chamber.chamber === 'upper';
  const rows = isUpper ? KANSAS_SENATE_2024 : KANSAS_HOUSE_2024;
  const row = rows.find(([district]) => district === seatIndex);
  if (!row) throw new Error(`Missing certified Kansas 2024 ${chamber.chamber} winner for district ${seatIndex}.`);
  const [districtId, holderParty2024, holderName2024] = row;
  return {
    districtId: String(districtId),
    identityStatus: 'verified-single-member-district',
    boundaryVintage: 2022,
    boundarySource: KANSAS_DISTRICT_SOURCE,
    holderParty2024,
    holderName2024,
    holderStatus: 'official-certified-2024-general-election-winner',
    holderSource: KANSAS_2024_SOURCE,
    baselineLeanDMinusR: null,
    leanStatus: 'unavailable-district-two-party-margin-not-modeled',
    baselineRaceYear: null,
    baselineStateRaceYear: null,
    leanSource: null,
    stateBaselineSource: null,
    raceVotes: null,
    stateBaselineVotes: null,
    sourceStatus: KANSAS_2024_SOURCE.status,
    ...(isUpper ? {
      seatUpIn2028: true,
      seatUpStatus: 'verified-2024-four-year-class',
      seatUpSource: KANSAS_2024_SOURCE,
    } : { seatUpIn2028: true, seatUpStatus: 'verified-two-year-legislative-cycle' }),
  };
}

function scheduleForSeat(chamber) {
  if (chamber.seatsUp2028 === 0) return { seatUpIn2028: false, seatUpStatus: 'not-scheduled' };
  if (chamber.seatsUp2028 === chamber.totalSeats) return { seatUpIn2028: true, seatUpStatus: 'all-seats-scheduled' };
  // The source schedule gives the count but not a verified seat-class roster.
  // Do not invent which numbered seats are in the 2028 class.
  return { seatUpIn2028: null, seatUpStatus: 'seat-class-roster-unavailable' };
}

function makeSeats(state, chamber) {
  const chamberSource = (STATE_LEGISLATURE_RESULTS_2024_BY_STATE[state.abbr] || [])
    .find((record) => record.chamber === chamber.chamber);
  if (!chamberSource || chamberSource.totalSeats !== chamber.totalSeats) {
    throw new Error(`2024 aggregate source does not reconcile to ${state.abbr} ${chamber.chamber} statutory seats.`);
  }
  return Array.from({ length: chamber.totalSeats }, (_, index) => {
    const seatIndex = index + 1;
    const schedule = scheduleForSeat(chamber);
    const nonpartisan = state.nonpartisanUnicameral === true;
    const verified = state.abbr === 'DE' ? delawareSeat(chamber, seatIndex) : state.abbr === 'WY' ? wyomingSeat(chamber, seatIndex) : state.abbr === 'NC' ? northCarolinaSeat(chamber, seatIndex) : state.abbr === 'WA' ? washingtonSeat(chamber, seatIndex) : state.abbr === 'CA' ? californiaSeat(chamber, seatIndex) : state.abbr === 'TN' ? tennesseeSeat(chamber, seatIndex) : state.abbr === 'AR' ? arkansasSeat(chamber, seatIndex) : state.abbr === 'SC' ? southCarolinaSeat(chamber, seatIndex) : state.abbr === 'KY' ? kentuckySeat(chamber, seatIndex) : state.abbr === 'AZ' ? arizonaSeat(chamber, seatIndex) : state.abbr === 'AK' ? alaskaSeat(chamber, seatIndex) : state.abbr === 'IA' ? iowaSeat(chamber, seatIndex) : state.abbr === 'KS' ? kansasSeat(chamber, seatIndex) : null;
    const research = RESEARCH_2024_SEAT_BY_ID[`${state.abbr}:${chamber.chamber}:seat-${String(seatIndex).padStart(3, '0')}`];
    const priorCycleResearch = PRIOR_CYCLE_SEAT_BY_ID[`${state.abbr}:${chamber.chamber}:seat-${String(seatIndex).padStart(3, '0')}`];
    const seat = {
      schemaVersion: STATE_LEGISLATURE_SEAT_SCHEMA_VERSION,
      seatId: `${state.abbr}:${chamber.chamber}:seat-${String(seatIndex).padStart(3, '0')}`,
      state: state.abbr,
      stateName: state.name,
      chamber: chamber.chamber,
      seatIndex,
      districtId: null,
      identityStatus: 'stable-index-district-join-unavailable',
      holderParty2024: nonpartisan ? 'nonpartisan' : null,
      holderStatus: nonpartisan ? 'officially-nonpartisan-chamber' : 'unavailable-seat-level-assignment',
      baselineLeanDMinusR: null,
      leanStatus: 'unavailable-seat-level-result-and-same-cycle-state-baseline',
      baselineRaceYear: null,
      baselineStateRaceYear: null,
      holderSource: STATE_LEGISLATURE_RESULTS_2024_SOURCE,
      leanSource: null,
      sourceYear: 2024,
      sourceStatus: 'chamber-aggregate-only',
      voterWeight: 1,
      ...schedule,
      ...(priorCycleResearch || {}),
      ...(research || {}),
      ...(verified || {}),
    };
    if (priorCycleResearch && !seat.holderName2024) {
      seat.holderParty2024 = seat.holderParty2024 ?? priorCycleResearch.holderParty2024;
      seat.holderName2024 = priorCycleResearch.holderName2024;
      seat.holderStatus = priorCycleResearch.holderStatus;
      seat.holderSource = priorCycleResearch.holderSource;
      seat.sourceStatus = priorCycleResearch.sourceStatus;
      seat.priorElectionYear = priorCycleResearch.priorElectionYear;
      seat.districtId = seat.districtId ?? priorCycleResearch.districtId;
      seat.position = seat.position ?? priorCycleResearch.position;
      seat.identityStatus = priorCycleResearch.identityStatus;
      if (seat.seatUpIn2028 == null && priorCycleResearch.seatUpIn2028 != null) {
        seat.seatUpIn2028 = priorCycleResearch.seatUpIn2028;
        seat.seatUpStatus = priorCycleResearch.seatUpStatus;
        seat.seatUpSource = priorCycleResearch.seatUpSource;
      } else if (seat.seatUpIn2028 == null && priorCycleResearch.seatUpStatus) {
        seat.seatUpStatus = priorCycleResearch.seatUpStatus;
        seat.seatUpSource = priorCycleResearch.seatUpSource;
      }
    }
    return Object.freeze(seat);
  });
}

/** @type {ReadonlyArray<Record<string, any>>} */
export const STATE_LEGISLATURE_SEATS_2028 = Object.freeze(
  STATE_LEGISLATURES_2028.flatMap((state) => state.chambers.flatMap((chamber) => makeSeats(state, chamber))),
);

export const STATE_LEGISLATURE_SEATS_2028_BY_ID = Object.freeze(
  Object.fromEntries(STATE_LEGISLATURE_SEATS_2028.map((seat) => [seat.seatId, seat])),
);

export function validateStateLegislatureSeatData({
  seats = STATE_LEGISLATURE_SEATS_2028,
  schedules = STATE_LEGISLATURES_2028,
  resultsByState = STATE_LEGISLATURE_RESULTS_2024_BY_STATE,
} = {}) {
  const errors = [];
  const ids = new Set();
  (seats || []).forEach((seat) => {
    if (!seat?.seatId || ids.has(seat.seatId)) errors.push(`Missing or duplicate legislative seat ID: ${seat?.seatId || '(blank)'}.`);
    ids.add(seat?.seatId);
    if (seat?.voterWeight !== 1) errors.push(`${seat?.seatId || 'Unknown seat'} must have voterWeight 1.`);
    if (seat?.sourceYear !== 2024) errors.push(`${seat?.seatId || 'Unknown seat'} must identify the 2024 source year.`);
    if (seat?.baselineLeanDMinusR != null && (!Number.isFinite(seat.baselineLeanDMinusR) || Math.abs(seat.baselineLeanDMinusR) > 100)) errors.push(`${seat?.seatId || 'Unknown seat'} has an invalid D-minus-R lean.`);
    if (seat?.holderParty2024 != null && !['dem', 'rep', 'other', 'independent', 'nonpartisan', 'vacant'].includes(seat.holderParty2024)) errors.push(`${seat?.seatId || 'Unknown seat'} has an invalid 2024 holder party.`);
    if (seat?.seatUpIn2028 !== true && seat?.seatUpIn2028 !== false && seat?.seatUpIn2028 !== null) errors.push(`${seat?.seatId || 'Unknown seat'} has an invalid 2028 schedule value.`);
  });

  for (const state of schedules || []) {
    const results = resultsByState[state.abbr] || [];
    for (const chamber of state.chambers) {
      const chamberSeats = (seats || []).filter((seat) => seat.state === state.abbr && seat.chamber === chamber.chamber);
      if (chamberSeats.length !== chamber.totalSeats) errors.push(`${state.abbr} ${chamber.chamber} has ${chamberSeats.length} seat records; expected ${chamber.totalSeats}.`);
      const aggregate = results.find((result) => result.chamber === chamber.chamber);
      if (!aggregate || aggregate.totalSeats !== chamber.totalSeats || aggregate.dem + aggregate.rep + aggregate.other !== chamber.totalSeats) {
        errors.push(`${state.abbr} ${chamber.chamber} 2024 aggregate does not match its statutory chamber total.`);
      }
      if (aggregate) {
        const knownHolders = chamberSeats.filter((seat) => seat.holderParty2024 != null);
        const holderCounts = knownHolders.reduce((counts, seat) => {
          const party = seat.holderParty2024 === 'independent' || seat.holderParty2024 === 'nonpartisan' || seat.holderParty2024 === 'vacant'
            ? 'other'
            : seat.holderParty2024;
          if (Object.hasOwn(counts, party)) counts[party] += 1;
          return counts;
        }, { dem: 0, rep: 0, other: 0 });
        const certifiedCompleteRosterOverridesPreliminaryAggregate = aggregate.sourceStatus === 'unofficial-preliminary'
          && knownHolders.length === chamberSeats.length
          && chamberSeats.every((seat) => seat.holderSource?.status === 'official-certified-winner-roster');
        const researchCompleteRosterOverridesPreliminaryAggregate = aggregate.sourceStatus === 'unofficial-preliminary'
          && chamberSeats.length === chamber.totalSeats
          && chamberSeats.every((seat) => seat.holderName2024 && seat.holderSource?.status === 'research-dataset-computed-winner');
        if (!certifiedCompleteRosterOverridesPreliminaryAggregate && !researchCompleteRosterOverridesPreliminaryAggregate) {
          if (holderCounts.dem > aggregate.dem || holderCounts.rep > aggregate.rep || holderCounts.other > aggregate.other) {
            errors.push(`${state.abbr} ${chamber.chamber} seat holder assignments exceed the sourced 2024 chamber totals.`);
          }
          if (knownHolders.length === chamberSeats.length && (
            holderCounts.dem !== aggregate.dem || holderCounts.rep !== aggregate.rep || holderCounts.other !== aggregate.other
          )) errors.push(`${state.abbr} ${chamber.chamber} full seat holder roster does not match the sourced 2024 chamber totals.`);
        }
      }
      chamberSeats.forEach((seat) => {
        const validVoteTotals = [seat.raceVotes, seat.stateBaselineVotes].every((votes) => (
          Number.isInteger(votes?.dem) && votes.dem >= 0
          && Number.isInteger(votes?.rep) && votes.rep >= 0
          && votes.dem + votes.rep > 0
        ));
        if (seat.baselineLeanDMinusR != null && (
          !Number.isInteger(seat.baselineRaceYear)
          || seat.baselineRaceYear !== seat.baselineStateRaceYear
          || !seat.leanSource?.url
          || seat.leanSource.year !== seat.baselineRaceYear
          || !seat.stateBaselineSource?.url
          || seat.stateBaselineSource.year !== seat.baselineStateRaceYear
          || !seat.boundarySource?.url
          || !Number.isInteger(seat.boundaryVintage)
          || !validVoteTotals
        )) {
          errors.push(`${seat.seatId} has a lean without verified race years and a source.`);
        }
        if (Number.isFinite(seat.baselineLeanDMinusR) && validVoteTotals) {
          const raceTotal = seat.raceVotes.dem + seat.raceVotes.rep;
          const baselineTotal = seat.stateBaselineVotes.dem + seat.stateBaselineVotes.rep;
          const computedLean = 100 * (seat.raceVotes.dem - seat.raceVotes.rep) / raceTotal
            - 100 * (seat.stateBaselineVotes.dem - seat.stateBaselineVotes.rep) / baselineTotal;
          if (Math.abs(computedLean - seat.baselineLeanDMinusR) > 0.02) {
            errors.push(`${seat.seatId} lean does not reconcile to its same-cycle race and state vote totals.`);
          }
        }
        if (seat.holderParty2024 != null && !seat.holderSource?.url) errors.push(`${seat.seatId} has a 2024 holder without a source URL.`);
      });
      const scheduledSeatCount = chamberSeats.filter((seat) => seat.seatUpIn2028 === true).length;
      const nonScheduledSeatCount = chamberSeats.filter((seat) => seat.seatUpIn2028 === false).length;
      const hasUnresolvedSchedule = chamberSeats.some((seat) => seat.seatUpIn2028 === null);
      const scheduleMismatch = chamber.seatsUp2028 === 0
        ? nonScheduledSeatCount !== chamber.totalSeats
        : chamber.seatsUp2028 === chamber.totalSeats
          ? scheduledSeatCount !== chamber.totalSeats
          : scheduledSeatCount > chamber.seatsUp2028
            || nonScheduledSeatCount > chamber.totalSeats - chamber.seatsUp2028
            || (!hasUnresolvedSchedule && scheduledSeatCount !== chamber.seatsUp2028);
      if (scheduleMismatch) {
        errors.push(`${state.abbr} ${chamber.chamber} seat-up roster does not reconcile to the 2028 schedule.`);
      }
    }
  }
  return { valid: errors.length === 0, errors, seatCount: seats?.length || 0, chamberCount: (schedules || []).reduce((sum, state) => sum + state.chambers.length, 0) };
}

const VALIDATION = validateStateLegislatureSeatData();
if (!VALIDATION.valid) throw new Error(`State legislature seat catalog is invalid:\n${VALIDATION.errors.join('\n')}`);
