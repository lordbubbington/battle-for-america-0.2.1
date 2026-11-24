import React, { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';
import { CANDIDATE_BY_ID } from '@/data/candidates';

function ToastIcon({ src, title }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Trophy className="h-6 w-6 text-primary" />;
  return (
    <img
      src={src}
      alt={title}
      onError={() => setFailed(true)}
      className="h-9 w-9 object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export default function AchievementToast({ items, onDismiss }) {
  useEffect(() => {
    if (!items || items.length === 0) return undefined;
    const timer = setTimeout(() => {
      onDismiss?.();
    }, 8000);
    return () => clearTimeout(timer);
  }, [items, onDismiss]);

  if (!items || items.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {items.slice(0, 4).map((ach) => {
        const unlockNames = (ach.unlockCandidateIds || [])
          .map((id) => CANDIDATE_BY_ID[id]?.name || id)
          .filter(Boolean);
        return (
          <div
            key={ach.id}
            className="panel flex items-start gap-3 border-primary/60 bg-[#111A29]/95 p-3 shadow-xl"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/50 bg-primary/15">
              <ToastIcon src={ach.icon} title={ach.title} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">
                Achievement Unlocked
              </p>
              <p className="font-heading text-[14px] leading-tight text-white">{ach.title}</p>
              {unlockNames.length > 0 && (
                <p className="mt-0.5 text-[11px] font-semibold text-slate-300">
                  Unlocked: {unlockNames.join(', ')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      {items.length > 4 && (
        <div className="panel border-primary/40 bg-[#111A29]/95 px-3 py-1.5 text-right text-[11px] font-bold text-primary">
          +{items.length - 4} more achievement{items.length - 4 === 1 ? '' : 's'} unlocked
        </div>
      )}
    </div>
  );
}
