import React, { useMemo, useState } from 'react';
import { ISSUES_BY_WEIGHT, stateIssueAlignment, stanceLabel } from '@/data/platform';
import { STATE_BY_ABBR } from '@/data/states';
import { X, MessageCircle, ArrowRight, Users } from 'lucide-react';
import SpotArt from '@/components/ui/spot-art';

const PROMPTS = {
  affordability: '“What will you do about the cost of groceries, rent, and everything else?”',
  economy: '“How will your plan help people in this state find stable, well-paid work?”',
  health: '“What would you change about health care for families like mine?”',
  corruption: '“How do we know donors and lobbyists won’t write your agenda?”',
  immigration: '“How would you handle the border and the people already here?”',
  rent: '“How can families afford a home in the communities where they work?”',
};

const RESPONSE_OPTIONS = [
  { id: 'direct', title: 'Answer plainly', text: 'Give a direct answer that matches your platform.', score: (fit) => fit >= 0.68 ? 2 : -2 },
  { id: 'connect', title: 'Connect it to local life', text: 'Explain what your position means for people here.', score: (fit) => fit >= 0.5 ? 1 : 0 },
  { id: 'pushback', title: 'Push back on the premise', text: 'Challenge the question and make the case for your side.', score: (fit) => fit <= 0.55 ? 2 : -1 },
];

function stableHash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

export default function TownHallPanel({ game, abbr, accent, onClose, onFinish }) {
  const state = STATE_BY_ABBR[abbr];
  const issues = useMemo(() => [...ISSUES_BY_WEIGHT]
    .sort((a, b) => stableHash(`${abbr}-${game.week}-${a.id}`) - stableHash(`${abbr}-${game.week}-${b.id}`))
    .slice(0, 3), [abbr, game.week]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [reaction, setReaction] = useState(null);
  const issue = issues[round];
  const stance = game.stances?.[issue?.id] ?? 1;
  const fit = issue ? stateIssueAlignment(abbr, issue.id, stance) : 0;
  const energy = Math.max(0, Math.min(100, 50 + score * (50 / 6)));

  const answer = (response) => {
    const nextScore = Math.max(-6, Math.min(6, score + response.score(fit)));
    const recordedAnswer = {
      issueId: issue.id,
      issue: issue.label,
      question: PROMPTS[issue.id] || `What should the government do about ${issue.label.toLowerCase()}?`,
      response: response.title,
      responseApproach: response.text,
    };
    const nextAnswers = [...answers, recordedAnswer];
    setScore(nextScore);
    if (round === issues.length - 1) {
      onFinish(nextScore, issues.map((item) => item.id), nextAnswers);
      return;
    }
    setAnswers(nextAnswers);
    const delta = nextScore - score;
    setReaction(delta > 0 ? 'The room warms to your answer.' : delta < 0 ? 'The audience looks unconvinced.' : 'The response lands without changing the room.');
    setRound((value) => value + 1);
  };

  if (!state || !issue) return null;

  return (
    <section id="staff-focus-townhall" tabIndex={-1} className="panel panel-gold animate-pop-in p-4" aria-label="Town hall Q&A">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="label-xs">Town hall · {state.name}</p>
          <h3 className="font-heading text-lg text-white">Take the questions</h3>
        </div>
        <button type="button" onClick={onClose} className="btn-ghost rounded-lg p-1.5" aria-label="Close town hall">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
            <Users className="h-3.5 w-3.5" /> Question {round + 1} of {issues.length}
          </span>
          <span className="text-[10px] font-bold text-slate-400">Your line: {stanceLabel(issue, stance)}</span>
        </div>
        <div className="mt-2 flex items-start gap-2.5">
          <SpotArt symbol={issue.icon} className="h-7 w-7" />
          <p className="font-heading text-[15px] leading-snug text-white">{PROMPTS[issue.id] || `“What should the government do about ${issue.label.toLowerCase()}?”`}</p>
        </div>
        <p className="mt-2 text-[10px] font-semibold text-slate-400">Your position fits this state’s voters {Math.round(fit * 100)}% on this issue.</p>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
          <span>Room energy</span><span>{energy < 38 ? 'Cooling' : energy > 62 ? 'Engaged' : 'Listening'}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${energy}%`, backgroundColor: energy < 38 ? '#FDA4AF' : energy > 62 ? '#6EE7B7' : accent }} />
        </div>
        {reaction && <p className="mt-1.5 text-[10px] font-semibold text-slate-400">{reaction}</p>}
      </div>

      <div className="mt-3 space-y-1.5">
        {RESPONSE_OPTIONS.map((response) => (
          <button key={response.id} type="button" onClick={() => answer(response)} className="panel-lite flex w-full items-center gap-2 p-2.5 text-left hover:bg-white/10">
            <MessageCircle className="h-4 w-4 shrink-0" style={{ color: accent }} />
            <span className="min-w-0 flex-1">
              <span className="block font-heading text-[12px] text-white">{response.title}</span>
              <span className="block text-[10px] font-semibold text-slate-400">{response.text}</span>
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] font-semibold text-slate-500">The room reacts to the match between your platform and state opinion.</p>
    </section>
  );
}
