import React, { useMemo, useState } from 'react';
import { ISSUES_BY_WEIGHT, stateIssueAlignment, stanceLabel } from '@/data/platform';
import { STATE_BY_ABBR } from '@/data/states';
import { promiseOutlook, actionsLeftIn } from '@/lib/gameEngine';
import { X, FileText } from 'lucide-react';
import SpotArt from '@/components/ui/spot-art';

const TIER = {
  hit: { label: 'The room is with you', color: '#6EE7B7' },
  ok: { label: 'Polite applause', color: '#F7C145' },
  miss: { label: 'This is not their issue', color: '#FDA4AF' },
};

export default function PromisePanel({ game, abbr, onPromise, onClose, accent, initialIssueId }) {
  const state = STATE_BY_ABBR[abbr];
  const [issueId, setIssueId] = useState(initialIssueId || ISSUES_BY_WEIGHT[0].id);
  const outlook = promiseOutlook(game, abbr, issueId);
  const canAct = actionsLeftIn(game) > 0;

  const sorted = useMemo(
    () =>
      ISSUES_BY_WEIGHT.map((issue) => ({
        ...issue,
        fit: stateIssueAlignment(abbr, issue.id, game.stances?.[issue.id] ?? 1),
      })).sort((a, b) => b.weight * b.fit - a.weight * a.fit),
    [abbr, game.stances]
  );

  return (
    <div id="staff-focus-promise" tabIndex={-1} className="panel panel-gold animate-pop-in p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="label-xs">On the stage in {state.name}</p>
          <h3 className="font-heading text-lg text-white">Make a promise</h3>
        </div>
        <button type="button" onClick={onClose} className="btn-ghost rounded-lg p-1.5">
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-1 text-[11.5px] font-semibold leading-snug text-slate-400">
        You will be graded on how well your stance agrees with this state — the more important the issue, the bigger the
        swing either way.
      </p>

      <div className="mt-3 grid max-h-[240px] grid-cols-1 gap-1.5 overflow-y-auto pr-1">
        {sorted.map((issue) => {
          const active = issueId === issue.id;
          return (
            <button
              key={issue.id}
              type="button"
              onClick={() => setIssueId(issue.id)}
              className="panel-lite flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-white/10"
              style={active ? { borderColor: accent, backgroundColor: `${accent}26` } : undefined}
            >
              <SpotArt symbol={issue.icon} className="h-5 w-5" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-extrabold text-white">{issue.label}</span>
                <span className="block truncate text-[9.5px] font-bold text-slate-400">
                  You: {stanceLabel(issue, game.stances?.[issue.id] ?? 1)}
                </span>
              </span>
              <span
                className="num shrink-0 text-[11px] font-extrabold"
                style={{ color: issue.fit >= 0.7 ? '#6EE7B7' : issue.fit >= 0.55 ? '#F7C145' : '#FDA4AF' }}
              >
                {Math.round(issue.fit * 100)}%
              </span>
            </button>
          );
        })}
      </div>

      <div className="panel-sunken mt-3 space-y-1 p-2.5 text-[11.5px] font-semibold text-slate-300">
        <div className="flex items-center justify-between">
          <span>Your line</span>
          <span className="max-w-[60%] text-right text-[11px] font-extrabold text-white">{outlook?.stanceLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>State agreement</span>
          <span className="num font-extrabold text-slate-200">{Math.round((outlook?.fit || 0) * 100)}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span>If it lands</span>
          <span className="num font-extrabold" style={{ color: TIER[outlook?.tier || 'miss'].color }}>
            {outlook?.swing > 0 ? '+' : ''}
            {outlook?.swing} in {state.abbr}
          </span>
        </div>
        <p className="pt-1 text-[10px] font-semibold" style={{ color: TIER[outlook?.tier || 'miss'].color }}>
          {TIER[outlook?.tier || 'miss'].label}
        </p>
      </div>

      <button
        type="button"
        disabled={!canAct}
        onClick={() => onPromise(issueId)}
        className="btn-gold mt-3 w-full py-2.5 text-[14px]"
      >
        <FileText className="mr-1.5 inline h-4 w-4" />
        {canAct ? 'Make the promise · 1 action' : 'No actions left'}
      </button>
    </div>
  );
}
