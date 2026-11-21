import { scenarioPartyMeta } from '@/lib/build39Scenarios';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import ResultsMaps from '@/components/game/ResultsMaps';
import RankPanel from '@/components/game/RankPanel';
import { fileRun, scoringEnabled } from '@/lib/rankings';
import {
  DIFFICULTIES,
  resultSnapshot,
  senateSnapshot,
  houseSnapshot,
  nomineeOf,
  opsTotals,
  EV_TO_WIN,
} from '@/lib/gameEngine';
import { PARTY_COLOR } from '@/lib/downballot';
import { decidePresidency } from '@/lib/presidency';
import DecisionPanel from '@/components/game/DecisionPanel';
import { coalitionRows } from '@/lib/coalition';
import { Landmark, Flame, Users } from 'lucide-react';

const DEM = '#4C7BFF';
const REP = '#E8433C';

function signed(v) {
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;
}

export default function ResultsScreen({ game, snap, you, them, accent, oppAccent, onReplay, onNewGame, onOfferVP }) {
  const result = useMemo(() => resultSnapshot(game), [game]);
  const senate = useMemo(() => senateSnapshot(game, true), [game]);
  const senateStart = /** @type {Record<string, number>} */ (senate.start);
  const house = useMemo(() => houseSnapshot(game, true), [game]);
  const decision = useMemo(() => decidePresidency(game, result, house), [game, result, house]);
  const evOf = (party) => result.evBy?.[party] ?? 0;
  const yourEV = evOf(game.party);
  const theirEV = evOf(them.party);
  const otherEV = Math.max(0, result.otherEV || 0);
  // Third parties are counted on their own colour, never lumped together.
  const thirdEV = Object.keys(result.evBy).filter((party) => party !== 'dem' && party !== 'rep' && evOf(party) > 0)
    .map((party) => ({ party, ev: evOf(party), name: scenarioPartyMeta(game.build39?.scenario?.id, party)?.label
      || ({ lib: 'Libertarians', grn: 'Greens', ind: 'Independents' }[party]) || party }));
  const popShare = (party) => {
    const total = result.rows.reduce((sum, r) => sum + (r.cast || 0), 0) || 1;
    return result.rows.reduce((sum, r) => sum + (((result.firstChoicePopularVote ? r.shares : r.rcvShares || r.shares)?.[party]) || 0) * (r.cast || 0), 0) / total;
  };
  const yourPct = popShare(game.party);
  const theirPct = popShare(them.party);
  // 270 wins it. Nobody at 270 and the House votes by state delegation; with the
  // popular-vote switch on, none of that matters and the votes alone decide.
  const won = decision.winner === game.party;
  const winnerShort =
    !decision.winner
      ? null
      : decision.winner === game.party
      ? you.short
      : decision.winner === them.party
        ? them.short
        : nomineeOf(game, decision.winner)?.short || String(decision.winner).toUpperCase();

  const evLeaderRows = Object.entries(result.evBy || {}).filter(([, ev]) => ev > 0).sort((a, b) => b[1] - a[1]);
  const vpOptions = game.thirdMode === 'surge' && (!game.build39?.scenario?.id || game.build39.scenario.id === 'standard') && !game.popularVote && !game.electoralAllianceResolved &&
    !game.electoralAlliance && evLeaderRows[0]?.[0] === game.party && evLeaderRows[0]?.[1] < EV_TO_WIN &&
    evLeaderRows[0]?.[1] > (evLeaderRows[1]?.[1] || 0)
    ? ['dem', 'rep', 'lib', 'grn'].filter((party) => party !== game.party && yourEV + evOf(party) >= EV_TO_WIN)
    : [];
  const vpOfferPending = vpOptions.length > 0;

  const [ranking, setRanking] = useState(null);
  const filed = useRef(false);

  // File the finished campaign once, so the career table carries this run — unless
  // the map was shuffled past the scoring limit, in which case it stays unscored.
  const scored = scoringEnabled(game);
  useEffect(() => {
    if (vpOfferPending) return;
    if (filed.current) return;
    filed.current = true;
    if (!scored) {
      setRanking({ unscored: true, randomness: Math.round((game.randomness || 0) * 10) / 10 });
      return;
    }
    setRanking(fileRun({ game, result, senate, you, them, decision }));
  }, [game, result, senate, you, them, decision, scored, vpOfferPending]);

  useEffect(() => {
    if (!won) return;
    const shoot = () => {
      confetti({
        particleCount: 80,
        spread: 75,
        origin: { y: 0.22, x: Math.random() * 0.6 + 0.2 },
        colors: [accent, '#F7C145', '#2FB48C', '#ffffff'],
      });
    };
    shoot();
    const t = setTimeout(shoot, 420);
    return () => clearTimeout(t);
  }, [won, accent]);

  const swings = useMemo(() => {
    return result.rows
      .map((r) => ({ ...r, swing: r.margin - (game.leans[r.abbr] ?? r.margin) }))
      .filter((r) => Math.abs(r.swing) > 3)
      .sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing))
      .slice(0, 6);
  }, [result, game.leans]);

  const ops = opsTotals(game);
  const scandalCount = (game.scandals || []).length;
  // How the coalition ended up, group by group, against where it started.
  const coalition = useMemo(() => {
    const rows = coalitionRows(game).slice().sort((a, b) => b.moved - a.moved);
    return { rises: rows.slice(0, 3), falls: rows.slice(-3).reverse() };
  }, [game]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {vpOfferPending && (
        <div className="panel mb-3 animate-pop-in border-amber-300/50 p-4 sm:p-5">
          <p className="label-xs text-amber-200">The Electoral College has no majority</p>
          <h2 className="mt-1 font-heading text-xl text-white">Offer the vice presidency to build a majority</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            You led the four-party field but fell short of 270. Choose a rival whose electors would put your ticket over the top; the candidate accepts the offer and joins your ticket.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {vpOptions.map((party) => {
              const candidate = nomineeOf(game, party);
              const name = candidate?.name || ({ dem: 'Democratic nominee', rep: 'Republican nominee', lib: 'Libertarian nominee', grn: 'Green nominee' }[party]);
              return (
                <button key={party} type="button" onClick={() => onOfferVP(party)} className="btn-gold px-3 py-2.5 text-left">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider">Offer the vice presidency</span>
                  <span className="font-heading text-[15px]">{name}</span>
                  <span className="block text-[10px] font-bold text-slate-300">{yourEV} + {evOf(party)} = {yourEV + evOf(party)} electoral votes</span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => onOfferVP(null)} className="btn-ghost mt-2 w-full px-3 py-2 text-sm">
            Let House delegations decide
          </button>
        </div>
      )}
      <div
        className="panel animate-pop-in p-5 text-center sm:p-8"
        style={{ borderColor: won ? accent : oppAccent }}
      >
        <p className="label-xs">
          November 7, 2028 · {DIFFICULTIES[game.difficultyId].label} mode
        </p>
        <h1 className="mt-1 font-heading text-3xl leading-[0.98] text-white sm:text-5xl">
          {decision.mode === 'contingent' && !decision.winner
            ? 'House delegations are tied'
            : won ? `${you.short} wins the presidency` : `${winnerShort} wins the presidency`}
        </h1>
        <p className="mt-2 text-sm font-bold text-slate-300">
          <span className="num">{yourEV}</span> – <span className="num">{theirEV}</span> in the Electoral College
          {thirdEV.length > 0 ? ` · ${thirdEV.map((x) => `${x.ev} to the ${x.name}`).join(', ')}` : ''} ·{' '}
          <span className="num">{yourPct.toFixed(1)}%</span> –{' '}
          <span className="num">{theirPct.toFixed(1)}%</span> popular vote
        </p>
        <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
          {decision.mode === 'contingent'
            ? decision.winner
              ? 'Nobody reached 270 · the House of Representatives chose the president by state delegation'
              : 'Nobody reached 270 · state delegations are tied, with no seat-count tiebreak'
            : decision.mode === 'coalition'
              ? `${nomineeOf(game, decision.partner)?.short || decision.partner} accepts the vice presidency · combined ticket ${decision.allianceEV} EV`
            : decision.mode === 'popular'
              ? 'Decided by the national popular vote'
              : 'Decided in the Electoral College'}
        </p>
        <p className="mx-auto mt-2 max-w-xl text-[13px] font-medium text-slate-400">
          {decision.mode === 'contingent' && !decision.winner
            ? 'No candidate won a plurality of state delegations. The House delegation count is tied.'
            : decision.mode === 'coalition'
              ? `${you.name} offers the vice presidency to ${nomineeOf(game, decision.partner)?.name || decision.partner}. The combined ticket clears 270.`
              : won
            ? `Every week of it, and now ${you.name} is standing on a stage in the rain. Somewhere a rogue AI is live-posting the concession.`
            : `${you.name} calls to concede at 1:40am. You kept it close, but ${them.name} owned the last three weeks of the news cycle.`}
        </p>
      </div>

      <DecisionPanel decision={decision} game={game} you={you} them={them} />

      <RankPanel data={ranking} accent={accent} />

      <ResultsMaps game={game} result={result} accent={accent} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="panel p-3">
          <div className="flex items-center gap-1.5">
            <Landmark className="h-4 w-4" style={{ color: accent }} />
            <h2 className="font-heading text-[15px] text-white">The Senate</h2>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="label-xs">Seats gained</p>
              <p className="num text-2xl font-extrabold leading-none" style={{ color: DEM }}>
                {senate.net > 0 ? '+' : senate.net < 0 ? '−' : '±'}
                {Math.abs(senate.net)}
              </p>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
              {senate.control === 'dem'
                ? 'Democratic control'
                : senate.control === 'rep'
                  ? 'Republican control'
                  : 'Dead even'}
            </span>
            <div className="text-right">
              <p className="label-xs">Seats gained</p>
              <p className="num text-2xl font-extrabold leading-none" style={{ color: REP }}>
                {senate.net < 0 ? '+' : senate.net > 0 ? '−' : '±'}
                {Math.abs(senate.net)}
              </p>
            </div>
          </div>
          <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full border border-white/15">
            <div style={{ width: `${senate.dem}%`, backgroundColor: DEM }} />
            <div style={{ width: `${senate.rep}%`, backgroundColor: REP }} />
            {senate.lib !== undefined && (
              <>
                <div style={{ width: `${senate.lib}%`, backgroundColor: PARTY_COLOR.lib }} />
                <div style={{ width: `${senate.grn}%`, backgroundColor: PARTY_COLOR.grn }} />
              </>
            )}
          </div>
          <p className="mt-1 num flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span>
              {senate.lib !== undefined
                ? `${senate.dem} D · ${senate.rep} R · ${senate.lib} L · ${senate.grn} G`
                : `${senate.dem} D · ${senate.rep} R`}
            </span>
            <span>
              {senate.lib !== undefined
                ? `${senateStart.dem}–${senateStart.rep}–${senateStart.lib ?? 0}–${senateStart.grn ?? 0} standing`
                : `from ${senateStart.dem}–${senateStart.rep} after 2026`}
            </span>
          </p>
          {senate.tossups.length > 0 ? (
            <p className="mt-2 text-[11px] font-semibold text-slate-400">
              Decided by under four: {senate.tossups.map((r) => r.state).join(', ')}
            </p>
          ) : (
            <p className="mt-2 text-[11px] font-semibold text-slate-400">
              Not a single Senate race landed inside four points.
            </p>
          )}
        </div>

        <div className="panel p-3">
          <div className="flex items-center gap-1.5">
            <Landmark className="h-4 w-4" style={{ color: '#F7C145' }} />
            <h2 className="font-heading text-[15px] text-white">How wrong the polls were</h2>
          </div>
          <p className="mt-1.5 text-[12px] font-semibold text-slate-300">
            Every state was counted, and the result is on the map above — the size of the miss stays between the
            campaigns and the county clerks.
          </p>
          <p className="mt-2 text-[10.5px] font-semibold leading-snug text-slate-500">
            Polling error is only ever added to the final count. It does not exist during the campaign, so it can never
            be planned around.
          </p>
        </div>
      </div>

      {swings.length > 0 && (
        <div className="panel mt-3 p-3">
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4" style={{ color: accent }} />
            <h2 className="font-heading text-[15px] text-white">Biggest moves of the campaign</h2>
          </div>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {swings.map((s) => (
              <div key={s.abbr} className="panel-lite flex items-center justify-between px-2.5 py-1.5">
                <span className="font-heading text-[12px] text-white">
                  {s.name} <span className="text-[10px] text-slate-500">{s.ev} EV</span>
                </span>
                <span
                  className="num text-[11px] font-extrabold"
                  style={{ color: s.swing > 0 ? DEM : REP }}
                >
                  {signed(s.swing)} D
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10.5px] font-semibold text-slate-500">
            {ops.levels > 0
              ? `${ops.levels} levels of ground game across ${Object.keys(game.ops || {}).length} states · $${ops.weekly.toFixed(
                  1
                )}M a week at the end`
              : 'You ran no permanent field operation at all.'}
            {scandalCount > 0 ? ` · ${scandalCount} scandal${scandalCount === 1 ? '' : 's'} survived` : ''}
          </p>
        </div>
      )}

      <div className="panel mt-3 p-3">
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4" style={{ color: accent }} />
          <h2 className="font-heading text-[15px] text-white">The coalition you built</h2>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {[
            { title: 'Moved toward you', list: coalition.rises, color: '#6EE7B7' },
            { title: 'Moved away', list: coalition.falls, color: '#FCA5A5' },
          ].map((col) => (
            <div key={col.title}>
              <p className="label-xs mb-1">{col.title}</p>
              {col.list.map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11.5px] font-semibold text-slate-300">{g.label}</span>
                  <span className="num text-[11px] font-extrabold" style={{ color: col.color }}>
                    {signed(g.moved)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10.5px] font-semibold leading-snug text-slate-500">
          Every point here was worth that group's share of a state — and the party's own factions paid for it or paid
          you back every week.
        </p>
      </div>

      <div className="sticky bottom-4 mt-5 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onReplay} className="btn-gold flex-1 px-5 py-3 text-[16px]">
          Run it back
        </button>
        <button type="button" onClick={onNewGame} className="btn-ghost flex-1 px-5 py-3 font-heading text-[16px]">
          Set up a new race
        </button>
      </div>
    </div>
  );
}
