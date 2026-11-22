import React, { useState } from 'react';
import { ISSUES_BY_WEIGHT, stanceLabel } from '@/data/platform';
import { flipCost, actionsLeftIn } from '@/lib/gameEngine';
import { X } from 'lucide-react';
import SpotArt from '@/components/ui/spot-art';

export default function ShiftPolicyPanel({ game, onShift, onClose, accent }) {
  const [issueId, setIssueId] = useState(ISSUES_BY_WEIGHT[0].id);
  const issue = ISSUES_BY_WEIGHT.find((i) => i.id === issueId);
  const current = game.stances?.[issueId] ?? 1;
  const cost = flipCost(game);
  const canAct = actionsLeftIn(game) > 0;

  return (
    <div id="staff-focus-shift" tabIndex={-1} className="panel panel-gold animate-pop-in p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="label-xs">Reinventing yourself</p>
          <h3 className="font-heading text-lg text-white">Change a position</h3>
        </div>
        <button type="button" onClick={onClose} className="btn-ghost rounded-lg p-1.5">
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-1 text-[11.5px] font-semibold leading-snug text-slate-400">
        You have changed position {game.flips || 0} time{(game.flips || 0) === 1 ? '' : 's'}. Each one costs momentum −
        {cost.momentum} and {cost.spread.toFixed(1)} points of margin everywhere — and it gets worse every time.
      </p>

      <div className="mt-3 grid max-h-[220px] grid-cols-1 gap-1.5 overflow-y-auto pr-1">
        {ISSUES_BY_WEIGHT.map((i) => {
          const active = issueId === i.id;
          return (
            <button
              key={i.id}
              type="button"
              onClick={() => setIssueId(i.id)}
              className="panel-lite flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-white/10"
              style={active ? { borderColor: accent, backgroundColor: `${accent}26` } : undefined}
            >
              <SpotArt symbol={i.icon} className="h-5 w-5" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-extrabold text-white">{i.label}</span>
                <span className="block truncate text-[9.5px] font-bold text-slate-400">
                  Now: {stanceLabel(i, game.stances?.[i.id] ?? 1)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 space-y-1.5">
        <p className="label-xs">Move to</p>
        {issue.options.map((option, index) => {
          const active = index === current;
          return (
            <button
              key={option}
              type="button"
              disabled={active || !canAct}
              onClick={() => onShift(issueId, index)}
              className="panel-lite block w-full px-2.5 py-2 text-left text-[11.5px] font-extrabold text-white transition-colors hover:bg-white/10 disabled:opacity-45"
              style={active ? { borderColor: `${accent}88`, backgroundColor: `${accent}1f` } : undefined}
            >
              {option}
              {active && <span className="ml-1.5 text-[9.5px] font-bold uppercase tracking-wide text-slate-400">current</span>}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-center text-[10px] font-semibold text-slate-500">
        Costs one action. The policy effect is instant — the trust damage lasts the rest of the campaign.
      </p>
    </div>
  );
}
