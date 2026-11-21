import React from 'react';
import SpotArt from '@/components/ui/spot-art';
import { DIFFICULTIES } from '@/lib/gameEngine';

export default function DifficultyPicker({ value, onChange, disabled = false, disabledNote = null }) {
  return (
    <div>
      {disabled && disabledNote && (
        <p className="mb-2 rounded-lg border border-amber-400/35 bg-amber-400/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200">
          {disabledNote}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {Object.values(DIFFICULTIES).map((d) => {
          const active = value === d.id;
          return (
            <button
              key={d.id}
              type="button"
              disabled={disabled}
              aria-disabled={disabled ? 'true' : undefined}
              onClick={() => { if (!disabled) onChange(d.id); }}
              className={`panel-lite p-3 text-left transition-transform duration-150 ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-[2px] hover:bg-white/10'}`}
              style={
                active
                  ? { borderColor: '#F7C145', boxShadow: 'inset 0 0 0 1px rgba(247,193,69,0.5)' }
                  : undefined
              }
            >
              <div className="flex items-start gap-3">
                <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-inner">
                  <SpotArt symbol={d.icon} className="h-[60px] w-[60px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-[14px] leading-tight text-white">{d.label}</p>
                  <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-400">{d.blurb}</p>
                </div>
              </div>
              <p className="mt-1.5 text-[10.5px] font-extrabold text-amber-300">
                ${d.startFunds}M to start · ×{d.scoreMul} ranking points
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
