import React from 'react';
import { X } from 'lucide-react';

// The moment the desk puts somebody over 270: a banner across the top of the
// night that stays until the player puts it away.
export default function PresidencyCall({ name, dem, rep, pct, onDismiss }) {
  return (
    <div
      className="animate-pop-in relative mt-3 overflow-hidden rounded-2xl border-2 p-3 pr-10 sm:p-4 sm:pr-12"
      style={{
        borderColor: 'rgba(247,193,69,0.75)',
        background:
          'linear-gradient(100deg, rgba(247,193,69,0.24), rgba(14,23,42,0.97) 42%, rgba(14,23,42,0.97) 68%, rgba(247,193,69,0.18))',
        boxShadow: '0 26px 54px -30px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.16)',
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss the call"
        className="btn-ghost absolute right-2 top-2 rounded-lg p-1.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <p className="inline-block rotate-[-1.5deg] rounded-sm border border-primary/60 bg-primary/20 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-primary">
        The presidency is called
      </p>

      <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
        <h2 className="font-heading text-2xl leading-none text-white sm:text-[34px]">
          {name} <span className="text-primary">wins</span> the White House
        </h2>
        <p className="num text-[12px] font-extrabold text-slate-300">
          {dem}–{rep} · {Math.round(pct)}% counted
        </p>
      </div>
    </div>
  );
}