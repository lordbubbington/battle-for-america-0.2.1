import React from 'react';
import { Check } from 'lucide-react';
import SpotArt from '@/components/ui/spot-art';
import CandidatePortrait from '@/components/CandidatePortrait';
import { publicAssetUrl } from '@/lib/publicAssetUrl';

const selectionThumbnailPath = (portrait) => {
  if (typeof portrait !== 'string') return portrait;
  if (portrait.startsWith('./art/candidates/')) {
    return portrait.replace('./art/candidates/', './art/candidates/selection-thumbnails/');
  }
  return portrait.replace('/art/candidates/', '/art/candidates/selection-thumbnails/');
};

export default function CandidatePicker({ candidates, selected, onSelect, accent, prefix = 'cand' }) {
  const totalWeight = candidates.reduce((sum, c) => sum + (c.weight || 0), 0) || 1;
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {candidates.map((c) => {
        const active = selected === c.id;
        const pull = Math.round(((c.weight || 0) / totalWeight) * 100);
        return (
          <button
            key={c.id}
            type="button"
            data-testid={`${prefix}-${c.id}`}
            onClick={() => onSelect(c.id)}
            className="panel-lite relative p-3 text-left transition-transform duration-150 hover:-translate-y-[2px] hover:bg-white/10"
            style={
              active
                ? { borderColor: accent, backgroundColor: `${accent}22`, boxShadow: `inset 0 0 0 1px ${accent}88` }
                : undefined
            }
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 text-lg"
                style={{ backgroundColor: `${accent}26` }}
              >
                {(c.portrait?.startsWith('/art/candidates/') || c.portrait?.startsWith('./art/candidates/')) ? (
                  <CandidatePortrait
                    person={{ ...c, selectionThumbnailPath: selectionThumbnailPath(c.portrait) }}
                    variant="selection"
                    assetUrlResolver={publicAssetUrl}
                    className="h-full w-full"
                  />
                ) : (
                  <SpotArt symbol={c.portrait} className="h-7 w-7" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-[15px] leading-tight text-white">{c.name}</p>
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{c.title}</p>
              </div>
              {active && (
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: accent }}
                >
                  <Check className="h-3 w-3" strokeWidth={4} />
                </span>
              )}
            </div>

            <p className="mt-2 line-clamp-2 text-[11.5px] font-semibold leading-snug text-slate-400">{c.bio}</p>

            <div className="mt-2 space-y-0.5">
              {c.strengths.slice(0, 1).map((s) => (
                <p key={s} className="flex items-start gap-1 text-[10.5px] font-bold text-emerald-300">
                  <span className="mt-[1px]">▲</span>
                  <span>{s}</span>
                </p>
              ))}
              {c.weaknesses.slice(0, 1).map((s) => (
                <p key={s} className="flex items-start gap-1 text-[10.5px] font-bold text-rose-300">
                  <span className="mt-[1px]">▼</span>
                  <span>{s}</span>
                </p>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-4 gap-1" aria-label="Candidate skill ratings">
              {[
                ['Debate', c.ratings?.debate],
                ['Speech', c.ratings?.speech],
                ['Rally', c.ratings?.rally],
                ['Corruption', c.ratings?.corruption],
              ].map(([label, score]) => (
                <span key={label} className="rounded-md border border-white/10 bg-black/20 px-1 py-1 text-center">
                  <span className="block text-[8px] font-extrabold uppercase tracking-wide text-slate-500">{label}</span>
                  <span className="num text-[11px] font-extrabold text-white">{score ?? 10}</span>
                </span>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Polling</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(2, Math.min(100, pull))}%`, backgroundColor: accent }}
                />
              </div>
              <span className="num text-[10px] font-extrabold" style={{ color: accent }}>
                {pull}%
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}



