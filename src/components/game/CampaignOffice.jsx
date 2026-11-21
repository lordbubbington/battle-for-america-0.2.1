import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Handshake, Target, Swords } from 'lucide-react';
import {
  ENDORSEMENT_LEADERS,
  policyAlignment,
  upcomingMilestones,
} from '@/lib/campaignOperations';
import { weekLabel } from '@/lib/gameEngine';
import RivalLog from '@/components/game/RivalLog';
import { ENDORSER_ROSTER } from '@/data/endorserRoster';
import { ISSUE_BY_ID } from '@/data/platform';
import { endorserPolicyFit } from '@/lib/endorsementNetwork';

const TABS = [
  { id: 'network', label: 'Endorsements', icon: Handshake },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'rivals', label: 'Opponent moves', icon: Swords },
];

export default function CampaignOffice({ game, accent, onEndorsement, onFocusState, focusEndorserId }) {
  const [tab, setTab] = useState('network');
  const [endorserSearch, setEndorserSearch] = useState('');
  const [endorserScope, setEndorserScope] = useState('all');
  useEffect(() => {
    const group = ENDORSER_ROSTER.find((item) => item.id === focusEndorserId);
    if (!group) return;
    setTab('network');
    setEndorserScope('all');
    setEndorserSearch(group.name);
  }, [focusEndorserId]);
  const leaders = ENDORSEMENT_LEADERS.filter((leader) => leader.parties.includes(game.party));
  const unavailableEndorserPeople = useMemo(() => new Set([
    game.candidateId,
    game.opponentId,
    game.runningMateId,
    ...Object.values(game.oppMates || {}).map((mate) => mate?.mateId),
  ].filter(Boolean)), [game.candidateId, game.opponentId, game.runningMateId, game.oppMates]);
  const directory = useMemo(() => {
    const query = endorserSearch.trim().toLowerCase();
    return ENDORSER_ROSTER.filter((group) => group.party === game.party &&
      (group.type !== 'candidate' || ('personId' in group && !unavailableEndorserPeople.has(group.personId))))
      .filter((group) => endorserScope === 'all' || group.level === endorserScope)
      .filter((group) => !query || [group.name, group.factionId, group.type, 'state' in group ? group.state : '', ...Object.keys(group.positionByIssue || {})]
        .some((value) => String(value || '').toLowerCase().includes(query)))
      .sort((a, b) => {
        const aRelationship = Number(game.build34EndorserRelationships?.[a.id]) || 0;
        const bRelationship = Number(game.build34EndorserRelationships?.[b.id]) || 0;
        return bRelationship - aRelationship || a.name.localeCompare(b.name);
      })
      .slice(0, 12);
  }, [endorserSearch, endorserScope, game.party, game.build34EndorserRelationships, unavailableEndorserPeople]);
  const milestones = upcomingMilestones(game, 5);

  return (
    <section className="panel p-3 sm:p-4" id="campaign-office" tabIndex={-1} data-testid="campaign-office">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="label-xs">Campaign office</p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Outside support, rival activity, and time-sensitive priorities.</p>
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

      {tab === 'network' && (
        <>
        <p className="mt-3 rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-[9px] font-semibold leading-snug text-slate-500">
          Named public figures are modeled scenario characters. Their policy profiles and endorsement outcomes are fictional game simulations.
        </p>
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {leaders.map((leader) => {
            const record = game.endorsements?.[leader.id] || { favor: 54, status: 'watching', attempts: 0, memory: [] };
            const fit = policyAlignment(game, leader);
            const lastMemory = record.memory?.[record.memory.length - 1];
            const locked = (game.actionsLeft ?? 0) <= 0 || record.status === 'endorsed' || record.status === 'withdrawn';
            const statusColor = record.status === 'endorsed' ? '#6EE7B7' : record.status === 'critical' ? '#FCA5A5' : '#F7C145';
            return (
              <article key={leader.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-heading text-[13px] leading-tight text-white">{leader.representative || leader.label}</p>
                    <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-500">
                      {leader.representative ? `${leader.representativeRole} · ${leader.label}` : leader.office}
                    </p>
                  </div>
                  <span className="rounded-full border px-1.5 py-0.5 text-[8px] font-extrabold uppercase" style={{ color: statusColor, borderColor: `${statusColor}66` }}>{record.status}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[9px] font-bold text-slate-500">
                  <span>Policy fit</span><span>{Math.round(fit * 100)}%</span>
                </div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${Math.round(fit * 100)}%`, backgroundColor: fit >= leader.minFit ? '#6EE7B7' : '#FCA5A5' }} />
                </div>
                <p className="mt-2 min-h-7 text-[9px] font-semibold leading-snug text-slate-400">
                  {lastMemory ? `Remembers your ${lastMemory.issue} position (${lastMemory.reaction}).` : `Watching your positions on ${Object.keys(leader.preferences).slice(0, 3).join(', ')}.`}
                  {' '}Potential support: ${leader.cash}M{leader.volunteers ? ` and field teams in ${leader.states.join(', ')}` : ''}.
                </p>
                <button type="button" disabled={locked} onClick={() => onEndorsement(leader.id)} className="btn-outline mt-2 w-full px-2 py-1.5 text-[10px] font-extrabold disabled:cursor-not-allowed disabled:opacity-40">
                  {record.status === 'endorsed' ? 'Endorsement secured' : record.status === 'withdrawn' ? 'Relationship withdrawn' : `Request support · 1 action`}
                </button>
              </article>
            );
          })}
        </div>
        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="label-xs">Organization directory</p>
              <p className="mt-0.5 text-[9px] font-semibold text-slate-500">Modeled composites have faction and policy positions. Outreach costs one action; eligible groups may also endorse at a weekly boundary.</p>
            </div>
            <div className="flex gap-1">
              {[
                ['all', 'All'],
                ['national', 'National'],
                ['state', 'State'],
                ['candidate', 'Candidate'],
              ].map(([value, label]) => (
                <button key={value} type="button" aria-pressed={endorserScope === value} onClick={() => setEndorserScope(value)} className={`rounded-full border px-2 py-1 text-[9px] font-extrabold ${endorserScope === value ? 'border-primary/60 bg-primary/15 text-primary' : 'border-white/10 text-slate-400'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <input
            value={endorserSearch}
            onChange={(event) => setEndorserSearch(event.target.value)}
            placeholder="Search organizations, states, factions, or issues"
            aria-label="Search endorsement organizations"
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] font-semibold text-white outline-none placeholder:text-slate-600 focus:border-primary/50"
          />
          <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {directory.map((group) => {
              const relationship = Number(game.build34EndorserRelationships?.[group.id]) || 0;
              const factionStanding = Number(game.factions?.[group.factionId]) || 0;
              const fit = endorserPolicyFit(group, game.stances);
              const record = game.build34EndorserRegistry?.[group.id];
              const factionReady = factionStanding >= group.minimumFactionStanding;
              const relationshipReady = relationship >= group.endorsementThreshold;
              const locked = (game.actionsLeft ?? 0) <= 0 || !!record || !factionReady || relationship < group.endorsementThreshold - 12;
              const policyIssues = Object.keys(group.positionByIssue || {}).slice(0, 2).map((id) => ISSUE_BY_ID[id]?.label || id);
              return (
                <article key={group.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-heading text-[12px] leading-tight text-white">{group.name}</p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">{group.level === 'state' ? `${group.state} · ` : group.level === 'candidate' ? 'Candidate profile · ' : ''}{group.factionId} faction · {group.fictionalComposite ? 'fictional composite' : 'real person in the candidate roster'}</p>
                    </div>
                    <span className="num rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-300">{Math.round(relationship)}% support</span>
                  </div>
                  <p className="mt-2 text-[9px] font-semibold leading-snug text-slate-400">
                    Policy fit {Math.round(fit * 100)}% · watches {policyIssues.join(', ') || 'campaign positions'} · faction standing {Math.round(factionStanding)}%.
                    {record ? ' Already endorsed this campaign.' : !factionReady ? ` Needs ${group.factionId} faction standing.` : relationshipReady ? ' Ready to endorse.' : relationship >= group.endorsementThreshold - 12 ? ' Near the relationship threshold.' : ' Needs more relationship support.'}
                  </p>
                  <button type="button" disabled={locked} onClick={() => onEndorsement(group.id)} className="btn-outline mt-2 w-full px-2 py-1.5 text-[10px] font-extrabold disabled:cursor-not-allowed disabled:opacity-40">
                    {record ? 'Endorsement secured' : relationshipReady ? 'Request endorsement · 1 action' : 'Court organization · 1 action'}
                  </button>
                </article>
              );
            })}
          </div>
          {!directory.length && <p className="mt-2 text-[10px] font-semibold text-slate-500">No matching organization. Try a state, faction, or issue name.</p>}
          <p className="mt-2 text-[9px] font-semibold text-slate-600">Showing up to 12 matches at a time. These names and endorsement outcomes are scenario simulations, not real-world organizational endorsements.</p>
        </div>
        </>
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
