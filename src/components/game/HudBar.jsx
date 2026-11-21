import React from 'react';
import {
  weekLabel,
  daysUntilElection,
  totalWeeksOf,
  EV_TO_WIN,
  DIFFICULTIES,
} from '@/lib/gameEngine';
import EvBar from '@/components/game/EvBar';
import { TOSSUP_COLOR } from '@/lib/marginColors';
import { Landmark } from 'lucide-react';
import SpotArt, { SpotGlyph } from '@/components/ui/spot-art';
import PredictionMeter from '@/components/game/PredictionMeter';

function Meter({ label, value, color }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-1">
        <span className="label-xs">{label}</span>
        <span className="num text-[13px] font-extrabold leading-none">{Math.round(value)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(3, Math.min(100, value))}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function HudBar({ game, snap, senate, house, gov, forecast, forecastStatus, vp, oppVp, you, them, accent, oppAccent, onOpenDownballot }) {
  // The tracker above the map is not the count. A state polling inside the tossup
  // band is held by neither party, so its electors sit unclaimed — and the bar
  // leaves them blank — until somebody breaks the race open.
  const trackerEV = {};
  let tossupEV = 0;
  const claim = (row, ev) => {
    if (row.tossup) {
      tossupEV += ev;
      return;
    }
    trackerEV[row.winner] = (trackerEV[row.winner] || 0) + ev;
  };
  (snap.rows || []).forEach((r) => claim(r, r.atLarge ?? r.ev));
  (snap.districts || []).forEach((d) => claim(d, d.ev));

  const evOf = (party) => trackerEV[party] || 0;
  const yourEV = evOf(game.party);
  const theirEV = evOf(them.party);
  const popShare = (party) => {
    const rows = snap.rows || [];
    const weight = rows.reduce((sum, r) => sum + (r.atLarge ?? r.ev), 0) || 1;
    return rows.reduce((sum, r) => sum + (r.shares?.[party] || 0) * (r.atLarge ?? r.ev), 0) / weight;
  };
  const yourPct = popShare(game.party);
  const theirPct = popShare(them.party);
  const weeks = totalWeeksOf(game);
  const days = daysUntilElection(game, game.week);
  const senateGain = game.party === 'dem' ? senate.net : -senate.net;
  const senateColor = senateGain > 0 ? '#6EE7B7' : senateGain < 0 ? '#FDA4AF' : '#A8B6D0';
  const chamberNet = (data) => (data?.[game.party] ?? 0) - (data?.start?.[game.party] ?? 0);
  const houseGain = chamberNet(house);
  const governorGain = chamberNet(gov);
  const houseColor = houseGain > 0 ? '#6EE7B7' : houseGain < 0 ? '#FDA4AF' : '#A8B6D0';
  const governorColor = governorGain > 0 ? '#6EE7B7' : governorGain < 0 ? '#FDA4AF' : '#A8B6D0';

  return (
    <div className="panel p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-lg">
            <SpotArt symbol={DIFFICULTIES[game.difficultyId]?.icon || 'power'} className="h-7 w-7" />
          </span>
          <div>
            <p className="num text-[15px] font-extrabold leading-none tracking-wide">
              WEEK {Math.min(game.week + 1, weeks)} / {weeks}
            </p>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <SpotGlyph symbol="week-calendar" className="h-3 w-3" />
              {weekLabel(game, game.week)}, 2028 · {days} days out
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-x-5 gap-y-2">
          <div className="min-w-[100px] flex-1 sm:flex-none">
            <Meter label="Your momentum" value={game.momentum} color={accent} />
          </div>
          <div className="min-w-[100px] flex-1 sm:flex-none">
            <Meter label={`${them.short} momentum`} value={game.oppMomentum} color={oppAccent} />
          </div>
          <div className="text-right">
            <p className="label-xs">War chest</p>
            <p className="num text-[17px] font-extrabold leading-none">${Math.round(game.funds)}M</p>
          </div>
        </div>
      </div>

      {/* The calendar, one notch per week: how much of the race is left. */}
      <div className="mt-2.5 flex gap-[3px]" aria-hidden>
        {Array.from({ length: weeks }).map((_, i) => (
          <span
            key={i}
            className="h-[3px] flex-1 rounded-full transition-colors duration-300"
            style={{
              backgroundColor:
                i < game.week ? 'rgba(255,255,255,0.34)' : i === game.week ? accent : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </div>

      <div className="panel-sunken mt-2.5 p-2.5">
        <div className="flex items-center justify-between gap-2 text-[12px] font-extrabold">
          <span style={{ color: accent }}>
            {you.short} <span className="num text-[15px]">{yourEV}</span>
          </span>
          <span className="label-xs">{game.popularVote ? 'popular vote' : `${EV_TO_WIN} to win`}</span>
          <span style={{ color: oppAccent }}>
            <span className="num text-[15px]">{theirEV}</span> {them.short}
          </span>
        </div>
        <EvBar
          evBy={trackerEV}
          you={game.party}
          them={them.party}
          accent={accent}
          oppAccent={oppAccent}
          tossup={tossupEV}
          className="mt-1.5 h-3.5"
        />
        <PredictionMeter forecast={forecast} status={forecastStatus} you={you} them={them} accent={accent} oppAccent={oppAccent} />

        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[10px] font-bold text-muted-foreground">
          <span className="num" style={{ color: accent }}>
            {yourPct.toFixed(1)}% {you.short}
          </span>
          <span className="flex flex-col items-center leading-none" style={{ color: TOSSUP_COLOR }}>
            <span className="num text-[15px] font-extrabold leading-none">{tossupEV}</span>
            <span className="mt-0.5 text-[12px] font-extrabold leading-none">Tossup</span>
          </span>
          <span className="num" style={{ color: oppAccent }}>
            {theirPct.toFixed(1)}% {them.short}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {vp && (
              <span className="chip" style={{ borderColor: `${accent}55` }}>
                VP · {vp.short}
              </span>
            )}
            {game.popularVote && <span className="chip chip-gold">Popular vote decides</span>}
            {!game.popularVote && snap.leaderEV < EV_TO_WIN && (
              <span className="chip chip-gold">No 270 · House decides</span>
            )}
            <span
              className="chip flex items-center gap-1"
              style={{ color: senateColor, borderColor: `${senateColor}55` }}
            >
              <Landmark className="h-2.5 w-2.5" /> Senate{' '}
              <span className="num">
                {senateGain > 0 ? '+' : senateGain < 0 ? '−' : ''}
                {Math.abs(senateGain)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onOpenDownballot?.('house')}
              className="chip flex items-center gap-1 hover:bg-white/10"
              style={{ color: houseColor, borderColor: `${houseColor}55` }}
              title="Open House projections"
            >
              <Landmark className="h-2.5 w-2.5" /> House <span className="num">{houseGain > 0 ? '+' : houseGain < 0 ? '−' : ''}{Math.abs(houseGain)}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenDownballot?.('gov')}
              className="chip flex items-center gap-1 hover:bg-white/10"
              style={{ color: governorColor, borderColor: `${governorColor}55` }}
              title="Open governor projections"
            >
              <Landmark className="h-2.5 w-2.5" /> Governors <span className="num">{governorGain > 0 ? '+' : governorGain < 0 ? '−' : ''}{Math.abs(governorGain)}</span>
            </button>
            {game.debate && !game.debate.done && <span className="chip chip-gold">Debate tonight</span>}
            {game.week === weeks - 1 && <span className="chip chip-gold">Final week</span>}
          </div>
          {oppVp && (
            <span className="chip" style={{ color: oppAccent, borderColor: `${oppAccent}55` }}>
              VP · {oppVp.short}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
