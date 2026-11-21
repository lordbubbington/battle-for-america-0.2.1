import React from 'react';

// Every party that is not yours campaigns every week: the one you are running
// against first, then the other two. Seven actions each, and none of them happen
// off the record.
export default function RivalLog({ game }) {
  const entries = [game.oppRival, ...(game.rivals || [])].filter(Boolean);
  if (!entries.length) return null;

  return (
    <div className="panel-lite space-y-2 px-3 py-2">
      <p className="label-xs">Every other campaign · seven actions each</p>
      {entries.map((r) => (
        <div key={r.party}>
          <p
            className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em]"
            style={{ color: r.color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: r.color }} />
            {r.short}
            <span className="font-bold tracking-normal text-slate-500">
              · {r.main ? 'your rival · ' : ''}
              {r.moves.length} actions
            </span>
          </p>
          {r.strategy && (
            <p className="mt-0.5 text-[10.5px] font-semibold leading-snug text-slate-300">
              <span className="font-extrabold text-white">Plan: {r.strategy.label}.</span>{' '}
              {r.strategy.reason}
            </p>
          )}
          <ul className="mt-0.5 space-y-0.5">
            {r.moves.map((m, i) => (
              <li key={i} className="flex items-start gap-1 text-[11px] font-semibold leading-snug text-slate-400">
                <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-white/30" />
                <span>{m.text || m.name || m.type}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
