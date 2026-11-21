import React, { useMemo } from 'react';
import { STATE_BY_ABBR } from '@/data/states';
import { Landmark, Building2, Vote, ArrowRight } from 'lucide-react';

const DEM = '#4C7BFF';
const REP = '#E8433C';

const KINDS = {
  senate: {
    title: 'Senate',
    icon: Landmark,
    sub: 'Class 3 · 34 seats up',
    baselineLabel: 'Democratic Senate baseline: +2 percentage points transferred from other candidates in eligible races.',
    emptyLabel: 'no Senate race',
    note: 'Races ride your state polling, damped for ticket-splitting, then get their own election-night error.',
  },
  house: {
    title: 'House',
    icon: Building2,
    emptyLabel: 'no House seats',
    note: 'Each district uses its recorded partisan lean plus the current statewide generic ballot. Local House news, campaign effects, and reduced candidate quality are shown separately.',
  },
  gov: {
    title: 'Governors',
    icon: Vote,
    sub: '11 races in 2028',
    emptyLabel: "no governor's race",
    note: "Governors run at 42% of the top of the ticket. The rest is the state's own politics.",
  },
};

// Two parties, or four when the scenario splits the ballot.
function seatLine(counts) {
  const third = (counts.lib || 0) + (counts.grn || 0);
  if (counts.lib !== undefined) {
    return `${counts.dem}D · ${counts.rep}R${third > 0 ? ` · ${counts.lib}L · ${counts.grn}G` : ''}`;
  }
  return `${counts.dem}D · ${counts.rep}R${counts.other ? ` · ${counts.other} other` : ''}`;
}

function controlLabel(control) {
  if (control === 'dem') return 'D control';
  if (control === 'rep') return 'R control';
  return 'No majority';
}

function controlColor(control) {
  if (control === 'dem') return DEM;
  if (control === 'rep') return REP;
  return '#F5C542';
}

function Stat({ label, value, color = '#9BA7C0' }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="label-xs">{label}</span>
      <span className="num text-[12px] font-extrabold" style={{ color }}>
        {value}
      </span>
    </span>
  );
}

// The downballot screens: the whole map, the state of the chamber, and every
// race on it, closest first. It takes the slot campaign actions normally hold.
export default function DownballotPanel({ kind, data, forecast, game, selected, onSelect, showExact, accent, onAdvance, isLastWeek }) {
  const meta = KINDS[kind];
  const Icon = meta.icon;

  const houseDistrictMode = kind === 'house' && data.rule !== 'pr';
  const races = kind === 'house'
    ? houseDistrictMode && data.districts?.length ? data.districts : data.states
    : data.races;
  const rows = useMemo(
    () =>
      races
        .map((r) => ({
          id: r.id || r.state,
          abbr: r.stateAbbr || r.state,
          name: r.id ? `${r.name} · ${r.state}` : r.name || STATE_BY_ABBR[r.state]?.name || r.state,
          label: r.label,
          lead: r.lead ?? Math.abs(r.margin),
          color: r.color,
          winnerColor: r.winnerColor,
          noteTitle: kind === 'house' ? r.id
            ? `${r.leanProvenance?.label || `${r.sourceYear} ${r.baselineStatus === 'current-unofficial' ? 'reported-vote' : 'historical-fallback'} baseline`}. D–R lean ${r.districtLeanDMinusR >= 0 ? '+' : ''}${Number(r.districtLeanDMinusR || 0).toFixed(1)}. Candidate quality: ${Number(r.qualityContribution || 0) >= 0 ? '+' : ''}${Number(r.qualityContribution || 0).toFixed(1)} points.`
            : game?.houseRule === 'pr' ? 'Statewide party vote; seats allocated proportionally.'
              : `House candidate-quality contribution: ${Number(r.qualityContribution || 0) >= 0 ? '+' : ''}${Number(r.qualityContribution || 0).toFixed(1)} points, dampened to half strength.`
            : kind === 'senate' ? 'The fictional opening Senate advantage scales with the starting national environment.' : '',
          note:
            kind === 'house'
              ? r.id ? (r.leanProvenance ? 'PVI' : r.sourceYear === 2026 ? '2026' : '2024*') : game?.houseRule === 'pr' ? 'PR' : `Q${Number(r.qualityContribution || 0) >= 0 ? '+' : ''}${Number(r.qualityContribution || 0).toFixed(1)}`
              : kind === 'senate'
                ? `${r.defending === 'dem' ? 'D-held' : r.defending === 'rep' ? 'R-held' : ''}`
                : r.defending === 'dem'
                  ? 'D-held'
                  : r.defending === 'rep'
                    ? 'R-held'
                    : '',
        }))
        .sort((a, b) => a.lead - b.lead),
    [races, kind, game?.houseRule]
  );

  const net = data.net || 0;
  const netColor = net === 0 ? '#9BA7C0' : net > 0 ? DEM : REP;
  const selectedState = selected?.includes('-') ? selected.split('-')[0] : selected;

  return (
    <div className="panel p-3" data-testid={`downballot-${kind}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-4 w-4" style={{ color: accent }} />
          <h3 className="font-heading text-[15px] text-white">{meta.title}</h3>
        </div>
        <span className="label-xs">{kind === 'house' ? `${data.total} seats · ${data.majority} to win · ${data.rule === 'mmp' ? 'MMP' : data.rule === 'pr' ? 'PR' : 'district forecast'}` : meta.sub}</span>
      </div>

      <div className="panel-lite mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-1.5">
        <Stat label="seats" value={seatLine(data)} />
        <Stat label="net" value={`${net > 0 ? '+' : ''}${net} D`} color={netColor} />
        <Stat label="control" value={controlLabel(data.control)} color={controlColor(data.control)} />
        <Stat label="tossups" value={(data.tossups || []).length} />
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="label-xs">{kind === 'house' ? `${rows.length} ${houseDistrictMode && data.districts?.length ? 'district races' : 'state allocations'} · closest first` : `${rows.length} races · closest first`}</p>
        <p className="text-[9.5px] font-extrabold uppercase tracking-wide text-slate-500">
          {selected ? `${STATE_BY_ABBR[selectedState]?.name || selectedState}${selected?.includes('-') ? ` · ${selected}` : ''}` : 'Tap a state'}
        </p>
      </div>

      <div className="mt-1 max-h-[440px] space-y-0.5 overflow-y-auto pr-1 map-scroll">
        {rows.map((r) => {
          const active = selected === r.id || (!houseDistrictMode && selected === r.abbr);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(houseDistrictMode && r.id !== r.abbr ? r.id : r.abbr)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-[5px] text-left transition-colors ${
                active ? 'bg-white/15' : 'hover:bg-white/8'
              }`}
            >
              <span className="num w-[48px] shrink-0 text-[10px] font-extrabold text-white">{r.id}</span>
              <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${Math.min(100, r.lead * 9)}%`, backgroundColor: r.color }}
                />
              </span>
              <span className="num w-[68px] shrink-0 text-right text-[10px] font-extrabold" style={{ color: r.winnerColor }}>
                {r.label}
              </span>
              <span title={r.noteTitle} className="w-[50px] shrink-0 text-right text-[9px] font-bold uppercase tracking-wide text-slate-500">
                {r.note}
              </span>
            </button>
          );
        })}
      </div>

      {kind === 'senate' && <p className="mt-1 text-[10px] font-bold text-blue-200">{KINDS.senate.baselineLabel}</p>}
      {kind === 'house' && data.leanSourceLabel && <p className="mt-1 text-[10px] font-semibold text-blue-200">Forecast leans: {data.leanSourceLabel}.</p>}
      {kind === 'house' && data.rule !== 'pr' && data.baselineSourceCounts && (
        <p className="mt-1 text-[9px] font-semibold text-amber-200/80">
          {data.leanSourceLabel ? 'Retained vote-source coverage' : 'Baselines'}: {data.baselineSourceCounts['2026'] || 0} use currently reported 2026 votes; {data.baselineSourceCounts['2024'] || 0} use a labeled 2024 fallback (*).
        </p>
      )}
      <p className="mt-2 text-[10px] font-semibold leading-snug text-slate-500">{meta.note}</p>
      {(kind === 'house' || kind === 'senate') && (kind === 'house' ? forecast?.houseProjection : forecast?.senateProjection) && (
        <ChamberForecast kind={kind} projection={kind === 'house' ? forecast.houseProjection : forecast.senateProjection} />
      )}

      {onAdvance && (
        <button type="button" onClick={onAdvance} className="btn-gold mt-3 w-full px-4 py-2.5 text-[15px]">
          {isLastWeek ? 'Close the campaign' : 'Advance one week'}
          <ArrowRight className="ml-1 inline h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function ChamberForecast({ kind, projection }) {
  const title = kind === 'house' ? 'House control forecast' : 'Senate control forecast';
  const dem = Math.max(0, projection.demControl || 0);
  const rep = Math.max(0, projection.repControl || 0);
  const noMajority = Math.max(0, projection.noMajority || 0);
  const parts = [
    { label: 'D', value: dem, color: DEM },
    { label: 'R', value: rep, color: REP },
    { label: 'No majority', value: noMajority, color: '#8B93A6' },
  ].filter((part) => part.value > 0.05);
  const range = (values) => `${Math.round(values?.[0] || 0)}–${Math.round(values?.[1] || 0)}`;
  return (
    <section className="panel-lite mt-2 p-2.5" aria-label={`Nick Bronze ${title.toLowerCase()}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="label-xs">Nick Bronze · {title}</p>
        <p className="text-[9px] font-bold text-slate-500">{projection.draws.toLocaleString()} shared simulations</p>
      </div>
      <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={parts.map((part) => `${part.label} ${Math.round(part.value)}%`).join(', ')}>
        {parts.map((part) => <span key={part.label} style={{ width: `${part.value}%`, backgroundColor: part.color }} />)}
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-x-2 text-[9px] font-extrabold">
        <span style={{ color: DEM }}>D control {Math.round(dem)}%</span>
        <span style={{ color: REP }}>R control {Math.round(rep)}%</span>
        {noMajority > 0.05 && <span className="text-slate-400">No majority {Math.round(noMajority)}%</span>}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-2 border-t border-white/10 pt-1.5 text-[9px] font-bold text-slate-400">
        <span>D median {Math.round(projection.demMedian)} · 80% range {range(projection.demRange)}</span>
        <span className="text-right">R median {Math.round(projection.repMedian)} · 80% range {range(projection.repRange)}</span>
      </div>
      <p className="mt-1 text-[9px] font-semibold text-slate-600">{projection.total} seats · {projection.majority} needed · {projection.rule.toUpperCase()} · projections only</p>
    </section>
  );
}
