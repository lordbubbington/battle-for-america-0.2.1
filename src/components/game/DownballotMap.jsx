import React, { useMemo, useState } from 'react';
import { ratingLabel } from '@/lib/gameEngine';
import { buildMap } from '@/lib/usProjection';
import { STATE_LIST } from '@/data/states';
import StateMapLabels from '@/components/game/StateMapLabels';

const NO_RACE = '#1A2338';
const OCEAN = '#0B1530';

// One map, four races. A race is anything with a state, a winner and a colour —
// Senate seats, House delegations, governor's mansions.
export default function DownballotMap({
  races = [],
  showExact = false,
  selected = null,
  onSelect = /** @type {(abbr: string) => void} */ (() => {}),
  accentRing = '#F7C145',
  emptyLabel = 'no race in 2028',
  colorMode = 'margin',
  flipped = [],
}) {
  const map = useMemo(() => buildMap(), []);
  const [hover, setHover] = useState(null);
  const byState = useMemo(
    () =>
      races.reduce((acc, r) => {
        acc[r.state] = r;
        return acc;
      }, {}),
    [races]
  );
  const flippedSet = useMemo(() => new Set(flipped || []), [flipped]);
  const fillOf = (race) => (colorMode === 'winner' ? race.winnerColor || race.color : race.color);
  const labelRows = STATE_LIST.map(({ abbr }) => ({
    abbr,
    fill: byState[abbr] ? fillOf(byState[abbr]) : NO_RACE,
    muted: !byState[abbr],
  }));

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${map.width} ${map.height}`}
        className="block w-full"
        role="img"
        aria-label="Downballot map of the United States"
      >
        <defs>
          <radialGradient id="downballotOcean" cx="50%" cy="0%" r="90%">
            <stop offset="0%" stopColor="#16274B" />
            <stop offset="100%" stopColor={OCEAN} />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={map.width} height={map.height} fill="url(#downballotOcean)" rx="14" />

        {STATE_LIST.map((s) => {
          const geo = map.states[s.abbr];
          if (!geo) return null;
          const race = byState[s.abbr];
          const isSelected = selected === s.abbr;
          const isHovered = hover === s.abbr;
          const fill = race ? fillOf(race) : NO_RACE;

          return (
            <g key={s.abbr}>
              <path
                d={geo.d}
                role="button"
                tabIndex={0}
                aria-label={
                  race
                    ? `${s.name}: ${race.label || ratingLabel(race.margin, showExact)}, ${race.winner}`
                    : `${s.name}: ${emptyLabel}`
                }
                onClick={() => onSelect && onSelect(s.abbr)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(s.abbr); } }}
                onMouseEnter={() => setHover(s.abbr)}
                onMouseLeave={() => setHover(null)}
                fill={fill}
                fillRule="evenodd"
                stroke={isSelected ? accentRing : race ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)'}
                strokeWidth={isSelected ? 2.8 : race ? 1.2 : 0.7}
                style={{
                  cursor: onSelect ? 'pointer' : 'default',
                  filter: isHovered ? 'brightness(1.22)' : 'none',
                  transition: 'fill 500ms ease, filter 120ms ease',
                  outline: 'none',
                }}
              >
                <title>{race ? `${s.name} · ${race.label}` : `${s.name} · ${emptyLabel}`}</title>
              </path>
              {flippedSet.has(s.abbr) && (
                <path
                  d={geo.d}
                  fill="none"
                  stroke="#F7C145"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}

        <StateMapLabels map={map} rows={labelRows} />
      </svg>
    </div>
  );
}
