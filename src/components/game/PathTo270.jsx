import React, { useMemo, useState } from 'react';
import { PARTY_COLOR } from '@/lib/downballot';
import USMap from '@/components/game/USMap';
import { TOSSUP_COLOR } from '@/lib/marginColors';

const RATINGS = [
  { id: 'solid', label: 'Solid', strength: 15 },
  { id: 'likely', label: 'Likely', strength: 8 },
  { id: 'lean', label: 'Lean', strength: 3 },
  { id: 'tossup', label: 'Toss-up', strength: 0 },
];

const COLOR = {
  dem: { solid: '#3454A4', likely: '#4C7BFF', lean: '#89A9FF' },
  rep: { solid: '#A92F36', likely: '#E8433C', lean: '#F08B82' },
};
const NEUTRAL = TOSSUP_COLOR;

function autoAssignment(row, party, opponentParty) {
  const margin = (row.shares?.[party] || 0) - (row.shares?.[opponentParty] || 0);
  if (margin >= 10) return { party, rating: 'solid', automatic: true };
  if (margin <= -10) return { party: opponentParty, rating: 'solid', automatic: true };
  return { party: null, rating: 'tossup', automatic: true };
}

function fillColor(party, rating) {
  if (!party || rating === 'tossup') return NEUTRAL;
  return COLOR[party]?.[rating] || PARTY_COLOR[party] || NEUTRAL;
}

function assignmentLabel(assignment, you, them) {
  if (assignment.rating === 'tossup') return 'Toss-up';
  const side = assignment.party === you.party ? you.short : assignment.party === them.party ? them.short : assignment.party.toUpperCase();
  const rating = RATINGS.find((item) => item.id === assignment.rating)?.label || 'Lean';
  return `${rating} ${side}`;
}

export default function PathTo270({ game, snap, you, them, accent, onChange }) {
  const [selected, setSelected] = useState('PA');
  const [side, setSide] = useState(game.party);
  const assignments = useMemo(() => {
    const stored = game.pathMap || {};
    return snap.rows.reduce((map, row) => {
      map[row.abbr] = stored[row.abbr] || autoAssignment(row, game.party, game.opponentParty);
      return map;
    }, {});
  }, [game.pathMap, game.party, game.opponentParty, snap.rows]);

  const pathRows = useMemo(() => snap.rows.map((row) => {
    const assignment = assignments[row.abbr];
    const strength = RATINGS.find((item) => item.id === assignment.rating)?.strength || 0;
    const margin = assignment.rating === 'tossup' ? 0 : assignment.party === game.party ? strength : -strength;
    const color = fillColor(assignment.party, assignment.rating);
    return { ...row, shares: undefined, margin, color, winnerColor: color };
  }), [snap.rows, assignments, game.party]);

  const totals = useMemo(() => {
    const byParty = {};
    let tossup = 0;
    snap.rows.forEach((row) => {
      const assignment = assignments[row.abbr];
      if (assignment.rating === 'tossup') tossup += row.ev;
      else byParty[assignment.party] = (byParty[assignment.party] || 0) + row.ev;
    });
    return { byParty, tossup };
  }, [snap.rows, assignments]);

  const row = snap.rows.find((item) => item.abbr === selected);
  const assignment = row ? assignments[row.abbr] : null;
  const effectiveSide = side === game.party || side === game.opponentParty ? side : game.party;
  const updateMap = (abbr, value) => onChange({ ...(game.pathMap || {}), [abbr]: value });
  const setRating = (rating) => updateMap(selected, rating === 'tossup' ? { party: null, rating } : { party: effectiveSide, rating });
  const resetAuto = () => {
    const next = { ...(game.pathMap || {}) };
    delete next[selected];
    onChange(next);
  };

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
        <div>
          <p className="label-xs">Your electoral map</p>
          <p className="mt-0.5 text-[10px] font-semibold text-slate-500">Auto-colors a side at 10 points ahead; closer states start as toss-ups.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[10px] font-extrabold">
          <span style={{ color: accent }}>{you.short} {totals.byParty[game.party] || 0}</span>
          <span className="text-slate-500">Toss-up {totals.tossup}</span>
          <span style={{ color: PARTY_COLOR[game.opponentParty] || '#E8433C' }}>{them.short} {totals.byParty[game.opponentParty] || 0}</span>
          {Object.entries(totals.byParty).filter(([party]) => party !== game.party && party !== game.opponentParty).map(([party, ev]) => (
            <span key={party} style={{ color: PARTY_COLOR[party] || '#B8C4D8' }}>{party.toUpperCase()} {ev}</span>
          ))}
        </div>
      </div>

      <div className="mt-2">
        <USMap
          rows={pathRows}
          showExact={false}
          selected={selected}
          onSelect={setSelected}
          accentRing={accent}
          colorMode="margin"
        />
      </div>

      <div className="panel-lite mt-2 flex flex-wrap items-center gap-2 px-3 py-2">
        {row && assignment ? (
          <>
            <p className="mr-auto font-heading text-[13px] text-white">{row.name} <span className="text-[10px] text-slate-400">{row.ev} EV</span></p>
            <span className="chip" style={{ borderColor: assignment.automatic ? 'rgba(255,255,255,0.14)' : `${accent}77` }}>
              {assignmentLabel(assignment, you, them)}{assignment.automatic ? ' · Auto' : ' · Manual'}
            </span>
            <div className="flex w-full flex-wrap items-center gap-1.5 border-t border-white/10 pt-2">
              <span className="label-xs mr-1">Assign to</span>
              {[{ party: game.party, name: you.short, color: accent }, { party: game.opponentParty, name: them.short, color: PARTY_COLOR[game.opponentParty] || '#E8433C' }].map((choice) => (
                <button key={choice.party} type="button" onClick={() => setSide(choice.party)}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold transition-colors ${effectiveSide === choice.party ? 'bg-white/10' : 'bg-transparent text-slate-400'}`}
                  style={{ borderColor: effectiveSide === choice.party ? `${choice.color}99` : 'rgba(255,255,255,0.14)', color: effectiveSide === choice.party ? choice.color : undefined }}>
                  {choice.name}
                </button>
              ))}
              <span className="label-xs ml-2 mr-1">Rating</span>
              {RATINGS.map((rating) => (
                <button key={rating.id} type="button" onClick={() => setRating(rating.id)}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold transition-colors ${assignment.rating === rating.id && !assignment.automatic ? 'border-primary/60 bg-primary/15 text-primary' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
                  {rating.label}
                </button>
              ))}
              <button type="button" onClick={resetAuto} disabled={assignment.automatic}
                className="btn-ghost ml-auto rounded-full px-2.5 py-1 text-[10px] font-extrabold disabled:opacity-40">
                Reset to auto
              </button>
            </div>
          </>
        ) : (
          <p className="text-[11px] font-semibold text-slate-400">Select a state to edit its projection.</p>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-bold text-slate-500">
        {RATINGS.filter((item) => item.id !== 'tossup').map((rating) => (
          <span key={rating.id} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-white/40" />{rating.label}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: NEUTRAL }} />Toss-up</span>
        <span className="ml-auto">Statewide totals are grouped for quick planning.</span>
      </div>
    </div>
  );
}
