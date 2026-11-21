
function signedMargin(value, you, them) {
  if (Math.abs(value) < 0.05) return 'Even';
  return value > 0 ? `${you.short} +${value.toFixed(1)} pts` : `${them.short} +${Math.abs(value).toFixed(1)} pts`;
}

export default function PredictionMeter({ forecast, status, forecastWeek = null, you, them, accent, oppAccent }) {
  // R20: Reserve the same structural footprint as the populated forecast panel
  // during initial load or unavailable states so the header never collapses/jumps.
  if (!forecast) return (
    <section
      className="panel-sunken mt-2.5 flex min-h-[156px] flex-col justify-between p-2.5"
      aria-label="Nick Bronze election forecast"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div>
          <p className="label-xs">Nick Bronze · Election forecast</p>
          <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
            {status === 'unavailable' ? 'Forecast unavailable' : 'Calculating weekly forecast…'}
          </p>
        </div>
        <div className="text-right">
          <p className="label-xs">Chance to win</p>
          <p className="num text-[17px] font-extrabold leading-none text-slate-500">—</p>
        </div>
      </div>
      <div className="mt-2">
        <div className="h-2.5 rounded-full bg-white/10" />
        <div className="mt-1 flex justify-between text-[9px] font-extrabold uppercase tracking-wide text-slate-500">
          <span>{them?.short || 'OPP'} favored</span>
          <span>Even</span>
          <span>{you?.short || 'YOU'} favored</span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2 border-t border-white/10 pt-2 text-slate-500">
        <div>
          <p className="label-xs">Average electoral outcome</p>
          <p className="num mt-0.5 text-[12px] font-extrabold">—</p>
        </div>
        <div className="text-center">
          <p className="label-xs">Popular vote margin</p>
          <p className="num mt-0.5 text-[11px] font-extrabold">—</p>
        </div>
        <div className="text-right">
          <p className="label-xs">Projected</p>
          <p className="num mt-0.5 text-[12px] font-extrabold">—</p>
        </div>
      </div>
      <p className="mt-1.5 text-[9px] font-semibold text-slate-600">
        Weekly forecast updates at the start of each campaign week.
      </p>
    </section>
  );

  const chance = Math.max(0, Math.min(100, forecast.youWin));
  const midpoint = `${chance}%`;
  const marginText = signedMargin(forecast.popularMargin, you, them);
  const winBasis = forecast.popularVoteDecides ? 'popular vote' : 'Electoral College / House';
  const isUpdating = status === 'updating';

  return (
    <section
      className="panel-sunken mt-2.5 min-h-[156px] p-2.5"
      aria-label="Nick Bronze election forecast"
      aria-busy={isUpdating ? 'true' : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div>
          <p className="label-xs">
            Nick Bronze · Election forecast
            {isUpdating && (
              <span className="ml-1.5 font-semibold text-amber-300" role="status" aria-live="polite">
                · Week {forecastWeek ?? '?'} forecast (updating…)
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
            Average outcome across {forecast.draws.toLocaleString()} simulations
          </p>
        </div>
        <div className="text-right">
          <p className="label-xs">Chance to win · {winBasis}</p>
          <p className="num text-[17px] font-extrabold leading-none" style={{ color: accent }}>{Math.round(chance)}%</p>
        </div>
      </div>

      <div className="mt-2" role="meter" aria-label={`${you.name} win likelihood`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(chance)} aria-valuetext={`${Math.round(chance)} percent chance for ${you.short}`}>
        <div className="relative h-2.5 rounded-full" style={{ background: `linear-gradient(90deg, ${oppAccent} 0%, #8290AA 50%, ${accent} 100%)` }}>
          <span className="absolute -top-[4px] h-[18px] w-[3px] -translate-x-1/2 rounded-sm border border-white bg-slate-950 shadow" style={{ left: midpoint }} />
        </div>
        <div className="mt-1 flex justify-between text-[9px] font-extrabold uppercase tracking-wide">
          <span style={{ color: oppAccent }}>{them.short} favored</span>
          <span className="text-slate-500">Even</span>
          <span style={{ color: accent }}>{you.short} favored</span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2 border-t border-white/10 pt-2">
        <div>
          <p className="label-xs">Average electoral outcome</p>
          <p className="num mt-0.5 text-[12px] font-extrabold" style={{ color: accent }}>{you.short} {Math.round(forecast.youEV)} EV</p>
        </div>
        <div className="text-center">
          <p className="label-xs">Popular vote margin</p>
          <p className="num mt-0.5 text-[11px] font-extrabold text-slate-200">{marginText}</p>
        </div>
        <div className="text-right">
          <p className="label-xs">Projected</p>
          <p className="num mt-0.5 text-[12px] font-extrabold" style={{ color: oppAccent }}>{them.short} {Math.round(forecast.themEV)} EV</p>
        </div>
      </div>
      <p className="mt-1.5 text-[9px] font-semibold text-slate-600">
        Weekly snapshot — refreshes at the start of each week using half-weight turnout inputs.
      </p>
    </section>
  );
}
