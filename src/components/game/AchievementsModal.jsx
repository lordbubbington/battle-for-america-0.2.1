import React, { useMemo, useState } from 'react';
import { Trophy, Lock, CheckCircle2, X, HelpCircle } from 'lucide-react';
import { ACHIEVEMENTS } from '@/data/achievements';
import { CANDIDATE_BY_ID } from '@/data/candidates';

function AchievementIcon({ ach, unlocked }) {
  const [imgError, setImgError] = useState(false);
  const isHiddenLocked = ach.hidden && !unlocked;
  const src = isHiddenLocked ? '/art/achievements/hidden.png' : ach.icon;

  return (
    <div
      className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border ${
        unlocked
          ? 'border-primary/60 bg-primary/10'
          : 'border-white/15 bg-black/35'
      }`}
    >
      {!imgError ? (
        <img
          src={src}
          alt={isHiddenLocked ? 'Hidden achievement' : ach.title}
          onError={() => setImgError(true)}
          className={`h-10 w-10 object-contain ${unlocked ? '' : 'opacity-45 grayscale'}`}
          style={{ imageRendering: 'pixelated' }}
        />
      ) : isHiddenLocked ? (
        <HelpCircle className="h-6 w-6 text-slate-400" />
      ) : unlocked ? (
        <Trophy className="h-6 w-6 text-primary" />
      ) : (
        <Lock className="h-5 w-5 text-slate-500" />
      )}
    </div>
  );
}

export default function AchievementsModal({ open, onClose, profile }) {
  const [filter, setFilter] = useState('all');

  const unlockedIds = useMemo(() => profile?.unlockedIds || {}, [profile]);
  const unlockedCount = useMemo(
    () => ACHIEVEMENTS.filter((a) => Boolean(unlockedIds[a.id])).length,
    [unlockedIds]
  );

  const visibleList = useMemo(() => {
    return ACHIEVEMENTS.filter((ach) => {
      const isUnlocked = Boolean(unlockedIds[ach.id]);
      if (filter === 'unlocked') return isUnlocked;
      if (filter === 'locked') return !isUnlocked;
      return true;
    });
  }, [filter, unlockedIds]);

  if (!open) return null;

  const pct = Math.round((unlockedCount / ACHIEVEMENTS.length) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Achievements"
      onClick={onClose}
    >
      <div
        className="panel relative flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden border-white/15 p-4 sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-xl text-white">Achievements</h2>
              <span className="rounded-full border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[11px] font-extrabold text-primary">
                {unlockedCount} / {ACHIEVEMENTS.length} ({pct}%)
              </span>
            </div>
            <div className="mt-2 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost rounded-full p-1.5 text-slate-400 hover:text-white"
            aria-label="Close achievements"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {[
            ['all', `All (${ACHIEVEMENTS.length})`],
            ['unlocked', `Unlocked (${unlockedCount})`],
            ['locked', `Locked (${ACHIEVEMENTS.length - unlockedCount})`],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3 py-1 text-[11px] font-extrabold transition-colors ${
                filter === key
                  ? 'border-primary/60 bg-primary/15 text-primary'
                  : 'border-white/15 bg-black/25 text-slate-300 hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid flex-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
          {visibleList.map((ach) => {
            const unlockedAt = unlockedIds[ach.id];
            const unlocked = Boolean(unlockedAt);
            const isHiddenLocked = ach.hidden && !unlocked;
            const unlockNames = (ach.unlockCandidateIds || [])
              .map((id) => CANDIDATE_BY_ID[id]?.name || id)
              .filter(Boolean);

            return (
              <div
                key={ach.id}
                className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                  unlocked
                    ? 'border-primary/40 bg-primary/[0.06]'
                    : 'border-white/10 bg-black/25'
                }`}
              >
                <AchievementIcon ach={ach} unlocked={unlocked} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate font-heading text-[13.5px] ${unlocked ? 'text-white' : 'text-slate-300'}`}>
                      {isHiddenLocked ? 'Hidden Achievement' : ach.title}
                    </p>
                    {unlocked && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-slate-400">
                    {isHiddenLocked ? '???' : ach.description}
                  </p>
                  {!isHiddenLocked && unlockNames.length > 0 && (
                    <p className={`mt-1.5 text-[10.5px] font-bold ${unlocked ? 'text-primary' : 'text-slate-500'}`}>
                      {unlocked ? 'Unlocked: ' : 'Unlocks: '}
                      {unlockNames.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {visibleList.length === 0 && (
            <p className="col-span-full py-8 text-center text-xs font-semibold text-slate-400">
              No achievements in this view yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
