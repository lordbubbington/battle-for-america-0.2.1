import React, { useMemo, useState } from 'react';
import { ISSUES_BY_WEIGHT, stateIssueAlignment, stanceLabel } from '@/data/platform';
import { STATE_BY_ABBR } from '@/data/states';
import { X, MessageCircle, ArrowRight, Users, CheckCircle2 } from 'lucide-react';
import SpotArt from '@/components/ui/spot-art';

const PROMPTS = {
  affordability: {
    voter: 'Small-business owner',
    text: '“Groceries, insurance, and utilities all jumped again this year. What concrete relief would families actually feel?”',
  },
  economy: {
    voter: 'Manufacturing technician',
    text: '“Our county lost two major employers in the last decade. How does your plan bring durable, well-paid jobs back here?”',
  },
  health: {
    voter: 'Hospital nurse',
    text: '“Premiums keep climbing while local clinics close. What would you actually change about health care for working families?”',
  },
  corruption: {
    voter: 'Independent voter',
    text: '“Why should voters trust that major donors and lobbyists will not end up writing your agenda once you take office?”',
  },
  immigration: {
    voter: 'County sheriff deputy',
    text: '“How would you balance border enforcement with a workable legal process for communities dealing with the fallout?”',
  },
  rent: {
    voter: 'First-time homebuyer',
    text: '“Rents and mortgage payments have priced out younger residents. How do you make housing affordable again?”',
  },
  prices: {
    voter: 'Retired teacher',
    text: '“On a fixed income, every trip to the store costs more. Should the federal government step in on corporate pricing?”',
  },
  energy: {
    voter: 'Utility lineman',
    text: '“Power bills are surging and grid reliability is slipping. How do you keep electricity affordable without stalling new capacity?”',
  },
  crime: {
    voter: 'Neighborhood business owner',
    text: '“Residents want safer streets and accountable policing at the same time. What does your administration prioritize?”',
  },
};

const RESPONSE_OPTIONS = [
  {
    id: 'direct',
    title: 'Direct policy commitment',
    badge: 'High reward / high risk',
    text: 'Stand firmly on your platform and give a concrete policy pledge.',
    score: (fit) => (fit >= 0.64 ? 2 : fit >= 0.52 ? 0 : -2),
  },
  {
    id: 'connect',
    title: 'Practical local framing',
    badge: 'Steady persuasion',
    text: 'Tie your stance to local pocketbook realities and avoid partisan buzzwords.',
    score: (fit) => (fit >= 0.56 ? 1 : fit >= 0.42 ? 1 : -1),
  },
  {
    id: 'pushback',
    title: 'Sharp contrast & pushback',
    badge: 'Contested-room play',
    text: 'Reframe the premise directly and draw a hard contrast with the opposing party.',
    score: (fit) => (fit <= 0.54 ? 2 : -1),
  },
];

function stableHash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

export default function TownHallPanel({ game, abbr, accent, onClose, onFinish }) {
  const state = STATE_BY_ABBR[abbr];
  const issues = useMemo(() => {
    const topPool = ISSUES_BY_WEIGHT.slice(0, 10);
    return [...topPool]
      .sort((a, b) => stableHash(`${abbr}-${game.week}-${a.id}`) - stableHash(`${abbr}-${game.week}-${b.id}`))
      .slice(0, 3);
  }, [abbr, game.week]);

  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [reaction, setReaction] = useState(null);
  const [completed, setCompleted] = useState(false);

  const issue = issues[round];
  const stance = game.stances?.[issue?.id] ?? 1;
  const fit = issue ? stateIssueAlignment(abbr, issue.id, stance) : 0;
  const energy = Math.max(0, Math.min(100, 50 + score * (50 / 6)));
  const projectedShift = Math.round((score / 6) * 100) / 100;

  const answer = (response) => {
    const delta = response.score(fit);
    const nextScore = Math.max(-6, Math.min(6, score + delta));
    const promptObj = PROMPTS[issue.id] || {
      voter: 'Local resident',
      text: `“What should the next administration do about ${issue.label.toLowerCase()}?”`,
    };
    const recordedAnswer = {
      issueId: issue.id,
      issue: issue.label,
      voter: promptObj.voter,
      question: promptObj.text,
      response: response.title,
      responseApproach: response.text,
      delta,
    };
    const nextAnswers = [...answers, recordedAnswer];
    setScore(nextScore);
    setAnswers(nextAnswers);
    setReaction(
      delta >= 2
        ? 'Strong applause in the room — undecided voters take notice.'
        : delta === 1
          ? 'The audience nods along with the practical framing.'
          : delta === 0
            ? 'The answer lands neutrally without moving the room.'
            : 'Visible skepticism in the hall as voters push back on the answer.'
    );
    if (round === issues.length - 1) {
      setCompleted(true);
      return;
    }
    setRound((value) => value + 1);
  };

  if (!state || !issue) return null;

  const promptObj = PROMPTS[issue.id] || {
    voter: 'Local resident',
    text: `“What should the next administration do about ${issue.label.toLowerCase()}?”`,
  };

  return (
    <section id="staff-focus-townhall" tabIndex={-1} className="panel panel-gold animate-pop-in p-4" aria-label="Town hall Q&A">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="label-xs">Town hall marathon · {state.name}</p>
          <h3 className="font-heading text-lg text-white">
            {completed ? 'Town hall wrap-up' : 'Persuade the room'}
          </h3>
        </div>
        <button type="button" onClick={onClose} className="btn-ghost rounded-lg p-1.5" aria-label="Close town hall">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
          <span>Audience persuasion meter</span>
          <span className="num font-extrabold" style={{ color: score > 0 ? '#6EE7B7' : score < 0 ? '#FDA4AF' : '#CBD5E1' }}>
            {projectedShift >= 0 ? '+' : ''}{projectedShift.toFixed(2)} pts ({energy < 38 ? 'Skeptical' : energy > 62 ? 'Convinced' : 'Undecided'})
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${energy}%`, backgroundColor: energy < 38 ? '#FDA4AF' : energy > 62 ? '#6EE7B7' : accent }} />
        </div>
        {reaction && <p className="mt-1.5 text-[10px] font-semibold text-slate-300">{reaction}</p>}
      </div>

      {completed ? (
        <div className="mt-3 space-y-2.5">
          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <p className="label-xs mb-1.5">Question-by-question breakdown</p>
            <div className="space-y-1.5">
              {answers.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate font-semibold text-slate-300">
                    {a.voter} ({a.issue}) · <span className="text-slate-400">{a.response}</span>
                  </span>
                  <span className="num shrink-0 font-extrabold" style={{ color: a.delta > 0 ? '#6EE7B7' : a.delta < 0 ? '#FDA4AF' : '#94A3B8' }}>
                    {a.delta > 0 ? `+${a.delta}` : a.delta}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 border-t border-white/10 pt-2 text-[11px] font-bold text-white">
              Persuasion shift in {state.name}:{' '}
              <span className="num" style={{ color: projectedShift > 0 ? '#6EE7B7' : projectedShift < 0 ? '#FDA4AF' : '#CBD5E1' }}>
                {projectedShift >= 0 ? '+' : ''}{projectedShift.toFixed(2)} points
              </span>{' '}
              <span className="text-[10px] font-semibold text-slate-400">(persuasion only, no turnout change)</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onFinish(score, issues.map((item) => item.id), answers)}
            className="btn-gold flex w-full items-center justify-center gap-1.5 py-2 text-xs font-extrabold"
          >
            <CheckCircle2 className="h-4 w-4" /> Finish town hall marathon
          </button>
        </div>
      ) : (
        <>
          <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                <Users className="h-3.5 w-3.5" /> Q{round + 1}/{issues.length} · {promptObj.voter}
              </span>
              <span className="text-[10px] font-bold text-slate-400">Your stance: {stanceLabel(issue, stance)}</span>
            </div>
            <div className="mt-2 flex items-start gap-2.5">
              <SpotArt symbol={issue.icon} className="h-7 w-7" />
              <p className="font-heading text-[15px] leading-snug text-white">{promptObj.text}</p>
            </div>
            <p className="mt-2 text-[10px] font-semibold text-slate-400">
              Issue alignment in {state.name}: <span className="num font-bold text-slate-200">{Math.round(fit * 100)}%</span> ({issue.label})
            </p>
          </div>

          <div className="mt-3 space-y-1.5">
            {RESPONSE_OPTIONS.map((response) => (
              <button key={response.id} type="button" onClick={() => answer(response)} className="panel-lite flex w-full items-center gap-2 p-2.5 text-left hover:bg-white/10">
                <MessageCircle className="h-4 w-4 shrink-0" style={{ color: accent }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="font-heading text-[12px] text-white">{response.title}</span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-300">{response.badge}</span>
                  </span>
                  <span className="block text-[10px] font-semibold text-slate-400">{response.text}</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] font-semibold text-slate-500">Town hall marathons shift persuasion (-1.0 to +1.0 pts) and do not change turnout.</p>
        </>
      )}
    </section>
  );
}
