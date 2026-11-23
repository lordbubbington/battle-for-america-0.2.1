import React from 'react';
import { nationalPoll } from '@/lib/gameEngine';
import { POLL_PARTIES, nationalShares } from '@/lib/polling';
import { nationalNewsCard } from '@/lib/nationalNews';
import SpotArt from '@/components/ui/spot-art';

const signed = (v) => `${v >= 0 ? 'D' : 'R'}+${Math.abs(v).toFixed(1)}`;
const colorOf = (v) => (v >= 0 ? '#6C9BFF' : '#FF8A7A');

// The environment tracker: without a state picked it is the country's mood.
// With one picked it becomes that state's generic ballot — the House number,
// which is not the top of the ticket and does not move with it.
export default function NationalEnvironment({ game, snap, showExact, row = null, stateName = null }) {
  const env = nationalPoll(game);
  const shares = nationalShares(snap.rows || []);
  const generic = row ? row.generic || 0 : game.natGeneric || 0;
  const value = row ? generic : env;
  const capped = Math.max(-12, Math.min(12, value));
  const marker = ((capped + 12) / 24) * 100;
  const demAhead = value >= 0;
  const color = colorOf(value);
  // Whatever the country was told this week, and any story still paying out.
  const news = nationalNewsCard(game);
  const arc = game.arc || null;
  const gap = row ? generic - (row.margin || 0) : 0;

  return (
    <div className="panel p-3" data-testid="environment-tracker">
      <div className="flex items-baseline justify-between gap-2">
        <p className="label-xs truncate">
          {row ? `${stateName} · House ballot` : 'National environment'}
        </p>
        <p className="shrink-0 text-[9.5px] font-extrabold uppercase tracking-wide text-slate-500">
          {game.weighted ? 'weighted map' : 'base map'}
        </p>
      </div>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0">
        <span className="num text-[26px] font-extrabold leading-none" style={{ color }}>
          {signed(value)}
        </span>
        <span className="text-[11px] font-bold text-slate-400">
          {row
            ? `House ballot in ${stateName}`
            : demAhead
              ? 'Democrats ahead nationwide'
              : 'Republicans ahead nationwide'}
        </span>
      </div>

      <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full border border-white/15">
        <div className="absolute inset-y-0 left-0 w-1/2" style={{ backgroundImage: 'linear-gradient(90deg,#E8433C66,#E8433C1F)' }} />
        <div className="absolute inset-y-0 right-0 w-1/2" style={{ backgroundImage: 'linear-gradient(90deg,#4C7BFF1F,#4C7BFF66)' }} />
        <div className="absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 bg-white/60" />
        <div
          className="absolute -top-[3px] h-[16px] w-[3px] rounded-full"
          style={{ left: `calc(${marker}% - 1.5px)`, backgroundColor: color }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[9px] font-extrabold uppercase tracking-wide text-slate-600">
        <span>R+12</span>
        <span>even</span>
        <span>D+12</span>
      </div>

      {row ? (
        <>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-white/10 pt-2">
            <span className="flex items-baseline gap-1">
              <span className="label-xs">Top of ticket</span>
              <span className="num text-[12px] font-extrabold" style={{ color: colorOf(row.margin) }}>
                {signed(row.margin)}
              </span>
            </span>
            <span className="flex items-baseline gap-1">
              <span className="label-xs">House ballot</span>
              <span className="num text-[12px] font-extrabold" style={{ color }}>
                {signed(generic)}
              </span>
            </span>
            <span className="flex items-baseline gap-1">
              <span className="label-xs">{gap >= 0 ? 'Ahead by' : 'Behind by'}</span>
              <span className="num text-[12px] font-extrabold text-slate-200">{Math.abs(gap).toFixed(1)}</span>
            </span>
          </div>
          <p className="mt-1.5 text-[10px] font-semibold leading-snug text-slate-500">
            This is {stateName}&apos;s generic congressional ballot — what its House races are polling at, not the
            presidential margin — and its own environment can move independently of the top of the ticket.
          </p>
        </>
      ) : (
        <>
          <div className="mt-2 border-t border-white/10 pt-2">
            <p className="label-xs mb-1">National vote</p>
            <div className="flex h-2 w-full overflow-hidden rounded-full border border-white/15">
              {POLL_PARTIES.map((p) => (
                <div
                  key={p.id}
                  style={{ width: `${shares[p.id] || 0}%`, backgroundColor: p.color }}
                  title={`${p.label} ${(shares[p.id] || 0).toFixed(1)}%`}
                />
              ))}
            </div>
            <div className="mt-1 grid grid-cols-2 gap-x-3">
              {POLL_PARTIES.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ backgroundColor: p.color }} />
                    {p.label}
                  </span>
                  <span className="num text-[11px] font-extrabold" style={{ color: p.color }}>
                    {(shares[p.id] || 0).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-white/10 pt-1.5">
            <span className="label-xs">House generic ballot</span>
            <span className="num text-[11.5px] font-extrabold" style={{ color: colorOf(game.houseGenericBallot ?? game.natGeneric ?? 0) }}>
              {signed(game.houseGenericBallot ?? game.natGeneric ?? 0)}
            </span>
          </div>
        </>
      )}

      {news && !row && (
        <div className="mt-2 rounded-xl border border-white/12 bg-black/25 px-2 py-1.5">
          <p className="label-xs mb-0.5">The national desk · week {game.week + 1}</p>
          <p className="font-heading text-[12px] leading-tight text-white">
            <span className="inline-flex items-center gap-1"><SpotArt symbol={news.icon} className="h-4 w-4" />{news.headline}</span>
          </p>
          {arc && (
            <p className="mt-1 num text-[10px] font-extrabold" style={{ color: arc.color }}>
              {arc.label} · {arc.perWeek >= 0 ? '+' : '−'}
              {Math.abs(arc.perWeek)} a week · {arc.weeksLeft} week{arc.weeksLeft === 1 ? '' : 's'} left
            </p>
          )}
        </div>
      )}

      <p className="mt-2 text-[10px] font-semibold leading-snug text-slate-500">
        {showExact
          ? 'Exact margins on — the polls are showing their real numbers, and they still miss on the night.'
          : 'Ratings only. The country shifts a little every week, and every state moves with it.'}
      </p>
    </div>
  );
}
