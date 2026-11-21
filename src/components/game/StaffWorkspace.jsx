import React, { useMemo } from 'react';
import StaffPanel from '@/components/game/StaffPanel';
import StaffPortrait from '@/components/game/StaffPortrait';
import { build35StaffBriefing, build35AgendaAlternatives, LIVE_NONTRADITIONAL_EFFECTS } from '@/lib/build35Staff';
import { buildStaffOperationalWarnings } from '@/lib/traditionalStaffNativeAdapter';
import { ACTIONS_PER_WEEK } from '@/lib/gameEngine';

export default function StaffWorkspace({ game, paused, onSetAgenda, onOpenAction }) {
  const briefing = useMemo(() => build35StaffBriefing(game), [game]);
  const agenda = game.staffing.agendaByWeek?.[game.week];
  const alternatives = build35AgendaAlternatives(game, briefing);
  return (
    <div className="space-y-3">
      <StaffPanel game={game} briefing={briefing} agenda={agenda} Portrait={StaffPortrait}
        agendaLocked={paused || agenda?.status === 'consumed' || game.actionsLeft < ACTIONS_PER_WEEK}
        debrief={game.staffing.briefingHistory.at(-1)} operationalWarnings={buildStaffOperationalWarnings(game)}
        policyWarnings={null} liveNonTraditionalIds={[...LIVE_NONTRADITIONAL_EFFECTS]}
        onSetAgenda={(recommendation) => onSetAgenda(recommendation.id)}
        onOpenAction={paused ? undefined : onOpenAction} />
      {alternatives.length > 0 && !paused && (
        <label className="panel flex flex-wrap items-center justify-between gap-2 p-2.5 text-xs text-slate-300">
          <span className="flex items-center gap-2">
            <StaffPortrait portraitId="astrology-consultant" alt="Astrology Consultant" size="compact" />
            Move this agenda to another eligible state
          </span>
          <select className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-white" value=""
            onChange={(event) => onSetAgenda(event.target.value)}>
            <option value="">Choose a state</option>
            {alternatives.map((option) => <option key={option.id} value={option.id}>{option.targetName}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}
