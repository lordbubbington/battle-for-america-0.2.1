import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { STATE_LIST } from '@/data/states';
import { buildMap } from '@/lib/usProjection';
import { marginColor } from '@/lib/marginColors';
import DownballotMap from '@/components/game/DownballotMap';
import LegislatureControlMap from '@/components/game/LegislatureControlMap';
import NightBoard from '@/components/game/night/NightBoard';
import PathTo270 from '@/components/game/PathTo270';
import QuickOutcomeMap from '@/components/game/QuickOutcomeMap';
import USMap from '@/components/game/USMap';
import MapTuner from '@/components/setup/MapTuner';
import '@/index.css';

const query = new URLSearchParams(location.search);
const variant = query.get('map') || 'president';
const titles = {
  president: 'Campaign · President', downballot: 'Campaign · House', legislature: 'Projected legislature control',
  quick: 'Quick outcomes', night: 'Election Night', path: 'Path to 270', tuner: 'Setup map tuner',
};
const light = query.get('fill') !== 'dark';
const rows = STATE_LIST.map((state, index) => {
  const margin = state.abbr === 'FL' ? (light ? -3 : -18) : [-13, -6, 3, 18][index % 4];
  const winner = margin < 0 ? 'rep' : 'dem';
  return { ...state, margin, winner, lead: Math.abs(margin), color: marginColor(winner, margin), ...(variant === 'night' ? {
    called: state.abbr !== 'PA', pct: state.abbr === 'PA' ? 12 : 100,
  } : {}) };
});
const races = rows.filter(({ abbr }) => abbr !== 'DC').map((row) => ({ ...row, state: row.abbr, label: 'Projected delegation', reporting: true }));
const legislature = rows.filter(({ abbr }) => abbr !== 'DC').map(({ abbr, winner }) => ({
  abbr, chambers: [{ forecastControl: abbr === 'FL' ? (light ? 'nonpartisan' : 'unavailable') : winner }],
}));
const frequency = rows.map(({ abbr, margin, winner }) => ({
  abbr, averageDemRepMargin: margin,
  winPct: abbr === 'FL' ? { dem: 0, lib: 100 } : { dem: 97, lib: winner === 'rep' ? 3 : 0 },
}));
const districts = [
  { id: 'ME-1', parent: 'ME', short: 'ME-1', color: '#1C2C88', margin: 14 },
  { id: 'ME-2', parent: 'ME', short: 'ME-2', color: '#841811', margin: -12 },
];
const snap = { rows, districts };
const night = {
  ...snap, unreported: ['NV'], pct: 75,
  pres: { demEV: 237, repEV: 181 },
  senate: { races, dem: 20, rep: 20, won: 36, total: 40 },
  gov: { races, dem: 36, rep: 25, won: 61, total: 100 },
  house: { states: races, dem: 185, rep: 172, won: 357, total: 435 },
  stateLegislatures: { states: races, races, dem: 12, rep: 12, calledRaces: 23, totalRaces: 62 },
};
const empty = () => {};

function MapFixture() {
  const [selected, setSelected] = useState('PA');
  const [pathMap, setPathMap] = useState({});
  const [kind, setKind] = useState('pres');
  const [mode, setMode] = useState('margin');
  const map = {
    president: <USMap rows={rows} districts={districts} selected={selected} onSelect={setSelected} onSelectDistrict={setSelected} />,
    downballot: <DownballotMap races={races} selected={selected} onSelect={setSelected} flipped={['AZ']} emptyLabel="no House seats" />,
    legislature: <LegislatureControlMap states={legislature} selected={selected} onSelect={setSelected} />,
    quick: <QuickOutcomeMap stateRows={frequency} parties={['lib', 'dem']} />,
    night: <NightBoard kind={kind} onKind={setKind} mode={mode} onMode={setMode} night={night} accent="#F7C145" selected={selected} onSelect={setSelected} />,
    path: <PathTo270 game={{ party: 'dem', opponentParty: 'rep', pathMap }} snap={snap} you={{ party: 'dem', short: 'Democrat' }} them={{ party: 'rep', short: 'Republican' }} accent="#F7C145" onChange={setPathMap} />,
    tuner: <MapTuner leans={{}} adjust={{}} onAdjust={empty} national={0} onNational={empty} randomness={0} onRandomness={empty} onReroll={empty} previewRows={rows} showExact />,
  }[variant];
  return (
    <main className="fixture">
      <h1 className="mb-2 font-heading text-lg text-white">{titles[variant]}</h1>
      <div className={variant === 'quick' ? 'fixture-quick' : 'fixture-campaign'}>
        <div>{map}</div>
      </div>
    </main>
  );
}

window.mapFixture = buildMap();
createRoot(document.querySelector('#root')).render(<MapFixture />);
