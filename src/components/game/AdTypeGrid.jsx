import React from 'react';
import { AD_TYPE_LIST, adCost } from '@/lib/gameEngine';
import SpotArt from '@/components/ui/spot-art';

const round1 = (v) => Math.round(v * 10) / 10;

// The five ways to spend money in a state. Price and payoff both change with the
// medium, so the price is printed on each row against the current buy — and a buy
// in several states is simply the sum of each state's own price.
export default function AdTypeGrid({ game, abbr = null, abbrs, kind, value, onChange, accent }) {
  const targets = abbrs && abbrs.length ? abbrs : abbr ? [abbr] : [];
  return (
    <div className="grid grid-cols-1 gap-1.5">
      {AD_TYPE_LIST.map((t) => {
        const active = value === t.id;
        const cost = game.campaignPerks?.corruptionAd ? 0 : round1(targets.reduce((sum, target) => sum + adCost(game, target, t.id, kind), 0));
        return (
          <button
            key={t.id}
            type="button"
            data-testid={`ad-type-${t.id}`}
            onClick={() => onChange(t.id)}
            className="panel-lite flex items-start gap-2 px-2 py-1.5 text-left transition-colors hover:bg-white/10"
            style={active ? { borderColor: accent, backgroundColor: `${accent}26` } : undefined}
          >
            <SpotArt symbol={t.icon} className="h-5 w-5" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-[11.5px] font-extrabold text-white">{t.label}</span>
                <span className="num shrink-0 text-[11px] font-extrabold text-amber-200">${cost}M</span>
              </span>
              <span className="block text-[9.5px] font-bold leading-snug text-slate-400">{t.blurb}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
