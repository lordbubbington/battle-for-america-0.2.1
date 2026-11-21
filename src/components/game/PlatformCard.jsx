import React from 'react';
import {
  BLOC_BY_ID,
  ISSUES_BY_WEIGHT,
  nationalIssueAlignment,
  stanceLabel,
  stateBlocs,
  stateIssueAlignment,
} from '@/data/platform';
import SpotArt from '@/components/ui/spot-art';

export default function PlatformCard({ game, abbr, accent }) {
  const issues = ISSUES_BY_WEIGHT.slice(0, 6);
  const blocs = abbr
    ? Object.entries(stateBlocs(abbr))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, share]) => `${BLOC_BY_ID[id]?.label ?? id} ${Math.round(share)}%`)
        .join(' · ')
    : null;

  return (
    <div className="panel p-3" data-testid="platform-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-heading text-[15px] text-white">Your platform</h3>
        <span className="label-xs">{abbr ? `Agreement in ${abbr}` : 'National agreement'}</span>
      </div>
      <div className="space-y-1.5">
        {issues.map((issue) => {
          const stance = game.stances?.[issue.id] ?? 1;
          const fit = abbr
            ? stateIssueAlignment(abbr, issue.id, stance)
            : nationalIssueAlignment(issue.id, stance);
          const edge = game.issueEdge?.[issue.id] || 0;
          return (
            <div key={issue.id}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 truncate text-[11.5px] font-extrabold text-white">
                  <SpotArt symbol={issue.icon} className="mr-1 inline-flex h-4 w-4 align-middle" />
                  {issue.label}
                </p>
                <span
                  className="num shrink-0 text-[10.5px] font-extrabold"
                  style={{ color: fit >= 0.7 ? '#6EE7B7' : fit >= 0.55 ? '#F7C145' : '#FDA4AF' }}
                >
                  {Math.round(fit * 100)}%
                  {edge !== 0 && (
                    <span style={{ color: edge > 0 ? '#6EE7B7' : '#FDA4AF' }}> {edge > 0 ? '▲' : '▼'}</span>
                  )}
                </span>
              </div>
              <p className="truncate text-[10px] font-semibold text-slate-500">{stanceLabel(issue, stance)}</p>
              <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.round(fit * 100)}%`, backgroundColor: accent }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {blocs && (
        <p className="mt-1.5 text-[10px] font-semibold leading-snug text-slate-500">Who lives here: {blocs}</p>
      )}
      <p className="mt-2 text-[10px] font-semibold leading-snug text-slate-500">
        Weighted by how much voters care: {ISSUES_BY_WEIGHT.slice(0, 3).map((i) => i.label.toLowerCase()).join(', ')} count
        for more than the rest. Change a position in your action list.
      </p>
    </div>
  );
}
