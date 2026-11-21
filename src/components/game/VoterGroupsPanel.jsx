import React from 'react';
import { coalitionRows, coalitionSummary } from '@/lib/coalition';
import CoalitionGroupList from '@/components/game/CoalitionGroupList';

// Which voters you are holding, and which ones are slipping.
export default function VoterGroupsPanel({ game, accent }) {
  const rows = coalitionRows(game);
  const summary = coalitionSummary(rows);

  return (
    <div className="panel p-3" data-testid="voter-groups">
      <div className="flex items-center justify-between gap-2">
        <p className="label-xs">Voter groups</p>
        <span className="chip num" style={{ color: accent, borderColor: `${accent}66` }}>
          {summary.withYou} of {summary.total} with you
        </span>
      </div>
      <p className="mt-1 text-[10px] font-semibold leading-snug text-slate-500">Groups overlap: the same modeled voter can belong to several profiles. Their estimates describe coalitions and are never added as separate voters.</p>
      <CoalitionGroupList rows={rows} shift={game.lastShift || null} />
    </div>
  );
}
