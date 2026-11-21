import React, { useMemo } from 'react';
import { STATES } from '@/data/states';
import { scenarioBallotAccess } from '@/lib/build39Scenarios';
import { groundWeeklyCost } from '@/lib/fieldOperations';
import { quoteOpeningFieldPlan } from '@/lib/build40Field';
import { Building2, Check, X } from 'lucide-react';

export default function Build40FieldPlan({ game, plan = {}, onPlanChange, onConfirm, onCancel, accent = '#F7C145' }) {
  const quote = useMemo(() => quoteOpeningFieldPlan({ game, plan }), [game, plan]);
  const setLevel = (abbr, level) => onPlanChange?.({ ...plan, [abbr]: level });

  return (
    <section className="panel panel-gold p-4" aria-labelledby="build40-field-plan-title" data-testid="build40-field-plan">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-xs">Optional campaign setup</p>
          <h2 id="build40-field-plan-title" className="font-heading text-xl text-white">Ground Game</h2>
          <p className="mt-1 max-w-2xl text-[12px] font-semibold text-slate-400">Choose up to three permanent field-operation levels in each state. The one-time setup is paid from your starting cash; operations begin before the first full week.</p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Cancel ground game setup" className="btn-ghost rounded-lg p-1.5"><X className="h-4 w-4" /></button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {STATES.filter(({ abbr }) => scenarioBallotAccess(game.build39?.scenario?.id, 'president', abbr, game.party)).map(({ abbr, name }) => {
          const level = Number(plan[abbr] ?? game.ops?.[abbr] ?? 0);
          const upkeep = groundWeeklyCost(abbr, level);
          return (
            <div key={abbr} className="panel-lite flex items-center gap-2 p-2.5" data-testid={`field-plan-${abbr}`}>
              <Building2 className="h-4 w-4 shrink-0" style={{ color: accent }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-extrabold text-white">{name}</p>
                <p className="text-[10px] font-semibold text-slate-400">Level {level} · ${upkeep.toFixed(1)}M weekly upkeep</p>
              </div>
              <div className="flex items-center gap-1" aria-label={`${name} ground game level`}>
                {[0, 1, 2, 3].map((nextLevel) => (
                  <button key={nextLevel} type="button" aria-pressed={level === nextLevel}
                    aria-label={`${name}: ${nextLevel} field levels`} data-testid={`field-level-${abbr}-${nextLevel}`}
                    onClick={() => setLevel(abbr, nextLevel)}
                    className={`h-7 min-w-7 rounded-md border px-1 text-[10px] font-extrabold ${level === nextLevel ? 'text-slate-950' : 'border-white/15 bg-black/20 text-slate-300'}`}
                    style={level === nextLevel ? { backgroundColor: accent, borderColor: accent } : undefined}>{nextLevel}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel-sunken mt-3 grid gap-2 p-3 text-[12px] font-semibold sm:grid-cols-3">
        <div><span className="block text-slate-400">One-time setup</span><strong className="num text-white">${quote.cost.toFixed(2)}M</strong></div>
        <div><span className="block text-slate-400">Cash after purchase</span><strong className="num text-white">${quote.remainingFunds.toFixed(2)}M</strong></div>
        <div><span className="block text-slate-400">Weekly upkeep</span><strong className="num text-white">${quote.upkeep.toFixed(1)}M</strong></div>
      </div>
      {!quote.ok && <p role="alert" className="mt-2 text-[11px] font-bold text-rose-300">{quote.errors.join(' · ')}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!quote.ok} onClick={() => onConfirm?.(quote.plan)} className="btn-gold flex items-center gap-1.5 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"><Check className="h-4 w-4" />Confirm Ground Game</button>
        <button type="button" onClick={onCancel} className="btn-ghost px-4 py-2">Skip for now</button>
      </div>
    </section>
  );
}
