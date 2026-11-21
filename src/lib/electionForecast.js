import { STATE_BY_ABBR } from '@/data/states';
import { houseSnapshot, presidentialRankedTally, resultMargin, resultSnapshot } from '@/lib/gameEngine';
import { buildHouse, buildSenate, RACE_WEIGHT } from '@/lib/downballot';
import { decidePresidency } from '@/lib/presidency';
import { allocateProportional, largestRemainder } from '@/lib/electionRules';
import { earlyBallotsByState, presidentialBallotCounter } from '@/lib/build37Ballots';

const DRAWS = 1200;
const CHAMBER_DRAWS = 600;
const NATIONAL_ERROR_SD = 2.0;
const REGION_ERROR_SD = 1.6;
const STATE_ERROR_SD = 2.6;

function hash32(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

function randomFor(seed) {
  let value = seed >>> 0;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}

function normal(random) {
  const u = Math.max(Number.EPSILON, random());
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function shiftShares(shares, marginShift) {
  const moved = { ...shares };
  moved.dem = Math.max(0, (shares.dem || 0) + marginShift / 2);
  moved.rep = Math.max(0, (shares.rep || 0) - marginShift / 2);
  const total = Object.values(moved).reduce((sum, share) => sum + Math.max(0, share || 0), 0) || 1;
  Object.keys(moved).forEach((party) => {
    moved[party] = (Math.max(0, moved[party] || 0) / total) * 100;
  });
  return moved;
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function reportMeanMargin(report, fallbackMargin) {
  if (!report) return fallbackMargin;
  const pct = clamp((Number(report.pct) || 0) / 100, 0, 1);
  const expected = Number.isFinite(report.expectedMargin) ? report.expectedMargin : fallbackMargin;
  if (report.expectedShares && report.shares) {
    // The model margin is a polling margin. Vote shares already include
    // turnout and other ballot effects, so compare reported votes with their
    // own expected vote-share baseline before applying a correction to it.
    const expectedBallotMargin = (Number(report.expectedShares.dem) || 0) - (Number(report.expectedShares.rep) || 0);
    const countedBallotMargin = (Number(report.shares.dem) || 0) - (Number(report.shares.rep) || 0);
    return expected + (countedBallotMargin - expectedBallotMargin) * pct;
  }
  const counted = Number.isFinite(report.margin) ? report.margin : expected;
  return expected + (counted - expected) * pct;
}

function reportMap(rows, key = 'abbr') {
  return new Map((rows || []).filter((row) => row?.[key]).map((row) => [row[key], row]));
}

function topParty(shares) {
  return Object.entries(shares).sort((a, b) => b[1] - a[1])[0]?.[0] || 'dem';
}

function percentile(values, fraction) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))] || 0;
}

function chamberProjection(controls, demSeats, repSeats, total, majority, rule) {
  return {
    draws: controls.dem + controls.rep + controls.other,
    demControl: (controls.dem / Math.max(1, controls.dem + controls.rep + controls.other)) * 100,
    repControl: (controls.rep / Math.max(1, controls.dem + controls.rep + controls.other)) * 100,
    noMajority: (controls.other / Math.max(1, controls.dem + controls.rep + controls.other)) * 100,
    demMedian: percentile(demSeats, 0.5),
    repMedian: percentile(repSeats, 0.5),
    demRange: [percentile(demSeats, 0.1), percentile(demSeats, 0.9)],
    repRange: [percentile(repSeats, 0.1), percentile(repSeats, 0.9)],
    total,
    majority,
    rule,
  };
}

function lockSenateCalls(draw, reports) {
  const counts = { dem: draw.dem, rep: draw.rep, lib: draw.lib || 0, grn: draw.grn || 0 };
  for (const race of draw.races) {
    const report = reports.get(race.state);
    if (!report?.called) continue;
    const caucus = report.caucus || report.winner;
    if (caucus === race.caucus) continue;
    if (Object.hasOwn(counts, race.caucus)) counts[race.caucus] -= 1;
    if (Object.hasOwn(counts, caucus)) counts[caucus] += 1;
  }
  const control = Object.keys(counts).find((party) => counts[party] >= draw.majority) || 'hung';
  return { ...draw, ...counts, control };
}

export function electionForecast(game, options = {}) {
  const draws = Number.isFinite(options.draws) ? Math.max(1, Math.floor(options.draws)) : DRAWS;
  const chamberDraws = Number.isFinite(options.chamberDraws) ? Math.max(0, Math.min(draws, Math.floor(options.chamberDraws))) : Math.min(CHAMBER_DRAWS, draws);
  const reporting = options.reporting || {};
  const stateReports = reportMap(reporting.states);
  const senateReports = reportMap(reporting.senate, 'state');
  const houseReports = reportMap(reporting.house, 'state');
  const houseDistrictReports = reportMap(reporting.houseDistricts, 'id');
  const districtReports = reportMap(reporting.districts, 'id');
  const stateDeltas = {};
  let forecastGame = {
    ...game,
    pollMiss: null,
    stateMods: { ...(game.stateMods || {}) },
    downballotNews: {
      senate: { ...(game.downballotNews?.senate || {}) },
      house: { ...(game.downballotNews?.house || {}) },
      gov: { ...(game.downballotNews?.gov || {}) },
    },
  };

  stateReports.forEach((report, abbr) => {
    const expected = Number.isFinite(report.expectedMargin) ? report.expectedMargin : resultMargin(abbr, forecastGame);
    const posterior = reportMeanMargin(report, expected);
    const delta = posterior - expected;
    stateDeltas[abbr] = delta;
    forecastGame.stateMods[abbr] = (forecastGame.stateMods[abbr] || 0) + delta;
  });

  const applyRaceReports = (kind, reports) => {
    const sensitivity = kind === 'house' ? 0 : 0.92 * RACE_WEIGHT[kind] + 0.42;
    reports.forEach((report, state) => {
      if (!Number.isFinite(report.expectedMargin)) return;
      const posterior = reportMeanMargin(report, report.expectedMargin);
      const presidentialShare = (stateDeltas[state] || 0) * sensitivity;
      const raceSpecificChange = posterior - report.expectedMargin - presidentialShare;
      forecastGame.downballotNews[kind][state] = (forecastGame.downballotNews[kind][state] || 0) + raceSpecificChange;
    });
  };
  applyRaceReports('senate', senateReports);
  applyRaceReports('house', houseReports);
  applyRaceReports('gov', reportMap(reporting.governors, 'state'));

  forecastGame.houseCalledDistrictWinners = Object.fromEntries([...houseDistrictReports]
    .filter(([, report]) => report.called).map(([id, report]) => [id, report.winner]));
  forecastGame.houseCalledStateSeats = Object.fromEntries([...houseReports]
    .filter(([, report]) => report.called && ['pr', 'mmp'].includes(report.rule))
    .map(([id, report]) => [id, report]));
  const base = resultSnapshot(forecastGame);
  const earlyByState = earlyBallotsByState(game.earlyBallotLedger);
  const ballotCounters = new Map(base.rows.map((row) =>
    [row.abbr, presidentialBallotCounter(forecastGame, row.abbr, earlyByState[row.abbr], Object.keys(row.support))]));
  const stateWins = Object.fromEntries(base.rows.map((row) => [row.abbr, { dem: 0, rep: 0, lib: 0, grn: 0, ind: 0 }]));
  forecastGame.houseReportedDistrictRemaining = Object.fromEntries([...houseDistrictReports]
    .map(([id, report]) => [id, 1 - clamp((Number(report.pct) || 0) / 100, 0, 1)]));
  const house = houseSnapshot(forecastGame, true);
  const houseStateReportAdjustments = Object.fromEntries([...houseReports.keys()].map((state) => [
    state,
    (forecastGame.downballotNews.house[state] || 0) - (game.downballotNews?.house?.[state] || 0),
  ]));
  forecastGame.houseDistrictReportShifts = Object.fromEntries(house.districts
    .map((district) => {
      const report = houseDistrictReports.get(district.id);
      if (!report) return null;
      const expected = Number.isFinite(report.expectedMargin) ? report.expectedMargin : district.margin;
      const posterior = reportMeanMargin(report, expected);
      const stateShift = houseStateReportAdjustments[district.stateAbbr] || 0;
      return [district.id, posterior - expected - stateShift];
    })
    .filter(Boolean));
  const districtHouse = game.electoralRule === 'district' ? houseSnapshot({ ...forecastGame, houseRule: 'standard', presidentialDistrictAllocation: game.build39?.scenario?.id === 'favorite-sons-daughters' }, true) : null;
  const senateBase = buildSenate(forecastGame, (abbr) => resultMargin(abbr, forecastGame), 'result');
  const seedText = [game.candidateId, game.opponentId, game.week, ...base.rows.map((row) => row.margin.toFixed(2))].join('|');
  const random = randomFor(hash32(String(options.seed ?? seedText)));
  const baseMargins = Object.fromEntries(base.rows.map((row) => [row.abbr, row.margin]));
  const electoralRule = game.electoralRule || 'standard';
  const partyYou = game.party;
  const partyThem = game.opponentParty;
  let youWins = 0;
  let themWins = 0;
  let otherWins = 0;
  let evYou = 0;
  let evThem = 0;
  let evOther = 0;
  let popularMargin = 0;
  let rivalPopularShare = 0;
  let rivalHouseSeatShare = 0;
  let rivalSenateSeatShare = 0;
  let rivalHouseMajorities = 0;
  let rivalSenateMajorities = 0;
  const houseControls = { dem: 0, rep: 0, other: 0 };
  const senateControls = { dem: 0, rep: 0, other: 0 };
  const houseDemSeats = [];
  const houseRepSeats = [];
  const senateDemSeats = [];
  const senateRepSeats = [];

  for (let draw = 0; draw < draws; draw++) {
    const nationalError = normal(random) * NATIONAL_ERROR_SD;
    const regionalErrors = {};
    Object.values(STATE_BY_ABBR).forEach((state) => {
      if (regionalErrors[state.region] === undefined) regionalErrors[state.region] = normal(random) * REGION_ERROR_SD;
    });
    const stateErrors = Object.fromEntries(base.rows.map((row) => [row.abbr, normal(random) * STATE_ERROR_SD]));
    const marginWithError = (abbr) => {
      const region = STATE_BY_ABBR[abbr]?.region;
      const remaining = 1 - clamp((Number(stateReports.get(abbr)?.pct) || 0) / 100, 0, 1);
      return baseMargins[abbr] + remaining * (nationalError + (regionalErrors[region] || 0) + (stateErrors[abbr] || 0));
    };
    const evBy = { dem: 0, rep: 0, lib: 0, grn: 0, ind: 0 };
    const rows = base.rows.map((row) => {
      const report = stateReports.get(row.abbr);
      const shift = marginWithError(row.abbr) - row.margin;
      const votes = ballotCounters.get(row.abbr)(shiftShares(row.support, shift));
      const cast = Object.values(votes).reduce((total, value) => total + value, 0) || 1;
      const fullyReported = report?.pct >= 100 && report.shares;
      const shares = fullyReported ? report.shares : Object.fromEntries(Object.entries(votes).map(([party, value]) => [party, value / cast * 100]));
      const ranked = game.thirdMode === 'surge' ? presidentialRankedTally(game, shares) : null;
      const winner = report?.called ? report.winner : (ranked?.winner || topParty(shares));
      stateWins[row.abbr][winner] = (stateWins[row.abbr][winner] || 0) + 1;
      if (electoralRule === 'proportional') {
        const awards = report?.called && report.evAwards ? report.evAwards : allocateProportional(shares, row.ev, 5);
        Object.entries(awards).forEach(([party, seats]) => { evBy[party] = (evBy[party] || 0) + seats; });
      } else if (electoralRule === 'district') {
        evBy[winner] = (evBy[winner] || 0) + (row.abbr === 'DC' ? 3 : 2);
      } else {
        const ev = row.atLarge ?? row.ev;
        evBy[winner] = (evBy[winner] || 0) + ev;
      }
      return { ...row, votes: fullyReported ? null : votes, cast, shares, rcvShares: ranked?.shares || null, winner };
    });
    const districts = electoralRule === 'standard' ? base.districts.map((district) => {
      const report = districtReports.get(district.id);
      const expectedMargin = Number.isFinite(report?.expectedMargin) ? report.expectedMargin : district.margin;
      const reportedResidual = report ? reportMeanMargin(report, expectedMargin) - expectedMargin - (stateDeltas[district.parent] || 0) : 0;
      const stateShift = marginWithError(district.parent) - baseMargins[district.parent];
      const remaining = 1 - clamp((Number(report?.pct) || 0) / 100, 0, 1);
      const shift = stateShift + reportedResidual + normal(random) * 1.2 * remaining;
      const shares = shiftShares(district.shares, shift);
      const winner = report?.called ? report.winner : (game.thirdMode === 'surge' ? presidentialRankedTally(game, shares).winner : topParty(shares));
      evBy[winner] = (evBy[winner] || 0) + district.ev;
      return { ...district, shares, winner };
    }) : [];
    const districtSeatAwards = {};
    if (districtHouse) {
      districtHouse.states.forEach((state) => {
        const source = state.seatsByParty || state.firstChoiceSeats || { dem: state.demSeats, rep: state.repSeats, lib: state.libSeats, grn: state.grnSeats, ind: state.indSeats || 0 };
        const total = Object.values(source).reduce((sum, value) => sum + (value || 0), 0) || 1;
        const shares = Object.fromEntries(Object.entries(source).map(([party, seats]) => [party, (seats || 0) / total * 100]));
        const region = STATE_BY_ABBR[state.state]?.region;
        const shift = nationalError * 0.8 + ((regionalErrors[region] || 0) + (stateErrors[state.state] || 0)) * 0.2;
        districtSeatAwards[state.state] = largestRemainder(shiftShares(shares, shift), state.seats);
      });
      rows.forEach((row) => {
        const allocation = districtSeatAwards[row.abbr] || {};
        Object.entries(allocation).forEach(([party, seats]) => { evBy[party] = (evBy[party] || 0) + seats; });
      });
    }
    const result = { ...base, rows, districts, evBy };
    let houseDraw = house;
    if (draw < chamberDraws) {
      forecastGame.houseStateDrawErrors = Object.fromEntries(base.rows.map(({ abbr, region }) =>
        [abbr, nationalError + (regionalErrors[region] || 0) + (stateErrors[abbr] || 0)]));
      forecastGame.forecastCompactHouse = true;
      houseDraw = buildHouse(forecastGame, marginWithError, 'result');
      const projectedSenate = buildSenate(forecastGame, marginWithError, 'result');
      const senateDraw = senateReports.size ? lockSenateCalls(projectedSenate, senateReports) : projectedSenate;
      houseControls[houseDraw.control === 'dem' ? 'dem' : houseDraw.control === 'rep' ? 'rep' : 'other'] += 1;
      senateControls[senateDraw.control === 'dem' ? 'dem' : senateDraw.control === 'rep' ? 'rep' : 'other'] += 1;
      houseDemSeats.push(houseDraw.dem);
      houseRepSeats.push(houseDraw.rep);
      senateDemSeats.push(senateDraw.dem);
      senateRepSeats.push(senateDraw.rep);
      rivalHouseSeatShare += (houseDraw[partyThem] || 0) / houseDraw.total;
      rivalSenateSeatShare += (senateDraw[partyThem] || 0) / (senateDraw.total || 100);
      rivalHouseMajorities += Number(houseDraw.control === partyThem);
      rivalSenateMajorities += Number(senateDraw.control === partyThem);
    }
    const decision = decidePresidency(forecastGame, result, houseDraw);
    if (decision.winner === partyYou) youWins += 1;
    else if (decision.winner === partyThem) themWins += 1;
    else otherWins += 1;

    evYou += evBy[partyYou] || 0;
    evThem += evBy[partyThem] || 0;
    evOther += Object.entries(evBy).reduce((sum, [party, ev]) => party === partyYou || party === partyThem ? sum : sum + ev, 0);
    popularMargin += (decision.popular[partyYou] || 0) - (decision.popular[partyThem] || 0);
    rivalPopularShare += decision.popular[partyThem] || 0;
  }

  return {
    draws,
    youWin: (youWins / draws) * 100,
    themWin: (themWins / draws) * 100,
    otherWin: (otherWins / draws) * 100,
    youEV: evYou / draws,
    themEV: evThem / draws,
    otherEV: evOther / draws,
    popularMargin: popularMargin / draws,
    rivalPopularShare: rivalPopularShare / draws,
    rivalChambers: {
      houseSeatShare: rivalHouseSeatShare / Math.max(1, chamberDraws),
      senateSeatShare: rivalSenateSeatShare / Math.max(1, chamberDraws),
      houseMajorityProbability: rivalHouseMajorities / Math.max(1, chamberDraws),
      senateMajorityProbability: rivalSenateMajorities / Math.max(1, chamberDraws),
    },
    popularVoteDecides: !!game.popularVote,
    stateWinProbabilities: Object.fromEntries(Object.entries(stateWins).map(([abbr, wins]) => [abbr, {
      called: !!stateReports.get(abbr)?.called,
      parties: Object.fromEntries(Object.entries(wins).map(([party, count]) => [party, count / draws * 100])),
    }])),
    houseProjection: chamberProjection(houseControls, houseDemSeats, houseRepSeats, house.total, house.majority, house.rule),
    senateProjection: chamberProjection(senateControls, senateDemSeats, senateRepSeats, senateBase.total || 100, senateBase.majority, 'standard'),
  };
}
