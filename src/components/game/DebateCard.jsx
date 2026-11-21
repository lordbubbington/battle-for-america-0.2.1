import React from 'react';
import { Mic, ArrowRight, AlertTriangle, TrendingUp, TrendingDown, Brain, Radio } from 'lucide-react';
import { prepAnswerBonus, prepGaffeScale } from '@/lib/gameEngine';
import { publicAssetUrl } from '@/lib/publicAssetUrl';

const REGION_LABELS = { northeast: 'Northeast', south: 'South', midwest: 'Midwest', west: 'West' };

function DebateFigure({ candidate, accent, active, side }) {
  const name = candidate?.short || candidate?.name || (side === 'left' ? 'Your candidate' : 'Opponent');
  return (
    <div className={'debate-figure debate-figure-' + side + (active ? ' is-speaking' : '')}>
      <span className="debate-figure-status">{active ? 'YOUR TURN' : 'LISTENING'}</span>
      <div className="debate-portrait-wrap" style={{ borderColor: accent, boxShadow: '0 0 0 3px ' + accent + '24' }}>
        {candidate?.portrait ? (
          <img className="debate-portrait" src={publicAssetUrl(candidate.portrait)} alt={name} draggable="false" />
        ) : (
          <span className="debate-portrait-fallback">{name.slice(0, 1)}</span>
        )}
      </div>
      <div className="debate-podium" style={{ borderTopColor: accent }}>
        <span className="debate-podium-mark" style={{ backgroundColor: accent }} />
        <span>{name}</span>
      </div>
    </div>
  );
}

function DebateArena({ def, debate, you, them, accent, oppAccent, verdict = null }) {
  const score = debate.picks.reduce((sum, pick) => sum + (pick.mom || 0), 0);
  const marker = Math.max(12, Math.min(88, 50 + score * 4));
  const latest = debate.picks.at(-1);
  const response = latest?.reply;
  const roomRead = verdict
    ? verdict.tier === 'win' ? 'Your side owned the room' : verdict.tier === 'edge' ? 'A narrow edge on the snap poll' : verdict.tier === 'draw' ? 'The audience stayed split' : 'The opponent won the room'
    : debate.picks.length === 0 ? 'The room is waiting for your first answer'
    : score >= 5 ? 'The room is turning your way'
    : score >= 1 ? 'A favorable reaction in the hall'
    : score > -2 ? 'The audience is split'
    : 'The opponent is landing punches';

  return (
    <section className="debate-arena" aria-label="Live debate stage">
      <div className="debate-arena-topline">
        <span className="debate-on-air"><i /> {verdict ? 'DEBATE RECAP' : 'LIVE FROM THE STAGE'}</span>
        <span className="debate-arena-venue">{def.venue}</span>
      </div>
      <div className="debate-stage-floor">
        <DebateFigure candidate={you} accent={accent} active={!verdict} side="left" />
        <div className="debate-stage-center">
          <div className="debate-stage-mic"><Mic className="h-5 w-5" /></div>
          <span className="debate-vs">VS</span>
          <div className="debate-audience" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <i
                key={i}
                style={/** @type {import('react').CSSProperties & { '--crowd-delay'?: string }} */ ({ '--crowd-delay': `${(i % 4) * 90}ms` })}
              />
            ))}
          </div>
        </div>
        <DebateFigure candidate={them} accent={oppAccent} active={false} side="right" />
      </div>
      <div className="debate-room-read">
        <div className="debate-room-read-label">
          <span><Radio className="h-3 w-3" /> ROOM READ</span>
          <strong>{roomRead}</strong>
        </div>
        <div className="debate-reaction-track" aria-label={'Audience response: ' + roomRead}>
          <span className="debate-reaction-left" style={{ width: marker + '%', backgroundColor: accent }} />
          <span className="debate-reaction-right" style={{ left: marker + '%', backgroundColor: oppAccent }} />
          <i style={{ left: marker + '%' }} />
        </div>
      </div>
      {latest?.rivalAnswer?.correction && <p className="debate-live-reaction">{them.short} said “{latest.rivalAnswer.claim}” {latest.rivalAnswer.correction}</p>}
      {latest?.factCheck?.correction && <p className="debate-live-reaction">{latest.factCheck.correction}</p>}
      {response ? (
        <p className="debate-live-reaction"><Radio className="h-3 w-3 shrink-0" /><span>CLIP FROM THE HALL</span>{response}</p>
      ) : (
        <p className="debate-live-reaction"><Radio className="h-3 w-3 shrink-0" /><span>THE MODERATOR</span>{def.title} is underway. The room is listening for a clear answer.</p>
      )}
    </section>
  );
}

function Chips({ effects }) {
  const chips = [];
  if (effects.mom) {
    chips.push({
      key: 'mom',
      icon: effects.mom > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />,
      text: `You ${effects.mom > 0 ? '+' : ''}${effects.mom}`,
      good: effects.mom > 0,
    });
  }
  if (effects.oppMom) {
    chips.push({
      key: 'opp',
      icon: <TrendingDown className="h-3 w-3" />,
      text: `Them ${effects.oppMom > 0 ? '−' : '+'}${Math.abs(effects.oppMom)}`,
      good: effects.oppMom > 0,
    });
  }
  Object.entries(effects.region || {}).forEach(([r, v]) => {
    chips.push({ key: `r-${r}`, icon: null, text: `${REGION_LABELS[r] || r} ${v > 0 ? '+' : ''}${v}`, good: v > 0 });
  });
  Object.entries(effects.states || {}).forEach(([s, v]) => {
    chips.push({ key: `s-${s}`, icon: null, text: `${s} ${v > 0 ? '+' : ''}${v}`, good: v > 0 });
  });

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c.key}
          className="flex items-center gap-1 rounded-full border px-1.5 py-[1px] text-[9.5px] font-extrabold"
          style={{
            borderColor: c.good ? 'rgba(52,211,153,0.4)' : 'rgba(251,113,133,0.4)',
            backgroundColor: c.good ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)',
            color: c.good ? '#6EE7B7' : '#FDA4AF',
          }}
        >
          {c.icon}
          {c.text}
        </span>
      ))}
      {effects.risk ? (
        <span className="flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-400/10 px-1.5 py-[1px] text-[9.5px] font-extrabold text-amber-300">
          <AlertTriangle className="h-2.5 w-2.5" /> Gaffe risk
        </span>
      ) : null}
    </div>
  );
}

export default function DebateCard({ def, debate, onAnswer, accent, oppAccent, them, you, prep = 0, hero = false }) {
  const total = def.questions.length;

  if (debate.done) {
    const v = debate.verdict || { label: 'Debate over', text: '', tier: 'draw' };
    const tierColor =
      v.tier === 'win' ? '#6EE7B7' : v.tier === 'edge' ? '#F7C145' : v.tier === 'draw' ? '#A8B6D0' : '#FDA4AF';
    return (
      <div className="panel animate-pop-in overflow-hidden p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="chip" style={{ borderColor: `${accent}66`, color: '#FFDA8A' }}>
            <Mic className="h-2.5 w-2.5" /> {def.night}
          </p>
          <span className="label-xs">Verdict</span>
        </div>
        <DebateArena def={def} debate={debate} you={you} them={them} accent={accent} oppAccent={oppAccent} verdict={v} />
        <h2 className="mt-1.5 font-heading text-[19px] leading-tight" style={{ color: tierColor }}>
          {v.label}
        </h2>
        <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-slate-300">{v.text}</p>

        <div className="mt-2 space-y-1">
          {debate.picks.map((p, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
              <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-extrabold text-white">
                Q{i + 1} Â· {p.label}
                {p.prep > 0 && <span className="chip chip-gold">Prep +{p.prep}</span>}
                <span className="num" style={{ color: p.mom >= 0 ? '#6EE7B7' : '#FDA4AF' }}>
                  {p.mom >= 0 ? '+' : '−'}
                  {Math.abs(p.mom)} momentum
                </span>
              </p>
              {p.reply && <p className="text-[10.5px] font-semibold leading-snug text-slate-400">{p.reply}</p>}
              {p.evasive && <p className="mt-0.5 text-[10px] font-extrabold text-amber-200">Evasive response to: “{p.question}”</p>}
              {p.clip?.status === 'widely-shared' && <p className="mt-0.5 text-[10px] font-extrabold text-sky-200">The clip cleared the game’s sharing threshold.</p>}
              {p.promise?.text && <p className="mt-0.5 text-[10px] font-semibold text-emerald-200">Recorded promise: “{p.promise.text}”</p>}
              {p.groupShifts && <p className="mt-0.5 text-[10px] font-semibold text-violet-200">Group response: {Object.entries(p.groupShifts).map(([group, value]) => `${group} ${value > 0 ? '+' : ''}${value}`).join(' · ')}</p>}
              {p.scandal && (
                <p className="mt-0.5 text-[10px] font-extrabold text-amber-300">
                  Clip follows you — {p.scandal.level}, momentum −{p.scandal.hit}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10.5px] font-semibold text-slate-500">
          {them.short}’s team spent the spin room calling it “a draw”. Nobody believes them either.
        </p>
      </div>
    );
  }

  const q = def.questions[debate.step];

  return (
    <div
      className={`panel animate-pop-in overflow-hidden ${hero ? 'p-4 sm:p-6' : 'p-3.5'}`}
      style={{ borderColor: `${accent}66` }}
      data-testid="debate-stage"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="chip chip-gold">
          <Mic className="h-2.5 w-2.5" /> {def.night}
        </p>
        <div className="flex items-center gap-1.5">
          {prep > 0 && (
            <span className="chip" style={{ borderColor: `${accent}88`, color: '#FFDA8A' }}>
              <Brain className="h-2.5 w-2.5" /> Prep ×{prep}
            </span>
          )}
          <span className="num text-[10px] font-extrabold text-slate-400">
            Question {debate.step + 1} of {total}
          </span>
        </div>
      </div>
      <h2
        className={`mt-1.5 font-heading leading-tight text-white ${hero ? 'text-2xl sm:text-4xl' : 'text-[19px]'}`}
      >
        {def.title}
      </h2>
      <p className={`font-bold uppercase tracking-wide text-slate-500 ${hero ? 'text-[11px]' : 'text-[10.5px]'}`}>
        {def.venue}
      </p>
      {hero && <p className="mt-1 text-[12.5px] font-semibold leading-snug text-slate-400">{def.stakes}</p>}

      <DebateArena def={def} debate={debate} you={you} them={them} accent={accent} oppAccent={oppAccent} />
      <div className="mt-2 flex gap-1">
        {def.questions.map((_, i) => (
          <span
            key={i}
            className="h-1 flex-1 rounded-full"
            style={{ backgroundColor: i <= debate.step ? accent : 'rgba(255,255,255,0.15)' }}
          />
        ))}
      </div>

      <p className={`mt-3 font-heading leading-snug text-white ${hero ? 'text-[17px] sm:text-xl' : 'text-[15px]'}`}>
        {q.q}
      </p>

      <div className="mt-2.5 space-y-2">
        {q.answers.map((a, i) => (
          <button
            key={a.label}
            type="button"
            disabled={Boolean(a.unavailable)}
            onClick={() => onAnswer(a)}
            className={`panel-lite block w-full text-left transition-transform duration-150 hover:-translate-y-[1px] hover:bg-white/10 ${
              hero ? 'p-3' : 'p-2.5'
            }`}
          >
            <div className="flex items-start gap-2">
              <span
                className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
                style={{ backgroundColor: accent }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className={`font-heading leading-tight text-white ${hero ? 'text-[15px]' : 'text-[13px]'}`}>
                    {a.label}
                  </p>
                  <span className="chip">{a.tag}</span>
                </div>
                <p
                  className={`mt-0.5 font-semibold leading-snug text-slate-400 ${hero ? 'text-[12px]' : 'text-[11px]'}`}
                >
                  {a.unavailable || a.detail}
                </p>
                <Chips effects={a.effects || {}} />
                {a.factionDeltasByParty?.[you?.party]?.length > 0 && <p className="mt-1 text-xs text-slate-300">
                  {a.factionDeltasByParty[you.party].map(({ factionId, approvalPoints }) => factionId + ' ' + (approvalPoints > 0 ? '+' : '') + approvalPoints).join(' · ')} faction approval
                </p>}
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-2 text-center text-[10.5px] font-bold text-slate-500">
        {prep > 0
          ? `Prep banked: +${prepAnswerBonus(prep).toFixed(1)} momentum on every answer, gaffes ${Math.round(
              (1 - prepGaffeScale(prep)) * 100
            )}% less likely.`
          : 'No prep banked — answers land exactly as written.'}
      </p>
      <p className="mt-1 flex items-center justify-center gap-1 text-[10.5px] font-bold text-slate-500">
        <span style={{ color: oppAccent }}>{them.short}</span> is on the same stage — and answering too
        <ArrowRight className="h-3 w-3" />
      </p>
    </div>
  );
}


