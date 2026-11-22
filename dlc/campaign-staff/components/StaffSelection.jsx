import React, { useState } from 'react';
import { mainGameStaffProfile } from '@/lib/endorsementRemoval.mjs';
import { NONTRADITIONAL_STAFF_BY_ID } from '@/data/nonTraditionalStaffRoster';
import { TRADITIONAL_STAFF_BY_ID, TRADITIONAL_STAFF_ROSTER, TRADITIONAL_STAFF_SELECTION_COUNT } from '@/data/traditionalStaffRoster';
import { previewTraditionalPortraits, selectInitialTraditionalStaff, validateTraditionalStaffing } from '@/lib/traditionalStaffRules';
import { randomizeStaff, staffSetupDrawback } from '@/lib/build38StaffRules';

/**
 * @param {{
 *   staffing: any,
 *   campaignId?: string,
 *   onComplete?: (selectedIds: string[]) => void,
 *   disabled?: boolean,
 *   reorganizing?: boolean,
 *   Portrait?: React.ComponentType<{ portraitId: string, alt: string, size: 'card' | 'compact' }>,
 *   liveNonTraditionalIds?: readonly string[],
 * }} props
 */
export default function StaffSelection({ staffing, campaignId, onComplete, disabled = false, Portrait, liveNonTraditionalIds }) {
  const [selection, setSelection] = useState({ campaignId, ids: [], previewRoll: 0 });
  const [error, setError] = useState(null);
  if (staffing?.initialSelectionComplete) return null;

  const previews = previewTraditionalPortraits(campaignId);
  const setupErrors = validateTraditionalStaffing(staffing);
  if (setupErrors.length || !previews.chief) {
    return <p role="alert" className="panel p-4 text-sm text-amber-200">Staff choices could not be loaded for this campaign.</p>;
  }
  const selectedIds = selection.campaignId === campaignId ? selection.ids : [];
  const remaining = TRADITIONAL_STAFF_SELECTION_COUNT - selectedIds.length;
  const chief = TRADITIONAL_STAFF_BY_ID.chief;
  const choices = [
    ...TRADITIONAL_STAFF_ROSTER.filter((staff) => staff.id !== 'chief').map(mainGameStaffProfile).map((staff) => ({
      id: staff.id,
      title: staff.title,
      description: staff.responsibility,
      expertise: staff.expertise,
      portraitId: previews[staff.id],
      effectUnavailable: staff.id === 'establishment-liaison',
    })),
    ...staffing.nonTraditionalSelectionPoolIds.map((id) => {
      const profile = mainGameStaffProfile(NONTRADITIONAL_STAFF_BY_ID[id]);
      return {
        id,
        title: profile.name,
        description: profile.description,
        expertise: staffSetupDrawback(profile.effect.drawback),
        portraitId: id,
        effectUnavailable: !!liveNonTraditionalIds && !liveNonTraditionalIds.includes(id),
      };
    }),
  ];

  const toggle = (staffId) => {
    setError(null);
    setSelection((current) => {
      const previous = current.campaignId === campaignId ? current : { campaignId, ids: [], previewRoll: 0 };
      const ids = previous.ids;
      if (ids.includes(staffId)) return { ...previous, ids: ids.filter((id) => id !== staffId) };
      if (ids.length === TRADITIONAL_STAFF_SELECTION_COUNT) return current;
      return { ...previous, ids: [...ids, staffId] };
    });
  };

  const randomize = () => {
    setError(null);
    setSelection((current) => {
      const previous = current.campaignId === campaignId ? current : { campaignId, ids: [], previewRoll: 0 };
      const previewRoll = previous.previewRoll + 1;
      return { campaignId, previewRoll, ids: randomizeStaff({ campaignId, previewRoll, eligibleIds: choices.map((choice) => choice.id), count: TRADITIONAL_STAFF_SELECTION_COUNT }) };
    });
  };

  const submit = () => {
    const result = selectInitialTraditionalStaff(selectedIds, staffing, campaignId);
    if (!result.ok) {
      setError({ campaignId, message: result.errors.join(' ') });
      return;
    }
    setError(null);
    onComplete?.(selectedIds);
  };

  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="staff-selection-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="staff-selection-heading" className="font-heading text-xl text-white">Choose your inner circle</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-300">
            Choose three staff to join your Chief of Staff before week one. Your choice lasts the entire campaign.
          </p>
        </div>
        <span className={`chip ${remaining === 0 ? 'chip-gold' : ''}`} aria-live="polite">
          {selectedIds.length} / {TRADITIONAL_STAFF_SELECTION_COUNT} selected
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/10 p-3">
        {Portrait && <Portrait portraitId={previews.chief} alt={chief.title} size="card" />}
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm text-white">{chief.title} <span className="chip ml-1">Preassigned</span></p>
          <p className="mt-1 text-xs text-slate-300">{chief.responsibility}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Staff choices">
        {choices.map((staff) => {
          const isSelected = selectedIds.includes(staff.id);
          const atCapacity = !isSelected && remaining === 0;
          return (
            <button
              key={staff.id}
              type="button"
              aria-pressed={isSelected}
              disabled={disabled || atCapacity}
              onClick={() => toggle(staff.id)}
              className={`panel-lite flex min-h-24 items-start gap-3 p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-55 ${isSelected ? 'border-primary/70 bg-primary/10' : 'hover:border-white/25 hover:bg-white/5'}`}
            >
              {Portrait && <Portrait portraitId={staff.portraitId} alt={staff.title} size="card" />}
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-sm leading-tight text-white">{staff.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-300">{staff.description}</span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-400">{staff.expertise}</span>
                {staff.effectUnavailable && <span className="mt-1 block text-xs text-amber-200">Gameplay effect unavailable</span>}
                {isSelected && <span className="mt-2 block text-xs font-bold text-primary">Selected</span>}
              </span>
            </button>
          );
        })}
      </div>

      {error?.campaignId === campaignId && <p role="alert" className="mt-3 text-sm text-rose-200">{error?.message}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-300">{remaining > 0 ? `Choose ${remaining} more staff.` : 'Your four-person staff is ready.'}</p>
        <button type="button" disabled={disabled || !campaignId || choices.length < TRADITIONAL_STAFF_SELECTION_COUNT} onClick={randomize} className="btn-ghost px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45">
          Randomize Staff
        </button>
        <button
          type="button"
          disabled={disabled || remaining !== 0 || !onComplete}
          onClick={submit}
          className="btn-gold px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45"
        >
          Confirm inner circle
        </button>
      </div>
    </section>
  );
}
