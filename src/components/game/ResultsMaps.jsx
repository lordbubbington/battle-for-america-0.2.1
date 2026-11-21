import React, { useMemo, useState } from 'react';
import USMap from '@/components/game/USMap';
import DownballotMap from '@/components/game/DownballotMap';
import MarginLegend from '@/components/game/MarginLegend';
import { senateSnapshot, houseSnapshot, govSnapshot } from '@/lib/gameEngine';
import { PARTY_COLOR } from '@/lib/downballot';
import { marginColor } from '@/lib/marginColors';
import { SpotGlyph } from '@/components/ui/spot-art';

const TABS = [
  { id: 'pres', label: 'President · first choice', icon: 'president' },
  { id: 'rcv', label: 'President · ranked choice', icon: 'ranked-choice' },
  { id: 'senate', label: 'Senate', icon: 'senate' },
  { id: 'house', label: 'House', icon: 'house' },
  { id: 'gov', label: 'Governors', icon: 'governors' },
];

const MODES = [
  { id: 'winner', label: 'Winner' },
  { id: 'margin', label: 'Margin of victory' },
];

const SOLID = [
  { key: 'dem', label: 'Democrat' },
  { key: 'rep', label: 'Republican' },
  { key: 'lib', label: 'Libertarian' },
  { key: 'grn', label: 'Green' },
  { key: 'ind', label: 'Independent' },
];

function WinnerLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {SOLID.map((p) => (
        <span key={p.key} className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: PARTY_COLOR[p.key] }} />
          <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">{p.label}</span>
        </span>
      ))}
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm border-2" style={{ borderColor: '#F7C145' }} />
        <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">flipped</span>
      </span>
    </div>
  );
}

// The election-night map wall: the presidency by default, then the Senate, the
// House delegations and the governor's mansions. Winner colours unless you ask
// for the margin — and every seat that changed hands is ringed in gold.
export default function ResultsMaps({ game, result, accent }) {
  const [tab, setTab] = useState(game.thirdMode === 'surge' ? 'senate' : 'pres');
  const [mode, setMode] = useState('winner');
  const visibleTabs = game.thirdMode === 'surge'
    ? TABS
    : TABS.filter((item) => item.id !== 'rcv').map((item) => item.id === 'pres' ? { ...item, label: 'President' } : item);

  const senate = useMemo(() => senateSnapshot(game, true), [game]);
  const house = useMemo(() => houseSnapshot(game, true), [game]);
  const gov = useMemo(() => govSnapshot(game, true), [game]);

  const firstChoiceRows = useMemo(() => result.rows.map((r) => {
    const winner = r.firstChoiceWinner || r.winner;
    const lead = r.firstChoiceLead ?? r.lead;
    return { ...r, winner, lead, color: marginColor(winner, lead), winnerColor: PARTY_COLOR[winner] || r.winnerColor };
  }), [result]);
  const firstChoiceEV = useMemo(() => {
    const counts = firstChoiceRows.reduce((out, row) => {
      out[row.winner] = (out[row.winner] || 0) + (row.atLarge ?? row.ev);
      return out;
    }, {});
    (result.districts || []).forEach((district) => {
      const party = district.firstChoiceWinner || district.winner;
      counts[party] = (counts[party] || 0) + district.ev;
    });
    return counts;
  }, [firstChoiceRows, result.districts]);
  const flipSetFor = (rows) => rows
    .filter((r) => {
      const before = (game.leans?.[r.abbr] ?? 0) >= 0 ? 'dem' : 'rep';
      return r.winner !== before;
    })
    .map((r) => r.abbr);
  const flippedPres = useMemo(() => flipSetFor(firstChoiceRows), [firstChoiceRows, game.leans]);
  const flippedRcv = useMemo(() => flipSetFor(result.rows), [result.rows, game.leans]);

  const isPresident = tab === 'pres' || tab === 'rcv';
  const races = tab === 'senate' ? senate.races : tab === 'house' ? house.states : gov.races;
  const flippedDown = isPresident ? [] : races.filter((r) => r.flip).map((r) => r.state);
  const flipped = tab === 'pres' ? flippedPres : tab === 'rcv' ? flippedRcv : flippedDown;
  const caption =
    tab === 'pres'
      ? `${game.electoralRule === 'proportional' ? 'Proportional electors' : game.electoralRule === 'district' ? 'District-plan electors' : game.thirdMode === 'surge' ? 'First-choice EV' : 'Electoral votes'} · ${Object.entries(firstChoiceEV).filter(([, ev]) => ev > 0).map(([p, ev]) => `${ev}${({ dem: 'D', rep: 'R', lib: 'L', grn: 'G', ind: 'I' }[p] || p)}`).join(' – ')}`
      : tab === 'rcv'
        ? `${game.electoralRule === 'proportional' ? 'Proportional electors' : game.electoralRule === 'district' ? 'District-plan electors' : 'Ranked-choice EV'} · ${Object.entries(result.evBy || {}).filter(([, ev]) => ev > 0).map(([p, ev]) => `${ev}${({ dem: 'D', rep: 'R', lib: 'L', grn: 'G', ind: 'I' }[p] || p)}`).join(' – ')}`
    : tab === 'senate'
      ? `${senate.dem}D – ${senate.rep}R${senate.lib !== undefined ? ` – ${senate.lib}L – ${senate.grn}G` : senate.other ? ` – ${senate.other} other` : ''} · ${
          senate.control === 'dem' ? 'Democratic' : senate.control === 'rep' ? 'Republican' : 'no'
        } control`
      : tab === 'house'
        ? `${house.dem}D – ${house.rep}R${(house.lib || 0) + (house.grn || 0) > 0 ? ` – ${house.lib}L – ${house.grn}G` : ''} · ${
            house.control === 'dem' ? 'Democratic' : house.control === 'rep' ? 'Republican' : 'no'
          } control`
        : `${gov.dem}D – ${gov.rep}R${gov.lib !== undefined ? ` – ${gov.lib}L – ${gov.grn}G` : gov.other ? ` – ${gov.other} other` : ''} · ${
            gov.control === 'dem' ? 'Democratic' : gov.control === 'rep' ? 'Republican' : 'split'
          } control`;

  return (
    <div className="panel mt-4 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-black/25 p-1">
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] font-extrabold transition-colors ${
                  active ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <SpotGlyph symbol={Icon} className="h-3 w-3" /> {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1 rounded-xl border border-white/10 bg-black/25 p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
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
        {isPresident ? (
          <USMap rows={tab === 'pres' ? firstChoiceRows : result.rows} showExact accentRing={accent} colorMode={mode} flipped={flipped} />
        ) : (
          <DownballotMap
            races={races}
            showExact
            accentRing={accent}
            colorMode={mode}
            flipped={flippedDown}
            emptyLabel={tab === 'senate' ? 'no Senate race' : tab === 'house' ? 'no House seats' : "no governor's race"}
          />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="num text-[11px] font-extrabold text-slate-300">{caption}</span>
        <span className="text-[10px] font-bold text-slate-500">
          {isPresident
            ? tab === 'rcv' ? 'final ranked-choice projection' : 'first-choice projection'
            : tab === 'house'
            ? `${house.closest.length} delegations inside five`
            : flipped.length
              ? `${flipped.length} flipped`
              : 'nothing changed hands'}
        </span>
      </div>

      <div className="mt-1.5">{mode === 'winner' ? <WinnerLegend /> : <MarginLegend />}</div>
    </div>
  );
}
