import React from 'react';
import { coalitionRows, coalitionSummary } from '@/lib/coalition';

const TAG_COLOR = {
  Strong: '#6EE7B7',
  Pivotal: '#F7C145',
  Leaning: '#9DB8FF',
  Vulnerable: '#FCA5A5',
  Hostile: '#FF8A7A',
};

// What the nominee walks in with, before a dollar is spent: the groups already
// with you, the ones you cannot win, and the ones that will decide it.
export default function CoalitionPreview({ party, candidateId }) {
  const rows = coalitionRows({ party, candidateId });
  const summary = coalitionSummary(rows);
  const sorted = rows.slice().sort((a, b) => b.support - a.support);
  const columns = [
    { title: 'Where you start strong', list: sorted.slice(0, 3) },
    { title: 'What you have to fix', list: sorted.slice(-3).reverse() },
  ];

  return (
    <div className="mt-3 rounded-xl border border-dashed border-white/20 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="label-xs">The coalition you inherit</p>
        <span className="chip">
          {summary.withYou} of {summary.total} groups
        </span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {columns.map((col) => (
          <div key={col.title}>
            <p className="mb-1 text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-slate-500">{col.title}</p>
            <div className="space-y-1">
              {col.list.map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-1.5">
                  <span className="flex min-w-0 items-center gap-1 text-[11px] font-bold text-slate-300">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ backgroundColor: g.color }} />
                    <span className="truncate">{g.short}</span>
                    <span
                      className="shrink-0 text-[8px] font-extrabold uppercase tracking-[0.08em]"
                      style={{ color: TAG_COLOR[g.tag] }}
                    >
                      {g.tag}
                    </span>
                  </span>
                  <span className="num text-[11px] font-extrabold text-white">{Math.round(g.support)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] font-semibold leading-snug text-slate-500">
        Every promise and position lands differently in each group, and a group's swing is worth its share of a state.
        The nominee's own ideology already decides part of this.
      </p>
    </div>
  );
}