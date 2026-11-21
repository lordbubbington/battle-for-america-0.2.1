import React from 'react';
import { BUILD40_MODE_OPTIONS } from '@/data/build40Elections';
import { normalizeBuild40Mode } from '@/lib/build40Elections';

/** Leaf selector for Advanced Options Panel C. */
export default function Build40ModePicker({ modeId = 'two-parties', onChange, id = 'build40-election-mode' }) {
  const current = normalizeBuild40Mode(modeId).modeId;
  return (
    <fieldset className="panel-lite p-3" aria-describedby={`${id}-help`}>
      <legend className="px-1 font-heading text-[13px] text-white">Presidential mode</legend>
      <p id={`${id}-help`} className="mb-2 text-[10.5px] font-semibold text-slate-400">
        Choose the opening ballot and eligible presidential tickets.
      </p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {BUILD40_MODE_OPTIONS.map((option) => {
          const checked = current === option.id;
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer gap-2 rounded-lg border px-2.5 py-2 transition-colors ${checked ? 'border-primary/70 bg-primary/10' : 'border-white/10 bg-black/15 hover:bg-white/5'}`}
            >
              <input
                type="radio"
                name={id}
                value={option.id}
                checked={checked}
                onChange={() => onChange?.(option.id)}
                className="mt-0.5 accent-amber-300"
              />
              <span>
                <span className="block text-[11.5px] font-extrabold text-white">{option.label}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-slate-400">{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

