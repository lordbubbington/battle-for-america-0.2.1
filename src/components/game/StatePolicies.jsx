import React from 'react';
import { ISSUES_BY_WEIGHT, stateBlocs, stateIssueAlignment, stanceLabel } from '@/data/platform';
import SpotArt from '@/components/ui/spot-art';

function medianStance(issue, blocs) {
  let sum = 0;
  Object.entries(blocs).forEach(([id, share]) => {
    sum += share * (issue.blocPref[id] ?? 1);
  });
  return Math.max(0, Math.min(2, Math.round(sum / 100)));
}

function fitColor(fit) {
  if (fit >= 0.62) return '#6EE7B7';
  if (fit >= 0.48) return '#F7C145';
  return '#FDA4AF';
}

// The state's median answer on the eight issues that decide the most votes, and
// how well your own stance lines up with the voters who live there.
export default function StatePolicies({ game, abbr }) {
  const blocs = stateBlocs(abbr);

  return (
    <div className="border-t border-white/10 pt-1.5">
      <p className="label-xs mb-1">Median position on the big issues</p>
      <div className="space-y-1">
        {ISSUES_BY_WEIGHT.slice(0, 8).map((issue) => {
          const median = medianStance(issue, blocs);
          const yourStance = game.stances?.[issue.id] ?? 1;
          const fit = stateIssueAlignment(abbr, issue.id, yourStance);
          return (
            <div key={issue.id} className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-[10px] font-bold text-slate-500">
                <span className="inline-flex items-center gap-1"><SpotArt symbol={issue.icon} className="h-3.5 w-3.5" />{issue.label}</span>
              </span>
              <span className="min-w-0 flex-1 truncate text-right text-[10px] font-bold text-slate-300">
                {stanceLabel(issue, median)}
              </span>
              <span
                className="num w-9 shrink-0 text-right text-[10px] font-extrabold"
                style={{ color: fitColor(fit) }}
                title={`Your stance on ${issue.label.toLowerCase()} fits ${(fit * 100).toFixed(0)}% of this state`}
              >
                {(fit * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-[10px] font-semibold leading-snug text-slate-500">
        Right column is how well your own position on that issue lands with this state's voters.
      </p>
    </div>
  );
}
