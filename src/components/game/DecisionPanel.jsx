import React from 'react';
import { PARTY_COLOR } from '@/lib/downballot';
import { EV_TO_WIN } from '@/data/states';
import { REGIONAL_PARTY_IDS, SCENARIO_PARTIES } from '@/data/build39Scenarios';

const ORDER = ['dem', 'rep', 'lib', 'grn', 'ind', ...REGIONAL_PARTY_IDS];
const SHORT = {
  dem: 'Dem',
  rep: 'GOP',
  lib: 'Lib',
  grn: 'Grn',
  ind: 'Ind',
  ...Object.fromEntries(REGIONAL_PARTY_IDS.map((id) => [id, SCENARIO_PARTIES[id]?.short || id.toUpperCase()])),
};

const MODE_LABEL = {
  electoral: 'Electoral College',
  'regional-pool': 'Regional Elector Pool',
  popular: 'National popular vote',
  coalition: 'Electoral coalition',
  contingent: `No ${EV_TO_WIN} — House delegations`,
};

export default function DecisionPanel({ decision, game, you, them }) {
  const { popular, delegations, regionalPool } = decision;
  const nameOf = (party) =>
    !party ? 'No candidate' : party === game.party ? you.short : party === them.party ? them.short : SCENARIO_PARTIES[party]?.label || SHORT[party] || party;
  const barParties = ORDER.filter((p) => (popular[p] || 0) >= 0.3);

  return (
    <div className="panel mt-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-[15px] text-white">How this was decided</h2>
        <span className="chip chip-gold">{MODE_LABEL[decision.mode] || 'Electoral College'}</span>
      </div>

      <div className="mt-2 space-y-1">
        {barParties.map((p) => (
          <div key={p} className="flex items-center gap-2">
            <span
              className="w-[34px] shrink-0 text-[10px] font-extrabold uppercase tracking-wide"
              style={{ color: PARTY_COLOR[p] }}
            >
              {SHORT[p] || p}
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
          : decision.mode === 'regional-pool' && regionalPool
            ? regionalPool.explanation
            : decision.mode === 'coalition'
              ? `${you.short} joined electors with ${nameOf(decision.partner)} for ${decision.allianceEV} total electoral votes, passing ${EV_TO_WIN}.`
              : decision.mode === 'contingent' && !decision.winner
                ? 'The leading state-delegation counts are tied. House seat totals do not decide this result.'
                : `${nameOf(popular.leader)} led the national popular vote by ${popular.margin.toFixed(1)} — which is not what elects a president.`}
      </p>

      {regionalPool && (
        <div className="panel-lite mt-2 p-2.5">
          <p className="label-xs">
            Regional elector consolidation · {regionalPool.combinedEV} combined EVs (original state tallies preserved on map)
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2 text-[10.5px] font-bold text-slate-300">
            {regionalPool.participants.map(({ party, ev }) => (
              <span key={party} className="inline-flex items-center gap-1 rounded border border-white/10 bg-black/20 px-2 py-0.5">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: PARTY_COLOR[party] }} />
                <span>{SCENARIO_PARTIES[party]?.label || party}: {ev} EV</span>
              </span>
            ))}
          </div>
          <p className="mt-1 text-[10.5px] font-extrabold text-amber-300">
            Final pooled tally: {nameOf(regionalPool.winner)} — {regionalPool.combinedEV} EV
          </p>
        </div>
      )}

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
                style={{
                  width: `${(delegations.counts.split / delegations.total) * 100}%`,
                  backgroundColor: '#64748B',
                }}
              />
            )}
          </div>
          <div className="mt-1 flex flex-wrap justify-between gap-2 text-[10.5px] font-extrabold text-slate-400">
            {ORDER.filter((p) => delegations.counts[p] > 0).map((p) => (
              <span key={p} style={{ color: PARTY_COLOR[p] }}>
                {SHORT[p]} {delegations.counts[p]}
              </span>
            ))}
            {delegations.counts.split > 0 && <span>Split {delegations.counts.split}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
