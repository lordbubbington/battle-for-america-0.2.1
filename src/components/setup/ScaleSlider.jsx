import React, { useEffect, useState } from 'react';

export function leadLabel(v) {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  if (abs < 0.05) return 'EVEN';
  return `${n > 0 ? 'D' : 'R'}+${abs.toFixed(1)}`;
}

// One movable scale with a typed box beside it: drag it, or type the number you
// actually want. Positive is Democratic everywhere.
export default function ScaleSlider({
  label,
  value,
  min,
  max,
  step = 0.5,
  onChange,
  readout,
  hint,
  color = '#F7C145',
  leftLabel,
  rightLabel,
  extra = null,
  allowedMin = min,
  allowedMax = max,
  disabled = false,
}) {
  const [draft, setDraft] = useState(value.toFixed(1));
  const [editing, setEditing] = useState(false);
  const clampAllowed = (number) => Math.min(allowedMax, Math.max(allowedMin, number));

  useEffect(() => {
    if (!editing) setDraft(value.toFixed(1));
  }, [value, editing]);

  // Typing "7", "D+7" or "R+7" all work: a leading D or R decides the sign.
  const commit = (raw) => {
    const text = String(raw).trim();
    const democratic = /^d/i.test(text);
    const republican = /^r/i.test(text);
    const cleaned = text
      .replace(/[−–]/g, '-')
      .replace(/[^0-9.+-]/g, '')
      .replace(/\+/g, '');
    let parsed = Number(cleaned);
    if (Number.isFinite(parsed) && (republican || /^-/.test(cleaned)) && !democratic) {
      parsed = -Math.abs(parsed);
    }
    if (cleaned.trim() !== '' && Number.isFinite(parsed)) {
      onChange(clampAllowed(Math.min(max, Math.max(min, parsed))));
    } else {
      setDraft(value.toFixed(1));
    }
    setEditing(false);
  };

  return (
    <div className="panel-lite px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="label-xs">{label}</p>
          <p className="num text-[15px] font-extrabold leading-tight" style={{ color }}>
            {readout}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            value={draft}
            inputMode="decimal"
            disabled={disabled}
            aria-label={`${label} — type a value`}
            onChange={(e) => {
              setEditing(true);
              setDraft(e.target.value);
            }}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="num w-[66px] rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-right text-[12px] font-extrabold text-white outline-none focus:border-primary"
          />
          {extra}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          setEditing(false);
          onChange(clampAllowed(Number(e.target.value)));
        }}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
      />

      {(allowedMin > min || allowedMax < max) && (
        <div className="relative -mt-1 h-1" aria-hidden="true">
          {allowedMin > min && <span className="absolute top-0 h-2 w-px bg-amber-300" style={{ left: `${((allowedMin - min) / (max - min)) * 100}%` }} />}
          {allowedMax < max && <span className="absolute top-0 h-2 w-px bg-amber-300" style={{ left: `${((allowedMax - min) / (max - min)) * 100}%` }} />}
        </div>
      )}

      <div className="mt-1 flex justify-between text-[9px] font-extrabold uppercase tracking-wide text-slate-500">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>

      {hint && <p className="mt-1 text-[10.5px] font-semibold leading-snug text-slate-400">{hint}</p>}
    </div>
  );
}
