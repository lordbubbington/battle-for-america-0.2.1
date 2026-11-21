import React, { useMemo, useState } from 'react';
import { buildMap } from '@/lib/usProjection';
import { STATE_LIST } from '@/data/states';
import { PARTY_COLOR } from '@/lib/downballot';
import StateMapLabels from '@/components/game/StateMapLabels';

const PARTIES = [
  { id: 'dem', short: 'D', name: 'Democrats', color: PARTY_COLOR.dem },
  { id: 'rep', short: 'R', name: 'Republicans', color: PARTY_COLOR.rep },
  { id: 'lib', short: 'L', name: 'Libertarians', color: PARTY_COLOR.lib },
  { id: 'grn', short: 'G', name: 'Greens', color: PARTY_COLOR.grn },
  { id: 'ind', short: 'I', name: 'Independents', color: PARTY_COLOR.ind },
];

const EMPTY = '#1B2942';

function blendColor(color, chance) {
  const amount = Math.max(0, Math.min(100, chance)) / 100;
  const from = EMPTY.match(/[A-Fa-f0-9]{2}/g).map((part) => parseInt(part, 16));
  const to = color.match(/[A-Fa-f0-9]{2}/g).map((part) => parseInt(part, 16));
  return `#${from.map((value, index) => Math.round(value + (to[index] - value) * amount).toString(16).padStart(2, '0')).join('')}`;
}

export default function QuickOutcomeMap({ stateRows, parties }) {
  const map = useMemo(() => buildMap(), []);
  const available = PARTIES.filter((party) => parties.includes(party.id));
  const [selectedParty, setSelectedParty] = useState(available[0]?.id || 'dem');
  const current = available.find((party) => party.id === selectedParty) || available[0] || PARTIES[0];
  const byState = useMemo(() => Object.fromEntries(stateRows.map((row) => [row.abbr, row])), [stateRows]);
  const dc = map.states.DC;
  const fillFor = (chance) => blendColor(current.color, chance);
  const dcChance = byState.DC?.winPct[selectedParty] || 0;
  const mapRows = STATE_LIST.filter(({ abbr }) => abbr !== 'DC' && map.states[abbr] && byState[abbr]).map((state) => {
    const outcome = byState[state.abbr];
    const chance = outcome.winPct[selectedParty] || 0;
    return { ...state, chance, averageMargin: outcome.averageDemRepMargin, fill: fillFor(chance) };
  });

  return (
    <section className="panel-lite mb-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-heading text-[15px] text-white">State win frequency map</h3>
          <p className="mt-0.5 text-[10px] font-semibold text-slate-500">Select a party; stronger color means it won that state more often.</p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Map party">
          {available.map((party) => (
            <button
              key={party.id}
              type="button"
              aria-pressed={selectedParty === party.id}
              onClick={() => setSelectedParty(party.id)}
              className="rounded-md border px-2.5 py-1 text-[10px] font-extrabold transition-colors"
              style={{ borderColor: selectedParty === party.id ? party.color : 'rgba(255,255,255,0.14)', color: selectedParty === party.id ? party.color : '#94A3B8', backgroundColor: selectedParty === party.id ? `${party.color}18` : 'transparent' }}
            >
              {party.short} · {party.name}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${map.width} ${map.height}`} className="mt-2 block w-full" role="img" aria-label={`${current.name} state win frequency map`}>
        <defs>
          <radialGradient id="quickMapOcean" cx="50%" cy="0%" r="90%">
            <stop offset="0%" stopColor="#16274B" />
            <stop offset="100%" stopColor="#0B1530" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={map.width} height={map.height} fill="url(#quickMapOcean)" rx="14" />
        {mapRows.map(({ abbr, name, fill, chance, averageMargin }) => (
          <path key={abbr} d={map.states[abbr].d} fill={fill} fillRule="evenodd" stroke="rgba(255,255,255,0.36)" strokeWidth="0.9" strokeLinejoin="round">
            <title>{`${name}: ${chance.toFixed(1)}% ${current.name} win chance · average D−R ${averageMargin > 0 ? '+' : ''}${averageMargin.toFixed(1)}`}</title>
          </path>
        ))}
        <StateMapLabels map={map} rows={[...mapRows, { abbr: 'DC', fill: fillFor(dcChance) }]} />
        {dc && <circle cx={dc.cx} cy={dc.cy} r="4.5" fill={fillFor(dcChance)} stroke="rgba(255,255,255,0.55)" strokeWidth="1.2"><title>{`District of Columbia: ${dcChance.toFixed(1)}% ${current.name} win chance`}</title></circle>}
      </svg>
      <div className="mt-2 flex items-center gap-2 text-[9px] font-bold text-slate-500">
        <span>0%</span>
        <div className="h-2 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${EMPTY}, ${current.color})` }} />
        <span>100%</span>
        <span className="ml-1 text-slate-300">{current.short} win chance</span>
      </div>
    </section>
  );
}
