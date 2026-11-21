import React, { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import DownballotMap from '@/components/game/DownballotMap';
import { STATE_LEGISLATURES_2028, STATE_LEGISLATURE_2028_SUMMARY, STATE_LEGISLATURE_SOURCE } from '@/data/stateLegislatureCycles';
import { STATE_LEGISLATURE_RESULTS_2026_BY_STATE, STATE_LEGISLATURE_RESULTS_2026_SOURCE } from '@/data/stateLegislatureResults2026';
import { projectStateLegislatures, summarizeStateTrifectas } from '@/lib/stateLegislatureForecast';
import { COLOR_TOKENS } from '@/lib/marginColors';

function compactStructure(chamber) {
  const structure = chamber.districtStructure;
  if (structure.kind === 'multi-member') {
    return `${structure.multiMemberDistricts} multi-member districts · ${structure.method.replaceAll('-', ' ')}`;
  }
  if (structure.kind === 'nonpartisan-single-member') return 'nonpartisan, single-member districts';
  return 'single-member districts';
}

function seatText(counts) {
  if (counts.nonpartisan != null) return `${counts.nonpartisan} nonpartisan`;
  return `D ${counts.dem || 0} · R ${counts.rep || 0}${counts.independent ? ` · Ind ${counts.independent}` : ''}${counts.other ? ` · Other ${counts.other}` : ''}${counts.unallocated ? ` · U ${counts.unallocated}` : ''}`;
}

function controlText(control) {
  if (control === 'dem') return 'Projected Democratic control';
  if (control === 'rep') return 'Projected Republican control';
  if (control === 'split') return 'No party projected to control';
  if (control === 'unresolved') return 'Control unresolved';
  return 'Officially nonpartisan';
}

export default function StateLegislaturePanel({ game, governorRaces = [], selected, onSelect, showExact, accent }) {
  const projection = useMemo(() => projectStateLegislatures(game), [game]);
  const trifectas = useMemo(() => summarizeStateTrifectas(game, governorRaces), [game, governorRaces]);
  const elections = projection.states.map((state) => ({
    state,
    race: {
      state: state.abbr,
      margin: state.margin,
      lead: Math.abs(state.margin),
      winner: state.winner,
      winnerColor: state.winnerColor,
      color: state.color,
      label: state.label,
    },
  }));
  const selectedState = STATE_LEGISLATURES_2028.find((state) => state.abbr === selected) || null;
  const projectedState = projection.byState[selected] || null;
  const selectedChambers = projectedState?.activeChambers || [];
  const reportedChambers = selectedState ? STATE_LEGISLATURE_RESULTS_2026_BY_STATE[selectedState.abbr] || [] : [];
  const genericMargin = projectedState?.margin ?? 0;

  return (
    <section className="mt-2" aria-label="State legislature elections">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Building2 className="h-4 w-4" style={{ color: accent }} />
          <h3 className="font-heading text-[15px] text-white">2028 state legislatures</h3>
        </div>
        <span className="label-xs">{STATE_LEGISLATURE_2028_SUMMARY.statesWithElections} states · {STATE_LEGISLATURE_2028_SUMMARY.chambersWithElections} chambers · {STATE_LEGISLATURE_2028_SUMMARY.seatsUp.toLocaleString()} seats scheduled</span>
      </div>

      <div className="panel-lite mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-2" aria-label="Projected state government trifectas">
        <span className="label-xs">Projected trifectas</span>
        <span className="num text-[10px] font-extrabold" style={{ color: COLOR_TOKENS.dem }}>D {trifectas.counts.dem}</span>
        <span className="num text-[10px] font-extrabold" style={{ color: COLOR_TOKENS.rep }}>R {trifectas.counts.rep}</span>
        <span className="num text-[10px] font-extrabold text-slate-300">Divided {trifectas.counts.split}</span>
        <span className="num text-[10px] font-extrabold text-amber-200">Pending / unresolved {trifectas.counts.unresolved}</span>
        <span className="w-full text-[9px] font-semibold text-slate-500">
          {trifectas.dem.length ? `D: ${trifectas.dem.join(', ')}` : ''}
          {trifectas.rep.length ? `${trifectas.dem.length ? ' · ' : ''}R: ${trifectas.rep.join(', ')}` : ''}
          {trifectas.split.length ? `${trifectas.dem.length || trifectas.rep.length ? ' · ' : ''}Divided: ${trifectas.split.join(', ')}` : ''}
          {trifectas.unresolved.length ? `${trifectas.dem.length || trifectas.rep.length || trifectas.split.length ? ' · ' : ''}Pending: ${trifectas.unresolved.join(', ')}` : ''}
        </span>
      </div>

      <DownballotMap
        races={elections.map(({ race }) => race)}
        showExact={showExact}
        selected={selected}
        onSelect={onSelect}
        accentRing={accent}
        emptyLabel="no regular legislative election in 2028"
      />

      {selectedState ? (
        <div className="panel-lite mt-2 p-3" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="font-heading text-[14px] text-white">{selectedState.name}</h4>
            {selectedState.nonpartisanUnicameral ? (
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-300">Officially nonpartisan</span>
            ) : (
              <span className="num text-[11px] font-extrabold" style={{ color: genericMargin >= 0 ? COLOR_TOKENS.dem : COLOR_TOKENS.rep }}>
                State generic ballot {genericMargin >= 0 ? 'D' : 'R'} {genericMargin >= 0 ? '+' : '−'}{Math.abs(genericMargin).toFixed(1)}
              </span>
            )}
          </div>
          <div className="mt-2 space-y-1.5">
            {selectedChambers.map((chamber) => (
              <div key={chamber.chamber} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-white/10 pt-1.5">
                <span className="text-[11px] font-extrabold capitalize text-slate-100">{chamber.chamber === 'upper' ? 'Upper chamber' : chamber.chamber === 'lower' ? 'Lower chamber' : 'Unicameral legislature'}</span>
                <span className="num text-[10px] font-bold text-slate-300">{chamber.seatsUp2028} of {chamber.totalSeats} seats up</span>
                <span className="num text-[10px] font-extrabold text-white">{controlText(chamber.control)}</span>
                <span className="num w-full text-[10px] font-bold text-slate-300">Projected: {seatText(chamber.projected)}</span>
                {!selectedState.nonpartisanUnicameral && <span className="num w-full text-[9px] font-semibold text-slate-500">Each 2028 seat uses {chamber.margin >= 0 ? 'D' : 'R'} {chamber.margin >= 0 ? '+' : '−'}{Math.abs(chamber.margin).toFixed(1)} state generic margin; {chamber.seatsOut} seats carried from the 2026 baseline.</span>}
                <span className="w-full text-[10px] font-semibold text-slate-500">{compactStructure(chamber)}{chamber.districtCycleStatus.includes('required') ? ' · exact 2028 district class list needs verification' : ''}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-white/10 pt-2">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h5 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-200">2026 reported chamber makeup</h5>
              <span className="text-[9px] font-bold text-amber-200/80">Unofficial · checked {STATE_LEGISLATURE_RESULTS_2026_SOURCE.checkedOn}</span>
            </div>
            {reportedChambers.length ? (
              <div className="space-y-1.5">
                {reportedChambers.map((result) => (
                  <div key={result.chamber} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[10px]">
                    <span className="font-bold text-slate-300">{result.chamber === 'upper' ? 'Upper' : result.chamber === 'lower' ? 'Lower' : 'Unicameral'}</span>
                    <span className="num font-bold text-slate-200">
                      {result.chamber === 'unicameral'
                        ? `Nonpartisan ${result.other}`
                        : `D ${result.dem} · R ${result.rep}${result.independent ? ` · Ind ${result.independent}` : ''}${result.other ? ` · Other ${result.other}` : ''}`}
                      {result.unallocated ? ` · U ${result.unallocated}` : ''}
                    </span>
                    <span className="w-full text-right text-[9px] font-semibold text-slate-500">
                      {result.reportedControl === 'tbd'
                        ? 'Control uncalled in source'
                        : result.reportedControl === 'nonpartisan'
                          ? 'Officially nonpartisan'
                          : `${result.reportedControl === 'dem' ? 'Democratic' : 'Republican'} control reported`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] font-semibold text-slate-500">No chamber result was included for this state in the 2026 snapshot.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-center text-[11px] font-bold text-slate-500">Select a state to see which chambers and seats are scheduled.</p>
      )}

      <div className="mt-2 rounded-lg border border-amber-300/20 bg-amber-300/5 px-2.5 py-2 text-[10px] font-semibold leading-snug text-amber-100/80">
        Projections apply the state generic-ballot margin uniformly to every seat up in 2028; no district lean, candidate quality, incumbency, or extra campaign modifier is added. Carried seats use the latest 2026 composition. Where the exact staggered-seat roster is unavailable, its carried-forward seat allocation is a proportional estimate; “U” remains unresolved. Trifecta counts are projections from chamber and governor control, with pending 2027 cycles or uncalled baselines listed as unresolved. Nebraska remains officially nonpartisan. Schedule: <a className="underline decoration-amber-100/40 underline-offset-2" href={STATE_LEGISLATURE_SOURCE.url} target="_blank" rel="noreferrer">{STATE_LEGISLATURE_SOURCE.title}</a>. 2026 results: <a className="underline decoration-amber-100/40 underline-offset-2" href={STATE_LEGISLATURE_RESULTS_2026_SOURCE.url} target="_blank" rel="noreferrer">{STATE_LEGISLATURE_RESULTS_2026_SOURCE.title}</a>. Unraced 2026 baseline: <a className="underline decoration-amber-100/40 underline-offset-2" href={projection.dataSources.baselineFallback.url} target="_blank" rel="noreferrer">{projection.dataSources.baselineFallback.title}</a>. Governor baseline: <a className="underline decoration-amber-100/40 underline-offset-2" href={trifectas.source.url} target="_blank" rel="noreferrer">{trifectas.source.title}</a>.
      </div>
    </section>
  );
}
