// The policy game: twenty-one issues, eight voter blocs, and a state-by-state
// makeup of who actually lives there.
//
// Issue importance follows the 2026 midterm polling (Gallup's "extremely
// important to my vote" list, the Harris Poll's top-issue ranking, and the Pew
// data-center work): cost of living and health care lead, Iran and corruption
// are close behind, and family/transgender policy trails.
//
// Every issue is a three-stop axis — 0 is the progressive/populist-left answer,
// 1 is the abundance/moderate answer, 2 is the right/MAGA answer — and each bloc
// has a preferred stop. A bloc agrees fully with its own stop, half with the one
// next to it, and barely at all with the far end.

import { BASE_LEANS, STATE_BY_ABBR } from '@/data/states';
import { modeledIssueFit } from '@/lib/syntheticElectorate';

export const BLOCS = [
  { id: 'progressive', label: 'Progressive wing', color: '#7C5CFF' },
  { id: 'abundance', label: 'Abundance wing', color: '#46B0FF' },
  { id: 'modDem', label: 'Moderate Democrats', color: '#7FB4FF' },
  { id: 'neutral', label: 'Neutral / unaffiliated', color: '#B9C4D6' },
  { id: 'modRep', label: 'Moderate Republicans', color: '#F0A9A0' },
  { id: 'maga', label: 'MAGA Republicans', color: '#E8433C' },
  { id: 'libertarian', label: 'Libertarian', color: '#F7C145' },
  { id: 'religious', label: 'Religious right', color: '#D8A657' },
];

export const BLOC_BY_ID = BLOCS.reduce((acc, b) => {
  acc[b.id] = b;
  return acc;
}, {});

const P = (progressive, abundance, modDem, neutral, modRep, maga, libertarian, religious) => ({
  progressive,
  abundance,
  modDem,
  neutral,
  modRep,
  maga,
  libertarian,
  religious,
});

export const ISSUES = [
  {
    id: 'affordability',
    label: 'Affordability',
    icon: 'affordability',
    weight: 10,
    line: 'The price of everything, and who gets blamed for it.',
    options: [
      'Cap prices and tax windfalls',
      'Build more, cut fees, drop tariffs',
      'Cut taxes and deregulate',
    ],
    blocPref: P(0, 1, 1, 1, 2, 2, 2, 2),
    party: { dem: 0, rep: 2 },
  },
  {
    id: 'economy',
    label: 'Jobs and the economy',
    icon: 'economy',
    weight: 9.4,
    line: 'Paychecks, factories, and whether your kids do better.',
    options: [
      'Public investment and union jobs',
      'Growth through permitting and skills',
      'Tax cuts and deregulation',
    ],
    blocPref: P(0, 1, 1, 1, 2, 2, 2, 2),
    party: { dem: 0, rep: 2 },
  },
  {
    id: 'health',
    label: 'Health care',
    icon: 'health',
    weight: 9.2,
    line: 'Premiums, drug prices, and the rural hospital.',
    options: ['Medicare for All', 'Public option and drug price caps', 'Repeal mandates, market plans'],
    blocPref: P(0, 1, 1, 1, 2, 2, 2, 1),
    party: { dem: 0, rep: 2 },
  },
  {
    id: 'iran',
    label: 'Iran and the war',
    icon: 'iran',
    weight: 9,
    line: 'A shooting war, gas prices, and another Middle East vote.',
    options: ['Ceasefire and diplomacy now', 'Pressure and targeted strikes only', 'Maximum force, no restraint'],
    blocPref: P(0, 1, 1, 1, 2, 2, 0, 2),
    party: { dem: 1, rep: 2 },
  },
  {
    id: 'corruption',
    label: 'Corruption and money',
    icon: 'corruption',
    weight: 8.8,
    line: 'Who owns whom, and what a donor gets for it.',
    options: [
      'Public financing, overturn Citizens United',
      'Lobbying bans and full disclosure',
      'It is a witch hunt — cut the agencies',
    ],
    blocPref: P(0, 1, 0, 0, 1, 2, 2, 1),
    party: { dem: 0, rep: 2 },
  },
  {
    id: 'prices',
    label: 'Prices and price gouging',
    icon: 'affordability',
    weight: 8.6,
    line: 'Whether anyone should be allowed to set a price.',
    options: ['Cap prices, break up monopolies', 'Enforce antitrust, no caps', 'No price controls, drill and produce'],
    blocPref: P(0, 1, 0, 1, 2, 2, 2, 2),
    party: { dem: 0, rep: 2 },
  },
  {
    id: 'immigration',
    label: 'Immigration and the border',
    icon: 'globe',
    weight: 8.4,
    line: 'The border, the buses, and the asylum courts.',
    options: ['Legalization and humane asylum', 'Border security plus legal pathways', 'Mass deportation'],
    blocPref: P(0, 0, 1, 1, 2, 2, 1, 2),
    party: { dem: 1, rep: 2 },
  },
  {
    id: 'inequality',
    label: 'Wealth and inequality',
    icon: 'data',
    weight: 8,
    line: 'Billionaires, taxes, and who pays for the country.',
    options: ['Wealth tax and inheritance tax', 'Tax the top, not the middle', 'No new taxes'],
    blocPref: P(0, 1, 0, 1, 2, 2, 2, 2),
    party: { dem: 0, rep: 2 },
  },
  {
    id: 'abortion',
    label: 'Abortion',
    icon: 'health',
    weight: 7.8,
    line: 'Clinics, courts, and ballot measures.',
    options: ['Codify Roe', 'Restore a national compromise', 'National ban'],
    blocPref: P(0, 0, 0, 1, 2, 2, 1, 2),
    party: { dem: 0, rep: 2 },
  },
  {
    id: 'gun-control',
    label: 'Gun policy',
    icon: 'shield',
    weight: 5,
    line: 'Background checks, safe storage, and the right to carry.',
    options: ['Universal checks and safe-storage laws', 'Red-flag laws and targeted restrictions', 'Protect gun rights and expand carry'],
    blocPref: P(0, 1, 0, 1, 2, 2, 2, 2),
    party: { dem: 0, rep: 2, lib: 2, grn: 0 },
  },
  {
    id: 'marriage-equality',
    label: 'Marriage equality',
    icon: 'heart',
    weight: 4.8,
    line: 'Federal recognition and protection of same-sex marriage.',
    options: ['Protect marriage equality nationwide', 'Keep current protections, leave implementation to states', 'End federal recognition of same-sex marriage'],
    blocPref: P(0, 0, 0, 1, 1, 2, 0, 2),
    party: { dem: 0, rep: 2, lib: 0, grn: 0 },
  },
  {
    id: 'rent',
    label: 'Rent and housing',
    icon: 'housing',
    weight: 7.4,
    line: 'Why the rent went up, and who gets to build.',
    options: ['Rent caps and public housing', 'Build housing, upzone, cut fees', 'Local control, no mandates'],
    blocPref: P(0, 1, 1, 1, 2, 2, 2, 1),
    party: { dem: 0, rep: 2 },
  },
  {
    id: 'tariffs',
    label: 'Tariffs and trade',
    icon: 'trade',
    weight: 7,
    line: 'Whether the tariff wall comes down.',
    options: ['Scrap them, help consumers', 'Targeted tariffs only', 'Big tariffs to bring factories home'],
    blocPref: P(0, 0, 1, 1, 1, 2, 0, 2),
    party: { dem: 1, rep: 2 },
  },
  {
    id: 'gerrymandering',
    label: 'Gerrymandering',
    icon: 'district-map',
    weight: 6.8,
    line: 'The redistricting war nobody admits to starting.',
    options: ['Independent commissions now', 'Fair maps, applied to both parties', 'Draw maps to win'],
    blocPref: P(0, 0, 1, 0, 1, 2, 1, 1),
    party: { dem: 0, rep: 2 },
  },
  {
    id: 'israel',
    label: 'Israel and Gaza',
    icon: 'globe',
    weight: 6.6,
    line: 'Aid, arms, and a war that splits both parties.',
    options: ['Condition aid, arms embargo', 'Aid with conditions, two-state push', 'Stand with Israel unconditionally'],
    blocPref: P(0, 1, 1, 1, 2, 2, 1, 2),
    party: { dem: 1, rep: 2 },
  },
  {
    id: 'crime',
    label: 'Crime and safety',
    icon: 'shield',
    weight: 6.4,
    line: 'Downtowns, carjackings, and the county jail.',
    options: ['Invest in communities', 'More police and accountability', 'Tough sentences, more cops'],
    blocPref: P(0, 1, 1, 2, 2, 2, 1, 2),
    party: { dem: 1, rep: 2 },
  },
  {
    id: 'datacenters',
    label: 'Data centers and power bills',
    icon: 'data-center',
    weight: 6.2,
    line: 'The server farm next door and the bill that came with it.',
    options: ['Moratorium until bills come down', 'Build, but they pay for the grid', 'Let them build, no new rules'],
    blocPref: P(0, 1, 1, 1, 2, 2, 2, 1),
    party: { dem: 1, rep: 2 },
  },
  {
    id: 'energy',
    label: 'Energy and climate',
    icon: 'power',
    weight: 6,
    line: 'The grid, the pipeline, and the wildfire.',
    options: ['Green investment now', 'All of the above, fast permits', 'Drill, and build the plants'],
    blocPref: P(0, 1, 1, 1, 2, 2, 2, 2),
    party: { dem: 0, rep: 2 },
  },
  {
    id: 'ai',
    label: 'AI',
    icon: 'ai-chip',
    weight: 5.8,
    line: 'Jobs, deepfakes, and who gets to write the rules.',
    options: ['Regulate and license models', 'Safety rules plus speed', 'No regulation, win the race'],
    blocPref: P(0, 1, 1, 1, 2, 2, 2, 1),
    party: { dem: 0, rep: 2 },
  },
  {
    id: 'trans',
    label: 'Transgender policy',
    icon: 'rights',
    weight: 5.2,
    line: 'Girls in sports, care for minors, bathroom bills.',
    options: ['Protect access and care', 'Leave it to sports bodies and doctors', 'Ban it in girls’ sports and for minors'],
    blocPref: P(0, 0, 0, 1, 2, 2, 1, 2),
    party: { dem: 0, rep: 2 },
  },
  {
    id: 'birthrate',
    label: 'Birth rate and families',
    icon: 'family',
    weight: 4.4,
    line: 'Whether the country should pay people to have children.',
    options: ['Child allowances and paid leave', 'Child tax credit and cheaper child care', 'Pro-family tax cuts, no new entitlements'],
    blocPref: P(0, 1, 0, 1, 2, 2, 2, 1),
    party: { dem: 0, rep: 2 },
  },
];

export const ISSUE_BY_ID = ISSUES.reduce((acc, i) => {
  acc[i.id] = i;
  return acc;
}, {});

export const ISSUES_BY_WEIGHT = ISSUES.slice().sort((a, b) => b.weight - a.weight);

// Ideology runs -1 (movement/progressive or MAGA, by party) to +1 (moderate).
export const CANDIDATE_IDEO = {
  aoc: -1,
  ossoff: 0.15,
  harris: 0,
  newsom: -0.45,
  beshear: 0.55,
  buttigieg: 0.1,
  whitmer: 0.2,
  shapiro: 0.35,
  klobuchar: 0.35,
  booker: 0.05,
  warnock: -0.3,
  moore: 0,
  vance: 0.85,
  rubio: 0.5,
  trumpjr: 1,
  desantis: 0.9,
  haley: -0.6,
  carlson: 0.9,
  cruz: 0.7,
  burlison: 0.9,
  abbott: 0.7,
  timscott: 0.4,
  youngkin: -0.2,
  kemp: -0.1,
  oliver: 0.2,
  dsmith: 0.3,
  termaat: 0.1,
  mcardle: -0.15,
  stein: -0.7,
  ware: -0.6,
  baraka: -0.9,
  sawant: -1,
};

export function ideoFor(candidateId) {
  return CANDIDATE_IDEO[candidateId] ?? 0;
}

function clampStance(v) {
  return Math.max(0, Math.min(2, v));
}

export function stanceFor(candidate, issue) {
  const override = candidate.issueStances?.[issue.id];
  if (override !== undefined) return clampStance(override);
  const ideo = ideoFor(candidate.id);
  // Democrats moderate toward the middle as `ideo` rises; Republicans the same,
  // mirrored. A third party's baseline comes from its own platform.
  const center = candidate.party === 'rep' ? -ideo : ideo;
  const base = issue.party[candidate.party] ?? (candidate.party === 'grn' ? 0 : 2);
  const t = Math.min(1, Math.max(0, center) * 1.6);
  return clampStance(Math.round(base + (1 - base) * t));
}

export function stancesFor(candidate) {
  const out = {};
  ISSUES.forEach((issue) => {
    out[issue.id] = stanceFor(candidate, issue);
  });
  return out;
}

export function stanceLabel(issue, index) {
  return issue.options[index] ?? issue.options[1];
}

// ---------------------------------------------------------------------------
// Who lives where
// ---------------------------------------------------------------------------

const REGION_BLOC = {
  northeast: { progressive: 1.15, abundance: 1, modDem: 1.05, modRep: 0.95, maga: 0.8, libertarian: 0.85, religious: 0.8 },
  south: { progressive: 0.85, abundance: 0.8, modDem: 0.95, modRep: 1.05, maga: 1.15, libertarian: 1, religious: 1.3 },
  midwest: { progressive: 0.9, abundance: 0.9, modDem: 1.05, modRep: 1.1, maga: 1.05, libertarian: 1, religious: 1.05 },
  west: { progressive: 1.05, abundance: 1.25, modDem: 1, modRep: 0.95, maga: 0.95, libertarian: 1.2, religious: 0.85 },
};

function hash(text) {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 997;
  return h / 997;
}

const blocCache = {};
const alignCache = {};

export function stateBlocs(abbr) {
  if (blocCache[abbr]) return blocCache[abbr];
  const state = STATE_BY_ABBR[abbr];
  const lean = BASE_LEANS[abbr] ?? 0;
  const d = 1 / (1 + Math.exp(-lean / 7));
  const neutral = 10 + 4 * (1 - Math.abs(d - 0.5) * 2);
  const demSide = d * (100 - neutral);
  const repSide = (1 - d) * (100 - neutral);
  const jitter = hash(abbr);
  const raw = {
    progressive: demSide * 0.4 * (0.9 + jitter * 0.25),
    abundance: demSide * 0.22,
    modDem: demSide * 0.38,
    modRep: repSide * 0.3,
    maga: repSide * 0.34,
    libertarian: repSide * 0.16 * (0.85 + (1 - jitter) * 0.4),
    religious: repSide * 0.2 * (0.85 + jitter * 0.4),
    neutral,
  };
  const region = REGION_BLOC[state?.region] || {};
  Object.keys(raw).forEach((k) => {
    raw[k] *= region[k] || 1;
  });
  const total = Object.values(raw).reduce((sum, v) => sum + v, 0);
  const out = {};
  Object.entries(raw).forEach(([k, v]) => {
    out[k] = (v / total) * 100;
  });
  blocCache[abbr] = out;
  return out;
}

const ALIGN = [1, 0.5, 0.12];

// How well a stance on one issue lands with the voters who live in a state.
export function stateIssueAlignment(abbr, issueId, stance) {
  const key = `${abbr}|${issueId}|${stance}`;
  const cached = alignCache[key];
  if (cached !== undefined) return cached;
  const modeled = modeledIssueFit(abbr, issueId, stance);
  if (Number.isFinite(modeled)) {
    alignCache[key] = modeled;
    return modeled;
  }
  const issue = ISSUE_BY_ID[issueId];
  if (!issue) return 0.5;
  const blocs = stateBlocs(abbr);
  let sum = 0;
  Object.entries(blocs).forEach(([id, share]) => {
    const pref = issue.blocPref[id] ?? 1;
    sum += share * ALIGN[Math.abs(pref - stance)] ;
  });
  const value = sum / 100;
  alignCache[key] = value;
  return value;
}

// National alignment, for the platform card when no state is picked.
export function nationalIssueAlignment(issueId, stance) {
  const states = Object.keys(BASE_LEANS);
  const sum = states.reduce((acc, abbr) => acc + stateIssueAlignment(abbr, issueId, stance), 0);
  return states.length ? sum / states.length : 0.5;
}

export const POLICY_SCALE = 34;
