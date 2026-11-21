import React from 'react';
import SpotArt from '@/components/ui/spot-art';

const REGION_LABELS = { northeast: 'Northeast', south: 'South', midwest: 'Midwest', west: 'West' };

export default function NationwideCard({ event }) {
  const eff = event.auto || {};
  const lines = [];
  if (eff.nat) lines.push(`Everywhere ${eff.nat > 0 ? '+' : ''}${eff.nat} D`);
  if (eff.region) {
    Object.entries(eff.region).forEach(([r, v]) => {
      lines.push(`${REGION_LABELS[r] || r} ${v > 0 ? '+' : ''}${v} D`);
    });
  }
  if (eff.states) {
    Object.entries(eff.states).forEach(([abbr, v]) => {
      lines.push(`${abbr} ${v > 0 ? '+' : ''}${v} D`);
    });
  }

  return (
    <div className="panel animate-pop-in border-sky-400/40 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/25 text-2xl">
          <SpotArt symbol={event.icon} className="h-full w-full" />
        </div>
        <div className="min-w-0">
          <p className="inline-block rounded-full bg-sky-500 px-2 py-[1px] text-[9px] font-extrabold uppercase tracking-[0.16em] text-white">
            {event.kicker}
          </p>
          <h2 className="mt-1 font-heading text-xl leading-[1.08] text-white sm:text-[22px]">{event.title}</h2>
        </div>
      </div>

      <p className="mt-2 text-[13px] font-medium leading-relaxed text-slate-200/90">{event.text}</p>

      {lines.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {lines.map((l) => (
            <span key={l} className="chip chip-gold">
              {l}
            </span>
          ))}
        </div>
      )}

      {event.note && (
        <p className="mt-3 rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 text-[11px] font-semibold italic text-slate-400">
          {event.note}
        </p>
      )}

      <p className="mt-3 text-center text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
        No choice this week — the country moved on its own
      </p>
    </div>
  );
}
