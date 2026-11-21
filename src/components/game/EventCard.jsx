import React, { useEffect, useRef } from 'react';
import { TONE_STYLES } from '@/data/events';
import { GROUP_BY_ID } from '@/data/demographics';
import { scandalWord } from '@/lib/gameEngine';
import { Coins, Flame, Skull, Sparkles, Users, TrendingDown, AlertTriangle, GitBranch } from 'lucide-react';
import SpotArt from '@/components/ui/spot-art';
import StaffMention from '@/components/game/StaffMention';

const REGION_LABELS = { northeast: 'Northeast', south: 'South', midwest: 'Midwest', west: 'West' };
const EFFECT_TONES = {
  positive: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300',
  negative: 'border-rose-400/50 bg-rose-400/10 text-rose-300',
  neutral: 'border-slate-400/50 bg-slate-400/10 text-slate-200',
};

function PresentedEffects({ effects, testId }) {
  if (!effects?.length) return null;

  return (
    <span className="mt-2 flex flex-wrap gap-1" data-testid={testId}>
      {effects.map(({ text, tone }, index) => (
        <span
          key={`${text}-${index}`}
          className={`min-w-0 max-w-full break-words rounded-lg border px-2 py-0.5 text-[11px] font-semibold leading-snug ${EFFECT_TONES[tone] || EFFECT_TONES.neutral}`}
        >
          {text}
        </span>
      ))}
    </span>
  );
}

function EffectChips({ effects }) {
  const chips = [];
  if (effects.mom) {
    chips.push({
      key: 'mom',
      icon: effects.mom > 0 ? <Flame className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />,
      text: `Momentum ${effects.mom > 0 ? '+' : ''}${effects.mom}`,
      good: effects.mom > 0,
    });
  }
  if (effects.oppMom) {
    chips.push({
      key: 'opp',
      icon: <Skull className="h-3 w-3" />,
      text: `Their momentum ${effects.oppMom > 0 ? '−' : '+'}${Math.abs(effects.oppMom)}`,
      good: effects.oppMom > 0,
    });
  }
  if (effects.funds) {
    chips.push({
      key: 'funds',
      icon: <Coins className="h-3 w-3" />,
      text: `${effects.funds > 0 ? '+' : '−'}$${Math.abs(effects.funds)}M`,
      good: effects.funds > 0,
    });
  }
  if (effects.region) {
    Object.entries(effects.region).forEach(([r, v]) => {
      chips.push({
        key: 'r-' + r,
        icon: <Sparkles className="h-3 w-3" />,
        text: `${REGION_LABELS[r] || r} ${v > 0 ? '+' : ''}${v}`,
        good: v > 0,
      });
    });
  }
  if (effects.states) {
    Object.entries(effects.states).forEach(([abbr, v]) => {
      chips.push({
        key: 's-' + abbr,
        icon: <Sparkles className="h-3 w-3" />,
        text: `${abbr} ${v > 0 ? '+' : ''}${v}`,
        good: v > 0,
      });
    });
  }
  if (effects.groups) {
    Object.entries(effects.groups).forEach(([id, v]) => {
      chips.push({
        key: 'g-' + id,
        icon: <Users className="h-3 w-3" />,
        text: `${GROUP_BY_ID[id]?.short || id} ${v > 0 ? '+' : ''}${v}`,
        good: v > 0,
      });
    });
  }
  if (effects.turnout) {
    const total = Object.values(effects.turnout).reduce((a, b) => a + b, 0);
    chips.push({
      key: 'turnout',
      icon: <Users className="h-3 w-3" />,
      text: `Turnout ${total > 0 ? '+' : ''}${Math.round(total * 10) / 10}`,
      good: total > 0,
    });
  }
  if (effects.nextAdMultiplier) chips.push({ key: 'ad-multiplier', icon: <TrendingDown className="h-3 w-3 rotate-180" />, text: `Next ad ×${effects.nextAdMultiplier}${effects.nextAdIssue ? ` · ${effects.nextAdIssue}` : ''}`, good: true });
  if (effects.freeAds) chips.push({ key: 'free-ads', icon: <Coins className="h-3 w-3" />, text: `${effects.freeAds} free ad${effects.freeAds === 1 ? '' : 's'}`, good: true });
  if (effects.groundState) chips.push({ key: 'ground-state', icon: <Users className="h-3 w-3" />, text: `${effects.groundState.state} ground game +${effects.groundState.levels || 1}`, good: true });
  if (effects.stanceContract) chips.push({ key: 'stance-contract', icon: <GitBranch className="h-3 w-3" />, text: `Change ${effects.stanceContract.issueId} · +$${effects.stanceContract.donation}M · extra conversion`, good: true });
  if (effects.corruptionAd) chips.push({ key: 'corruption-ad', icon: <GitBranch className="h-3 w-3" />, text: 'Refuse PAC · next corruption ad is free', good: true });
  if (effects.issueFavor) chips.push({ key: 'issue-favor', icon: effects.issueFavor > 0 ? <Sparkles className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />, text: `${effects.issueFavor > 0 ? 'Agreement +' : 'Agreement −'} on a random issue`, good: effects.issueFavor > 0 });

  return (
    <span className="mt-2 flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c.key}
          className="flex items-center gap-1 rounded-full border px-2 py-[1px] text-[10px] font-extrabold"
          style={{
            borderColor: c.good ? 'rgba(52,211,153,0.45)' : 'rgba(251,113,133,0.45)',
            backgroundColor: c.good ? 'rgba(52,211,153,0.13)' : 'rgba(251,113,133,0.13)',
            color: c.good ? '#6EE7B7' : '#FDA4AF',
          }}
        >
          {c.icon}
          <span className="capitalize">{c.text}</span>
        </span>
      ))}
      {effects.risk ? (
        <span className="flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-[1px] text-[10px] font-extrabold uppercase tracking-wide text-amber-300">
          <AlertTriangle className="h-3 w-3" /> Scandal risk: {scandalWord(effects.risk)}
        </span>
      ) : null}
    </span>
  );
}

export default function EventCard({ game, event, onChoose, outcome = null, disabled = false, hero = false, why = null, progress = null }) {
  const headingRef = useRef(null);
  useEffect(() => {
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const fromAction = !active || active === document.body || active.tagName === 'BUTTON' || active.hasAttribute?.('disabled');
    if (fromAction && headingRef.current) {
      headingRef.current.focus({ preventScroll: false });
    }
  }, [event?.id]);

  const tone = TONE_STYLES[event.tone] || TONE_STYLES.wild;
  const legacyOutcome = !event.context && !outcome?.presentation;

  return (
    <div
      className={`panel animate-pop-in overflow-hidden ${hero ? 'p-5 sm:p-7' : 'p-4 sm:p-5'}`}
      style={{ backgroundColor: tone.bg, borderColor: `${tone.border}66` }}
      data-testid="event-stage"
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/25 ${
            hero ? 'h-14 w-14 text-3xl' : 'h-11 w-11 text-2xl'
          }`}
        >
          <SpotArt symbol={event.icon} className="h-full w-full" />
        </div>
        <div className="min-w-0">
          <p
            className="inline-block rounded-full px-2 py-[1px] text-[9px] font-extrabold uppercase tracking-[0.16em] text-white"
            style={{ backgroundColor: tone.chip }}
          >
            {event.kicker}
          </p>
          {progress && <span className="chip ml-1 align-middle">Event {progress.current} of {progress.total}</span>}
          <h2 ref={headingRef} tabIndex={-1}
            className={`mt-1 font-heading font-normal leading-[1.08] ${
              hero ? 'text-2xl sm:text-[34px]' : 'text-xl sm:text-[22px]'
            }`}
          >
            <StaffMention game={game} text={event.title} />
          </h2>
        </div>
      </div>

      {why && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-dashed border-white/25 bg-black/25 px-2.5 py-1.5 text-[11px] font-semibold leading-snug text-slate-300">
          <GitBranch className="mt-[2px] h-3 w-3 shrink-0 text-primary" />
          <span>
            <span className="mr-1 font-extrabold uppercase tracking-[0.1em] text-[9px] text-slate-500">Why now</span>
            <StaffMention game={game} text={why} />
          </span>
        </p>
      )}

      <p
        className={`mt-2 font-medium leading-relaxed text-slate-200/90 ${
          hero ? 'text-[14px] sm:text-[15px]' : 'text-[13px]'
        }`}
      >
        <StaffMention game={game} text={event.text} />
      </p>

      {!outcome ? (
        <div className={`mt-4 ${hero ? 'space-y-2.5' : 'space-y-2'}`}>
          {event.choices.map((c, i) => {
            const legacyChoice = !event.context && !c.presentation;
            const detail = c.unavailable || c.detail;

            return (
              <button
                key={c.id || c.label}
                type="button"
                data-testid="choice"
                disabled={disabled || Boolean(c.unavailable)}
                onClick={() => onChoose(c)}
                className={`panel-lite block w-full text-left transition-transform duration-150 hover:-translate-y-[1px] hover:bg-white/10 disabled:opacity-50 disabled:hover:translate-y-0 ${
                  hero ? 'p-3.5 sm:p-4' : 'p-3'
                }`}
              >
                <span className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
                    style={{ backgroundColor: tone.chip }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-heading leading-tight text-white ${hero ? 'text-[15px] sm:text-[16px]' : 'text-[14px]'}`}>
                      <StaffMention game={game} text={c.displayLabel || c.label} />
                    </span>
                    {detail && (
                      <span className={`block font-semibold text-slate-400 ${hero ? 'text-[11.5px] sm:text-[12px]' : 'text-[11px]'}`}>
                        <StaffMention game={game} text={detail} />
                      </span>
                    )}
                    <PresentedEffects effects={c.presentation?.effects} testId="event-choice-presentation" />
                    {legacyChoice && !c.unavailable && <EffectChips effects={c.effects || {}} />}
                    {legacyChoice && c.roll ? (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-fuchsia-400/50 bg-fuchsia-400/10 px-2 py-[1px] text-[10px] font-extrabold uppercase tracking-wide text-fuchsia-300">
                        <AlertTriangle className="h-3 w-3" /> Coin flip — nobody knows which way it lands
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 animate-pop-in rounded-xl border border-white/15 bg-black/30 p-3" data-testid="event-outcome">
          <p className="label-xs">You chose</p>
          <p className="font-heading text-[14px] leading-tight text-white"><StaffMention game={game} text={outcome.label} /></p>
          {outcome.text && (
            <p className="mt-1 text-[13px] font-medium leading-relaxed text-slate-200/90"><StaffMention game={game} text={outcome.text} /></p>
          )}
          <PresentedEffects effects={outcome.presentation?.effects} testId="event-outcome-presentation" />
          {legacyOutcome && outcome.scandal ? (
            <p className="mt-2 rounded-lg border border-amber-400/50 bg-amber-400/10 px-2 py-1 text-[11px] font-extrabold text-amber-300">
              Scandal — {outcome.scandal.level}. Momentum −{outcome.scandal.hit}.
            </p>
          ) : null}
          {legacyOutcome && outcome.followUp ? (
            <p className="mt-2 rounded-lg border border-fuchsia-400/40 bg-fuchsia-400/10 px-2 py-1 text-[11px] font-extrabold text-fuchsia-200">
              <GitBranch className="mr-1 inline h-3 w-3" />
              {outcome.followUp.teaser || 'This one is not finished with you.'} It lands in{' '}
              {outcome.followUp.weeks} week{outcome.followUp.weeks > 1 ? 's' : ''}.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
