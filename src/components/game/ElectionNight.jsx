import NightStateCall from '@/components/game/night/NightStateCall';
import { scenarioPartyMeta } from '@/lib/build39Scenarios';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import NightHeader from '@/components/game/night/NightHeader';
import NightBoard from '@/components/game/night/NightBoard';
import Build40RaceDetails from '@/components/game/night/Build40RaceDetails';
import { normalizeBuild40Mode } from '@/lib/build40Elections';
import { STATE_DEMOGRAPHICS, ETHNIC_GROUPS } from '@/data/demographics';
import NightTally from '@/components/game/night/NightTally';
import NightRaceList from '@/components/game/night/NightRaceList';
import NightCalls from '@/components/game/night/NightCalls';
import PresidencyCall from '@/components/game/night/PresidencyCall';
import { buildNight, nightAt } from '@/lib/night';
import { useElectionForecast } from '@/lib/useElectionForecast';
import { decidePresidency } from '@/lib/presidency';
import { EV_TO_WIN, houseSnapshot, nomineeOf, resultSnapshot } from '@/lib/gameEngine';

const TICK = 100; // ms between ticks
const MIN_PER_SEC = 3; // game minutes per real second at 1×

function reportedDemographics(night, stateId, kind) {
  const rows = kind === 'pres' ? night.rows : kind === 'senate' ? night.senate.races : night.gov.races;
  const inState = rows.filter((row) => (row.state || row.abbr) === stateId);
  if (inState.length !== 1 || !inState[0].countedVotes || !inState[0].votes) return null;
  const votes = inState[0].votes;
  const weights = STATE_DEMOGRAPHICS[stateId]?.share || {};
  const denominator = ETHNIC_GROUPS.reduce((sum, group) => sum + (weights[group.id] || 0), 0);
  if (!denominator) return null;
  return { status: 'available', groups: ETHNIC_GROUPS.map(({ id, label }) => {
    const fraction = (weights[id] || 0) / denominator;
    return { id, label, denominator: inState[0].countedVotes * fraction,
      votesByCandidate: Object.fromEntries(Object.entries(votes).map(([party, count]) => [party, count * fraction])) };
  }) };
}

export default function ElectionNight({ game, you, them, accent, oppAccent, onDone }) {
  const plan = useMemo(() => buildNight(game), [game]);
  const result = useMemo(() => resultSnapshot(game), [game]);
  const [t, setT] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [kind, setKind] = useState('pres');
  const [stateId, setStateId] = useState(null);
  const [mode, setMode] = useState('winner');
  const [feed, setFeed] = useState([]);
  const [dismissedCall, setDismissedCall] = useState(null);
  const seen = useRef(new Set());

  const done = t >= plan.end;

  useEffect(() => {
    if (done) return;
    const step = (MIN_PER_SEC * speed * TICK) / 1000;
    const id = setInterval(() => setT((prev) => Math.min(plan.end, prev + step)), TICK);
    return () => clearInterval(id);
  }, [done, speed, plan.end]);

  const night = useMemo(() => nightAt(plan, t), [plan, t]);
  const forecastMinute = Math.min(plan.end, Math.floor(t / 15) * 15);
  const forecastReports = useMemo(() => nightAt(plan, forecastMinute), [plan, forecastMinute]);
  const forecastOptions = useMemo(() => ({
    draws: 120,
    chamberDraws: 120,
    reporting: {
      states: forecastReports.rows,
      districts: forecastReports.districts,
      senate: forecastReports.senate.races,
      house: forecastReports.house.states,
      houseDistricts: forecastReports.house.districts,
      governors: forecastReports.gov.races,
    },
  }), [forecastReports]);
  const { forecast: liveForecast } = useElectionForecast(game, forecastOptions);
  const calledKey = night.calls.map((c) => c.id).join('|');

  // Every newly called race drops into the feed with the hour it was called.
  useEffect(() => {
    const fresh = night.calls.filter((c) => !seen.current.has(c.id));
    if (!fresh.length) return;
    fresh.forEach((c) => seen.current.add(c.id));
    setFeed((list) => [...fresh.map((c) => ({ ...c, t })), ...list]);
  }, [calledKey]);

  const decision = useMemo(
    () => (done ? decidePresidency(game, result, houseSnapshot(game, true)) : null),
    [done, game, result]
  );

  const winnerShort =
    decision && decision.winner
      ? decision.winner === game.party
        ? you.short
        : decision.winner === them.party
          ? them.short
          : nomineeOf(game, decision.winner)?.short || String(decision.winner).toUpperCase()
      : null;

  const latestStateCall = feed.find((call) => call.kind === 'pres');
  const partyLabels = Object.fromEntries(Object.keys(result.evBy).map((party) => [party, scenarioPartyMeta(game.build39?.scenario?.id, party)?.label]));
  const projected = game.popularVote ? null : night.pres.reached;
  const calledName = projected
    ? projected === game.party
      ? you.name
      : projected === them.party
        ? them.name
        : nomineeOf(game, projected)?.name || String(projected).toUpperCase()
    : null;

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
      <NightHeader
        t={t}
        phase={night.phase}
        speed={speed}
        onSpeed={setSpeed}
        done={done}
        onSkip={() => setT(plan.end)}
      />

      <div className="mt-2 min-h-24">
        <NightStateCall key={latestStateCall?.id} call={latestStateCall && { ...latestStateCall, called: true }} partyLabels={partyLabels} reducedMotion={globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches} />
      </div>

      {projected && dismissedCall !== projected && (
        <PresidencyCall
          name={calledName}
          dem={night.evBy.dem}
          rep={night.evBy.rep}
          pct={night.pct}
          onDismiss={() => setDismissedCall(projected)}
        />
      )}

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <NightBoard
            kind={kind}
            onKind={setKind}
            mode={mode}
            onMode={setMode}
            night={night}
            accent={accent}
            selected={stateId}
            onSelect={['pres', 'senate', 'gov'].includes(kind) ? setStateId : undefined}
          />
          {stateId && ['pres', 'senate', 'gov'].includes(kind) && (
            <Build40RaceDetails kind={kind} stateId={stateId} night={night} game={game} finalResult={null}
              modeId={normalizeBuild40Mode(null, game).modeId}
              demographics={reportedDemographics(night, stateId, kind)}
              onStateChange={setStateId} onClose={() => setStateId(null)} />
          )}
          <NightRaceList kind={kind} night={night} />
        </div>

        <div className="space-y-3">
          <NightTally
            kind={kind}
            night={night}
            forecast={liveForecast}
            game={game}
            you={you}
            them={them}
            accent={accent}
            oppAccent={oppAccent}
          />

          <NightCalls feed={feed} />

          {done && (
            <div className="panel animate-pop-in border-primary/50 p-3 text-center">
              <p className="label-xs">The race is called</p>
              <p className="font-heading text-[19px] leading-tight text-white">
                {winnerShort ? `${winnerShort} wins the presidency` : 'Nobody can put a majority together'}
              </p>
              <p className="mt-1 text-[10.5px] font-bold text-slate-400">
                {decision?.mode === 'contingent'
                  ? decision.winner
                    ? `No one reached ${EV_TO_WIN}, so the House chose by state delegation — ${decision.delegations.counts[decision.winner]} of ${decision.delegations.total} states.`
                    : `No one reached ${EV_TO_WIN}; the leading House delegation counts are tied.`
                  : decision?.mode === 'popular'
                    ? `By ${decision.popular.margin.toFixed(1)} points in the national popular vote.`
                    : `${night.pres.demEV} to ${night.pres.repEV} in the Electoral College.`}
              </p>
              <button type="button" onClick={onDone} className="btn-gold mt-2 w-full py-2.5 text-[15px]">
                See the full results
              </button>
            </div>
          )}

          {!done && (
            <p className="px-1 text-center text-[10.5px] font-semibold leading-snug text-slate-500">
              States report at their own pace: two hours in the smallest, six in the largest. The desk calls a race
              once the margin is safe at the share counted.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
