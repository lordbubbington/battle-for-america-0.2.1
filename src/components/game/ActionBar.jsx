import React from 'react';
import {
  ACTIONS,
  actionsLeftIn,
  ACTIONS_PER_WEEK,
  DEBATE_PREP_MAX,
  flipCost,
  adCost,
  fundraiseCount,
  fundraiseOutlook,
} from '@/lib/gameEngine';
import { volunteerPrice } from '@/lib/build38Runtime';
import { STATE_BY_ABBR } from '@/data/states';
import { ArrowRight, Brain, Megaphone, Building2, BarChart3 } from 'lucide-react';
import SpotArt from '@/components/ui/spot-art';

export default function ActionBar({ game, selected, onAction, onOpenPanel, onAdvance, accent, isLastWeek, paused = false }) {
  const left = actionsLeftIn(game);
  // A district chip like NE-2 belongs to Nebraska.
  const targetAbbr = selected && selected.includes('-') ? selected.split('-')[0] : selected;
  const targetName = targetAbbr ? STATE_BY_ABBR[targetAbbr]?.name : null;
  const prep = game.debatePrep || 0;
  const flip = flipCost(game);
  const adFrom = targetAbbr ? adCost(game, targetAbbr, 'billboard', 'pro') : null;
  const room = targetAbbr ? fundraiseOutlook(game, targetAbbr) : null;
  const raisedHere = targetAbbr ? fundraiseCount(game, targetAbbr) : 0;
  const enhancedVolunteerReady = (game.campaignPerks?.freeVolunteerOps || 0) > 0;

  const costFor = (action) => action.id === 'volunteers' && targetAbbr ? volunteerPrice(targetAbbr) : action.cost;
  const hint = (a) => {
    if (!targetAbbr && a.needsState) return 'Pick a state on the map first.';
    if (a.id === 'visit') return `A rally in ${targetName}.`;
    if (a.id === 'volunteers') return enhancedVolunteerReady
      ? `Faction mobilization in ${targetName}: no cost and 50% stronger turnout.`
      : `$${costFor(a)}M of organizers, vans and phone banks in ${targetName}. Turnout, not headlines.`;
    if (a.id === 'townhall') return `Persuasion marathon in ${targetName}: shift margins from -1.0 to +1.0 points (no turnout effect).`;
    if (a.id === 'shift') return `Move to a new stance. Momentum −${flip.momentum} and votes — worse every time.`;
    if (a.id === 'prep') {
      return prep >= DEBATE_PREP_MAX
        ? `Three sessions banked — that is the ceiling for one debate.`
        : `Bank a prep session (${prep} of ${DEBATE_PREP_MAX}). Answers land harder on debate night.`;
    }
    if (a.id === 'fundraise') {
      if (!room) return 'Pick a state first — the donors are local.';
      return room.count === 0
        ? `$${room.cash}M from a fresh room of donors in ${targetName}. Momentum −3.`
        : `$${room.cash}M — trip ${room.count + 1}. Each repeat visit is worth 8% less. Momentum −3.`;
    }
    return a.blurb;
  };

  const blocked = (a) => {
    if (paused) return true;
    if (left <= 0) return true;
    if (a.panel === 'shift') return false;
    if (a.needsState && !targetAbbr) return true;
    if (costFor(a) > game.funds && !(a.id === 'volunteers' && enhancedVolunteerReady)) return true;
    if (a.id === 'prep' && prep >= DEBATE_PREP_MAX) return true;
    return false;
  };

  return (
    <div className="panel p-3" data-testid="action-bar">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-[15px] text-white">Your week in the field</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`chip ${left > 0 ? 'chip-gold' : ''}`}>
            {left} of {ACTIONS_PER_WEEK} actions left
          </span>
          {prep > 0 && <span className="chip chip-gold"><Brain className="h-3 w-3" /> Prep ×{prep}</span>}
          <span className="chip num">${Math.round(game.funds)}M</span>
        </div>
      </div>

      <button
        type="button"
        disabled={!targetAbbr || paused}
        onClick={() => onOpenPanel('ads')}
        className="panel-lite mb-2 flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:border-white/25 hover:bg-white/10 disabled:opacity-40"
        data-testid="ad-buys"
      >
        <Megaphone className="h-4 w-4" style={{ color: '#F7C145' }} />
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-[13px] leading-none text-white">Buy ads</span>
          <span className="block text-[10.5px] font-semibold text-slate-400">
            {targetAbbr
              ? `Money only — no action spent. From $${adFrom}M in ${targetName}.`
              : 'Pick a state, then buy airtime. Money only, no action spent.'}
          </span>
        </span>
        <span className="chip">No action cost</span>
      </button>

      <button
        type="button"
        onClick={() => onOpenPanel('ground-game')}
        className="panel-lite mb-2 flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:border-white/25 hover:bg-white/10"
        data-testid="ground-game"
      >
        <Building2 className="h-4 w-4 text-emerald-300" />
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-[13px] leading-none text-white">Ground Game</span>
          <span className="block text-[10.5px] font-semibold text-slate-400">
            Plan and buy permanent field upgrades across eligible states.
          </span>
        </span>
        <span className="chip">No action cost</span>
      </button>

      <button
        type="button"
        onClick={() => onOpenPanel('detailed-polling')}
        className="panel-lite mb-2 flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:border-white/25 hover:bg-white/10"
        data-testid="detailed-polling"
      >
        <BarChart3 className="h-4 w-4 text-sky-300" />
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-[13px] leading-none text-white">Detailed Polling</span>
          <span className="block text-[10.5px] font-semibold text-slate-400">
            {targetAbbr ? `Read the current modeled voter sample for ${targetName}.` : 'Free, up-to-date voter samples for any state.'}
          </span>
        </span>
        <span className="chip">Free</span>
      </button>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            data-testid={`action-${a.id}`}
            disabled={blocked(a)}
            id={'campaign-action-' + a.id}
            onClick={() => (a.panel ? onOpenPanel(a.panel) : onAction(a.id))}
            className="panel-lite p-2.5 text-left transition-transform duration-150 hover:-translate-y-[2px] hover:border-white/25 hover:bg-white/10 disabled:opacity-40 disabled:hover:translate-y-0"
          >
            <div className="flex items-start gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-black/30 text-[13px]">
                <SpotArt symbol={a.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-[13px] leading-none text-white">{a.label}</p>
                <p className="mt-1 text-[10.5px] font-semibold leading-snug text-slate-400">{hint(a)}</p>
              </div>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {costFor(a) > 0 && !(a.id === 'volunteers' && enhancedVolunteerReady) && (
                <span className="chip" style={{ color: '#FDA4AF', borderColor: 'rgba(251,113,133,0.45)' }}>
                  −${costFor(a)}M
                </span>
              )}
              {a.id === 'volunteers' && enhancedVolunteerReady && <span className="chip chip-gold">Faction boost</span>}
              {a.needsState && targetName && (
                <span className="chip" style={{ color: accent, borderColor: `${accent}66` }}>
                  {targetName}
                </span>
              )}
              {a.id === 'fundraise' && targetAbbr && (
                <span
                  className="chip"
                  style={{ color: raisedHere ? '#FCD34D' : '#6EE7B7', borderColor: raisedHere ? 'rgba(252,211,77,0.5)' : 'rgba(110,231,183,0.45)' }}
                >
                  {raisedHere}× here · ${room?.cash}M
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {paused && <p className="mt-2 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-2 text-center text-[11px] font-bold text-primary">Resolve the campaign decision above before taking another action.</p>}
      <button type="button" data-testid="advance" disabled={paused} onClick={onAdvance} className="btn-gold mt-3 w-full px-4 py-2.5 text-[15px] disabled:cursor-not-allowed disabled:opacity-45">
        {isLastWeek ? 'Close the campaign' : 'Advance one week'}
        <ArrowRight className="ml-1 inline h-4 w-4" />
      </button>
      {left > 0 && (
        <p className="mt-1.5 text-center text-[10.5px] font-semibold text-slate-500">
          You can advance without spending them — anything unused is lost at the end of the week.
        </p>
      )}
    </div>
  );
}
