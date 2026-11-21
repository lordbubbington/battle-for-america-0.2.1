import React, { useState } from 'react';
import { CalendarDays, Target, Swords } from 'lucide-react';
import { upcomingMilestones } from '@/lib/campaignOperations';
import { weekLabel } from '@/lib/gameEngine';
import { earlyBallotAvailable } from '@/lib/build37Ballots';
import RivalLog from '@/components/game/RivalLog';

const TABS = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'rivals', label: 'Opponent moves', icon: Swords },
];

export default function CampaignCalendar({ game, accent, onFocusState }) {
  const [tab, setTab] = useState('calendar');
  const milestones = upcomingMilestones(game, 5);
  const reports = (game.incidentLedger || []).filter((entry) => entry.week === game.week && ['election-update', 'campaign-briefing', 'policy-review', 'finance-report', 'hearing-request', 'running-mate-report', 'civic-forum-report', 'faction-schedule'].includes(entry.sourceType));
  const earlyVotes = (game.earlyBallotLedger?.batches || []).reduce((total, batch) => total + batch.ballotCount, 0);

  return (
    <section className="panel p-3 sm:p-4" id="campaign-office" tabIndex={-1} data-testid="campaign-office">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="label-xs">Campaign office</p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Campaign deadlines, early voting, and rival activity.</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${tab === id ? 'border-primary/60 bg-primary/15 text-primary' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'calendar' && (
        <div className="panel-lite mt-2 p-2.5 text-[11px] text-slate-300">
          <p className="font-bold text-white">Modeled early voting</p>
          {earlyBallotAvailable(game) ? (
            <>
              <p>Presidential ballots are recorded at the close of the two weeks before the final week. Already-cast votes are locked.</p>
              {game.electoralRule !== 'proportional' && <p>Maine and Nebraska need district-level ballot data for this feature.</p>}
              <p className="num mt-1">{Math.round(earlyVotes).toLocaleString()} presidential ballots cast so far</p>
            </>
          ) : <p>Early voting is unavailable under the district electoral rule because district ballot assignments are missing.</p>}
        </div>
      )}

      {tab === 'calendar' && reports.length > 0 && (
        <div className="panel-lite mt-2 p-2.5 text-[11px] text-slate-300">
          <p className="font-bold text-white">This week’s reports</p>
          <ul className="mt-1 space-y-1">{reports.map(({ id, recap }) => <li key={id}>{recap}</li>)}</ul>
        </div>
      )}
      {tab === 'calendar' && (
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {milestones.map((item) => (
            <article key={item.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-extrabold uppercase tracking-wide text-primary">{item.kind}</span>
                <span className="num text-[9px] font-bold text-slate-500">{weekLabel(game, item.week)}, 2028</span>
              </div>
              <p className="mt-1 font-heading text-[13px] leading-tight text-white">{item.title}</p>
              <p className="mt-1 text-[10px] font-semibold leading-snug text-slate-400">{item.detail} {item.tactic}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {item.states.map((abbr) => (
                  <button key={abbr} type="button" onClick={() => onFocusState(abbr)} className="chip px-1.5 py-0.5 text-[9px]" style={{ borderColor: `${accent}66`, color: '#FFDA8A' }}>
                    <Target className="mr-1 inline h-2.5 w-2.5" /> Focus {abbr}
                  </button>
                ))}
              </div>
            </article>
          ))}
          {!milestones.length && <p className="text-[11px] font-semibold text-slate-500">All campaign milestones have passed. Focus on turnout and the remaining close states.</p>}
        </div>
      )}

      {tab === 'rivals' && (
        <div className="mt-3">
          <RivalLog game={game} />
          {!game.oppRival && !(game.rivals || []).length && (
            <p className="text-[11px] font-semibold text-slate-500">Opponent plans appear after the first week advances.</p>
          )}
        </div>
      )}
    </section>
  );
}
