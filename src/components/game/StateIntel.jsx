import React from 'react';
import { BASE_LEANS, STATE_BY_ABBR } from '@/data/states';
import { pollMargin, policyMargin, ratingLabel } from '@/lib/gameEngine';
import StateVoters from '@/components/game/StateVoters';
import StatePolicies from '@/components/game/StatePolicies';
import { libertarianShare, greenShare } from '@/data/fourParty';

const signed = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;

// The drawer behind the map: every number that goes into a state's polling
// margin, plus who lives there and what they actually want.
export default function StateIntel({ game, abbr, showExact }) {
  const state = STATE_BY_ABBR[abbr];
  const lean = game.leans?.[abbr] ?? BASE_LEANS[abbr] ?? 0;
  const policy = policyMargin(abbr, game);
  const shift = game.stateMods?.[abbr] || 0;
  const track = game.track || 0;
  const noise = game.noise?.[abbr] || 0;
  const poll = pollMargin(abbr, game);
  const thirdBoost = game.thirdVariance?.[abbr] ?? 1;

  const stack = [
    { label: 'Base lean', value: lean },
    { label: 'Policy fit', value: policy },
    { label: 'Campaign & events', value: shift },
    { label: 'National trend', value: track },
    { label: 'Sampling noise', value: noise },
  ];

  return (
    <div className="panel-sunken mt-2 space-y-1.5 p-3 text-[11px]">
      <p className="label-xs">
        Behind the numbers · {state?.name} · {state?.region} · {state?.ev} EV
      </p>

      <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
        {stack.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-slate-500">{row.label}</span>
            <span className="num font-extrabold text-slate-200">{signed(row.value)}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-white/10 pt-1.5">
        <span className="font-semibold text-slate-500">Polling margin, D−R</span>
        <span className="num text-[12px] font-extrabold text-white">
          {signed(poll)} · {ratingLabel(poll, showExact)}
        </span>
      </div>

      <p className="text-[10px] font-semibold leading-snug text-slate-500">
        {game.thirdMode === 'surge'
          ? `Four-party ballot here: Libertarians ${libertarianShare(abbr)}%, Greens ${greenShare(abbr)}% — fixed by the scenario, not rolled.`
          : `Third parties run at ${thirdBoost.toFixed(1)}× their national baseline here.`}{' '}
        Nobody knows how wrong the polls are until the votes are counted — and there is no way to find out early.
      </p>

      <StateVoters abbr={abbr} />
      <StatePolicies game={game} abbr={abbr} />
    </div>
  );
}