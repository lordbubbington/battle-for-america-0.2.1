import React, { useEffect, useState } from 'react';
import { STATE_BY_ABBR } from '@/data/states';
import { ratingLabel, turnoutOf, groundLevel, adBlitzCost } from '@/lib/gameEngine';
import { ratingFor } from '@/lib/downballot';
import { formatVotes } from '@/lib/turnout';
import StateIntel from '@/components/game/StateIntel';
import { Info } from 'lucide-react';
import { movementFor, movementLabel, PULSE_THRESHOLD } from '@/lib/campaignPulse';

const DEM = '#4C7BFF';
const REP = '#E8433C';

const plusMinus = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;

// Everything about the state you clicked: the top line, and the drawer full of
// numbers behind it. Nothing shows until a state or a district is picked.
export default function StateFocusPanel({ game, snap, selected, showExact }) {
  const [intelOpen, setIntelOpen] = useState(false);

  // A new state means a new briefing; the drawer always closes with it.
  useEffect(() => {
    setIntelOpen(false);
  }, [selected]);

  const selDistrict = selected ? snap.districts.find((d) => d.id === selected) : null;
  const selRow = selDistrict || (selected ? snap.rows.find((r) => r.abbr === selected) : null);
  if (!selRow) return null;

  const targetAbbr = selDistrict ? selDistrict.parent : selected;
  const name = selDistrict ? selDistrict.name : STATE_BY_ABBR[selRow.abbr].name;
  const stateRow = snap.rows.find((row) => row.abbr === targetAbbr);
  const mapMovement = movementFor(stateRow, game.weekStartMap?.[targetAbbr], game.party);
  const movementCauses = (game.campaignTrail?.week === game.week ? game.campaignTrail.entries || [] : [])
    .map((entry) => ({ label: entry.label, amount: entry.changes?.[targetAbbr] || 0 }))
    .filter((entry) => Math.abs(entry.amount) >= 0.03)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 2);

  return (
    <div className="panel p-3" data-testid="state-focus">
      <p className="label-xs mb-1.5">State by state information</p>
      <div className="panel-lite flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2">
        <p className="font-heading text-[13px] text-white">
          {name} <span className="text-[10px] text-slate-400">{selRow.ev} EV</span>
        </p>
        <p
          className="num text-[12px] font-extrabold"
          style={{ color: selRow.winnerColor || selRow.color || (selRow.margin >= 0 ? DEM : REP) }}
        >
          {selRow.shares ? ratingFor(selRow.winner, selRow.lead, showExact) : ratingLabel(selRow.margin, showExact)}
        </p>
        <p className="text-[11px] font-bold text-slate-400">
          Campaign shift <span className="num text-slate-200">{plusMinus(game.stateMods[targetAbbr] || 0)}</span>
        </p>
        <p className="text-[11px] font-bold text-slate-400">
          Turnout <span className="num text-slate-200">{Math.round(turnoutOf(game, targetAbbr))}%</span>
        </p>
        {selRow.votes && (
          <p className="text-[11px] font-bold text-slate-400">
            Votes{' '}
            <span className="num text-slate-200">{formatVotes(selRow.votes[game.party])}</span> to{' '}
            <span className="num text-slate-200">{formatVotes(selRow.votes[game.opponentParty])}</span>
          </p>
        )}
        <p className="text-[11px] font-bold text-slate-400">
          Ground game <span className="num text-slate-200">{groundLevel(game, targetAbbr)}/3</span>
        </p>
        <p className="text-[11px] font-bold text-slate-400">
          Ad buy <span className="num text-slate-200">${adBlitzCost(game, targetAbbr, 'pro')}M</span>
        </p>
        {Math.abs(mapMovement) >= PULSE_THRESHOLD && (
          <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-white/10 pt-1.5">
            <span className="label-xs text-primary">This week</span>
            <span className="num text-[11px] font-extrabold text-slate-100">{movementLabel(mapMovement, game.party)}</span>
            <span className="text-[10px] font-semibold text-slate-500">
              {movementCauses.length
                ? `Your ${movementCauses.map((cause) => cause.label).join(' and ')} had the strongest local effect.`
                : 'The shift reflects your wider campaign activity.'}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIntelOpen((v) => !v)}
          className="btn-ghost ml-auto flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[10px] font-extrabold uppercase tracking-wide"
        >
          <Info className="h-3 w-3" /> {intelOpen ? 'Hide information' : 'More information'}
        </button>
      </div>
      {intelOpen && <StateIntel game={game} abbr={targetAbbr} showExact={showExact} />}
    </div>
  );
}
