import React, { useState } from 'react';
import { STATE_BY_ABBR, STATE_LIST } from '@/data/states';
import USMap from '@/components/game/USMap';
import ScaleSlider, { leadLabel } from '@/components/setup/ScaleSlider';
import { Dices } from 'lucide-react';

const DEM = '#7CA0FF';
const REP = '#FF8A7A';

export default function MapTuner({
  leans,
  adjust,
  onAdjust,
  national,
  onNational,
  randomness,
  onRandomness,
  onReroll,
  qualityDelta = 0,
  previewRows,
  showExact,
  capNote = null,
  nationalRangeMin = -25,
  nationalAllowedMin = -25,
  nationalAllowedMax = 25,
  stateEditsEnabled = false,
  stateEditNote = 'State-by-state adjustments are available on Cupcake and Easy.',
}) {
  const [sel, setSel] = useState('PA');
  const row = previewRows.find((r) => r.abbr === sel);
  const nudge = adjust[sel] ?? 0;
  const ticket = national + (qualityDelta || 0);

  return (
    <div>
      <div className="space-y-2">
        <ScaleSlider
          label="National generic ballot"
          value={national}
          min={nationalRangeMin}
          max={25}
          allowedMin={nationalAllowedMin}
          allowedMax={nationalAllowedMax}
          step={0.5}
          onChange={onNational}
          readout={leadLabel(national)}
          color={national >= 0 ? DEM : REP}
          leftLabel={`R+${Math.abs(nationalRangeMin)}`}
          rightLabel="D+25"
          hint={
            qualityDelta
              ? `Candidate quality moves the whole country to ${leadLabel(
                  ticket
                )}: the two names on the ticket are worth ${leadLabel(qualityDelta)} on top of the national mood.`
              : 'Drag it or type a number. Every state shifts by the same number of points.'
          }
        />
        {capNote && (
          <p className="rounded-lg border border-dashed border-amber-400/40 bg-amber-400/5 px-2.5 py-1.5 text-[10.5px] font-semibold leading-snug text-amber-200">
            {capNote}
          </p>
        )}

        <ScaleSlider
          label="Randomness"
          value={randomness}
          min={0}
          max={100}
          step={0.5}
          onChange={onRandomness}
          readout={randomness ? `${randomness}% shuffled` : 'None — the map as modelled'}
          color="#A855F7"
          leftLabel="0 — as modelled"
          rightLabel="100 — every state a fresh draw"
          hint="At 0% this is the 2024 map plus your generic ballot. Around 20% it is still the same country, with a handful of states on the wrong side of the line. At 100% the historical lean is gone entirely: California and Wyoming flip as often as anywhere else, and the map is a pure roll of the dice. The national mood you set is always preserved, and a campaign above 20% is played for fun and is not scored."
          extra={
            <button
              type="button"
              onClick={onReroll}
              className="btn-ghost flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-extrabold"
            >
              <Dices className="h-3 w-3" /> Re-roll
            </button>
          }
        />
      </div>

      <div className="mt-2">
        <USMap
          rows={previewRows}
          showExact={showExact}
          selected={sel}
          onSelect={(abbr) => setSel(abbr)}
          accentRing="#F7C145"
        />
      </div>

      {row && (
        <div className="panel-lite mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
          <p className="font-heading text-[13px] text-white">
            {row.name} <span className="text-[10px] text-slate-500">{row.ev} EV</span>
          </p>
          <p className="num text-[12px] font-extrabold" style={{ color: row.margin >= 0 ? DEM : REP }}>
            polls {row.margin >= 0 ? 'D' : 'R'} +{Math.abs(row.margin).toFixed(1)}
          </p>
          <p className="text-[11px] font-bold text-slate-400">
            starting lean <span className="num text-slate-200">{leadLabel(leans[sel] ?? 0)}</span>
          </p>
          <input
            type="range"
            min="-15"
            max="15"
            step="0.5"
            value={nudge}
            onChange={(e) => onAdjust(sel, Number(e.target.value))}
            disabled={!stateEditsEnabled}
            className="h-1.5 min-w-[140px] flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-amber-400"
            aria-label={`${STATE_BY_ABBR[sel]?.name || sel} nudge`}
          />
          <span className="num text-[11px] font-extrabold text-slate-300">
            {nudge > 0 ? 'D+' : nudge < 0 ? 'R+' : '±'}
            {Math.abs(nudge).toFixed(1)}
          </span>
          {stateEditsEnabled && <button
            type="button"
            onClick={() => onAdjust(sel, 0)}
            className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 hover:text-white"
          >
            Reset
          </button>}
          <p className="w-full text-[10px] font-semibold text-slate-500">
            {!stateEditsEnabled && <span className="mr-1 text-amber-200">{stateEditNote}</span>}
            {STATE_LIST.length} states plus DC. Nebraska and Maine still split their votes by district.
          </p>
        </div>
      )}
    </div>
  );
}
