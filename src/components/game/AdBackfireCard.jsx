import React from 'react';
import { Flame } from 'lucide-react';

// "Ad Backfires" — the buy that becomes the story. It lands the moment it
// happens and stays on screen for the rest of the week. A blowup can be local
// (the state turns on the spot) or national, or both.
export default function AdBackfireCard({ backfire }) {
  if (!backfire) return null;
  const attack = backfire.kind === 'attack';
  const nationwide = !!backfire.nationalHit;
  const local = !!backfire.localTurnout;
  const chipRed = { color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.5)' };

  return (
    <div
      className="panel animate-pop-in border-red-400/70 p-3"
      style={{ background: 'linear-gradient(180deg, rgba(248,113,113,0.2), rgba(10,16,32,0.55))' }}
    >
      <div className="flex items-start gap-2">
        <span className="mt-[1px] flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-400/60 bg-red-500/20">
          <Flame className="h-4 w-4 text-red-300" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[14px] leading-none text-white">Ad backfires</p>
          <p className="mt-1 text-[11.5px] font-semibold leading-snug text-red-100">
            Your {backfire.typeLabel.toLowerCase()} {attack ? 'attack' : 'spot'} on{' '}
            {backfire.issueLabel.toLowerCase()} blew up in {backfire.name}
            {nationwide
              ? " — and it followed you out of the state by Tuesday morning."
              : local
                ? ' — the story never leaves the state, but nobody there is listening to the issue any more.'
                : '.'}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {backfire.stateHit > 0 && (
              <span className="chip" style={chipRed}>
                {backfire.name} −{backfire.stateHit}
              </span>
            )}
            {backfire.nationalHit > 0 && (
              <span className="chip" style={chipRed}>
                Nationally −{backfire.nationalHit}
              </span>
            )}
            {backfire.localVote > 0 && (
              <span className="chip" style={chipRed}>
                {backfire.name} vote −{backfire.localVote}
              </span>
            )}
            {backfire.localTurnout > 0 && (
              <span className="chip" style={chipRed}>
                Turnout in {backfire.name} −{backfire.localTurnout} points
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}