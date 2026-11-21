import React, { useEffect, useMemo, useState } from 'react';
import { STATES } from '@/data/states';
import { groundLevel, quoteGroundGamePlan } from '@/lib/gameEngine';
import { scenarioBallotAccess } from '@/lib/build39Scenarios';
import { Building2, Check, X } from 'lucide-react';

const LEVELS = [0, 1, 2, 3];
const money = (amount) => `$${Number(amount || 0).toFixed(2)}M`;

export default function GroundGamePanel({ game, onInvest, onClose, accent = '#F7C145' }) {
  const [plan, setPlan] = useState({});
  const states = useMemo(
    () => STATES.filter(({ abbr }) => scenarioBallotAccess(game.build39?.scenario?.id, 'president', abbr, game.party)),
    [game],
  );
  const quote = useMemo(() => quoteGroundGamePlan(game, plan), [game, plan]);

  // A successful purchase updates the live level. Clear only selections that
  // now match that level; plans that failed validation remain editable.
  useEffect(() => {
    setPlan((currentPlan) => {
      const nextPlan = { ...currentPlan };
      let changed = false;
      Object.entries(currentPlan).forEach(([abbr, target]) => {
        if (groundLevel(game, abbr) === target) {
          delete nextPlan[abbr];
          changed = true;
        }
      });
      return changed ? nextPlan : currentPlan;
    });
  }, [game]);

  const setLevel = (abbr, target, current) => {
    setPlan((currentPlan) => {
      const nextPlan = { ...currentPlan };
      if (target === current) delete nextPlan[abbr];
      else nextPlan[abbr] = target;
      return nextPlan;
    });
  };

  return (
    <section
      className="panel panel-gold animate-pop-in flex max-h-[78vh] min-h-0 flex-col p-4"
      aria-labelledby="ground-game-title"
      data-testid="ground-game-panel"
    >
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <p className="label-xs">Permanent organization</p>
          <h3 id="ground-game-title" className="font-heading text-lg text-white">Ground Game</h3>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">Choose field-operation levels across every state where your ticket has ballot access.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close Ground Game" data-testid="ground-game-close" className="btn-ghost rounded-lg p-1.5">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" data-testid="ground-game-states" aria-label="Ballot-accessible states">
        {states.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {states.map(({ abbr, name }) => {
              const current = groundLevel(game, abbr);
              const planned = Number(plan[abbr] ?? current);
              return (
                <div key={abbr} className="panel-lite flex items-center gap-2 p-2.5" data-testid={`ground-game-state-${abbr}`}>
                  <Building2 className="h-4 w-4 shrink-0" style={{ color: accent }} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-extrabold text-white">{name}</p>
                    <p className="text-[10px] font-semibold text-slate-400">Current {current} · Planned {planned}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`${name} ground game level`}>
                    {LEVELS.map((level) => {
                      const belowCurrent = level < current;
                      const selected = planned === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          aria-pressed={selected}
                          aria-label={`${name}: level ${level}${belowCurrent ? ', already purchased' : ''}`}
                          data-testid={`ground-game-level-${abbr}-${level}`}
                          disabled={belowCurrent}
                          onClick={() => setLevel(abbr, level, current)}
                          className={`h-7 min-w-7 rounded-md border px-1 text-[10px] font-extrabold disabled:cursor-not-allowed disabled:opacity-40 ${selected ? 'text-slate-950' : 'border-white/15 bg-black/20 text-slate-300'}`}
                          style={selected ? { backgroundColor: accent, borderColor: accent } : undefined}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="panel-sunken p-3 text-[12px] font-semibold text-slate-300">Your ticket has no presidential ballot access in any state.</p>
        )}
      </div>

      <div className="mt-3 shrink-0 border-t border-white/10 pt-3" data-testid="ground-game-summary">
        <div className="panel-sunken grid grid-cols-2 gap-x-3 gap-y-2 p-2.5 text-[11px] font-semibold sm:grid-cols-4">
          <div><span className="block text-slate-400">States changing</span><strong className="num text-white">{quote.changedStates}</strong></div>
          <div><span className="block text-slate-400">Setup cost</span><strong className="num text-white">{money(quote.cost)}</strong></div>
          <div><span className="block text-slate-400">Cash remaining</span><strong className="num text-white">{money(quote.remainingFunds)}</strong></div>
          <div><span className="block text-slate-400">Added weekly upkeep</span><strong className="num text-white">{money(quote.addedWeeklyUpkeep)}</strong></div>
        </div>
        {!quote.ok && quote.errors?.length > 0 && <p role="alert" className="mt-2 text-[11px] font-bold text-rose-300">{quote.errors.join(' · ')}</p>}
        <button
          type="button"
          disabled={!quote.ok || quote.changedStates === 0}
          data-testid="purchase-ground-game"
          onClick={() => onInvest(plan, quote.confirmationKey)}
          className="btn-gold mt-2 flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check className="h-4 w-4" /> Buy upgrades · {money(quote.cost)}
        </button>
      </div>
    </section>
  );
}
