import React from 'react';
import { clockLabel } from '@/data/pollClose';
import { Radio, SkipForward } from 'lucide-react';

const SPEEDS = [1, 2, 4, 8];

// The night's clock, the tape speed, and the way out of it.
export default function NightHeader({ t, phase, speed, onSpeed, done, onSkip }) {
  return (
    <div className="panel flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-extrabold uppercase tracking-[0.16em] ${
            done ? 'bg-white/10 text-slate-300' : 'bg-rose-500/20 text-rose-300'
          }`}
        >
          <Radio className={`h-3 w-3 ${done ? '' : 'animate-pulse'}`} /> {done ? 'Called' : 'Live'}
        </span>
        <span className="num text-[16px] font-extrabold leading-none tabular-nums text-white">{clockLabel(t)}</span>
        <span className="hidden text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 sm:inline">
          Decision desk · Nov 7, 2028
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2" aria-label={`Election night phase ${phase?.step + 1 || 1} of 4`}>
        <span className="hidden text-[9px] font-extrabold uppercase tracking-wide text-slate-400 md:inline">{phase?.label}</span>
        <div className="hidden items-center gap-1 sm:flex" aria-hidden="true">
          {[0, 1, 2, 3].map((step) => <span key={step} className={`h-1 w-3 rounded-full ${step <= (phase?.step || 0) ? 'bg-primary' : 'bg-white/15'}`} />)}
        </div>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSpeed(s)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-colors ${
              speed === s
                ? 'bg-primary text-slate-900'
                : 'border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {s}×
          </button>
        ))}
        <button
          type="button"
          onClick={onSkip}
          disabled={done}
          className="btn-ghost ml-0.5 flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold disabled:opacity-40"
        >
          <SkipForward className="h-3 w-3" /> {done ? 'Finished' : 'Skip to the end'}
        </button>
      </div>
    </div>
  );
}