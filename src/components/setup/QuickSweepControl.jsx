import React from 'react';

export default function QuickSweepControl({ checked, onChange, draws, disabled = false }) {
  if (draws !== 50000) return null;
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg border border-white/15 bg-black/20 p-3 ${disabled ? 'opacity-50' : ''}`}>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-blue-500"
      />
      <span>
        <span className="block text-[12px] font-extrabold text-white">+5 R/D Sweep</span>
        <span className="mt-0.5 block text-[10px] font-semibold leading-snug text-slate-400">
          Spreads only the 50,000 quick election draws evenly from R+5 to D+5.
        </span>
      </span>
    </label>
  );
}
