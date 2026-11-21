import React, { useEffect, useState } from 'react';
import { BUILD40_DEMOGRAPHIC_GROUPS, BUILD40_RACE_KINDS, BUILD40_REGIONAL_PARTY_IDS } from '@/data/build40Elections';
import { scenarioPartyMeta } from '@/lib/build39Scenarios';
import { scenarioBallotAccess } from '@/lib/build40Elections';
import { PARTY_COLOR } from '@/lib/downballot';
import { nomineeOf } from '@/lib/gameEngine';

const KIND_LABEL = { pres: 'Presidential', senate: 'Senate', gov: 'Governor' };
const REGION_PARTIES = BUILD40_REGIONAL_PARTY_IDS;
const pct = (value, total) => total > 0 ? `${(100 * value / total).toFixed(1)}%` : '—';
const number = (value) => Number.isFinite(Number(value)) ? Math.round(Number(value)).toLocaleString() : '—';

function rowsFor(kind, night) {
  if (kind === 'pres') return night?.rows || [];
  if (kind === 'senate') return night?.senate?.races || [];
  if (kind === 'gov') return night?.gov?.races || [];
  return [];
}

function stateOf(row, kind) {
  return kind === 'pres' ? row.abbr : row.state || row.abbr;
}

function labelOf(party, game) {
  const meta = scenarioPartyMeta(game?.build39?.scenario?.id || game?.scenarioId, party);
  return meta?.label || ({ dem: 'Democratic', rep: 'Republican', lib: 'Libertarian', grn: 'Green', ind: 'Independent' }[party]) || party;
}

function candidateCounts(row, finalRow, kind) {
  const liveShares = row?.shares || {};
  const finalShares = finalRow?.shares || finalRow?.firstChoiceShares || {};
  const complete = row?.pct >= 100;
  const sourceShares = complete && Object.keys(finalShares).length ? finalShares : liveShares;
  const suppliedCounts = complete && finalRow?.votes ? finalRow.votes : row?.votes || row?.countedVotes || null;
  const cast = complete
    ? finiteTotal(finalRow?.cast || finalRow?.totalVotes || suppliedCounts)
    : finiteTotal(row?.countedVotes) || (finiteTotal(row?.cast) * Math.max(0, Number(row?.pct) || 0) / 100);
  const sharesTotal = Object.values(sourceShares).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  const counts = suppliedCounts
    ? { ...suppliedCounts }
    : cast > 0 && sharesTotal > 0
      ? Object.fromEntries(Object.entries(sourceShares).map(([party, share]) => [party, cast * Math.max(0, Number(share) || 0) / sharesTotal]))
      : {};
  const totalVotes = Object.values(counts).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  return { shares: sourceShares, counts, totalVotes, complete, available: totalVotes > 0, kind };
}

function validatedDemographics(input, aggregate) {
  if (!input || input.status !== 'available' || !Array.isArray(input.groups) || !aggregate.available) return null;
  const candidateIds = Object.keys(aggregate.counts);
  const reconciled = candidateIds.every((candidate) => {
    const fromGroups = input.groups.reduce((sum, group) => sum + Math.max(0, Number(group.votesByCandidate?.[candidate]) || 0), 0);
    return Math.abs(fromGroups - (Number(aggregate.counts[candidate]) || 0)) <= Math.max(1, aggregate.totalVotes * 0.001);
  });
  if (!reconciled) return null;
  return input.groups.filter((group) => Number(group.denominator) > 0);
}

function finalElectors(finalRow, modeId) {
  if (!finalRow?.evAwards && !finalRow?.electoralVotesByParty) return null;
  if (!['two-parties', 'four-parties', 'six-party', 'regional-parties', 'favorite-sons-daughters'].includes(modeId)) return null;
  const allocations = finalRow.evAwards || finalRow.electoralVotesByParty;
  return Object.values(allocations).filter((value) => Number(value) > 0).length > 1 ? allocations : null;
}

/** State/race detail leaf. Its caller supplies the live Election Night snapshot. */
export default function Build40RaceDetails({
  kind = 'pres', stateId = '', night, game, finalResult = null, demographics = null,
  modeId = game?.build40?.modeId || game?.build39?.scenario?.id || 'two-parties',
  onStateChange, onClose,
}) {
  const safeKind = BUILD40_RACE_KINDS.includes(kind) ? kind : 'pres';
  const rows = rowsFor(safeKind, night);
  const availableStates = [...new Set((night?.rows || rows).map((row) => stateOf(row, 'pres')).filter(Boolean))].sort();
  const selectedState = stateId || availableStates[0] || '';
  const stateRows = rows.filter((row) => stateOf(row, safeKind) === selectedState);
  const [contestId, setContestId] = useState('');
  useEffect(() => { setContestId(''); }, [selectedState, safeKind]);
  const active = stateRows.find((row, index) => (row.id || String(index)) === contestId) || stateRows[0] || null;
  const finalRows = safeKind === 'pres'
    ? (finalResult?.rows || [])
    : safeKind === 'senate'
      ? (finalResult?.races || finalResult?.senate?.races || [])
      : (finalResult?.races || finalResult?.gov?.races || []);
  const finalRow = finalRows.find((row) => stateOf(row, safeKind) === selectedState && (!active?.id || !row.id || row.id === active.id)) || null;
  const aggregate = candidateCounts(active, finalRow, safeKind);
  const modeledGroups = validatedDemographics(demographics, aggregate);
  const confirmed = Boolean(active?.called || active?.pct >= 100);
  const electoralVotes = safeKind === 'pres' && confirmed ? finalElectors(finalRow || active, modeId) : null;
  const partyIds = [...new Set([...Object.keys(aggregate.shares), ...Object.keys(aggregate.counts)])]
    .filter((party) => safeKind !== 'pres' || (aggregate.counts[party] || aggregate.shares[party]) > 0
      || scenarioBallotAccess(modeId, 'president', selectedState, party));

  return (
    <section className="panel p-3" aria-labelledby="build40-race-title" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-xs">Election Night detail</p>
          <h2 id="build40-race-title" className="font-heading text-[16px] text-white">{KIND_LABEL[safeKind]} · {active?.name || active?.stateName || selectedState || 'Choose a state'}</h2>
        </div>
        {onClose && <button type="button" className="btn-quiet px-2 py-1 text-[11px]" onClick={onClose} aria-label="Close race details">Close</button>}
      </div>

      <label className="mt-2 block text-[10px] font-bold text-slate-400">
        State
        <select
          className="ml-2 rounded-md border border-white/15 bg-slate-950 px-2 py-1 text-[11px] text-white"
          value={selectedState}
          onChange={(event) => onStateChange?.(event.target.value)}
          aria-label={`Choose a state for ${KIND_LABEL[safeKind]} results`}
        >
          {availableStates.map((abbr) => <option key={abbr} value={abbr}>{abbr}</option>)}
        </select>
      </label>

      {!active ? (
        <p className="mt-3 rounded-lg bg-black/20 p-3 text-[11px] font-semibold text-slate-400" role="status">
          {safeKind === 'senate' ? 'No Senate race is on the ballot in this state.' : safeKind === 'gov' ? 'No governor race is on the ballot in this state.' : 'No presidential result is available for this state.'}
        </p>
      ) : (
        <>
          {stateRows.length > 1 && (
            <label className="mt-2 block text-[10px] font-bold text-slate-400">
              Contest
              <select className="ml-2 rounded-md border border-white/15 bg-slate-950 px-2 py-1 text-[11px] text-white" aria-label="Choose a contest" value={active?.id || String(stateRows.indexOf(active))} onChange={(event) => setContestId(event.target.value)}>
                {stateRows.map((row, index) => <option key={row.id || index} value={row.id || String(index)}>{row.name || `${KIND_LABEL[safeKind]} contest ${index + 1}`}</option>)}
              </select>
            </label>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-400">
            <span>{active.called ? 'Confirmed call' : active.pct >= 100 ? 'Final count' : active.reporting ? 'Partial returns' : 'Not reporting'}</span>
            <span>{Math.round(active.pct || 0)}% reported{aggregate.available ? ` · ${number(aggregate.totalVotes)} counted` : ''}</span>
          </div>

          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[300px] text-left text-[10.5px]">
              <thead className="text-[9px] uppercase tracking-wide text-slate-500">
                <tr><th className="py-1">Candidate / ticket</th><th className="py-1 text-right">Votes</th><th className="py-1 text-right">Share</th></tr>
              </thead>
              <tbody>
                {partyIds.length ? partyIds.map((party) => {
                  const count = Number(aggregate.counts[party]);
                  const share = Number(aggregate.shares[party]);
                  return (
                    <tr key={party} className="border-t border-white/5">
                      <th scope="row" className="py-1.5 font-bold text-slate-200"><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: PARTY_COLOR[party] || '#8790A3' }} />{safeKind === 'pres' ? nomineeOf(game, party)?.name || labelOf(party, game) : active?.[party]?.name || (party === 'ind' && active?.indCand?.name) || labelOf(party, game)}</th>
                      <td className="num py-1.5 text-right text-slate-300">{aggregate.available ? number(count) : '—'}</td>
                      <td className="num py-1.5 text-right text-slate-300">{aggregate.available ? (Number.isFinite(share) ? `${share.toFixed(1)}%` : pct(count, aggregate.totalVotes)) : '—'}</td>
                    </tr>
                  );
                }) : <tr><td colSpan={3} className="py-2 text-slate-500">Candidate totals are not available in this reporting snapshot.</td></tr>}
              </tbody>
            </table>
          </div>

          {safeKind === 'pres' && electoralVotes && (
            <p className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-2 text-[10px] font-bold text-primary">
              Confirmed electoral allocation: {Object.entries(electoralVotes).filter(([, votes]) => Number(votes) > 0).map(([party, votes]) => `${labelOf(party, game)} ${votes}`).join(' · ')}
            </p>
          )}

          <div className="mt-3 border-t border-white/10 pt-2">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Modeled voter groups</h3>
            {modeledGroups ? (
              <div className="mt-1 space-y-1">
                {modeledGroups.map((group) => (
                  <div key={group.id} className="grid grid-cols-[1fr_auto] gap-2 text-[10px]">
                    <span className="font-semibold text-slate-300">{group.label || BUILD40_DEMOGRAPHIC_GROUPS.find((item) => item.id === group.id)?.label || group.id}</span>
                    <span className="text-slate-500">{number(group.denominator)} modeled ballots</span>
                    <div className="col-span-2 flex flex-wrap gap-x-2 text-slate-400">
                      {Object.entries(group.votesByCandidate || {}).map(([party, votes]) => <span key={party}>{labelOf(party, game)} {pct(Number(votes), Number(group.denominator))}</span>)}
                    </div>
                  </div>
                ))}
                <p className="text-[9px] font-semibold text-slate-600">Modeled disaggregation; group counts reconcile to the displayed state aggregate.</p>
              </div>
            ) : (
              <p className="mt-1 text-[10px] font-semibold text-slate-500">Unavailable for this snapshot. No voter-group result is inferred from the statewide total.</p>
            )}
          </div>
          {safeKind === 'pres' && REGION_PARTIES.some((party) => partyIds.includes(party)) && <p className="mt-2 text-[9px] font-semibold text-slate-600">Regional tickets appear only in their modeled home states.</p>}
        </>
      )}
    </section>
  );
}

function finiteTotal(value) {
  if (typeof value === 'object' && value) return Object.values(value).reduce((total, amount) => total + Math.max(0, Number(amount) || 0), 0);
  return Math.max(0, Number(value) || 0);
}

