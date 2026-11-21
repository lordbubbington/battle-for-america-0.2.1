import { STATE_BY_ABBR, STATE_LIST } from '@/data/states';
import { houseSnapshot, presidentialRankedTally, resultSnapshot, senateSnapshot, govSnapshot } from '@/lib/gameEngine';
import { HOUSE_TOTAL } from '@/data/downballot';
import { apportionSeats, FOUR_PARTY_ORDER } from '@/lib/rankedChoice';
import { allocateProportional, largestRemainder } from '@/lib/electionRules';
import { houseDelegations } from '@/lib/presidency';

import { resolveSweep } from './build38Sweep.js';

export const QUICK_SIMULATION_DRAWS = 50000;
const PARTIES = ['dem', 'rep', 'lib', 'grn', 'ind'];
const REGIONS = [...new Set(STATE_LIST.map((state) => state.region))];
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function normal() {
  const u = Math.max(Number.EPSILON, Math.random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

function moveShares(source, marginShift) {
  const shares = { ...source };
  shares.dem = Math.max(0, (shares.dem || 0) + marginShift / 2);
  shares.rep = Math.max(0, (shares.rep || 0) - marginShift / 2);
  const total = Object.values(shares).reduce((sum, value) => sum + Math.max(0, value || 0), 0) || 1;
  Object.keys(shares).forEach((party) => { shares[party] = Math.max(0, shares[party] || 0) / total * 100; });
  return shares;
}

function firstChoice(row) {
  return row.firstChoiceShares || row.shares || row.rcvShares || {};
}

function countedShares(shares, game) {
  if (game.thirdMode !== 'surge') return shares;
  return presidentialRankedTally(game, shares).shares;
}

function ranked(shares) {
  return Object.entries(shares).sort((a, b) => b[1] - a[1]);
}

function winnerOf(shares) {
  return ranked(shares)[0]?.[0] || 'rep';
}

function apportion(shares, seats, seed) {
  const total = Object.values(shares).reduce((sum, value) => sum + Math.max(0, value || 0), 0) || 1;
  const normalized = Object.fromEntries(FOUR_PARTY_ORDER.map((party) => [party, (shares[party] || 0) / total * 100]));
  const base = apportionSeats(normalized, seats, seed);
  if ((shares.ind || 0) <= 0 || seats <= 0) return base;
  const independent = Math.min(seats, Math.floor(shares.ind / total * seats));
  const rest = seats - independent;
  const major = apportionSeats(normalized, rest, `${seed}-major`);
  return { ...major, ind: independent };
}

function emptyPartyCounts(parties = PARTIES) {
  return Object.fromEntries(parties.map((party) => [party, 0]));
}

function createHistogram(min, max, step) {
  const length = Math.floor((max - min) / step) + 1;
  return Array.from({ length }, (_, index) => ({
    low: min + index * step,
    high: Math.min(max, min + (index + 1) * step - 1),
    count: 0,
  }));
}

function addHistogram(histogram, value, draws) {
  const index = clamp(Math.floor(value / draws.step), 0, histogram.length - 1);
  histogram[index].count += 1;
}

function initPartyHistograms(parties, max, step) {
  return Object.fromEntries(parties.map((party) => [party, createHistogram(0, max, step)]));
}

function raceCounts(races, correlatedStateShift, game, weight) {
  const counts = emptyPartyCounts();
  races.forEach((race) => {
    const shift = (correlatedStateShift[race.state] || 0) * weight + normal() * (weight === 0.68 ? 1.2 : 1.5);
    const shares = countedShares(moveShares(firstChoice(race), shift), game);
    const winner = winnerOf(shares);
    const party = winner === 'ind' ? (race.caucus || 'ind') : winner;
    counts[party] = (counts[party] || 0) + 1;
  });
  return counts;
}

function seedText(game, base) {
  return [game.candidateId, game.opponentId, game.week, Date.now(), ...base.rows.slice(0, 5).map((row) => row.margin.toFixed(2))].join('|');
}

/** @param {any} game @param {{draws?: number, sweepEnvironment?: boolean, onProgress?: (current: number, total: number) => void}} [options] */
export async function simulateQuickOutcomes(game, { draws = QUICK_SIMULATION_DRAWS, sweepEnvironment = false, onProgress = () => {} } = {}) {
  const base = resultSnapshot(game);
  const senate = senateSnapshot(game, true);
  const house = houseSnapshot(game, true);
  const districtHouse = game.electoralRule === 'district' ? houseSnapshot({ ...game, houseRule: 'standard', presidentialDistrictAllocation: game.build39?.scenario?.id === 'favorite-sons-daughters' }, true) : null;
  const governors = govSnapshot(game, true);
  const scenarioId = game.build39?.scenario?.id;
  const custom = !!scenarioId && scenarioId !== 'standard';
  const parties = [...new Set([...PARTIES, ...base.rows.flatMap((row) => Object.keys(row.shares))])];
  const stateStats = Object.fromEntries(base.rows.map((row) => [row.abbr, { wins: emptyPartyCounts(parties), margin: 0 }]));
  const aggregates = {
    ev: emptyPartyCounts(parties),
    house: emptyPartyCounts(parties),
    senate: emptyPartyCounts(parties),
    governors: emptyPartyCounts(parties),
    presidentialWins: emptyPartyCounts(parties),
    popularMargin: 0,
  };
  const histograms = {
    ev: initPartyHistograms(parties, 538, 10),
    house: initPartyHistograms(parties, house.total || HOUSE_TOTAL, 10),
    senate: initPartyHistograms(parties, 100, 2),
    governors: initPartyHistograms(parties, 11, 1),
  };
  /** @type {Array<any>} */
  const houseStates = house.states || [];
  const senateSafe = senate.start || { dem: 0, rep: 0, lib: 0, grn: 0 };
  sweepEnvironment = resolveSweep({ commandId: 'quick-outcomes', draws, sweepRequested: sweepEnvironment }).enabled;
  const drawsPerYield = 250;

  for (let draw = 0; draw < draws; draw += 1) {
    const nationalError = normal() * 2.2 + (sweepEnvironment ? ((draw % 1000) / 999) * 10 - 5 : 0);
    const regionalErrors = Object.fromEntries(REGIONS.map((region) => [region, normal() * 1.6]));
    const stateErrors = Object.fromEntries(STATE_LIST.map((state) => [state.abbr, normal() * 2.4]));
    const correlatedStateShift = Object.fromEntries(STATE_LIST.map((state) => [
      state.abbr,
      nationalError + (regionalErrors[state.region] || 0) + stateErrors[state.abbr],
    ]));
    const evBy = emptyPartyCounts(parties);
    const voteTotals = emptyPartyCounts(parties);
    const statesForDelegations = [];

    base.rows.forEach((row) => {
      const shift = nationalError + (regionalErrors[STATE_BY_ABBR[row.abbr]?.region] || 0) + stateErrors[row.abbr];
      const firstChoices = moveShares(firstChoice(row), shift);
      const shares = countedShares(firstChoices, game);
      const winner = winnerOf(shares);
      const rule = game.electoralRule || 'standard';
      if (rule === 'proportional') {
        Object.entries(allocateProportional(custom ? firstChoices : shares, row.ev, 5)).forEach(([party, seats]) => { evBy[party] = (evBy[party] || 0) + seats; });
      } else if (rule === 'district') {
        evBy[winner] += row.abbr === 'DC' ? 3 : 2;
      } else {
        const ev = row.atLarge ?? row.ev;
        evBy[winner] += ev;
      }
      const ev = row.atLarge ?? row.ev;
      const weight = row.cast || ev;
      Object.entries(scenarioId === 'six-party' ? firstChoices : shares).forEach(([party, share]) => { voteTotals[party] = (voteTotals[party] || 0) + share * weight; });
      const stats = stateStats[row.abbr];
      stats.wins[winner] = (stats.wins[winner] || 0) + 1;
      stats.margin += (shares.dem || 0) - (shares.rep || 0);
    });

    (game.electoralRule === 'standard' ? base.districts : []).forEach((district) => {
      const region = STATE_BY_ABBR[district.parent]?.region;
      const shift = nationalError + (regionalErrors[region] || 0) + stateErrors[district.parent] + normal() * 1.2;
      const shares = countedShares(moveShares(firstChoice(district), shift), game);
      const winner = winnerOf(shares);
      evBy[winner] = (evBy[winner] || 0) + district.ev;
    });

    let popularRank = ranked(voteTotals);
    const totalVotes = Object.values(voteTotals).reduce((sum, value) => sum + value, 0) || 1;
    const popularMargin = ((voteTotals.dem - voteTotals.rep) / totalVotes) * 100;
    aggregates.popularMargin += popularMargin;

    let houseCounts = emptyPartyCounts(parties);
    const districtSeatAwards = {};
    houseStates.forEach((state) => {
      const region = STATE_BY_ABBR[state.state]?.region;
      const shift = nationalError * 0.8 + ((regionalErrors[region] || 0) + stateErrors[state.state]) * 0.2;
      const seatShares = state.seatsByParty || state.firstChoiceSeats || {
        dem: state.demSeats,
        rep: state.repSeats,
        lib: state.libSeats,
        grn: state.grnSeats,
      };
      const total = Object.values(seatShares).reduce((sum, value) => sum + (value || 0), 0) || 1;
      const asShares = Object.fromEntries(Object.entries(seatShares).map(([party, value]) => [party, (value || 0) / total * 100]));
      const shifted = countedShares(moveShares(asShares, shift), game);
      const allocation = custom ? largestRemainder(moveShares(asShares, shift), state.seats) : apportion(shifted, state.seats, state.state);
      Object.entries(allocation).forEach(([party, seats]) => { houseCounts[party] = (houseCounts[party] || 0) + seats; });
      statesForDelegations.push({ state: state.state, name: state.name, seatsByParty: allocation, ...Object.fromEntries(['dem', 'rep', 'lib', 'grn'].map((party) => [party, allocation[party] || 0])), demSeats: allocation.dem || 0, repSeats: allocation.rep || 0, libSeats: allocation.lib || 0, grnSeats: allocation.grn || 0 });
    });
    if (districtHouse) {
      districtHouse.states.forEach((state) => {
        const source = state.seatsByParty || state.firstChoiceSeats || { dem: state.demSeats, rep: state.repSeats, lib: state.libSeats, grn: state.grnSeats, ind: state.indSeats || 0 };
        const total = Object.values(source).reduce((sum, value) => sum + (value || 0), 0) || 1;
        const shares = Object.fromEntries(Object.entries(source).map(([party, seats]) => [party, (seats || 0) / total * 100]));
        const region = STATE_BY_ABBR[state.state]?.region;
        const shift = nationalError * 0.8 + ((regionalErrors[region] || 0) + stateErrors[state.state]) * 0.2;
        districtSeatAwards[state.state] = largestRemainder(moveShares(shares, shift), state.seats);
      });
      Object.values(districtSeatAwards).forEach((allocation) => {
        Object.entries(allocation).forEach(([party, seats]) => { evBy[party] = (evBy[party] || 0) + seats; });
      });
    }

    // Keep the safe seats while adding the simulated winners of this cycle's races.
    const safeAndRaceSenate = { ...emptyPartyCounts(parties), ...senateSafe };
    senate.races.forEach((race) => {
      const shares = countedShares(moveShares(firstChoice(race), correlatedStateShift[race.state] * 0.68 + normal() * 1.2), game);
      const winner = winnerOf(shares);
      const party = winner === 'ind' ? (race.caucus || 'ind') : winner;
      safeAndRaceSenate[party] = (safeAndRaceSenate[party] || 0) + 1;
    });

    const governorCounts = raceCounts(governors.races, correlatedStateShift, game, 0.42);
    const evRanked = ranked(evBy);
    const evLeader = evRanked[0]?.[0] || 'rep';
    const evWinner = evRanked[0]?.[1] >= 270 && evRanked[0]?.[1] > (evRanked[1]?.[1] || 0) ? evLeader : null;
    const popularWinner = popularRank[0]?.[0] || 'rep';
    const delegationResult = houseDelegations({ states: statesForDelegations });
    const president = game.popularVote ? popularWinner : (evWinner || delegationResult.leader);
    if (president) aggregates.presidentialWins[president] = (aggregates.presidentialWins[president] || 0) + 1;

    parties.forEach((party) => {
      const evCount = evBy[party] || 0;
      const houseCount = houseCounts[party] || 0;
      const senateCount = safeAndRaceSenate[party] || 0;
      const governorCount = governorCounts[party] || 0;
      aggregates.ev[party] += evCount;
      aggregates.house[party] += houseCount;
      aggregates.senate[party] += senateCount;
      aggregates.governors[party] += governorCount;
      addHistogram(histograms.ev[party], evCount, { step: 10 });
      addHistogram(histograms.house[party], houseCount, { step: 10 });
      addHistogram(histograms.senate[party], senateCount, { step: 2 });
      addHistogram(histograms.governors[party], governorCount, { step: 1 });
    });

    if ((draw + 1) % drawsPerYield === 0 || draw + 1 === draws) {
      onProgress(draw + 1, draws);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  const toAverages = (group, total = draws) => Object.fromEntries(parties.map((party) => [party, group[party] / total]));
  const finalizeHistograms = (group) => Object.fromEntries(parties.map((party) => [party, group[party].map((bin) => ({ ...bin, pct: bin.count / draws * 100 })).filter((bin) => bin.count > 0)]));
  return {
    draws,
    sweepEnvironment,
    stateRows: base.rows.map((row) => ({
      abbr: row.abbr,
      name: row.name,
      averageDemRepMargin: stateStats[row.abbr].margin / draws,
      winPct: Object.fromEntries(parties.map((party) => [party, stateStats[row.abbr].wins[party] / draws * 100])),
    })),
    average: {
      electoralVotes: toAverages(aggregates.ev),
      houseSeats: toAverages(aggregates.house),
      senateSeats: toAverages(aggregates.senate),
      governorships: toAverages(aggregates.governors),
      presidentialWinPct: Object.fromEntries(parties.map((party) => [party, (aggregates.presidentialWins[party] || 0) / draws * 100])),
      popularDemRepMargin: aggregates.popularMargin / draws,
    },
    histograms: Object.fromEntries(Object.entries(histograms).map(([key, value]) => [key, finalizeHistograms(value)])),
  };
}
