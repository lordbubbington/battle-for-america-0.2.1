import React, { useMemo, useState } from 'react';
import { ratingLabel, MAP_IDLE } from '@/lib/gameEngine';
import { ratingFor } from '@/lib/downballot';
import { buildMap } from '@/lib/usProjection';
import { LABELED_CITIES } from '@/data/cities';
import SplitDistricts from '@/components/game/SplitDistricts';
import StateMapLabels from '@/components/game/StateMapLabels';

const OCEAN = '#0B1530';

export default function USMap({
  rows,
  showExact = false,
  onSelect = /** @type {(abbr: string) => void} */ (() => {}),
  selected = null,
  highlighted = [],
  compact = false,
  accentRing = '#F7C145',
  districts = [],
  onSelectDistrict = /** @type {(id: string) => void} */ (() => {}),
  unreported = [],
  colorMode = 'margin',
  flipped = [],
  adSelected = [],
}) {
  const map = useMemo(() => buildMap(), []);
  const [hover, setHover] = useState(null);
  const dark = useMemo(() => new Set(unreported || []), [unreported]);
  const flippedSet = useMemo(() => new Set(flipped || []), [flipped]);
  // The states already in an ad buy, ringed in the accent colour.
  const adSet = useMemo(() => new Set(adSelected || []), [adSelected]);
  const fillOf = (r) => (colorMode === 'winner' ? r.winnerColor || r.color : r.color);
  // A state's rating belongs to whoever won it, third parties included.
  const rateOf = (r) => (r.shares ? ratingFor(r.winner, r.lead, showExact) : ratingLabel(r.margin, showExact));

  const selectedParent = useMemo(() => {
    if (!selected) return null;
    const d = (districts || []).find((x) => x.id === selected);
    return d ? d.parent : selected;
  }, [selected, districts]);

  const dc = map.states.DC;
  const labelRows = rows.map((row) => ({
    abbr: row.abbr,
    fill: dark.has(row.abbr) ? MAP_IDLE : fillOf(row),
    muted: dark.has(row.abbr),
  }));

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${map.width} ${map.height}`}
        className="block w-full"
        style={compact ? { maxWidth: 660, margin: '0 auto' } : undefined}
        role="img"
        aria-label="Electoral map of the United States"
      >
        <defs>
          <radialGradient id="oceanGlow" cx="50%" cy="0%" r="90%">
            <stop offset="0%" stopColor="#16274B" />
            <stop offset="100%" stopColor={OCEAN} />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={map.width} height={map.height} fill="url(#oceanGlow)" rx="14" />

        {rows.map((s) => {
          const geo = map.states[s.abbr];
          if (!geo) return null;
          const isSelected = selectedParent === s.abbr;
          const isHovered = hover === s.abbr;
          const isHighlighted = highlighted && highlighted.includes(s.abbr);
          const isDark = dark.has(s.abbr);
          const isFlipped = flippedSet.has(s.abbr);
          const isAd = adSet.has(s.abbr);

          return (
            <g key={s.abbr}>
              <path
                d={geo.d}
                data-testid={`state-${s.abbr}`}
                role="button"
                tabIndex={0}
                aria-label={`${s.name}, ${s.ev} electoral votes, ${rateOf(s)}${Number.isFinite(s.pct) ? `, ${s.pct.toFixed(0)} percent counted${s.called ? ', called' : ', counting'}` : ''}`}
                onClick={() => onSelect && onSelect(s.abbr)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(s.abbr); } }}
                onMouseEnter={() => setHover(s.abbr)}
                onMouseLeave={() => setHover(null)}
                fill={isDark ? MAP_IDLE : fillOf(s)}
                fillRule="evenodd"
                fillOpacity={isDark ? 1 : Number.isFinite(s.pct) ? 0.4 + 0.6 * Math.min(100, s.pct) / 100 : 1}
                stroke={isSelected || isAd ? accentRing : 'rgba(255,255,255,0.32)'}
                strokeWidth={isSelected ? 2.8 : isAd ? 2.2 : 0.9}
                style={{
                  cursor: onSelect ? 'pointer' : 'default',
                  filter: isHovered ? 'brightness(1.22)' : 'none',
                  transition: 'fill 600ms ease, filter 120ms ease',
                  outline: 'none',
                }}
              >
                <title>
                  {isDark
                    ? `${s.name} · too early to call`
                    : `${s.name} · ${s.ev} EV · ${rateOf(s)}${Number.isFinite(s.pct) ? ` · ${s.pct.toFixed(0)}% counted${s.called ? ' · called' : ' · counting'}` : ''}`}

                </title>
              </path>
              {isHighlighted && (
                <circle cx={geo.cx} cy={geo.cy} r="10" fill="none" stroke="#F7C145" strokeWidth="2" />
              )}
              {isFlipped && (
                <path
                  d={geo.d}
                  fill="none"
                  stroke="#F7C145"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}

        <StateMapLabels map={map} rows={labelRows} />

        {/* District of Columbia */}
        {dc && (
          <circle
            cx={dc.cx}
            cy={dc.cy}
            r="4.5"
            fill={labelRows.find((row) => row.abbr === 'DC')?.fill}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.2"
            pointerEvents="none"
          />
        )}

        {/* Cities */}
        {map.cities.map((c) => (
          <g key={c.name} pointerEvents="none">
            <circle
              cx={c.x}
              cy={c.y}
              r={c.rank <= 12 ? 2.4 : 1.7}
              fill="rgba(255,255,255,0.7)"
              stroke={OCEAN}
              strokeWidth="0.9"
            />
            <title>{c.name}</title>
          </g>
        ))}

        {LABELED_CITIES.map((c) => {
          const placed = map.cities.find((m) => m.name === c.name);
          if (!placed) return null;
          const lx = placed.x + (c.dx || 0);
          const ly = placed.y + (c.dy || 0);
          return (
            <g key={`city-${c.name}`} pointerEvents="none">
              {c.leader && (
                <line
                  x1={placed.x}
                  y1={placed.y}
                  x2={lx}
                  y2={ly}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="0.8"
                />
              )}
              <text
                x={lx}
                y={ly}
                textAnchor={c.anchor === 'end' || c.anchor === 'middle' ? c.anchor : 'start'}
                dominantBaseline="central"
                fontSize="9"
                fontWeight="700"
                fill="#C9D6EE"
                stroke={OCEAN}
                strokeWidth="2.4"
                paintOrder="stroke"
              >
                {c.name}
              </text>
            </g>
          );
        })}
      </svg>

      {districts && districts.length > 0 && (
        <SplitDistricts
          districts={districts}
          selected={selected}
          onSelect={onSelectDistrict}
          showExact={showExact}
          unreported={unreported}
          colorMode={colorMode}
        />
      )}
    </div>
  );
}
