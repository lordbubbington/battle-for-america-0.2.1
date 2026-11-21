import React from 'react';
import { marginColor } from '@/lib/marginColors';
import { REGIONAL_PARTY_IDS, SCENARIO_PARTIES } from '@/data/build39Scenarios';

// The ladder every map in the game uses: teal inside two points, then pale,
// full and dark shades at two, five and ten.
const STEPS = [
  { label: 'Under 2', lead: 1 },
  { label: '2–5', lead: 3 },
  { label: '5–10', lead: 7 },
  { label: '10+', lead: 14 },
];

const THIRD = [
  { key: 'lib', label: 'Libertarian' },
  { key: 'grn', label: 'Green' },
  { key: 'ind', label: 'Independent' },
  { key: 'mcmullin', label: 'McMullin' },
];

const REGIONAL = REGIONAL_PARTY_IDS.map((id) => ({
  key: id,
  label: SCENARIO_PARTIES[id]?.label || id,
}));

function Ramp({ family, tag }) {
  return (
    <div className="flex items-center gap-1">
      <span className="label-xs w-3 shrink-0">{tag}</span>
      {STEPS.map((s) => (
        <span
          key={s.label}
          title={`${tag} +${s.label}`}
          className="h-2.5 flex-1 rounded-sm"
          style={{ backgroundColor: marginColor(family, s.lead) }}
        />
      ))}
    </div>
  );
}

export default function MarginLegend({ showThirdParties = true, scenarioId = null, className = '' }) {
  const showRegional = scenarioId === 'regional-parties';
  const extraParties = showRegional
    ? [...THIRD.filter((t) => t.key !== 'mcmullin'), ...REGIONAL]
    : THIRD;

  return (
    <div className={className}>
      <div className="space-y-1">
        <Ramp family="dem" tag="D" />
        <Ramp family="rep" tag="R" />
      </div>
      <div className="num mt-0.5 flex justify-between pl-4 text-[8.5px] font-bold uppercase tracking-wide text-slate-500">
        {STEPS.map((s) => (
          <span key={s.label}>{s.label}</span>
        ))}
      </div>
      <div className="mt-1 flex items-center gap-1.5 pl-4 text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
        <span className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: marginColor('dem', 0) }} /> Tossup under 2 points
      </div>
      {showThirdParties && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-white/10 pt-1.5">
          {extraParties.map((t) => (
            <span key={t.key} className="flex items-center gap-1">
              <span className="flex">
                {[3, 7, 14].map((lead) => (
                  <span
                    key={lead}
                    className="h-2 w-1.5"
                    style={{ backgroundColor: marginColor(t.key, lead) }}
                  />
                ))}
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">{t.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
