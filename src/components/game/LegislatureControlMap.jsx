import React, { useMemo } from 'react';
import { buildMap } from '@/lib/usProjection';
import { PARTY_COLOR, PARTY_NAME } from '@/lib/downballot';
import { scenarioPartyMeta } from '@/lib/build39Scenarios';
import { STATE_LIST } from '@/data/states';
import StateMapLabels from '@/components/game/StateMapLabels';

const UNAVAILABLE = '#273449';

function controlFor(state, scenarioId) {
  const chambers = state?.chambers || [];
  if (!chambers.length) return null;
  if (chambers.some((chamber) => ['unavailable', 'unresolved'].includes(chamber.forecastControl))) {
    return { label: 'Incomplete projection', color: UNAVAILABLE };
  }
  const controls = new Set(chambers.map((chamber) => chamber.forecastControl));
  if (controls.size !== 1 || controls.has('split')) return { label: 'Split control', color: UNAVAILABLE };
  const [rawParty] = controls;
  const party = rawParty === 'independent' ? 'ind' : rawParty;
  const label = scenarioPartyMeta(scenarioId, rawParty)?.label || (rawParty === 'independent' ? 'Independent'
    : rawParty === 'other' ? 'Other'
      : rawParty === 'nonpartisan' ? 'Nonpartisan'
        : PARTY_NAME[party]);
  const color = scenarioPartyMeta(scenarioId, rawParty)?.color || (rawParty === 'nonpartisan' || rawParty === 'other' ? '#A6ADBB' : PARTY_COLOR[party]);
  if (!label || !color) return { label: 'Split control', color: UNAVAILABLE };
  return { party, label, color };
}

export default function LegislatureControlMap({ states = [], selected = null, scenarioId = 'standard', onSelect = (_abbr) => {} }) {
  const geometry = useMemo(() => buildMap(), []);
  const controls = useMemo(() => new Map(states.map((state) => [state.abbr, controlFor(state, scenarioId)])), [states, scenarioId]);
  const labelRows = STATE_LIST.map(({ abbr }) => ({
    abbr,
    fill: controls.get(abbr)?.color || UNAVAILABLE,
    muted: !controls.has(abbr),
  }));

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} role="group"
        aria-label="Projected control of state legislatures" className="block w-full">
        <rect width={geometry.width} height={geometry.height} rx="14" fill="#0B1530" />
        {STATE_LIST.map((item) => {
          const shape = geometry.states[item.abbr];
          if (!shape) return null;
          const control = controls.get(item.abbr);
          const fill = control?.color || UNAVAILABLE;
          const active = selected === item.abbr;
          const interactive = controls.has(item.abbr);
          return (
            <path key={item.abbr} d={shape.d} fill={fill} fillRule="evenodd"
              stroke={active ? '#F7C145' : 'rgba(255,255,255,0.35)'} strokeWidth={active ? 3 : 1}
              role={interactive ? 'button' : 'img'} tabIndex={interactive ? 0 : -1}
              aria-label={`${item.name}: ${control?.label || 'projection unavailable'}`}
              aria-pressed={interactive ? active : undefined}
              onClick={interactive ? () => onSelect(item.abbr) : undefined}
              onKeyDown={interactive ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(item.abbr);
                }
              } : undefined}
              style={{ cursor: interactive ? 'pointer' : 'default', outline: 'none' }}>
              <title>{`${item.name}: ${control?.label || 'projection unavailable'}`}</title>
            </path>
          );
        })}
        <StateMapLabels map={geometry} rows={labelRows} />
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-300" aria-label="Map legend">
        {Object.entries(PARTY_NAME).map(([party, name]) => (
          <span key={party} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PARTY_COLOR[party] || '#9CA3AF' }} />
            {name}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: UNAVAILABLE }} />
          Split / unavailable
        </span>
      </div>
      <p className="text-[10px] font-semibold text-slate-500">Color shows the projected combined control from available chamber forecasts. It does not show historical seat holders.</p>
    </div>
  );
}
