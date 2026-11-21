import React from 'react';
import CandidatePortrait from '@/components/CandidatePortrait';
import { Ban, Check, MapPin } from 'lucide-react';
import { CANDIDATE_BY_ID } from '@/data/candidates';
import { STATE_BY_ABBR } from '@/data/states';
import { publicAssetUrl } from '@/lib/publicAssetUrl';

// The shortlist is your own party's field. Each one brings a home state, its
// neighbours and a region — spelled out, because this is a map decision.
export default function RunningMatePicker({ mates, selected, onSelect, accent }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {mates.map((m) => {
        const active = selected === m.id;
        const blocked = !!m.sameState;
        const canonicalCandidate = CANDIDATE_BY_ID[m.candidateId || m.id];
        const portraitPerson = canonicalCandidate
          ? {
            ...m,
            ...canonicalCandidate,
            id: m.candidateId || m.id,
            name: m.name || canonicalCandidate.name,
            portraitPath: canonicalCandidate.portraitPath || canonicalCandidate.portrait,
          }
          : m;
        return (
          <button
            key={m.id}
            type="button"
            disabled={blocked}
            aria-disabled={blocked}
            onClick={() => !blocked && onSelect(m.id)}
            title={blocked ? `${m.state} is already at the top of the ticket` : undefined}
            className={`panel-lite p-3 text-left transition-transform duration-150 ${
              blocked
                ? 'cursor-not-allowed opacity-45 grayscale'
                : 'hover:-translate-y-[2px] hover:rotate-[0.4deg] hover:bg-white/10'
            }`}
            style={
              active && !blocked
                ? { borderColor: accent, backgroundColor: `${accent}22`, boxShadow: `inset 0 0 0 1px ${accent}88` }
                : undefined
            }
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-slate-800/80">
                  {(portraitPerson.portraitPath || portraitPerson.portrait) ? (
                    <CandidatePortrait
                      person={portraitPerson}
                      assetUrlResolver={publicAssetUrl}
                      className="relative h-full w-full"
                    />
                  ) : (
                    <span className="font-heading text-lg font-bold text-slate-300" aria-hidden="true">
                      {m.name?.slice(0, 1) || '?'}
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-heading text-[14px] leading-tight text-white">{m.name}</p>
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                    {m.title} · {m.state}
                  </p>
                </div>
              </div>
              {active && !blocked && (
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: accent }}
                >
                  <Check className="h-3 w-3" strokeWidth={4} />
                </span>
              )}
              {blocked && <Ban className="h-4 w-4 shrink-0 text-fuchsia-300" />}
            </div>

            <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-snug text-slate-400">{m.blurb}</p>

            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(m.states || {}).map(([abbr, v]) => (
                <span
                  key={abbr}
                  className="chip"
                  style={{ borderColor: `${accent}66`, color: '#FFDA8A' }}
                  title={`${STATE_BY_ABBR[abbr]?.name || abbr} moves ${v} points`}
                >
                  <MapPin className="h-2.5 w-2.5" />
                  {STATE_BY_ABBR[abbr]?.name || abbr} +{v}
                </span>
              ))}
              {Object.entries(m.region || {}).map(([r, v]) => (
                <span key={r} className="chip capitalize">
                  {r} region +{v}
                </span>
              ))}
            </div>

            {blocked ? (
              <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-wide text-fuchsia-300">
                Same state as the nominee — ineligible
              </p>
            ) : (
              <p className="mt-1.5 text-[10px] font-bold text-rose-300">− {m.weakness}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
