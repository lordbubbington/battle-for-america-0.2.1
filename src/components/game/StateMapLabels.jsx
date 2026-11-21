import React from 'react';
import { labelInk } from '@/lib/marginColors';

const OCEAN = '#0B1530';
const CALLOUT_INK = '#E4ECFA';
const MUTED_INK = '#A2AFC6';

function glyphsFor(abbr, { x, align, fontSize }) {
  if (align === 'first-glyph') {
    return <><tspan x={x}>C</tspan><tspan x={x + fontSize * 0.64}>A</tspan></>;
  }
  if (align === 'glyph-gap') {
    return <><tspan x={x - 0.35} textAnchor="end">A</tspan><tspan x={x + 0.35} textAnchor="start">K</tspan></>;
  }
  return abbr;
}

/**
 * @param {{ map: ReturnType<typeof import('@/lib/usProjection').buildMap>,
 *   rows: { abbr: string, fill: string, muted?: boolean }[] }} props
 */
export default function StateMapLabels({ map, rows }) {
  return (
    <g aria-hidden="true" pointerEvents="none" style={{ fontFamily: 'var(--font-display)' }}>
      {rows.map(({ abbr, fill, muted }) => {
        const label = map.labels[abbr];
        if (!label) return null;
        const { x, y, align, fontSize, leader } = label;
        const callout = !!leader || abbr === 'DC';
        const ink = muted ? MUTED_INK : callout ? CALLOUT_INK : labelInk(fill);
        return (
          <g key={abbr}>
            {leader && <path d={leader} fill="none" stroke="#A2AFC6" strokeWidth="1" />}
            <text
              data-state-label={abbr}
              x={x}
              y={y}
              textAnchor={align === 'start' || align === 'end' ? align : 'middle'}
              dominantBaseline={abbr === 'DC' ? 'auto' : 'central'}
              fontSize={fontSize}
              fontWeight="800"
              fill={ink}
              stroke={callout ? OCEAN : undefined}
              strokeWidth={callout ? 2.4 : undefined}
              paintOrder={callout ? 'stroke' : undefined}
            >
              {glyphsFor(abbr, label)}
            </text>
          </g>
        );
      })}
    </g>
  );
}
