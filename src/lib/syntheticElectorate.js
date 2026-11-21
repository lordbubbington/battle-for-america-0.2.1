import model from '@/data/syntheticVoterModel.json';
import { publicAssetUrl } from '@/lib/publicAssetUrl';

const BALLOTS_BY_STATE = Object.fromEntries((model.states || []).map((state) => [state.abbr, state.ballots]));

export const SYNTHETIC_ELECTORATE = model;

const RECORD_BYTES = 38;
const HEADER_BYTES = 32;
const MEMBER = {
  state: 0,
  age: 1,
  race: 3,
  education: 4,
  religion: 6,
  ideology: 7,
  partyAffinity: 8,
  turnoutPropensity: 9,
  persuadability: 10,
  policyAttention: 11,
  issuePositions: 18,
};
const ISSUE_FIT = [1, 0.5, 0.12];
const ISSUE_IDS = Object.keys(model.issueFit?.AL || {});

export const SYNTHETIC_GROUPS = [
  { id: 'all', label: 'All modeled voters' },
  { id: 'black', label: 'Black voters' },
  { id: 'hispanic', label: 'Hispanic voters' },
  { id: 'asian', label: 'Asian voters' },
  { id: 'white', label: 'White voters' },
  { id: 'evangelical', label: 'Evangelical voters' },
  { id: 'catholic', label: 'Catholic voters' },
  { id: 'irreligious', label: 'Irreligious voters' },
  { id: 'far left', label: 'Progressive voters' },
  { id: 'moderate', label: 'Moderate voters' },
  { id: 'conservative', label: 'Conservative voters' },
  { id: 'populistright', label: 'Populist-right voters' },
  { id: 'libertarian', label: 'Libertarian voters' },
  { id: 'under30', label: 'Voters under 30' },
  { id: 'age30to49', label: 'Voters age 30 to 49' },
  { id: 'age50to64', label: 'Voters age 50 to 64' },
  { id: 'over65', label: 'Voters age 65 and older' },
  { id: 'college', label: 'College graduates' },
  { id: 'noncollege', label: 'Voters without a bachelor’s degree' },
];

const GROUP_BIT = Object.fromEntries(SYNTHETIC_GROUPS.map((group, index) => [group.id, 1 << index]));
let agentSamplePromise;

function groupMaskForRecord(record) {
  let mask = GROUP_BIT.all;
  const add = (id) => { mask |= GROUP_BIT[id]; };
  const race = record[MEMBER.race];
  if (race === 0) add('white');
  if (race === 1) add('black');
  if (race === 2) add('hispanic');
  if (race === 3) add('asian');

  const religion = record[MEMBER.religion];
  if (religion === 0) add('catholic');
  if (religion === 1) add('evangelical');
  if (religion === 4) add('irreligious');

  const ideology = record[MEMBER.ideology];
  if (ideology === 0) add('far left');
  if (ideology === 4) add('moderate');
  if (ideology === 6) add('conservative');
  if (ideology === 7) add('populistright');
  if (ideology === 8) add('libertarian');

  const age = record[MEMBER.age];
  if (age < 30) add('under30');
  else if (age < 50) add('age30to49');
  else if (age < 65) add('age50to64');
  else add('over65');

  if (record[MEMBER.education] === 2) add('college');
  else add('noncollege');
  return mask >>> 0;
}

async function decodeGzip(buffer) {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('This runtime does not support offline gzip decompression.');
  }
  const compressed = new Blob([buffer]).stream();
  return new Response(compressed.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}

/** Load the bundled synthetic agents once; no real voter records or network service are used. */
export function loadSyntheticAgentSample() {
  if (!agentSamplePromise) {
    agentSamplePromise = (async () => {
      const response = await fetch(publicAssetUrl('./data/synthetic-voter-sample-v1.bin.gz'));
      if (!response.ok) throw new Error(`Synthetic voter sample failed to load (${response.status}).`);
      const inflated = await decodeGzip(await response.arrayBuffer());
      const bytes = new Uint8Array(inflated);
      const view = new DataView(inflated);
      const magic = new TextDecoder().decode(bytes.subarray(0, 8));
      const version = bytes[8];
      const recordBytes = view.getUint16(10, true);
      const count = view.getUint32(12, true);
      if (magic !== 'BFAAGENT' || version !== 1 || recordBytes !== RECORD_BYTES || HEADER_BYTES + count * recordBytes !== bytes.length) {
        throw new Error('Synthetic voter sample has an invalid header or record layout.');
      }
      if (count !== model.agents) throw new Error('Synthetic voter sample does not match its metadata version.');
      return {
        count,
        recordBytes,
        records: new Uint8Array(inflated, HEADER_BYTES),
        states: model.states.map((state) => state.abbr),
        ballotsPerAgent: model.ballotsPerAgent,
      };
    })().catch((error) => {
      agentSamplePromise = null;
      throw error;
    });
  }
  return agentSamplePromise;
}

export function recordForAgent(sample, index) {
  if (!sample || !Number.isInteger(index) || index < 0 || index >= sample.count) return null;
  const start = index * sample.recordBytes;
  return sample.records.subarray(start, start + sample.recordBytes);
}

export function voterGroupsForRecord(record) {
  if (!record || record.length < RECORD_BYTES) return ['all'];
  const mask = groupMaskForRecord(record);
  return SYNTHETIC_GROUPS.filter((group, index) => (mask & (1 << index)) !== 0).map((group) => group.id);
}

export function summarizeSyntheticVoters(sample, { stateAbbr = null, issueIndex = null, stance = null, otherStance = null } = {}) {
  if (!sample) return null;
  const totals = Object.fromEntries(SYNTHETIC_GROUPS.map((group) => [group.id, { voters: 0, demSupport: 0, turnout: 0, persuadability: 0, issueAgreement: 0, issueWeight: 0 }]));
  const stateIndex = stateAbbr ? sample.states.indexOf(stateAbbr) : -1;
  const offset = Number.isInteger(issueIndex) && issueIndex >= 0 && issueIndex < 19 ? MEMBER.issuePositions + issueIndex : -1;
  let selectedVoters = 0;

  for (let index = 0; index < sample.count; index += 1) {
    const start = index * sample.recordBytes;
    const record = sample.records.subarray(start, start + sample.recordBytes);
    if (stateIndex >= 0 && record[MEMBER.state] !== stateIndex) continue;
    selectedVoters += 1;
    const mask = groupMaskForRecord(record);
    const support = record[MEMBER.partyAffinity];
    const turnout = record[MEMBER.turnoutPropensity];
    const persuasion = record[MEMBER.persuadability];
    let voterAgreement = 0;
    let issueWeight = 0;
    if (offset >= 0 && stance != null) {
      const position = record[offset];
      const reach = 0.7 + record[MEMBER.policyAttention] / 100;
      voterAgreement = ISSUE_FIT[Math.min(2, Math.abs(position - stance))] * reach;
      if (otherStance != null) voterAgreement = (voterAgreement - ISSUE_FIT[Math.min(2, Math.abs(position - otherStance))] * reach + 1) / 2;
      issueWeight = reach;
    }
    for (let groupIndex = 0; groupIndex < SYNTHETIC_GROUPS.length; groupIndex += 1) {
      if ((mask & (1 << groupIndex)) === 0) continue;
      const total = totals[SYNTHETIC_GROUPS[groupIndex].id];
      total.voters += 1;
      total.demSupport += support;
      total.turnout += turnout;
      total.persuadability += persuasion;
      total.issueAgreement += voterAgreement;
      total.issueWeight += issueWeight;
    }
  }

  return Object.fromEntries(Object.entries(totals).map(([id, total]) => [id, {
    voters: total.voters,
    share: total.voters && selectedVoters ? total.voters / selectedVoters * 100 : 0,
    demSupport: total.voters ? total.demSupport / total.voters : null,
    turnoutPropensity: total.voters ? total.turnout / total.voters : null,
    persuadability: total.voters ? total.persuadability / total.voters : null,
    issueAgreement: total.issueWeight ? total.issueAgreement / total.issueWeight : null,
  }]));
}

export function voterResponse(record, issueIndex, candidateStance, opponentStance, reach = 1) {
  if (!record || !Number.isInteger(issueIndex) || issueIndex < 0 || issueIndex >= 19) return { persuasion: 0, turnout: 0 };
  const position = record[MEMBER.issuePositions + issueIndex];
  const fit = (stance) => ISSUE_FIT[Math.min(2, Math.abs(position - stance))];
  const attention = 0.7 + record[MEMBER.policyAttention] / 100;
  const persuasionResistance = 0.35 + record[MEMBER.persuadability] / 150;
  const deterministicVariation = 0.9 + ((record[MEMBER.state] * 31 + record[MEMBER.age] * 7 + record[MEMBER.partyAffinity]) % 21) / 100;
  const persuasion = (fit(candidateStance) - fit(opponentStance)) * attention * persuasionResistance * deterministicVariation * Math.max(0, reach);
  const turnout = (record[MEMBER.turnoutPropensity] / 100) * Math.max(0, reach);
  return { persuasion, turnout };
}

export function ballotsInState(abbr) {
  return BALLOTS_BY_STATE[abbr] || 0;
}

export function modeledStateShares(abbr) {
  return model.stateShares?.[abbr] || null;
}

export function modeledIssueFit(abbr, issueId, stance) {
  const options = model.issueFit?.[abbr]?.[issueId];
  if (!Array.isArray(options)) return null;
  const index = Math.max(0, Math.min(options.length - 1, Math.round(Number(stance) || 0)));
  return options[index] ?? null;
}

export function modeledGroupSupport(groupId) {
  const value = model.groupSupport?.[groupId];
  return Number.isFinite(value) ? value : null;
}

/** Average issue fit for a group from the versioned individual-agent sample. */
export function modeledGroupIssueFit(groupId, issueId, stance) {
  const issueIndex = ISSUE_IDS.indexOf(issueId);
  const profile = model.groupIssueProfiles?.[groupId]?.positions?.[issueIndex];
  if (!Array.isArray(profile) || !profile.length) return null;
  const selected = Math.max(0, Math.min(2, Math.round(Number(stance) || 0)));
  return profile.reduce((sum, share, position) => sum + share * ISSUE_FIT[Math.min(2, Math.abs(position - selected))], 0);
}
