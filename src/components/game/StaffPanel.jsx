import { mainGameStaffProfile } from '@/lib/endorsementRemoval.mjs';
import React, { useMemo } from 'react';
import { NONTRADITIONAL_STAFF_BY_ID } from '@/data/nonTraditionalStaffRoster';
import { TRADITIONAL_STAFF_BY_ID } from '@/data/traditionalStaffRoster';
import { buildStaffDisagreement, isTraditionalStaffingReady } from '@/lib/traditionalStaffRules';

function moneyLabel(cost) {
  return Number(cost) === 0 ? '$0M campaign funds' : `$${Number(cost)}M`;
}

function reasonLabel(code) {
  const labels = {
    'public-poll-share-gap': 'Current state poll',
    'native-party-turnout': 'Current supporter turnout',
    'field-operation-not-maxed': 'Field office capacity',
    'native-donor-room-outlook': 'Donor room outlook',
    'native-promise-outlook': 'Issue agreement',
    'native-endorsement-outreach': 'Relationship and endorsement threshold',
    'native-digital-ad-outlook': 'Digital ad outlook',
    'native-press-story': 'Current news story',
    'public-elector-threshold': 'Electoral College threshold',
    'public-house-vote-share': 'State House vote share',
    'public-house-district-poll': 'Current district poll',
  };
  if (labels[code]) return labels[code];
  return String(code).replaceAll('-', ' ').replaceAll('_', ' ');
}

function StaffSpeaker({ staff, Portrait, children }) {
  if (!staff) return null;
  return (
    <div className="flex items-start gap-2">
      {Portrait && <Portrait portraitId={staff.portraitId} alt={staff.title} size="compact" />}
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-200">{staff.title}</p>
        {children}
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation, selected, locked, onSetAgenda, onOpenAction }) {
  const sameAgenda = selected?.recommendationId === recommendation.id;
  const setLabel = sameAgenda
    ? selected.status === 'consumed' ? 'Agenda used' : 'Agenda selected'
    : recommendation.agendaEligible ? 'Set agenda' : 'Advice only';
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="font-heading text-sm text-white">{recommendation.title}</p>
      {recommendation.dialogue && <p className="mt-1 text-xs leading-relaxed text-slate-300">“{recommendation.dialogue}”</p>}
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <p><span className="font-bold text-slate-400">Action:</span> <span className="text-slate-200">{recommendation.actionLabel} · {recommendation.targetName}{recommendation.issueLabel ? ` · ${recommendation.issueLabel}` : ''}</span></p>
        <p><span className="font-bold text-slate-400">Cost:</span> <span className="text-slate-200">{moneyLabel(recommendation.cost)}</span></p>
        <p className="sm:col-span-2"><span className="font-bold text-slate-400">Expected effect:</span> <span className="text-slate-200">{recommendation.expectedEffectSummary}</span></p>
      </div>
      {recommendation.reasonCodes?.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Why this matters</p>
          {recommendation.reasonSummary && <p className="mt-1 text-xs leading-relaxed text-slate-300">{recommendation.reasonSummary}</p>}
          <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="Evidence-based reasons">
            {recommendation.reasonCodes.map((code) => <li key={code} className="chip">{reasonLabel(code)}</li>)}
          </ul>
        </div>
      )}
      {recommendation.valueStatus === 'available'
        ? <p className="mt-2 text-[11px] text-slate-400">Estimated value: {Number(recommendation.estimatedValue).toFixed(2)}</p>
        : <p className="mt-2 text-[11px] text-amber-200/80">Value estimate unavailable: {recommendation.valueUnavailableReason}</p>}
      {recommendation.agendaEligible && <p className="mt-2 text-[11px] text-emerald-200/80">Taking this exact action can improve its execution by up to 10%.</p>}
      {!recommendation.agendaEligible && <p className="mt-2 text-[11px] text-slate-400">Advice only. This action uses its usual effects.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={locked || sameAgenda || !recommendation.agendaEligible || !onSetAgenda}
          onClick={() => onSetAgenda?.(recommendation)}
          className="btn-gold px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-45"
          aria-pressed={sameAgenda}
        >
          {setLabel}
        </button>
        <button
          type="button"
          disabled={!onOpenAction}
          onClick={() => onOpenAction?.(recommendation.actionId, recommendation.targetId, { issueId: recommendation.issueId, adTypeId: recommendation.adTypeId, adKind: recommendation.adKind, storyId: recommendation.storyId, spinMode: recommendation.spinMode })}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
          aria-label={`Open ${recommendation.actionLabel} for ${recommendation.targetName}`}
        >
          Open action
        </button>
      </div>
    </div>
  );
}

export default function StaffPanel({
  game,
  staffing = game?.staffing,
  briefing,
  agenda = staffing?.agendaByWeek?.[game?.week],
  agendaLocked = false,
  debrief = staffing?.briefingHistory?.at(-1),
  operationalWarnings,
  policyWarnings,
  onSetAgenda,
  onOpenAction,
  Portrait = null,
  liveNonTraditionalIds = null,
}) {
  const ready = isTraditionalStaffingReady(staffing);
  const activeStaff = ready ? [
    ...staffing.traditionalActiveIds.map((id) => ({ ...mainGameStaffProfile(TRADITIONAL_STAFF_BY_ID[id]), portraitId: staffing.traditionalPortraitByRole[id], effectUnavailable: id === 'establishment-liaison' })),
    ...staffing.nonTraditionalActiveIds.map((id) => {
      const profile = mainGameStaffProfile(NONTRADITIONAL_STAFF_BY_ID[id]);
      return {
        id,
        title: profile.name,
        responsibility: profile.description,
        portraitId: id,
        weeklyUpkeep: profile.weeklyUpkeep,
        effectUnavailable: !!liveNonTraditionalIds && !liveNonTraditionalIds.includes(id),
      };
    }),
  ] : [];
  const byId = new Map(activeStaff.map((staff) => [staff.id, staff]));
  const recommendations = Array.isArray(briefing?.recommendations)
    ? briefing.recommendations.filter((recommendation) => recommendation.legal === true && byId.has(recommendation.staffId)) : [];
  const recommendationsByStaff = new Map(recommendations.map((recommendation) => [recommendation.staffId, recommendation]));
  const disagreement = useMemo(
    () => buildStaffDisagreement(recommendations, game?.party, { week: game?.week, actionsLeft: game?.actionsLeft, funds: game?.funds }),
    [recommendations, game?.party, game?.week, game?.actionsLeft, game?.funds],
  );
  const selectedRole = byId.get(agenda?.staffId);
  const debriefRole = byId.get(debrief?.staffId);
  const unmetPriority = byId.get(debrief?.unmetPriority?.staffId);

  return (
    <section className="panel p-3 sm:p-4" aria-labelledby="staff-panel-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label-xs">Campaign office · week {game?.week ?? '—'}</p>
          <h2 id="staff-panel-heading" className="mt-1 font-heading text-xl text-white">Your staff briefing</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            Choose a weekly priority, or open an action to review it before committing.
          </p>
        </div>
      </div>

      {!ready ? (
        <div className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100" role="status">
          Select three advisors before week one to join your Chief of Staff.
        </div>
      ) : (
        <>
          {agenda && selectedRole && (
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3" aria-live="polite">
              <p className="label-xs">{agenda.status === 'consumed' ? 'Agenda used' : 'Current weekly agenda'}</p>
              <div className="mt-2">
                <StaffSpeaker staff={selectedRole} Portrait={Portrait}>
                  <p className="mt-1 text-sm text-white">{agenda.title || `${agenda.actionId} · ${agenda.targetId}`}</p>
                  <p className="mt-1 text-xs text-slate-300">
                    {agenda.status === 'consumed'
                      ? 'The campaign completed the matching action.'
                      : 'The agenda effect applies to the first matching action at this target.'}
                  </p>
                </StaffSpeaker>
              </div>
            </div>
          )}

          {disagreement && (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3" aria-label="Staff priority discussion">
              <p className="mb-2 label-xs">Competing priorities</p>
              <StaffSpeaker staff={byId.get('chief')} Portrait={Portrait}>
                <p className="mt-1 text-sm leading-relaxed text-slate-200">{disagreement.chiefSummary}</p>
              </StaffSpeaker>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[disagreement.firstPriority, disagreement.secondPriority].map((priority) => (
                  <StaffSpeaker key={priority.staffId} staff={byId.get(priority.staffId)} Portrait={Portrait}>
                    <p className="mt-1 text-xs text-slate-300">{priority.actionLabel || priority.actionId} · {priority.targetName || priority.targetId}</p>
                    <p className="mt-1 text-xs text-slate-400">{priority.reasonCodes.map(reasonLabel).join(', ')}</p>
                  </StaffSpeaker>
                ))}
              </div>
            </div>
          )}

          {byId.has('operations') && operationalWarnings?.status === 'ready' && operationalWarnings.warnings?.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/10 p-3" aria-label="Operations reminders">
              <StaffSpeaker staff={byId.get('operations')} Portrait={Portrait}>
                {operationalWarnings.warnings.map((warning) => <p key={warning.code} className="mt-1 text-xs text-amber-100">{warning.message}</p>)}
              </StaffSpeaker>
            </div>
          )}
          {byId.has('policy') && policyWarnings?.status === 'ready' && policyWarnings.conflicts?.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/10 p-3" role="status">
              <StaffSpeaker staff={byId.get('policy')} Portrait={Portrait}>
                <p className="mt-1 text-xs text-amber-100">This proposed position conflicts with {policyWarnings.conflicts.length} recorded campaign promise{policyWarnings.conflicts.length === 1 ? '' : 's'}.</p>
              </StaffSpeaker>
            </div>
          )}

          {briefing?.status === 'unavailable' && recommendations.length === 0 && (
            <p className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300" role="status">
              There are no eligible recommendations available this week.
            </p>
          )}

          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {activeStaff.map((staff) => {
              const staffId = staff.id;
              const recommendation = recommendationsByStaff.get(staffId);
              return (
                <article key={staffId} className="panel-lite p-3" aria-labelledby={`staff-${staffId}-heading`}>
                  <div className="flex items-start gap-3">
                    {Portrait && <Portrait portraitId={staff.portraitId} alt={staff.title} size="card" />}
                    <div className="min-w-0 flex-1">
                      <h3 id={`staff-${staffId}-heading`} className="font-heading text-base text-white">{staff.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{staff.responsibility}</p>
                      {staff.effectUnavailable && <p className="mt-1 text-xs text-amber-200">Gameplay effect unavailable</p>}
                    </div>
                  </div>
                  {recommendation ? (
                    <RecommendationCard
                      recommendation={recommendation}
                      selected={agenda}
                      locked={agendaLocked || agenda?.status === 'consumed'}
                      onSetAgenda={onSetAgenda}
                      onOpenAction={onOpenAction}
                    />
                  ) : staff.weeklyUpkeep == null ? (
                    <p className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-400">
                      No eligible action is available for this advisor this week.
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>

          {debrief && debriefRole && debrief.status !== 'unavailable' && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3" aria-live="polite">
              <p className="mb-2 label-xs">Weekly debrief · {debrief.status === 'used' ? 'agenda effect used' : debrief.status === 'acted-on' ? 'priority acted on' : 'priority not acted on'}</p>
              <StaffSpeaker staff={debriefRole} Portrait={Portrait}>
                <p className="mt-1 text-sm text-slate-200">{debrief.dialogue}</p>
                {debrief.status === 'acted-on' && <p className="mt-1 text-xs text-slate-400">The campaign completed this action at its usual strength.</p>}
              </StaffSpeaker>
              {unmetPriority && (
                <div className="mt-3">
                  <StaffSpeaker staff={unmetPriority} Portrait={Portrait}>
                    <p className="mt-1 text-xs text-slate-400">Unmet priority · {debrief.unmetPriority.actionId} · {debrief.unmetPriority.targetId}</p>
                  </StaffSpeaker>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
