import React from 'react';
import EvBar from '@/components/game/EvBar';
import { SENATE_MAJORITY } from '@/data/downballot';
import { EV_TO_WIN } from '@/lib/gameEngine';
import { PARTY_COLOR } from '@/lib/downballot';

// The number that matters for whichever race is on screen.
export default function NightTally({ kind, night, forecast, game, you, them, accent, oppAccent }) {
  const view =
    kind === 'pres'
      ? {
          title: 'The presidency',
          left: night.evBy[game.party] || 0,
          right: night.evBy[them.party] || 0,
          leftLabel: you.short,
          rightLabel: them.short,
          leftColor: PARTY_COLOR[game.party],
          rightColor: PARTY_COLOR[game.opponentParty],
          need: EV_TO_WIN,
          note: `${night.rows.filter((r) => r.called).length} of 51 states called`,
        }
      : kind === 'senate'
        ? {
            title: 'The Senate',
            left: night.senate.dem,
            right: night.senate.rep,
            leftLabel: 'Democrats',
            rightLabel: 'Republicans',
            need: SENATE_MAJORITY,
            leftColor: PARTY_COLOR.dem,
            rightColor: PARTY_COLOR.rep,
            note: `${night.senate.won} of ${night.senate.total} races called`,
          }
        : kind === 'house'
          ? {
              title: 'The House',
              left: night.house.dem,
              right: night.house.rep,
              leftLabel: 'Democrats',
              rightLabel: 'Republicans',
              need: night.house.majority,
              leftColor: PARTY_COLOR.dem,
              rightColor: PARTY_COLOR.rep,
              note: night.house.rule === 'pr'
                ? `${night.house.won} of ${night.house.total} state allocations called · ${night.house.totalSeats} seats`
                : night.house.rule === 'mmp'
                  ? `${night.house.won} of 435 districts called · ${night.house.listStatesCalled} state list allocations called · 870 seats`
                  : `${night.house.won} of 435 districts called · 435 seats`,
            }
          : kind === 'legislatures'
            ? {
                title: 'State legislatures',
                left: night.stateLegislatures.dem,
                right: night.stateLegislatures.rep,
                leftLabel: 'Democratic seats',
                rightLabel: 'Republican seats',
                need: null,
                leftColor: PARTY_COLOR.dem,
                rightColor: PARTY_COLOR.rep,
                pct: night.stateLegislatures.pct,
                note: `${night.stateLegislatures.calledRaces} of ${night.stateLegislatures.totalRaces} chambers called · ${night.stateLegislatures.seatsUpCalled} of ${night.stateLegislatures.totalSeatsUp} seats up called${night.stateLegislatures.nonpartisan ? ` · ${night.stateLegislatures.nonpartisan} nonpartisan seats` : ''}`,
              }
          : {
              title: 'The governorships',
              left: night.gov.dem,
              right: night.gov.rep,
              leftLabel: 'Democrats',
              rightLabel: 'Republicans',
              need: null,
              leftColor: PARTY_COLOR.dem,
              rightColor: PARTY_COLOR.rep,
              note: `${night.gov.won} of ${night.gov.total} called this year`,
            };

  const seatLeft = view.left >= view.need;

  return (
    <div className="panel p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="label-xs">{view.title}</p>
        <p className="num text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
          {(view.pct ?? night.pct).toFixed(0)}% counted
        </p>
      </div>

      <div className="mt-1.5 flex items-end justify-between gap-2">
        <div>
          <p className="num text-[30px] font-extrabold leading-none" style={{ color: view.leftColor }}>
            {view.left}
          </p>
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{view.leftLabel}</p>
        </div>
        <p className="num text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
          {view.need ? `${view.need} to win` : 'called'}
        </p>
        <div className="text-right">
          <p className="num text-[30px] font-extrabold leading-none" style={{ color: view.rightColor }}>
            {view.right}
          </p>
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{view.rightLabel}</p>
        </div>
      </div>

      {kind === 'pres' ? (
        <EvBar
          evBy={night.evBy}
          you={game.party}
          them={them.party}
          accent={accent}
          oppAccent={oppAccent}
          className="mt-2 h-3.5"
        />
      ) : (
        <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full border border-white/15 bg-white/5">
          <div
            className="transition-all duration-500"
            style={{ width: `${(view.left / Math.max(1, view.left + view.right)) * 100}%`, backgroundColor: view.leftColor }}
          />
          <div className="flex-1 transition-all duration-500" style={{ backgroundColor: view.rightColor }} />
        </div>
      )}

      <LiveProjection kind={kind} forecast={forecast} you={you} them={them} playerParty={game.party} opponentParty={game.opponentParty} />

      <p className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[10.5px] font-bold text-slate-500">
        <span>{view.note}</span>
        {view.need && <span className={seatLeft ? 'text-emerald-400' : ''}>{seatLeft ? 'Called by the desk' : 'No call yet'}</span>}
      </p>
    </div>
  );
}
function LiveProjection({ kind, forecast, you, them, playerParty, opponentParty }) {
  if (!forecast) return null;
  if (kind === 'pres') {
    return (
      <div className="panel-lite mt-2 px-2.5 py-2" aria-label="Nick Bronze live election forecast">
        <div className="flex items-center justify-between gap-2">
          <p className="label-xs">Nick Bronze · live forecast</p>
          <span className="text-[9px] font-bold text-slate-600">reported votes + remaining-vote model</span>
        </div>
        <div className="mt-1 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[10px] font-extrabold">
          <span style={{ color: PARTY_COLOR[playerParty] }}>{you.short} {Math.round(forecast.youWin)}%</span>
          <span style={{ color: PARTY_COLOR[opponentParty] }}>{them.short} {Math.round(forecast.themWin)}%</span>
          {forecast.otherWin > 0 && <span className="text-slate-400">Other {Math.round(forecast.otherWin)}%</span>}
        </div>
      </div>
    );
  }

  const projection = kind === 'house' ? forecast.houseProjection : kind === 'senate' ? forecast.senateProjection : null;
  if (!projection) return null;
  const range = ([low, high]) => `${Math.round(low)}–${Math.round(high)}`;
  return (
    <div className="panel-lite mt-2 px-2.5 py-2" aria-label={`Nick Bronze live ${kind} control forecast`}>
      <div className="flex items-center justify-between gap-2">
        <p className="label-xs">Nick Bronze · live control forecast</p>
        <span className="text-[9px] font-bold text-slate-600">projections, not calls</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[9.5px] font-extrabold">
        <span style={{ color: PARTY_COLOR.dem }}>D control {Math.round(projection.demControl)}%</span>
        <span style={{ color: PARTY_COLOR.rep }}>R control {Math.round(projection.repControl)}%</span>
        <span className="text-slate-400">No majority {Math.round(projection.noMajority)}%</span>
      </div>
      <div className="mt-1 flex justify-between gap-2 text-[9px] font-bold text-slate-500">
        <span>D median {Math.round(projection.demMedian)} · 80% range {range(projection.demRange)}</span>
        <span>R median {Math.round(projection.repMedian)} · 80% range {range(projection.repRange)}</span>
      </div>
    </div>
  );
}
