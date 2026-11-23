import { scenarioPartyMeta } from '@/lib/build39Scenarios';
import React from 'react';
import { STATE_BY_ABBR } from '@/data/states';
import { ratingFor } from '@/lib/downballot';
import { genericIn } from '@/lib/environment';
import USMap from '@/components/game/USMap';
import DownballotMap from '@/components/game/DownballotMap';
import HistoryPanel from '@/components/game/HistoryPanel';
import PathTo270 from '@/components/game/PathTo270';
import PollPanel from '@/components/game/PollPanel';
import MarginLegend from '@/components/game/MarginLegend';
import { ScrollText, Target } from 'lucide-react';
import { SpotGlyph } from '@/components/ui/spot-art';
import { movementFor, movementLabel, PULSE_THRESHOLD } from '@/lib/campaignPulse';

const DEM = '#4C7BFF';
const REP = '#E8433C';

export const BOARD_TABS = [
  { id: 'pres', label: 'President', icon: 'president' },
  { id: 'senate', label: 'Senate', icon: 'senate' },
  { id: 'house', label: 'House', icon: 'house' },
  { id: 'gov', label: 'Governors', icon: 'governors' },
  { id: 'path', label: 'Path to 270', icon: Target },
  { id: 'log', label: 'Log', icon: ScrollText },
];

const PARTY_SHORT = { dem: 'D', rep: 'R', lib: 'L', grn: 'G', ind: 'I' };

function winChanceLabel(chance) {
  if (chance < 1) return '<1%';
  if (chance > 99) return '>99%';
  return Math.round(chance) + '%';
}

function plusMinus(v) {
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;
}

export default function BoardPanel({
  game,
  snap,
  senate,
  house,
  gov,
  you,
  them,
  selected,
  onSelect,
  showExact,
  accent,
  oppAccent,
  tab,
  onTab,
  adMode = false,
  adSelected = null,
  onAdToggle,
  onPathMapChange,
  forecast = null,
}) {
  const mapPulse = snap.rows
    .map((row) => ({
      abbr: row.abbr,
      name: STATE_BY_ABBR[row.abbr]?.name || row.abbr,
      amount: movementFor(row, game.weekStartMap?.[row.abbr], game.party),
    }))
    .filter((row) => Math.abs(row.amount) >= PULSE_THRESHOLD)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const pulseLeaders = mapPulse.slice(0, 3);
  const pulseLead = pulseLeaders[0];
  const pulseDirection = pulseLead
    ? game.party === 'dem' || game.party === 'rep'
      ? pulseLead.amount > 0
        ? 'moving toward your ticket'
        : 'moving away from your ticket'
      : pulseLead.amount > 0
        ? 'adding support'
        : 'losing support'
    : null;
  const selDistrict = selected ? snap.districts.find((d) => d.id === selected) : null;
  const selRow = selDistrict || (selected ? snap.rows.find((r) => r.abbr === selected) : null);
  const selectedHouseDistrict = selected ? house.districts?.find((district) => district.id === selected) : null;
  const targetAbbr = selDistrict?.parent || selectedHouseDistrict?.stateAbbr || selected;

  const forecastState = !selDistrict && targetAbbr ? forecast?.stateWinProbabilities?.[targetAbbr] : null;
  const stateChances = forecastState ? Object.entries(forecastState.parties).filter(([, chance]) => Number(chance) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1])) : [];
  const senateRace = targetAbbr ? senate.races.find((r) => r.state === targetAbbr) : null;
  const houseRace = targetAbbr ? house.states.find((r) => r.state === targetAbbr) : null;
  const govRace = targetAbbr ? gov.races.find((r) => r.state === targetAbbr) : null;

  return (
    <div className="panel p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-black/25 p-1">
          {BOARD_TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTab(t.id)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] font-extrabold transition-colors ${
                  active ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                {typeof Icon === 'string' ? <SpotGlyph symbol={Icon} className="h-3 w-3" /> : <Icon className="h-3 w-3" />} {t.label}
              </button>
            );
          })}
        </div>
        {tab === 'path' ? (
          <span className="hidden text-[10px] font-semibold text-slate-500 sm:block">Click a state to edit its rating</span>
        ) : pulseLead ? (
          <button
            type="button"
            onClick={() => onSelect(pulseLead.abbr)}
            title={`${pulseLead.name}: ${movementLabel(pulseLead.amount, game.party)} this week. Click to inspect.`}
            className="hidden max-w-[235px] truncate text-right text-[10px] font-extrabold text-primary hover:text-amber-200 sm:block"
          >
            <span className="uppercase tracking-[0.12em]">Map pulse</span>
            <span className="ml-1 text-slate-300">{pulseLead.name} {pulseDirection}</span>
          </button>
        ) : (
          <span className="hidden text-[10px] font-semibold text-slate-500 sm:block">
            {showExact ? 'Exact margins shown' : 'Ratings only'}
          </span>
        )}
      </div>

      {tab === 'path' && (
        <PathTo270 game={game} snap={snap} you={you} them={them} accent={accent} onChange={onPathMapChange} />
      )}

      {/* ---------------------------------------------------------- President */}
      {tab === 'pres' && (
        <>
          <div className="mt-2">
            <USMap
              rows={snap.rows}
              districts={snap.districts}
              showExact={showExact}
              flipped={[]}
              selected={adMode ? null : selected}
              adSelected={adMode ? adSelected : null}
              onSelect={(abbr) => (adMode ? onAdToggle(abbr) : onSelect(abbr === selected ? null : abbr))}
              onSelectDistrict={(id) =>
                adMode ? onAdToggle(id.split('-')[0]) : onSelect(id === selected ? null : id)
              }
              accentRing={accent}
              highlighted={pulseLeaders.map((row) => row.abbr)}
            />
          </div>
          {adMode && (
            <p
              className="mt-2 rounded-lg border border-dashed px-2.5 py-1.5 text-center text-[11px] font-extrabold"
              style={{ borderColor: `${accent}77`, color: accent, backgroundColor: `${accent}14` }}
            >
              Buying airtime — tap a state to add it to the buy, tap it again to take it out.
            </p>
          )}
          <p className="mt-2 text-[10px] font-semibold text-slate-400">Map shows voter preferences. Turnout and early ballots affect the count on Election Night.</p>
          <PollPanel
            scenarioId={game.build39?.scenario?.id}
            snap={snap}
            row={selRow}
            label={selDistrict ? selDistrict.name : selRow ? STATE_BY_ABBR[selRow.abbr].name : null}
            ev={selRow ? selRow.ev : null}
            showExact={showExact}
          />

          {stateChances.length > 0 && <p className="mt-2 text-[11px] font-bold text-slate-300">Nick Bronze · {STATE_BY_ABBR[targetAbbr]?.name} win chances · {stateChances.map(([party, chance]) => (scenarioPartyMeta(game.build39?.scenario?.id, party)?.short || PARTY_SHORT[party] || party) + ' ' + winChanceLabel(Number(chance))).join(' · ')}</p>}
          <div className="mt-2">
            <MarginLegend />
          </div>

          {!selRow && (
            <p className="mt-2 text-center text-[11px] font-bold text-slate-500">
              Tap a state or a district chip to inspect it — or to send your bus there this week.
            </p>
          )}
        </>
      )}

      {/* ------------------------------------------------------------- Senate */}
      {tab === 'senate' && (
        <>
          <div className="mt-2">
            <DownballotMap
              races={senate.races}
              showExact={showExact}
              selected={targetAbbr}
              onSelect={(abbr) => onSelect(abbr === selected ? null : abbr)}
              flipped={[]}
              accentRing={accent}
              emptyLabel="no Senate race"
            />
          </div>

          {senateRace ? (
            <div className="panel-lite mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2">
              <p className="font-heading text-[13px] text-white">
                {STATE_BY_ABBR[senateRace.state].name} <span className="text-[10px] text-slate-400">Class 3</span>
              </p>
              <p className="num text-[12px] font-extrabold" style={{ color: senateRace.winnerColor || senateRace.color }}>
                {ratingFor(senateRace.winner, senateRace.lead, showExact)}
              </p>
              <p className="text-[11px] font-bold text-slate-400">
                Held by{' '}
                <span style={{ color: senateRace.defending === 'dem' ? DEM : REP }}>
                  {senateRace.defending === 'dem' ? 'Democrats' : 'Republicans'}
                </span>
              </p>
              <p className="text-[11px] font-bold text-slate-400">
                On the ballot{' '}
                <span className="text-slate-200">
                  {senateRace.indCand
                    ? `${senateRace.indCand.name} (${senateRace.indCand.title})`
                    : senateRace.incumbent
                      ? `incumbent ${senateRace.incumbent}`
                      : senateRace.note || 'open seat'}
                </span>
              </p>
              <p className="text-[11px] font-bold text-slate-400">
                State generic ballot{' '}
                <span className="num text-slate-200">{showExact ? `D ${plusMinus(genericIn(houseRace.state, game))}` : ratingFor(genericIn(houseRace.state, game) >= 0 ? 'dem' : 'rep', Math.abs(genericIn(houseRace.state, game)), false)}</span>
              </p>
              <p className="text-[11px] font-bold text-slate-400">
                Local candidate{' '}
                <span className="num text-slate-200">
                  {plusMinus(game.raceQuality?.[`senate:${senateRace.state}`] || 0)}
                </span>
              </p>
              <p className="w-full text-[10px] font-bold text-slate-500">
                {senateRace.indCand
                  ? senateRace.indCand.note
                  : 'Only 55% of this race is the top of the ticket. The rest is the recruit.'}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-center text-[11px] font-bold text-slate-500">
              {targetAbbr
                ? `${STATE_BY_ABBR[targetAbbr].name} has no Senate race in 2028 — only 34 seats are up.`
                : 'Pick a state to see who is defending the seat.'}
            </p>
          )}
        </>
      )}

      {/* -------------------------------------------------------------- House */}
      {tab === 'house' && (
        <>
          <div className="mt-2">
            <DownballotMap
              races={house.states}
              showExact={showExact}
              selected={targetAbbr}
              onSelect={(abbr) => onSelect(abbr === selected ? null : abbr)}
              flipped={[]}
              accentRing={accent}
              emptyLabel="no House seats"
            />
          </div>

          {houseRace ? (
            <div className="panel-lite mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2">
              <p className="font-heading text-[13px] text-white">{STATE_BY_ABBR[houseRace.state].name}</p>
              <p className="num text-[12px] font-extrabold" style={{ color: houseRace.winnerColor || houseRace.color }}>
                {houseRace.label}
              </p>
              {houseRace.rule === 'mmp' && <p className="w-full text-[10px] font-bold text-slate-400">Direct seats: {houseRace.directSeats.dem}D · {houseRace.directSeats.rep}R · {houseRace.directSeats.lib}L · {houseRace.directSeats.grn}G · List seats: {houseRace.listSeats.dem}D · {houseRace.listSeats.rep}R · {houseRace.listSeats.lib}L · {houseRace.listSeats.grn}G</p>}
              {houseRace.rule === 'pr' && <p className="w-full text-[10px] font-bold text-slate-400">Statewide proportional allocation · party must reach 5% nationally</p>}
              <p className="text-[11px] font-bold text-slate-400">
                {houseRace.seats} seat{houseRace.seats === 1 ? '' : 's'}
              </p>
              <p className="text-[11px] font-bold text-slate-400">
                Modeled House vote{' '}
                <span className="num text-slate-200">{showExact ? `D ${plusMinus(houseRace.shares.dem - houseRace.shares.rep)} vs R` : ratingFor(houseRace.shares.dem >= houseRace.shares.rep ? 'dem' : 'rep', Math.abs(houseRace.shares.dem - houseRace.shares.rep), false)}</span>
              </p>
              <p className="text-[11px] font-bold text-slate-400">
                Local candidate{' '}
                <span className="num text-slate-200">{plusMinus((game.raceQuality?.[`house:${houseRace.state}`] || 0) * 0.5)}</span>
              </p>
              <p className="w-full text-[10px] font-bold text-slate-500">
              Map colors show the projected seat delegation. The modeled House vote averages district shares. Each district uses its sourced baseline and the state generic ballot, with local and candidate adjustments.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-center text-[11px] font-bold text-slate-500">
              Pick a state to see its delegation.
            </p>
          )}
        </>
      )}

      {/* ---------------------------------------------------------- Governors */}
      {tab === 'gov' && (
        <>
          <div className="mt-2">
            <DownballotMap
              races={gov.races}
              showExact={showExact}
              selected={targetAbbr}
              onSelect={(abbr) => onSelect(abbr === selected ? null : abbr)}
              flipped={[]}
              accentRing={accent}
              emptyLabel="no governor's race"
            />
          </div>

          {govRace ? (
            <div className="panel-lite mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2">
              <p className="font-heading text-[13px] text-white">{govRace.name}</p>
              <p className="num text-[12px] font-extrabold" style={{ color: govRace.winnerColor || govRace.color }}>
                {ratingFor(govRace.winner, govRace.lead, showExact)}
              </p>
              <p className="text-[11px] font-bold text-slate-400">
                Held by{' '}
                <span style={{ color: govRace.defending === 'dem' ? DEM : REP }}>
                  {govRace.defending === 'dem' ? 'Democrats' : 'Republicans'}
                </span>
              </p>
              <p className="text-[11px] font-bold text-slate-400">
                Local candidate{' '}
                <span className="num text-slate-200">{plusMinus(game.raceQuality?.[`gov:${govRace.state}`] || 0)}</span>
              </p>
              {govRace.note && <p className="w-full text-[10px] font-bold text-slate-500">{govRace.note}</p>}
            </div>
          ) : (
            <p className="mt-2 text-center text-[11px] font-bold text-slate-500">
              Eleven states elect a governor in 2028. Pick one.
            </p>
          )}
        </>
      )}



      {tab === 'log' && (
        <div className="mt-2 max-h-[560px] overflow-y-auto pr-1 map-scroll">
          <HistoryPanel game={game} you={you} them={them} accent={accent} oppAccent={oppAccent} />
        </div>
      )}
    </div>
  );
}
