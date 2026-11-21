import React, { useMemo, useState } from 'react';
import { Map, ChevronDown, ChevronUp } from 'lucide-react';
import { marginColor } from '@/lib/marginColors';

const SHOW_FIRST = 10;

function value(generic) {
  const abs = Math.abs(generic);
  if (abs < 0.05) return 'even';
  return `${generic > 0 ? 'D' : 'R'}+${abs.toFixed(1)}`;
}

// One state's environment: how its House and Senate races are actually polling,
// which is not the same number as the top of its ticket.
function Row({ row }) {
  const family = row.generic >= 0 ? 'dem' : 'rep';
  const color = marginColor(family, Math.abs(row.generic));
  const width = Math.min(50, (Math.abs(row.generic) / 26) * 50);

  return (
    <div className="flex items-center gap-1.5 py-[3px]">
      <span className="num w-[26px] shrink-0 text-[10px] font-extrabold text-slate-400">{row.abbr}</span>
      <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full border border-white/10 bg-black/40">
        <div className="absolute inset-y-0 left-1/2 w-[1px] -translate-x-1/2 bg-white/25" />
        <div
          className="absolute inset-y-0 rounded-full transition-all duration-500"
          style={{
            backgroundColor: color,
            width: `${width}%`,
            [row.generic >= 0 ? 'left' : 'right']: '50%',
          }}
        />
      </div>
      <span className="num w-[46px] shrink-0 text-right text-[10px] font-extrabold" style={{ color }}>
        {value(row.generic)}
      </span>
    </div>
  );
}

// The state-by-state generic ballot: the environment each downballot race is
// running in, and the national average of all of them.
export default function EnvironmentPanel({ game, rows = [], accent = '#F7C145', onSelect = null }) {
  const [open, setOpen] = useState(false);

  const sorted = useMemo(
    () => rows.slice().sort((a, b) => Math.abs(a.generic) - Math.abs(b.generic)),
    [rows]
  );
  const shown = open ? sorted : sorted.slice(0, SHOW_FIRST);
  const national = game.natGeneric || 0;
  const nationalColor = national >= 0 ? '#6C9BFF' : '#FF8A7A';

  return (
    <div className="panel p-3" data-testid="state-environments">
      <div className="flex items-baseline justify-between gap-2">
        <p className="label-xs flex items-center gap-1">
          <Map className="h-3 w-3" /> State environments
        </p>
        <span className="num text-[11px] font-extrabold" style={{ color: nationalColor }}>
          {national >= 0 ? 'D' : 'R'}+{Math.abs(national).toFixed(1)} generic
        </span>
      </div>

      <p className="mt-1 text-[10px] font-semibold leading-snug text-slate-500">
        House and Senate races poll their own state, not the presidential map. Local news moves these hardest.
      </p>

      <div className="mt-2 space-y-0">
        {shown.map((row) => (
          <button
            key={row.abbr}
            type="button"
            onClick={() => onSelect && onSelect(row.abbr)}
            className="block w-full text-left hover:bg-white/5"
            title={`${row.name}: ${value(row.generic)} generic ballot`}
          >
            <Row row={row} />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-white/12 bg-white/5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400 hover:bg-white/10"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {open ? 'Tightest races only' : `All ${sorted.length} states`}
      </button>

      <p className="mt-2 text-[10px] font-semibold leading-snug text-slate-500">
        Your rallies move a state's generic ballot half as much as its presidential lean — a quarter as much where the
        House or Senate race is inside five points.
      </p>
    </div>
  );
}