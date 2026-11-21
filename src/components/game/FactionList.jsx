import React from 'react';
import { factionEffects, factionLine, factionMood } from '@/lib/factions';
import SpotArt from '@/components/ui/spot-art';

// Standing is only half of it — each faction's standing pays out every week.
export default function FactionList({ game, factions, shift, accent }) {
  const moves = shift?.factions || [];
  const moveOf = (id) => moves.find((m) => m.id === id)?.delta || 0;
  const fx = factionEffects(game);
  const income = Math.round((fx.incomeMul - 1) * 100);
  const field = Math.round((fx.actionMul - 1) * 100);
  const labor = Math.round((fx.laborFieldMul - 1) * 100);
  const moderate = Math.round((fx.moderatePersuasionMul - 1) * 100);
  const crisisNames = fx.activeCrises.map((id) => factions.find((f) => f.id === id)?.label || id);

  return (
    <div className="mt-2">
      <div className="space-y-2">
        {factions.map((f) => {
          const delta = moveOf(f.id);
          return (
            <div key={f.id}>
              <div className="flex items-center justify-between gap-1.5">
                <span className="flex min-w-0 items-center gap-1 text-[11px] font-bold">
                  <SpotArt symbol={f.icon} className="h-4 w-4" />
                  <span className="truncate text-slate-300">{f.label}</span>
                  <span className="shrink-0 text-[8.5px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                    {factionMood(f.standing)}
                  </span>
                </span>
                <span className="flex shrink-0 items-baseline gap-1">
                  {delta !== 0 && (
                    <span
                      className="num text-[9.5px] font-extrabold"
                      style={{ color: delta > 0 ? '#6EE7B7' : '#FCA5A5' }}
                    >
                      {delta > 0 ? '+' : '−'}
                      {Math.abs(delta).toFixed(1)}
                    </span>
                  )}
                  <span className="num text-[12px] font-extrabold text-white">{f.standing}</span>
                </span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${f.standing}%`, backgroundColor: f.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {moves.length > 0 && (
        <p className="mt-2 text-[10.5px] font-semibold leading-snug" style={{ color: accent }}>
          {moves
            .slice(0, 2)
            .map((m) => factionLine(factions.find((f) => f.id === m.id) || { label: m.id }, m.delta))
            .join(' · ')}
        </p>
      )}

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <div className="panel-sunken px-1.5 py-1 text-center">
          <p className="label-xs">Money</p>
          <p className="num text-[11.5px] font-extrabold" style={{ color: income >= 0 ? '#6EE7B7' : '#FCA5A5' }}>
            {income >= 0 ? '+' : '−'}
            {Math.abs(income)}%
          </p>
        </div>
        <div className="panel-sunken px-1.5 py-1 text-center">
          <p className="label-xs">Mood</p>
          <p
            className="num text-[11.5px] font-extrabold"
            style={{ color: fx.momentumDrift >= 0 ? '#6EE7B7' : '#FCA5A5' }}
          >
            {fx.momentumDrift >= 0 ? '+' : '−'}
            {Math.abs(fx.momentumDrift).toFixed(1)}
          </p>
        </div>
        <div className="panel-sunken px-1.5 py-1 text-center">
          <p className="label-xs">The field</p>
          <p
            className="num text-[11.5px] font-extrabold"
            style={{ color: field >= 0 ? '#6EE7B7' : '#FCA5A5' }}
          >
            {field >= 0 ? '+' : '−'}
            {Math.abs(field)}%
          </p>
        </div>
        <div className="panel-sunken px-1.5 py-1 text-center" title="Volunteer and ground-game actions in priority states">
          <p className="label-xs">Labor field</p>
          <p className="num text-[11.5px] font-extrabold" style={{ color: labor >= 0 ? '#6EE7B7' : '#FCA5A5' }}>
            {labor >= 0 ? '+' : '−'}{Math.abs(labor)}%
          </p>
        </div>
        <div className="panel-sunken px-1.5 py-1 text-center" title="Town hall and policy-persuasion actions">
          <p className="label-xs">Moderate reach</p>
          <p className="num text-[11.5px] font-extrabold" style={{ color: moderate >= 0 ? '#6EE7B7' : '#FCA5A5' }}>
            {moderate >= 0 ? '+' : '−'}{Math.abs(moderate)}%
          </p>
        </div>
        <div className="panel-sunken px-1.5 py-1 text-center" title="Applied to the modelled House, Senate, and governor margins">
          <p className="label-xs">Downballot</p>
          <p className="num text-[11.5px] font-extrabold" style={{ color: fx.downballotBonus >= 0 ? "#6EE7B7" : "#FCA5A5" }}>{fx.downballotBonus >= 0 ? "+" : "−"}{Math.abs(fx.downballotBonus).toFixed(2)} pts</p>
        </div>
      </div>

      {fx.specialistBonuses.length > 0 && (
        <p className="mt-2 text-[10px] font-semibold leading-snug text-slate-400">
          {fx.specialistBonuses.map((bonus) => `${bonus.label} +${bonus.percent}% on ${bonus.actions}`).join(' · ')}
        </p>
      )}      <p className="mt-2 text-[10px] font-semibold leading-snug text-slate-500">
        {crisisNames.length > 0
          ? `Faction crisis: ${crisisNames.join(', ')}. This penalty remains until support is rebuilt above 20.`
          : fx.defection > 0
            ? `A wing has walked away from you: ${fx.defection.toFixed(2)} points of vote share a week until it comes back.`
            : 'No faction has walked away yet. Money pays the week, officials set the mood, and the field decides how far an action carries.'}
      </p>
    </div>
  );
}
