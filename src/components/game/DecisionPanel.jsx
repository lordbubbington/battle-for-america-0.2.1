import React from 'react';
import { PARTY_COLOR } from '@/lib/downballot';
import { EV_TO_WIN } from '@/data/states';

const ORDER = ['dem', 'rep', 'lib', 'grn', 'ind'];
const SHORT = { dem: 'Dem', rep: 'GOP', lib: 'Lib', grn: 'Grn', ind: 'Ind' };

const MODE_LABEL = {
  electoral: 'Electoral College',
  popular: 'National popular vote',
  coalition: 'Electoral coalition',
  contingent: `No ${EV_TO_WIN} — House delegations`,
};

// Two tallies that explain the result: the national popular vote, and — when the
// College failed to produce a winner — the state delegations that chose the
// president instead.
export default function DecisionPanel({ decision, game, you, them }) {
  const { popular, delegations } = decision;
  const nameOf = (party) =>
    !party ? 'No candidate' : party === game.party ? you.short : party === them.party ? them.short : SHORT[party] || party;
  const barParties = ORDER.filter((p) => (popular[p] || 0) >= 0.3);

  return (
    <div className="panel mt-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-[15px] text-white">How this was decided</h2>
        <span className="chip chip-gold">{MODE_LABEL[decision.mode]}</span>
      </div>

      <div className="mt-2 space-y-1">
        {barParties.map((p) => (
          <div key={p} className="flex items-center gap-2">
            <span
              className="w-[34px] shrink-0 text-[10px] font-extrabold uppercase tracking-wide"
              style={{ color: PARTY_COLOR[p] }}
            >
              {SHORT[p]}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, popular[p] * 2)}%`, backgroundColor: PARTY_COLOR[p] }}
              />
            </div>
            <span className="num w-12 shrink-0 text-right text-[10.5px] font-extrabold text-slate-300">
              {popular[p].toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      <p className="mt-1.5 text-[10.5px] font-semibold leading-snug text-slate-500">
        {decision.mode === 'popular'
          ? `${nameOf(decision.winner)} won the national popular vote by ${popular.margin.toFixed(1)} points, and with it the presidency.`
          : decision.mode === 'coalition'
            ? `${you.short} joined electors with ${nameOf(decision.partner)} for ${decision.allianceEV} total electoral votes, passing ${EV_TO_WIN}.`
            : decision.mode === 'contingent' && !decision.winner
              ? 'The leading state-delegation counts are tied. House seat totals do not decide this result.'
            : `${nameOf(popular.leader)} led the national popular vote by ${popular.margin.toFixed(1)} — which is not what elects a president.`}
      </p>

      {delegations && (
        <div className="panel-lite mt-2 p-2.5">
          <p className="label-xs">
            House delegations · one vote per state · {delegations.needed} to win
          </p>
          <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full border border-white/15">
            {ORDER.map((p) =>
              delegations.counts[p] > 0 ? (
                <div
                  key={p}
                  style={{
                    width: `${(delegations.counts[p] / delegations.total) * 100}%`,
                    backgroundColor: PARTY_COLOR[p],
                  }}
                />
              ) : null
            )}
            {delegations.counts.split > 0 && (
              <div
                className="bg-white/25"
                style={{ width: `${(delegations.counts.split / delegations.total) * 100}%` }}
              />
            )}
          </div>
          <p className="num mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-extrabold">
            {['dem', 'rep', 'lib', 'grn'].map((p) =>
              delegations.counts[p] > 0 ? (
                <span key={p} style={{ color: PARTY_COLOR[p] }}>
                  {SHORT[p]} {delegations.counts[p]}
                </span>
              ) : null
            )}
            {delegations.counts.split > 0 && (
              <span className="text-slate-400">{delegations.counts.split} split</span>
            )}
          </p>
          <p className="mt-1.5 text-[10.5px] font-semibold leading-snug text-slate-400">
            {decision.winner
              ? <>{nameOf(decision.winner)} controlled <span className="num font-extrabold text-white">{delegations.counts[decision.winner]} of {delegations.total}</span> state delegations{delegations.majority ? '' : ' — the largest bloc in a chamber nobody commanded'}, so the House handed {nameOf(decision.winner)} the presidency.</>
              : `The leading parties tied at ${delegations.leaderCount} delegations. House seat totals do not break the tie.`}
          </p>
        </div>
      )}
    </div>
  );
}
