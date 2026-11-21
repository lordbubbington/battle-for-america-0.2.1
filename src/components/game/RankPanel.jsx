import React from 'react';
import { Trophy } from 'lucide-react';
import { rankFor, SCORING_SHUFFLE_LIMIT } from '@/lib/rankings';

function signed(v) {
  return `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v)}`;
}

export default function RankPanel({ data, accent }) {
  if (!data) return null;
  if (data.unscored) {
    return (
      <div className="panel mt-4 p-4" data-testid="rank-panel">
        <div className="flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-slate-500" />
          <h2 className="font-heading text-[15px] text-white">Not scored</h2>
        </div>
        <p className="mt-1.5 text-[12px] font-semibold leading-snug text-slate-400">
          {data.randomness}% shuffle is past the {SCORING_SHUFFLE_LIMIT}% limit, so this campaign is not filed in the
          career table. Nothing about the run changes — it just does not count.
        </p>
      </div>
    );
  }
  const { entry, runs, position } = data;
  const rank = rankFor(entry.score);
  const best = runs[0];

  return (
    <div className="panel mt-4 p-4" data-testid="rank-panel">
      <div className="flex items-center gap-1.5">
        <Trophy className="h-4 w-4" style={{ color: rank.color }} />
        <h2 className="font-heading text-[15px] text-white">Career ranking</h2>
        <span className="label-xs ml-auto">{runs.length} campaign{runs.length === 1 ? '' : 's'} filed</span>
      </div>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-heading text-2xl leading-none" style={{ color: rank.color }}>
            {rank.name}
          </p>
          <p className="mt-1 max-w-md text-[12px] font-semibold leading-snug text-slate-400">{rank.blurb}</p>
        </div>
        <div className="text-right">
          <p className="label-xs">Campaign score</p>
          <p className="num text-3xl font-extrabold leading-none" style={{ color: accent }}>
            {entry.score}
          </p>
          <p className="mt-0.5 text-[10.5px] font-extrabold uppercase tracking-wide text-slate-500">
            No. {position} of {runs.length}
          </p>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
        <div className="grid grid-cols-[26px_1fr_56px_48px_58px] items-center gap-1 bg-white/5 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
          <span>#</span>
          <span>Campaign</span>
          <span className="text-right">EV</span>
          <span className="text-right">Sen.</span>
          <span className="text-right">Score</span>
        </div>
        {runs.map((run, i) => (
          <div
            key={run.id}
            className="grid grid-cols-[26px_1fr_56px_48px_58px] items-center gap-1 px-2 py-1.5 text-[11px] font-bold"
            style={
              run.current
                ? { backgroundColor: `${accent}1f`, boxShadow: `inset 2px 0 0 ${accent}` }
                : undefined
            }
          >
            <span className="num text-slate-500">{i + 1}</span>
            <span className="min-w-0 truncate text-white">
              {run.name}
              <span className="ml-1 text-[9.5px] font-extrabold uppercase tracking-wide text-slate-500">
                {run.difficultyLabel}
                {run.current ? ' · this run' : ''}
              </span>
            </span>
            <span className="num text-right text-slate-300">{run.ev}</span>
            <span
              className="num text-right"
              style={{ color: run.senateNet > 0 ? '#6EE7B7' : run.senateNet < 0 ? '#FDA4AF' : '#A8B6D0' }}
            >
              {signed(run.senateNet)}
            </span>
            <span className="num text-right text-white">{run.score}</span>
          </div>
        ))}
      </div>

      {best && best.score > entry.score ? (
        <p className="mt-2 text-[10.5px] font-semibold text-slate-500">
          Your best is still {best.name} on {best.difficultyLabel} at {best.score} — {entry.score >= 0 ? best.score - entry.score : best.score + Math.abs(entry.score)} points clear.
        </p>
      ) : (
        <p className="mt-2 text-[10.5px] font-semibold text-slate-500">
          That is the best campaign on this account. Run it back, or take it up a difficulty.
        </p>
      )}
    </div>
  );
}