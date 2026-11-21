import React, { useState } from 'react';
import { Newspaper, ArrowRight, TrendingUp, TrendingDown, Flame, MapPin, Repeat, ChevronDown, ChevronUp, Archive } from 'lucide-react';
import { CARD_BY_ID, NATIONAL_ARCS } from '@/data/nationalNews';
import { STATE_BY_ABBR } from '@/data/states';
import SpotArt from '@/components/ui/spot-art';

const round1 = (v) => Math.round(v * 10) / 10;

function side(v) {
  return v >= 0 ? 'D' : 'R';
}

function signed(v) {
  return `${v >= 0 ? '+' : '−'}${Math.abs(round1(v))}`;
}

// One line of what the story did, in the game's own terms.
function EffectRows({ card, game }) {
  const rows = [];
  if (card.nat) {
    rows.push({
      key: 'env',
      good: card.nat > 0,
      text: `The national environment moves ${round1(Math.abs(card.nat)).toFixed(1)} toward the ${
        card.nat > 0 ? 'Democrats' : 'Republicans'
      }`,
    });
  }
  if (card.gen) {
    rows.push({
      key: 'gen',
      good: card.gen > 0,
      text: `The generic ballot moves with it in all fifty states${card.swing ? ', hardest in the battlegrounds' : ''}`,
    });
  }
  if (card.mom) {
    rows.push({
      key: 'mom',
      good: card.mom > 0,
      text: `Your campaign's momentum ${signed(card.mom)}`,
    });
  }
  if (card.states) {
    Object.entries(card.states).forEach(([abbr, amount]) => {
      rows.push({
        key: `s-${abbr}`,
        good: amount > 0,
        text: `${STATE_BY_ABBR[abbr]?.name || abbr} ${signed(amount)}`,
      });
    });
  }
  if (card.fourPartyFavor) {
    const label = card.fourPartyFavor.party === 'lib' ? 'Libertarian' : 'Green';
    rows.push({
      key: 'four-party-national',
      good: true,
      text: `National vote share shifts ${card.fourPartyFavor.points.toFixed(1)} points toward the ${label} candidate`,
    });
  }

  return (
    <div className="mt-4 space-y-1.5">
      {rows.map((r) => (
        <div
          key={r.key}
          className="flex items-start gap-1.5 text-[12px] font-extrabold leading-snug"
          style={{ color: r.good ? '#6EE7B7' : '#FDA4AF' }}
        >
          {r.good ? <TrendingUp className="mt-[1px] h-3.5 w-3.5 shrink-0" /> : <TrendingDown className="mt-[1px] h-3.5 w-3.5 shrink-0" />}
          <span>{r.text}</span>
        </div>
      ))}
    </div>
  );
}

// The story that is still paying out, week after week.
function ArcNote({ game, card }) {
  const starting = card.arc ? NATIONAL_ARCS[card.arc] : null;
  const running = game.arc;
  const ended = card.end ? NATIONAL_ARCS[card.end] : null;

  if (starting) {
    return (
      <div
        className="mt-4 rounded-xl border px-3 py-2"
        style={{ borderColor: `${starting.color}66`, backgroundColor: `${starting.color}14` }}
      >
        <p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: starting.color }}>
          <Repeat className="h-3 w-3" /> This becomes a running story
        </p>
        <p className="mt-1 font-heading text-[14px] leading-tight text-white">{starting.label}</p>
        <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-300">{starting.note}</p>
        <p className="mt-1 num text-[11px] font-extrabold text-slate-400">
          {signed(starting.perWeek)} a week, for up to {starting.weeks} weeks — and nobody can campaign it away.
        </p>
      </div>
    );
  }

  if (ended) {
    return (
      <p className="mt-4 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-[11.5px] font-extrabold text-slate-300">
        That ends the run on “{ended.label}.” The country finds something else to worry about.
      </p>
    );
  }

  if (running) {
    return (
      <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-black/25 px-3 py-1.5">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-extrabold text-slate-200">
          <Flame className="h-3 w-3 shrink-0" style={{ color: running.color }} />
          <span className="truncate">{running.label}</span>
        </span>
        <span className="num shrink-0 text-[10.5px] font-extrabold text-slate-400">
          {signed(running.perWeek)}/wk · {running.weeksLeft} left
        </span>
      </div>
    );
  }

  return null;
}

// The national desk, before the week's own card.
export default function NationalNewsCard({ card, game, onContinue, isNew = false }) {
  const [expanded, setExpanded] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [archiveStoryId, setArchiveStoryId] = useState(null);
  if (!card) return null;

  const archive = (game.natNewsLog || []).slice(0, -1).reverse().slice(0, 12);
  const effects = [];
  if (card.nat) effects.push(`${signed(card.nat)} national environment`);
  if (card.gen) effects.push(`${signed(card.gen)} generic ballot`);
  if (card.mom) effects.push(`${signed(card.mom)} momentum`);
  if (card.states) effects.push(`${Object.keys(card.states).length} state effect${Object.keys(card.states).length === 1 ? '' : 's'}`);
  const archivedStory = archiveStoryId ? CARD_BY_ID[archiveStoryId] : null;

  return (
    <section className="panel panel-gold mb-3 p-2.5 sm:p-3" data-testid="national-news" aria-label="National news desk">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-primary">
          <Newspaper className="h-3.5 w-3.5" /> News Desk
          {isNew && <span className="chip chip-gold ml-1">New this week</span>}
        </p>
        <p className="num text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Week {game.week + 1} · {card.desk}</p>
      </div>

      <div className="mt-1.5 flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-black/25 text-base">
          <SpotArt symbol={card.icon} className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[14px] leading-tight text-white">{card.headline}</h2>
          <p className="mt-0.5 text-[10.5px] font-semibold leading-snug text-slate-400">{expanded ? card.body : `${card.body.slice(0, 150)}${card.body.length > 150 ? '…' : ''}`}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {effects.length ? effects.map((effect) => <span key={effect} className="chip">{effect}</span>) : <span className="chip">No direct campaign effect</span>}
            {card.swing && <span className="chip"><MapPin className="mr-[2px] inline h-2.5 w-2.5" /> battlegrounds</span>}
          </div>
        </div>
      </div>

      {expanded && <><EffectRows card={card} game={game} /><ArcNote game={game} card={card} /></>}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="btn-ghost flex items-center gap-1 px-2 py-1 text-[10.5px] font-bold">
          {expanded ? 'Collapse brief' : 'Expand brief'} {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {isNew && <button type="button" onClick={onContinue} className="btn-ghost flex items-center gap-1 px-2 py-1 text-[10.5px] font-bold">Acknowledge report <ArrowRight className="h-3 w-3" /></button>}
        <button type="button" aria-expanded={showArchive} onClick={() => setShowArchive((value) => !value)} className="btn-ghost ml-auto flex items-center gap-1 px-2 py-1 text-[10.5px] font-bold">
          <Archive className="h-3 w-3" /> News history ({archive.length}) {showArchive ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {showArchive && <div className="mt-2 grid gap-1.5 border-t border-white/10 pt-2 sm:grid-cols-2">
        {archive.map((id) => {
          const item = CARD_BY_ID[id];
          if (!item) return null;
          return <button key={id} type="button" onClick={() => setArchiveStoryId((current) => current === id ? null : id)} className="rounded-lg border border-white/10 bg-black/15 px-2 py-1.5 text-left text-[10.5px] font-semibold text-slate-300 hover:bg-white/5">{item.headline}</button>;
        })}
        {archivedStory && <div className="sm:col-span-2 rounded-lg border border-white/10 bg-black/20 p-2"><p className="font-heading text-[12px] text-white">{archivedStory.headline}</p><p className="mt-1 text-[10.5px] leading-snug text-slate-400">{archivedStory.body}</p><p className="mt-1 text-[10px] font-bold text-slate-500">Effect applied when filed; opening the archive does not replay it.</p></div>}
      </div>}
    </section>
  );
}
