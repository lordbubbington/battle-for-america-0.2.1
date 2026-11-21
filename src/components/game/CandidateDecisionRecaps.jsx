import React from 'react';
import { CANDIDATE_BY_ID } from '@/data/candidates';
import { CANDIDATE_EVENTS_BY_ID } from '@/data/candidateEvents/index';
import { outcomePresentation } from '@/lib/build44EventPresentation';

export default function CandidateDecisionRecaps({ game }) {
  const current = game.currentEventData?.context?.instanceId;
  const receipts = (game.build40?.decisionReceipts || []).filter((receipt) =>
    receipt.candidateId && receipt.week === game.week && receipt.id !== current);
  if (!receipts.length) return null;

  return (
    <section className="panel space-y-2 p-3" aria-label="Resolved candidate decisions">
      <h3 className="label-xs">Candidate decisions this week</h3>
      {receipts.map((receipt, index) => {
        const event = CANDIDATE_EVENTS_BY_ID[receipt.eventId];
        if (!event) return null;
        const choice = event.choices.find(({ id }) => id === receipt.choiceId);
        const effects = outcomePresentation(receipt.effects || []).effects;
        return (
          <details key={receipt.id} open={index === receipts.length - 1}
            className="rounded-xl border border-white/10 bg-black/20 p-3" data-testid="candidate-decision-recap">
            <summary className="cursor-pointer text-sm font-semibold text-white">
              {CANDIDATE_BY_ID[receipt.candidateId]?.name || receipt.candidateId}: {event.title}
            </summary>
            <p className="mt-2 text-xs text-slate-200" data-testid="candidate-recap-choice">Choice: {choice?.label || receipt.choiceId}</p>
            <div className="mt-2 flex flex-wrap gap-1" data-testid="candidate-recap-effects">
              {effects.map(({ text, tone }, effectIndex) => (
                <span key={effectIndex} className={`max-w-full break-words rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${
                  tone === 'positive' ? 'border-emerald-400/50 text-emerald-300'
                    : tone === 'negative' ? 'border-rose-400/50 text-rose-300' : 'border-slate-400/50 text-slate-200'}`}>
                  {text}
                </span>
              ))}
              {!effects.length && <span className="text-xs text-slate-400">No additional effect.</span>}
            </div>
          </details>
        );
      })}
    </section>
  );
}
