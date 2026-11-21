import React from 'react';
import USMap from '@/components/game/USMap';
import DownballotMap from '@/components/game/DownballotMap';
import MarginLegend from '@/components/game/MarginLegend';
import { PARTY_COLOR } from '@/lib/downballot';
import { MARGIN_SCALE } from '@/lib/marginColors';
import { IDLE_COLOR } from '@/lib/night';
import { Scale } from 'lucide-react';
import { SpotGlyph } from '@/components/ui/spot-art';

const TABS = [
  { id: 'pres', label: 'President', icon: 'president' },
  { id: 'senate', label: 'Senate', icon: 'senate' },
  { id: 'house', label: 'House', icon: 'house' },
  { id: 'gov', label: 'Governors', icon: 'governors' },
  { id: 'legislatures', label: 'State legislatures', icon: Scale },
];

const MODES = [
  { id: 'winner', label: 'Winner' },
  { id: 'margin', label: 'Margin of victory' },
];

// Called races take the solid shade of their party; a race still counting keeps
// the party's ordinary colour; a state that has not reported is blank.
function NightLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: MARGIN_SCALE.dem.dark }} />
        <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">called</span>
      </span>
      {['dem', 'rep', 'lib', 'grn'].map((p) => (
        <span key={p} className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: PARTY_COLOR[p] }} />
          <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">{p}</span>
        </span>
      ))}
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: IDLE_COLOR }} />
        <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">not reporting</span>
      </span>
    </div>
  );
}

function captionFor(kind, night) {
  if (kind === 'senate') {
    return `${night.senate.dem}D – ${night.senate.rep}R · ${night.senate.won} of ${night.senate.total} called`;
  }
  if (kind === 'house') {
    return night.house.rule === 'pr'
      ? `${night.house.dem}D – ${night.house.rep}R · ${night.house.won} of ${night.house.total} state allocations called`
      : night.house.rule === 'mmp'
        ? `${night.house.dem}D – ${night.house.rep}R · ${night.house.won} of ${night.house.total} districts called · ${night.house.listStatesCalled} of ${night.house.listStatesTotal} state lists called`
        : `${night.house.dem}D – ${night.house.rep}R · ${night.house.won} of ${night.house.total} districts called`;
  }
  if (kind === 'gov') {
    return `${night.gov.dem}D – ${night.gov.rep}R · ${night.gov.won} of ${night.gov.total} called`;
  }
  if (kind === 'legislatures') {
    return `${night.stateLegislatures.dem}D – ${night.stateLegislatures.rep}R · ${night.stateLegislatures.calledRaces} of ${night.stateLegislatures.totalRaces} chambers called`;
  }
  return `${night.pres.demEV}D – ${night.pres.repEV}R called · ${night.pct.toFixed(0)}% of the vote in`;
}

export default function NightBoard({ kind, onKind, mode, onMode, night, accent, selected, onSelect }) {
  const races = kind === 'senate' ? night.senate.races
    : kind === 'gov' ? night.gov.races
      : kind === 'legislatures' ? night.stateLegislatures.states : night.house.states;
  const reporting = races.filter((r) => r.reporting);

  return (
    <div className="panel p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-black/25 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = kind === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onKind(tab.id)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] font-extrabold transition-colors ${
                  active ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                {typeof Icon === 'string' ? <SpotGlyph symbol={Icon} className="h-3 w-3" /> : <Icon className="h-3 w-3" />} {tab.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1 rounded-xl border border-white/10 bg-black/25 p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onMode(m.id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition-colors ${
                mode === m.id ? 'bg-primary text-slate-900' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2">
        {kind === 'pres' ? (
          <USMap
            rows={night.rows}
            districts={night.districts}
            showExact={false}
            accentRing={accent}
            colorMode={mode}
            unreported={night.unreported}
            selected={selected}
            onSelect={onSelect}
          />
        ) : (
          <DownballotMap
            races={reporting}
            showExact={false}
            accentRing={accent}
            colorMode={mode}
            emptyLabel="polls not closed"
            selected={selected}
            onSelect={onSelect}
          />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="num text-[11px] font-extrabold text-slate-300">{captionFor(kind, night)}</span>
        <span className="text-[10px] font-bold text-slate-500">
          {kind === 'pres' ? `${night.rows.filter((r) => r.called).length} of 51 states called`
            : kind === 'legislatures' ? `${night.stateLegislatures.races.filter((r) => r.reporting).length} chambers counting`
              : `${reporting.length} counting`}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        {mode === 'winner' ? <NightLegend /> : <MarginLegend />}
        {kind === 'pres' && <span className="text-[9px] font-bold text-slate-500">Map brightness shows vote counted</span>}
        {kind === 'house' && <span className="text-[9px] font-bold text-slate-500">State summary map · district results are in the list below</span>}
      </div>
    </div>
  );
}
