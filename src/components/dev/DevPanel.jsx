import React from 'react';
import { BUILD40_EVENTS } from '@/data/build40EventCatalog';
import { CANDIDATE_EVENTS } from '@/data/candidateEvents/index';
import { X } from 'lucide-react';
import FatigueTable from '@/components/dev/FatigueTable';
import SpotArt from '@/components/ui/spot-art';

function Row({ event, party, onTrigger }) {
  const restriction = event.bucket === 'Republicans only' ? 'rep' : event.bucket === 'Democrats only' ? 'dem' : null;
  const locked = restriction && restriction !== party;
  return (
    <button
      type="button"
      disabled={Boolean(locked)}
      onClick={() => onTrigger(event.id)}
      className="flex w-full items-start gap-2 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-left transition-colors hover:border-primary/50 hover:bg-white/10"
    >
      <SpotArt symbol="news" className="h-5 w-5" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-bold text-white">{event.title}</span>
        <span className="block truncate font-mono text-[9.5px] text-slate-500">
          {event.id}
          {event.auto ? ' · nationwide' : ''}
          {event.choices ? ` · ${event.choices.length} choices` : ''}
          {locked ? ` · ${restriction.toUpperCase()} only` : ''}
        </span>
      </span>
    </button>
  );
}

export default function DevPanel({ game, party, funds, onGiveCash, onDeveloperAction, onTrigger, onClose }) {
  const decisions = [...BUILD40_EVENTS, ...CANDIDATE_EVENTS].filter((event) => event.trigger.kind !== 'debate-question');

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[380px] flex-col border-l border-primary/40 bg-[#08101f]/97 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div>
          <p className="font-heading text-[15px] leading-none text-white">Developers</p>
          <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-primary">
            event injector · {party.toUpperCase()} campaign
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost flex h-7 w-7 items-center justify-center rounded-full p-0"
          aria-label="Close developer panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <div>
          <p className="label-xs mb-1.5">
            War chest · <span className="num text-primary">${Math.round(funds || 0)}M</span>
          </p>
          <div className="flex flex-wrap gap-1">
            {[10, 50, 200].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onGiveCash(n)}
                className="btn-ghost px-2.5 py-1 text-[11px] font-extrabold"
              >
                +${n}M
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="label-xs mb-1.5">Campaign controls · instant developer actions</p>
          <div className="grid grid-cols-2 gap-1">
            <button type="button" onClick={() => onDeveloperAction('autopersuade')} className="btn-gold px-2 py-1.5 text-[10px]">Auto persuade swing states</button>
            <button type="button" onClick={() => onDeveloperAction('persuade-all')} className="btn-ghost px-2 py-1.5 text-[10px]">Persuade every state</button>
            <button type="button" onClick={() => onDeveloperAction('momentum')} className="btn-ghost px-2 py-1.5 text-[10px]">+25 momentum</button>
            <button type="button" onClick={() => onDeveloperAction('actions')} className="btn-ghost px-2 py-1.5 text-[10px]">Restore weekly actions</button>
            <button type="button" onClick={() => onDeveloperAction('turnout', 20)} className="btn-ghost px-2 py-1.5 text-[10px]">+20 turnout everywhere</button>
            <button type="button" onClick={() => onDeveloperAction('fatigue')} className="btn-ghost px-2 py-1.5 text-[10px]">Clear campaign fatigue</button>
          </div>
        </div>

        <div>
          <p className="label-xs mb-1.5">State fatigue · hidden from the player</p>
          <FatigueTable game={game} />
        </div>

        <div>
          <p className="label-xs mb-1.5">Everything else · {decisions.length} cards</p>
          <div className="space-y-1">
            {decisions.map((e) => (
              <Row key={e.id} event={e} party={party} onTrigger={onTrigger} />
            ))}
          </div>
        </div>
      </div>

      <p className="border-t border-white/10 px-3 py-2 font-mono text-[9px] leading-relaxed text-slate-500">
        Triggers replace this week’s open card. Nothing here is saved to the game until you choose or advance.
      </p>
    </div>
  );
}
