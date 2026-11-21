import React, { useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { STATE_LEGISLATURES_2028 } from '@/data/stateLegislatureCycles';
import { STATE_LEGISLATURE_RESULTS_2024_BY_STATE, STATE_LEGISLATURE_RESULTS_2024_SOURCE } from '@/data/stateLegislatureResults2024';
import { STATE_LEGISLATURE_SEATS_2028 } from '@/data/stateLegislatureSeats2028';
import { projectStateLegislatureSeats } from '@/lib/stateLegislatureSeatForecast';
import { genericIn } from '@/lib/environment';
import { shareModel } from '@/lib/downballot';
import LegislatureControlMap from '@/components/game/LegislatureControlMap';

const number = (value) => Number(value || 0).toLocaleString();
const partySummary = (counts) => `D ${number(counts.dem)} · R ${number(counts.rep)} · Other ${number(counts.other + counts.independent + counts.lib + counts.grn)}${counts.nonpartisan ? ` · Nonpartisan ${number(counts.nonpartisan)}` : ''}${counts.vacant ? ` · Vacant ${number(counts.vacant)}` : ''} · Unresolved ${number(counts.unresolved)}`;
const EMPTY_CALLS = Object.freeze([]);

const seatSourceStats = STATE_LEGISLATURE_SEATS_2028.reduce((stats, seat) => {
  const key = `${seat.state}:${seat.chamber}`;
  const row = stats[key] || (stats[key] = { named: 0, leanCount: 0, unresolvedClass: 0, dem: 0, rep: 0, other: 0, holderSource: null });
  if (seat.holderName2024) row.named += 1;
  if (seat.holderParty2024) {
    const party = seat.holderParty2024;
    row[party === 'dem' || party === 'rep' ? party : 'other'] += 1;
    row.holderSource ??= seat.holderSource;
  }
  if (Number.isFinite(seat.baselineLeanDMinusR)) row.leanCount += 1;
  if (seat.seatUpIn2028 === null) row.unresolvedClass += 1;
  return stats;
}, {});

const seatRosterSummary = STATE_LEGISLATURE_SEATS_2028.reduce((summary, seat) => {
  if (!seat.holderName2024) return summary;
  summary.named += 1;
  if (seat.holderSource?.status !== 'research-dataset-computed-winner') {
    summary.stateSpecific += 1;
    return summary;
  }
  if (seat.holderSource.verification === 'official-state-election-result-or-recount-table') summary.officialTables += 1;
  else if (seat.holderSource.verification === 'candidate-results-crosschecked-against-official-state-database') summary.crosschecked += 1;
  else summary.notCrosschecked += 1;
  return summary;
}, { named: 0, stateSpecific: 0, officialTables: 0, crosschecked: 0, notCrosschecked: 0 });
const namedSeatStateCount = new Set(STATE_LEGISLATURE_SEATS_2028.filter((seat) => seat.holderName2024).map((seat) => seat.state)).size;

export default function SeatLegislaturePanel({ game, selected = null, actualCalls = EMPTY_CALLS, onSelect }) {
  const [localSelected, setLocalSelected] = useState('PA');
  const projection = useMemo(() => projectStateLegislatureSeats(game, {
    seats: [...STATE_LEGISLATURE_SEATS_2028],
    schedules: STATE_LEGISLATURES_2028,
    resultsByState: STATE_LEGISLATURE_RESULTS_2024_BY_STATE,
    resolveVoteShares: shareModel,
    actualCalls: [...actualCalls],
    resolveStateGeneric: (stateAbbr, currentGame) => Number.isFinite(currentGame?.stateGeneric?.[stateAbbr])
      ? genericIn(stateAbbr, currentGame)
      : null,
  }), [game, actualCalls]);
  const state = projection.byState[selected || localSelected] || projection.states[0];

  return (
    <section className="mt-2 space-y-2" aria-label="Seat-by-seat state legislature projection">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-cyan-300" />
          <h3 className="font-heading text-[15px] text-white">2028 legislative seats</h3>
        </div>
        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
          State
          <select className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-white" value={state?.abbr || ''} onChange={(event) => { setLocalSelected(event.target.value); onSelect?.(event.target.value); }}>
            {STATE_LEGISLATURES_2028.map((item) => <option key={item.abbr} value={item.abbr}>{item.name}</option>)}
          </select>
        </label>
      </div>

      <div className="panel-lite space-y-2 p-3">
        <h4 className="font-heading text-xs font-extrabold text-white">Projected legislature control</h4>
        <LegislatureControlMap
          scenarioId={game.build39?.scenario?.id}
          states={projection.states}
          selected={state?.abbr}
          onSelect={(abbr) => { setLocalSelected(abbr); onSelect?.(abbr); }}
        />
      </div>

      <div className="panel-lite space-y-2 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="font-heading text-sm font-bold text-white">{state?.name}</h4>
          {Number.isFinite(state?.genericMarginDMinusR) && <span className="text-[10px] font-bold text-slate-400">State generic ballot D {state.genericMarginDMinusR >= 0 ? '+' : '−'}{Math.abs(state.genericMarginDMinusR).toFixed(1)}</span>}
        </div>
        {state?.chambers.map((chamber) => {
          const aggregate = chamber['2024Aggregate'];
          const roster = seatSourceStats[`${state.abbr}:${chamber.chamber}`];
          const unresolvedClasses = chamber.forecasts.filter((seat) => seat.seatUpIn2028 === null).length;
          const rosterDiffers = aggregate && roster
            && roster.dem + roster.rep + roster.other === chamber.totalSeats
            && (roster.dem !== aggregate.dem || roster.rep !== aggregate.rep || roster.other !== aggregate.other);
          return <article key={chamber.chamber} className="space-y-1 border-t border-white/10 pt-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h5 className="text-xs font-extrabold capitalize text-slate-100">{chamber.chamber === 'upper' ? 'Upper chamber' : chamber.chamber === 'lower' ? 'Lower chamber' : 'Unicameral legislature'}</h5>
              <span className="text-[10px] font-semibold text-slate-400">{number(chamber.seatsUp2028)} of {number(chamber.totalSeats)} scheduled · projected control: {chamber.forecastControl}</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-300">Forecast: {partySummary(chamber.forecastCounts)}</p>
            <p className="text-[10px] font-semibold text-slate-400">Election Night calls: D {number(chamber.callCounts.dem)} · R {number(chamber.callCounts.rep)} · Other {number(chamber.callCounts.other + chamber.callCounts.independent + chamber.callCounts.lib + chamber.callCounts.grn)} · {chamber.calledSeatCount} called</p>
            <p className="text-[9px] font-semibold text-amber-100/70">NCSL preliminary 2024 tally · D {aggregate?.dem ?? '—'} · R {aggregate?.rep ?? '—'} · Other/nonpartisan {aggregate?.other ?? '—'}</p>
            {rosterDiffers && <p className="text-[9px] font-semibold text-amber-100/70">{roster.holderSource?.status === 'official-certified-winner-roster' ? 'Certified winner roster' : 'Compiled research winner roster'} · D {roster.dem} · R {roster.rep} · Other/nonpartisan {roster.other}{roster.holderSource?.url && <> · <a className="underline" href={roster.holderSource.url} target="_blank" rel="noreferrer">Roster source</a></>}</p>}
            <p className="text-[9px] font-semibold text-amber-100/70">{roster?.named ?? 0} of {chamber.totalSeats} named seat holders · {roster?.leanCount ?? 0} sourced contested-race leans{unresolvedClasses > 0 && ` · ${number(unresolvedClasses)} seat classes unresolved`}</p>
          </article>;
        })}
      </div>

      <div className="rounded-lg border border-amber-300/20 bg-amber-300/5 px-2.5 py-2 text-[10px] font-semibold leading-snug text-amber-100/80">
        {projection.simplification} {projection.methodology} The roster names {number(seatRosterSummary.named)} of {number(STATE_LEGISLATURE_SEATS_2028.length)} seat holders across {number(namedSeatStateCount)} states. The compiled 2024 research table identifies {number(seatRosterSummary.officialTables)} winners from official result or recount tables, {number(seatRosterSummary.crosschecked)} cross-checked with state databases, and {number(seatRosterSummary.notCrosschecked)} without an independent state canvass check. State-specific tables and earlier election rosters contribute {number(seatRosterSummary.stateSpecific)} more names. See <a className="underline decoration-amber-100/40 underline-offset-2" href="https://www.electionwrld.com/data/notes" target="_blank" rel="noreferrer">the per-state source and verification notes</a> and <a className="underline decoration-amber-100/40 underline-offset-2" href={STATE_LEGISLATURE_RESULTS_2024_SOURCE.url} target="_blank" rel="noreferrer">the preliminary NCSL totals</a>.
      </div>
    </section>
  );
}
