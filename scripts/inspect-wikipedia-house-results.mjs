import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const STATE_NAMES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];
const STATE_SEATS = {
  AL: ['Alabama', 7], AK: ['Alaska', 1], AZ: ['Arizona', 9], AR: ['Arkansas', 4], CA: ['California', 52],
  CO: ['Colorado', 8], CT: ['Connecticut', 5], DE: ['Delaware', 1], FL: ['Florida', 28], GA: ['Georgia', 14],
  HI: ['Hawaii', 2], ID: ['Idaho', 2], IL: ['Illinois', 17], IN: ['Indiana', 9], IA: ['Iowa', 4], KS: ['Kansas', 4],
  KY: ['Kentucky', 6], LA: ['Louisiana', 6], ME: ['Maine', 2], MD: ['Maryland', 8], MA: ['Massachusetts', 9],
  MI: ['Michigan', 13], MN: ['Minnesota', 8], MS: ['Mississippi', 4], MO: ['Missouri', 8], MT: ['Montana', 2],
  NE: ['Nebraska', 3], NV: ['Nevada', 4], NH: ['New Hampshire', 2], NJ: ['New Jersey', 12], NM: ['New Mexico', 3],
  NY: ['New York', 26], NC: ['North Carolina', 14], ND: ['North Dakota', 1], OH: ['Ohio', 15], OK: ['Oklahoma', 5],
  OR: ['Oregon', 6], PA: ['Pennsylvania', 17], RI: ['Rhode Island', 2], SC: ['South Carolina', 7], SD: ['South Dakota', 1],
  TN: ['Tennessee', 9], TX: ['Texas', 38], UT: ['Utah', 4], VT: ['Vermont', 1], VA: ['Virginia', 11], WA: ['Washington', 10],
  WV: ['West Virginia', 2], WI: ['Wisconsin', 8], WY: ['Wyoming', 1],
};
const UA = 'BattleForAmericaBuild33Research/1.0 (developer-only source data importer)';
const API = 'https://en.wikipedia.org/w/api.php';
const requestedYear = Number(process.argv.find((arg) => arg.startsWith('--year='))?.split('=')[1] || 2026);
if (![2024, 2026].includes(requestedYear)) throw new Error('Supported source years are 2024 and 2026.');
const RESULT_YEAR = String(requestedYear);
const ELECTION_DATE = requestedYear === 2024 ? '2024-11-05' : '2026-11-03';
const MAIN_PAGE = `${RESULT_YEAR}_United_States_House_of_Representatives_elections`;
const atLargeStates = ['Alaska', 'Delaware', 'North Dakota', 'South Dakota', 'Vermont', 'Wyoming'];

function templatesNamed(text, name) {
  const startToken = `{{${name}`;
  const found = [];
  let cursor = 0;
  while ((cursor = text.indexOf(startToken, cursor)) !== -1) {
    let depth = 0;
    let index = cursor;
    while (index < text.length) {
      const nextOpen = text.indexOf('{{', index);
      const nextClose = text.indexOf('}}', index);
      if (nextOpen === -1 && nextClose === -1) break;
      if (nextOpen !== -1 && (nextClose === -1 || nextOpen < nextClose)) {
        depth += 1;
        index = nextOpen + 2;
      } else {
        depth -= 1;
        index = nextClose + 2;
        if (depth === 0) {
          found.push(text.slice(cursor, index));
          cursor = index;
          break;
        }
      }
    }
  }
  return found;
}

function parameters(template) {
  const result = {};
  template.split('\n').slice(1).forEach((line) => {
    const match = line.match(/^\s*\|\s*([^=]+?)\s*=\s*(.*)$/);
    if (match) result[match[1].trim().toLowerCase()] = match[2].trim();
  });
  return result;
}

function plain(value = '') {
  return value
    .replace(/<ref\b[^>]*\/>/gi, '')
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/'''?/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function voteValue(value) {
  const match = plain(value).match(/\d[\d,]*/);
  return match ? Number(match[0].replaceAll(',', '')) : null;
}

function party(value) {
  const label = plain(value).toLowerCase();
  if (label.includes('democratic')) return 'dem';
  if (label.includes('republican')) return 'rep';
  return null;
}

function districtNumber(electionName) {
  const name = plain(electionName);
  const match = name.match(/\b(\d+)(?:st|nd|rd|th) congressional district/i);
  if (match) return Number(match[1]);
  return /at-large (?:congressional )?district/i.test(name) ? 1 : null;
}

async function fetchWikitexts(pages) {
  const url = new URL(API);
  url.search = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    titles: pages.join('|'),
  }).toString();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': UA } });
    if (response.status === 429 || response.status === 503) {
      const retryAfter = Number(response.headers.get('retry-after')) || Math.min(30, 2 ** (attempt + 1));
      await new Promise((resolveDelay) => setTimeout(resolveDelay, retryAfter * 1000));
      continue;
    }
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${pages.join(', ')}`);
    const json = await response.json();
    const fetched = {};
    (json?.query?.pages || []).forEach((page) => {
      const source = page.revisions?.[0]?.slots?.main?.content;
      if (typeof source === 'string') fetched[page.title] = source;
    });
    const redirects = Object.fromEntries((json?.query?.redirects || []).map((redirect) => [redirect.from, redirect.to]));
    const normalized = Object.fromEntries((json?.query?.normalized || []).map((item) => [item.from, item.to]));
    const resolveTitle = (title) => {
      let value = normalized[title] || title.replaceAll('_', ' ');
      const seen = new Set();
      while (redirects[value] && !seen.has(value)) {
        seen.add(value);
        value = redirects[value];
      }
      return value;
    };
    const missing = pages.filter((page) => !fetched[resolveTitle(page)]);
    if (missing.length) throw new Error(`Wikipedia returned no revision text for: ${missing.join(', ')}`);
    return Object.fromEntries(pages.map((page) => [page, fetched[resolveTitle(page)]]));
  }
  throw new Error(`Wikipedia API rate limit persisted after retrying: ${pages.join(', ')}`);
}

function districtRows(source, state, sourcePage) {
  const infoboxRows = templatesNamed(source, 'Infobox election').flatMap((template) => {
    const p = parameters(template);
    const electionName = plain(p.election_name || '');
    if (!/(?:congressional district|at-large district)/i.test(electionName)) return [];
    const district = districtNumber(electionName);
    if (!district) return [];
    const votes = { dem: 0, rep: 0 };
    const unknown = { dem: false, rep: false };
    Object.entries(p).forEach(([key, value]) => {
      const match = key.match(/^party(\d+)$/);
      if (!match) return;
      const side = party(value);
      const count = voteValue(p[`popular_vote${match[1]}`]);
      if (!side) return;
      if (count == null) unknown[side] = true;
      else votes[side] += count;
    });
    return [{
      state,
      district,
      electionName,
      demVotes: unknown.dem ? null : votes.dem,
      repVotes: unknown.rep ? null : votes.rep,
      reportingPercent: Number(p.reporting) || null,
      sourcePage,
    }];
  });

  const tableRows = [];
  const marker = `Results of the ${RESULT_YEAR} United States House of Representatives elections in ${state} by district:`;
  const markerIndex = source.indexOf(marker);
  const tableStart = markerIndex === -1 ? -1 : source.indexOf('{|', markerIndex);
  const tableEnd = tableStart === -1 ? -1 : source.indexOf('|}', tableStart);
  if (tableStart !== -1 && tableEnd !== -1) {
    const table = source.slice(tableStart, tableEnd);
    const partyOrder = [
      { party: 'rep', index: table.indexOf('Republican Party') },
      { party: 'dem', index: table.indexOf('Democratic Party') },
    ].filter((entry) => entry.index >= 0)
      .sort((a, b) => a.index - b.index)
      .map((entry) => entry.party);
    if (partyOrder.length === 2 && table.includes('District')) {
      table.split(/\n\|-/).forEach((row) => {
        const match = row.match(/\{\{ushr\|[A-Z]{2}\|(\d+)\|District\s+\d+\}\}/i);
        if (!match) return;
        const numericCells = row.split(/\|\|/).slice(1).map((cell) => plain(cell))
          .map((cell) => cell.match(/^(\d[\d,]*)$/)?.[1])
          .filter(Boolean)
          .map((value) => Number(value.replaceAll(',', '')));
        if (numericCells.length < 2) return;
        const totals = { [partyOrder[0]]: numericCells[0], [partyOrder[1]]: numericCells[1] };
        if (totals.dem + totals.rep <= 0) return;
        tableRows.push({
          state,
          district: Number(match[1]),
          demVotes: totals.dem,
          repVotes: totals.rep,
          reportingPercent: requestedYear === 2024 ? 100 : null,
          sourcePage,
        });
      });
    }
  }
  return [...infoboxRows, ...tableRows];
}

function ordinal(value) {
  const lastTwo = value % 100;
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[value % 10] || 'th');
  return `${value}${suffix}`;
}

const mainPage = await fetchWikitexts([MAIN_PAGE]);
const mainSource = mainPage[MAIN_PAGE];
const statePageRecords = STATE_NAMES
  .filter((state) => !atLargeStates.includes(state))
  .map((state) => ({
    state,
    page: `${RESULT_YEAR}_United_States_House_of_Representatives_elections_in_${state.replaceAll(' ', '_')}`,
  }));
const stateSources = [];
for (let index = 0; index < statePageRecords.length; index += 10) {
  if (index > 0) await new Promise((resolveDelay) => setTimeout(resolveDelay, 1500));
  const batch = statePageRecords.slice(index, index + 10);
  const pages = await fetchWikitexts(batch.map((item) => item.page));
  batch.forEach((item) => stateSources.push({ ...item, source: pages[item.page] }));
}
const splitPages = [];
stateSources.forEach(({ state, source }) => {
  const prefix = `${RESULT_YEAR} United States House of Representatives elections in ${state}`;
  const titles = new Set([
    ...[...source.matchAll(/\{\{main\|([^}|]*districts[^}|]*)\}\}/gi)].map((match) => match[1].trim()),
    ...[...source.matchAll(new RegExp(`\\[\\[(${RESULT_YEAR} United States House of Representatives elections in [^\\]|]*districts [^\\]|]*)\\]\\]`, 'gi'))].map((match) => match[1].trim()),
  ]);
  titles.forEach((title) => {
    if (title.startsWith(prefix) && /\(districts\s+\d+[–-]\d+\)/i.test(title)) splitPages.push({ state, title: title.replaceAll(' ', '_') });
  });
});
for (let index = 0; index < splitPages.length; index += 10) {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1500));
  const batch = splitPages.slice(index, index + 10);
  const pages = await fetchWikitexts(batch.map((item) => item.title));
  batch.forEach((item) => stateSources.push({ state: item.state, source: pages[item.title], page: item.title }));
}
const atLargePages = atLargeStates.map((state) => `${RESULT_YEAR}_United_States_House_of_Representatives_election_in_${state.replaceAll(' ', '_')}`);
const atLargeSources = await fetchWikitexts(atLargePages);
atLargePages.forEach((page, index) => stateSources.push({ state: atLargeStates[index], source: atLargeSources[page], page }));

const national = {};
templatesNamed(mainSource, 'Infobox election').slice(0, 1).forEach((template) => {
  const p = parameters(template);
  Object.entries(p).forEach(([key, value]) => {
    const match = key.match(/^party([12])$/);
    if (!match) return;
    const side = party(value);
    const votes = voteValue(p[`popular_vote${match[1]}`]);
    if (side && votes != null) national[side] = votes;
  });
});

const districts = stateSources.flatMap(({ state, source, page }) => districtRows(source, state, page));
const unique = new Map();
districts.forEach((row) => {
  unique.set(`${row.state}|${row.district}`, row);
});
const nationalGenericMargin = (national.dem + national.rep)
  ? 100 * (national.dem - national.rep) / (national.dem + national.rep)
  : null;
const rows = Object.entries(STATE_SEATS).flatMap(([stateAbbr, [state, seatCount]]) =>
  Array.from({ length: seatCount }, (_, index) => {
    const district = index + 1;
    const reported = unique.get(`${state}|${district}`) || null;
    const demVotes = reported?.demVotes ?? null;
    const repVotes = reported?.repVotes ?? null;
    const hasResult = demVotes != null && repVotes != null && demVotes + repVotes > 0;
    const districtMargin = hasResult ? 100 * (demVotes - repVotes) / (demVotes + repVotes) : null;
    const sourceTitle = reported?.sourcePage?.replaceAll('_', ' ')
      || `${RESULT_YEAR} United States House of Representatives elections in ${state}`;
    return {
      id: `${stateAbbr}-${String(district).padStart(2, '0')}`,
      stateAbbr,
      state,
      districtNumber: district,
      districtName: seatCount === 1 ? `${state} at-large district` : `${state}'s ${ordinal(district)} Congressional District`,
      seatCount: 1,
      electionDate: ELECTION_DATE,
      demVotes,
      repVotes,
      twoPartyMarginDMinusR: districtMargin,
      nationalGenericMarginDMinusR: nationalGenericMargin,
      districtLeanDMinusR: districtMargin == null || nationalGenericMargin == null ? null : districtMargin - nationalGenericMargin,
      reportingPercent: reported?.reportingPercent ?? null,
      certificationStatus: 'unofficial',
      resultStatus: hasResult ? 'reported' : 'not-reported',
      sourceTitle,
      sourceUrl: `https://en.wikipedia.org/wiki/${encodeURI(sourceTitle.replaceAll(' ', '_'))}`,
    };
  })
).flat();
const complete = rows.filter((row) => row.resultStatus === 'reported');
const missing = rows.filter((row) => row.resultStatus !== 'reported');
const totals = complete.reduce((sum, row) => ({ dem: sum.dem + row.demVotes, rep: sum.rep + row.repVotes }), { dem: 0, rep: 0 });
const result = {
  source: `https://en.wikipedia.org/wiki/${MAIN_PAGE}`,
  retrievedAt: new Date().toISOString(),
  status: requestedYear === 2026 ? 'provisional-unofficial-current-reported-results' : 'historical-wikipedia-reported-results',
  method: `Every configured ${RESULT_YEAR} district is listed. District two-party D-R margin is 100*(D-R)/(D+R), and lean is district margin minus the national margin, using the Wikipedia lead infobox vote totals. Missing candidate totals remain null; no results are imputed.`,
  nationalReportedTotals: national,
  nationalGenericMarginDMinusR: nationalGenericMargin,
  nationalSourceNote: requestedYear === 2026
    ? 'Totals as currently displayed in the 2026 House elections Wikipedia lead infobox; article remains marked as a current election and results are unofficial.'
    : 'Totals as displayed in the 2024 House elections Wikipedia lead infobox; preserved as a prior-cycle fallback source.',
  nationalComputedTotalsFromAvailableDistricts: totals,
  nationalComputedMargin: (totals.dem + totals.rep) ? 100 * (totals.dem - totals.rep) / (totals.dem + totals.rep) : null,
  districtCount: rows.length,
  completeDistrictCount: complete.length,
  missingDistricts: missing,
  districts: rows,
};

console.log(JSON.stringify({
  retrievedAt: result.retrievedAt,
  nationalReportedTotals: result.nationalReportedTotals,
  nationalGenericMarginDMinusR: result.nationalGenericMarginDMinusR,
  nationalComputedTotalsFromAvailableDistricts: result.nationalComputedTotalsFromAvailableDistricts,
  nationalComputedMargin: result.nationalComputedMargin,
  districtCount: result.districtCount,
  completeDistrictCount: result.completeDistrictCount,
  missingDistrictCount: result.missingDistricts.length,
  missingDistrictIds: result.missingDistricts.map((row) => row.id),
  byState: Object.entries(STATE_SEATS).map(([abbr, [state]]) => ({ state: abbr, districts: rows.filter((row) => row.stateAbbr === abbr).length, complete: complete.filter((row) => row.stateAbbr === abbr).length })),
}, null, 2));

if (process.argv.includes('--write')) {
  const outputName = requestedYear === 2026
    ? '2026-house-votes-wikipedia-provisional.json'
    : '2024-house-votes-wikipedia-historical.json';
  const output = resolve(`data-import/${outputName}`);
  await mkdir(resolve('data-import'), { recursive: true });
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`Wrote provisional results to ${output}`);
}
