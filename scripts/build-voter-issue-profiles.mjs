import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const modelPath = fileURLToPath(new URL('../src/data/syntheticVoterModel.json', import.meta.url));
const samplePath = fileURLToPath(new URL('../public/data/synthetic-voter-sample-v1.bin.gz', import.meta.url));
const model = JSON.parse(readFileSync(modelPath, 'utf8'));
const bytes = gunzipSync(readFileSync(samplePath));
const headerBytes = 32;
const recordBytes = 38;
const count = bytes.readUInt32LE(12);
if (bytes.toString('ascii', 0, 8) !== 'BFAAGENT' || bytes[8] !== 1 || bytes.readUInt16LE(10) !== recordBytes || bytes.length !== headerBytes + count * recordBytes) {
  throw new Error('Synthetic voter sample header or record layout is invalid.');
}
if (count !== model.agents) throw new Error('Synthetic voter sample does not match model metadata.');

const groups = [
  'all', 'black', 'hispanic', 'asian', 'white', 'evangelical', 'catholic', 'irreligious',
  'far left', 'moderate', 'conservative', 'populistright', 'libertarian', 'under30',
  'age30to49', 'age50to64', 'over65', 'college', 'noncollege',
];
const issueCount = model.issueCount;
const totals = Object.fromEntries(groups.map((id) => [id, { voters: 0, positions: Array.from({ length: issueCount }, () => [0, 0, 0]) }]));

for (let index = 0; index < count; index += 1) {
  const offset = headerBytes + index * recordBytes;
  const age = bytes[offset + 1];
  const race = bytes[offset + 3];
  const education = bytes[offset + 4];
  const religion = bytes[offset + 6];
  const ideology = bytes[offset + 7];
  const member = ['all'];
  if (race === 0) member.push('white');
  if (race === 1) member.push('black');
  if (race === 2) member.push('hispanic');
  if (race === 3) member.push('asian');
  if (religion === 0) member.push('catholic');
  if (religion === 1) member.push('evangelical');
  if (religion === 4) member.push('irreligious');
  if (ideology === 0) member.push('far left');
  if (ideology === 4) member.push('moderate');
  if (ideology === 6) member.push('conservative');
  if (ideology === 7) member.push('populistright');
  if (ideology === 8) member.push('libertarian');
  if (age < 30) member.push('under30');
  else if (age < 50) member.push('age30to49');
  else if (age < 65) member.push('age50to64');
  else member.push('over65');
  member.push(education === 2 ? 'college' : 'noncollege');

  for (const id of member) {
    const aggregate = totals[id];
    aggregate.voters += 1;
    for (let issue = 0; issue < issueCount; issue += 1) {
      const position = Math.max(0, Math.min(2, bytes[offset + 18 + issue]));
      aggregate.positions[issue][position] += 1;
    }
  }
}

model.voterGroupProfileVersion = 1;
model.groupIssueProfiles = Object.fromEntries(groups.map((id) => {
  const aggregate = totals[id];
  return [id, {
    voters: aggregate.voters,
    positions: aggregate.positions.map((row) => row.map((amount) => Number((amount / Math.max(aggregate.voters, 1)).toFixed(6)))),
  }];
}));
writeFileSync(modelPath, `${JSON.stringify(model, null, 2)}\n`);
process.stdout.write(`Wrote issue profiles for ${count.toLocaleString()} synthetic voters across ${groups.length} overlapping groups.\n`);
