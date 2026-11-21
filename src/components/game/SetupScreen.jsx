import { scenarioPartyMeta } from '@/lib/build39Scenarios';
import React, { useEffect, useMemo, useState } from 'react';
import { byParty, homeAbbr } from '@/data/candidates';
import { orderCandidatesForSelection } from '@/data/candidateFactionProfiles';
import { STATE_BY_ABBR, leansForNational, addRandomness } from '@/data/states';
import { createGame, snapshot, DIFFICULTIES, START_OPTIONS } from '@/lib/gameEngine';
import { startingNationalEnvironment } from '@/lib/newGameProfiles';
import { SENATE_RACES } from '@/data/senate';
import { THIRD_PARTIES, isThirdParty } from '@/data/thirdParties';
import { GOVERNOR_RACES, INDIE_SENATE_RACES } from '@/data/downballot';
import CandidatePicker from '@/components/setup/CandidatePicker';
import CoalitionPreview from '@/components/setup/CoalitionPreview';
import DifficultyPicker from '@/components/setup/DifficultyPicker';
import MapTuner from '@/components/setup/MapTuner';
import { leadLabel } from '@/components/setup/ScaleSlider';
import RunningMatePicker from '@/components/setup/RunningMatePicker';
import { mateOptions } from '@/data/runningMates';
import { ArrowRight, CircleHelp, Dices, RotateCcw } from 'lucide-react';
import QuickOutcomeReport from '@/components/game/QuickOutcomeReport';
import QuickSweepControl from '@/components/setup/QuickSweepControl';
import { VOTING_RULES } from '@/data/build38VotingRules';
import { QUICK_SIMULATION_DRAWS, simulateQuickOutcomes } from '@/lib/outcomeSimulation';
import TutorialDialog from '@/components/game/TutorialDialog';
import Build40ModePicker from '@/components/setup/Build40ModePicker';
import { normalizeBuild40Mode, scenarioPartyIds } from '@/lib/build40Elections';

const ACCENT = { dem: '#4C7BFF', rep: '#E8433C', lib: '#F5C542', grn: '#3FBF6F' };

function Step({ n, title, children, note = null, tilt = 0 }) {
  return (
    <section className="panel p-4 sm:p-5" style={{ transform: `rotate(${tilt}deg)` }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 -rotate-6 items-center justify-center rounded-[9px_4px_10px_5px] bg-primary text-[12px] font-extrabold text-primary-foreground">
          {n}
        </span>
        <h2 className="font-heading text-[17px] leading-none text-white">{title}</h2>
      </div>
      {note && <p className="mb-3 text-[12px] font-semibold text-slate-400">{note}</p>}
      {children}
    </section>
  );
}

function Toggle({ on, onChange, label, blurb, color }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="panel-lite flex w-full items-start gap-2 p-2.5 text-left transition-colors hover:bg-white/10"
      style={on ? { borderColor: color, boxShadow: `inset 0 0 0 1px ${color}88` } : undefined}
    >
      <span
        className="mt-[2px] flex h-4 w-7 shrink-0 items-center rounded-full border border-white/25 px-[2px]"
        style={{ backgroundColor: on ? color : 'rgba(0,0,0,0.35)', justifyContent: on ? 'flex-end' : 'flex-start' }}
      >
        <span className="h-3 w-3 rounded-full bg-white" />
      </span>
      <span className="min-w-0">
        <span className="block font-heading text-[13px] leading-tight text-white">{label}</span>
        <span className="block text-[10.5px] font-semibold leading-snug text-slate-400">{blurb}</span>
      </span>
    </button>
  );
}

function pickRandom(list, exclude = []) {
  const pool = list.filter((c) => !exclude.includes(c.id));
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function SetupScreen({ onStart, hasSave, onResume, onDiscardSave }) {
  const [party, setParty] = useState('dem');
  const [candidateId, setCandidateId] = useState('harris');
  const [rivalParty, setRivalParty] = useState('rep');
  const [opponentId, setOpponentId] = useState('vance');
  const [mateId, setMateId] = useState('ossoff');
  const [difficultyId, setDifficultyId] = useState('medium');
  const [national, setNational] = useState(0);
  const [nationalCustomized, setNationalCustomized] = useState(false);
  const [randomness, setRandomness] = useState(0);
  const [chaosSeed, setChaosSeed] = useState(() => Math.floor(Math.random() * 99991) + 1);
  const [adjust, setAdjust] = useState({});
  const [modeId, setModeId] = useState('two-parties');
  const { scenarioId, thirdMode } = normalizeBuild40Mode(modeId);
  const [indieSenate, setIndieSenate] = useState(false);
  const [startId, setStartId] = useState('aug');
  const [popularVote, setPopularVote] = useState(false);
  const [houseRule, setHouseRule] = useState('standard');
  const [electoralRule, setElectoralRule] = useState('standard');
  const [simulateElection, setSimulateElection] = useState(false);
  const [votingRuleId, setVotingRuleId] = useState('current');
  const [quickEnvironmentSweep, setQuickEnvironmentSweep] = useState(false);
  const [quickReportOpen, setQuickReportOpen] = useState(false);
  const [quickReport, setQuickReport] = useState(null);
  const [quickProgress, setQuickProgress] = useState(0);
  const [quickBusy, setQuickBusy] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [quickError, setQuickError] = useState('');
  const startChoice = START_OPTIONS.find((o) => o.id === startId) || START_OPTIONS[2];
  const defaultStartEnvironment = startingNationalEnvironment({
    difficultyId,
    playerParty: party,
    modeMaximumEnvironment: DIFFICULTIES[difficultyId]?.startEnvironment,
  });

  // How far the national mood may be dragged toward your own party is a
  // difficulty setting, written from the player's side: a cap of +3 means "three
  // points your way and no further". Positive is Democratic on the slider, so a
  // Republican player's cap flips sign. Third parties are never capped.
  const genericCap = isThirdParty(party) ? null : DIFFICULTIES[difficultyId]?.genericCap;
  const capDem = genericCap == null ? null : party === 'rep' ? -genericCap : genericCap;
  const capValue = (v) => {
    if (capDem == null) return v;
    return party === 'rep' ? Math.max(capDem, v) : Math.min(capDem, v);
  };
  const handleNational = (v) => {
    setNationalCustomized(true);
    setNational(capValue(v));
  };

  useEffect(() => {
    if (!nationalCustomized) {
      setNational(defaultStartEnvironment.nationalGeneric);
      return;
    }
    if (capDem != null) setNational((v) => capValue(v));
  }, [capDem, party, difficultyId, nationalCustomized]);

  const stateEditsEnabled = ['cupcake', 'easy'].includes(difficultyId);
  const nationalRangeMin = isThirdParty(party) ? -15 : -25;
  const allowedNationalMin = capDem == null ? nationalRangeMin : party === 'rep' ? capDem : nationalRangeMin;
  const allowedNationalMax = capDem == null ? 25 : party === 'rep' ? 25 : capDem;
  const changeDifficulty = (nextDifficultyId) => {
    setDifficultyId(nextDifficultyId);
    setNationalCustomized(false);
    if (!['cupcake', 'easy'].includes(nextDifficultyId)) setAdjust({});
    const nextEnvironment = startingNationalEnvironment({
      difficultyId: nextDifficultyId,
      playerParty: party,
      modeMaximumEnvironment: DIFFICULTIES[nextDifficultyId]?.startEnvironment,
    });
    setNational(nextEnvironment.nationalGeneric);
  };

  const field = (id) => byParty(id, scenarioId);
  const activeParties = scenarioPartyIds(modeId).filter((id) => id !== 'ind');
  const accentFor = (id) => scenarioPartyMeta(scenarioId, id)?.color || ACCENT[id];
  const yourField = field(party);
  // A third-party nominee is on the ballot against all three of the others: pick
  // which one you want to be measured against, and the rest campaign anyway.
  const theirParty = isThirdParty(party) ? rivalParty : party === 'dem' ? 'rep' : 'dem';
  const rivalParties = isThirdParty(party)
    ? activeParties.filter((p) => p !== party)
    : [];
  const theirField = field(theirParty);
  const yourCand = yourField.find((c) => c.id === candidateId);
  const nomineeAbbr = yourCand ? homeAbbr(yourCand) : null;
  // The running mate cannot come from the nominee's own state.
  const mates = useMemo(
    () => mateOptions(party, candidateId, scenarioId).map((m) => ({ ...m, sameState: m.stateAbbr === nomineeAbbr })),
    [party, candidateId, nomineeAbbr, scenarioId]
  );

  // Keep map randomness separate from hand-edited state leans. The engine
  // applies hand edits only on difficulties that allow them.
  const baseLeans = useMemo(
    () => addRandomness(leansForNational(national), randomness, chaosSeed),
    [national, randomness, chaosSeed],
  );
  const leans = useMemo(() => {
    const spread = { ...baseLeans };
    if (stateEditsEnabled) {
      Object.entries(adjust).forEach(([abbr, delta]) => {
        spread[abbr] = (spread[abbr] || 0) + delta;
      });
    }
    return spread;
  }, [baseLeans, adjust, stateEditsEnabled]);

  // What the two names at the top of the ticket are worth nationally.
  const qualityDelta = useMemo(() => {
    const you = yourField.find((c) => c.id === candidateId);
    const them = theirField.find((c) => c.id === opponentId);
    if (!you || !them) return 0;
    const demCand = you.party === 'dem' ? you : them;
    const repCand = you.party === 'dem' ? them : you;
    return Math.round(((demCand.nat || 0) - (repCand.nat || 0)) * 10) / 10;
  }, [yourField, theirField, candidateId, opponentId]);

  useEffect(() => {
    const chosen = mates.find((m) => m.id === mateId);
    if (chosen && !chosen.sameState) return;
    const eligible = mates.find((m) => !m.sameState);
    if (eligible && eligible.id !== mateId) setMateId(eligible.id);
  }, [mates, mateId]);

  const pickParty = (p) => {
    setParty(p);
    setNationalCustomized(false);
    setNational(startingNationalEnvironment({ difficultyId, playerParty: p, modeMaximumEnvironment: DIFFICULTIES[difficultyId]?.startEnvironment }).nationalGeneric);
    const yours = field(p);
    const sorted = yours.slice().sort((a, b) => b.weight - a.weight);
    const top = sorted[0];
    if (!top) return;
    setCandidateId(top.id);
    const rival = p === 'dem' ? 'rep' : p === 'rep' ? 'dem' : 'rep';
    setRivalParty(rival);
    const rivalTop = field(rival).slice().sort((a, b) => b.weight - a.weight)[0];
    setOpponentId(rivalTop.id);
    // The running mate is the next name on your own list, not the nominee.
    const nextMate = sorted.find((c) => c.id !== top.id);
    setMateId(nextMate ? nextMate.id : sorted[0].id);
  };

  const pickRival = (p) => {
    setRivalParty(p);
    const top = field(p).slice().sort((a, b) => b.weight - a.weight)[0];
    setOpponentId(top.id);
  };

  const pickNominee = (id) => {
    setCandidateId(id);
    if (mates.every((m) => m.id !== mateId)) {
      setMateId(mates.find((m) => m.id !== id)?.id || mateId);
    }
  };

  const randomizeNominee = () => {
    const pick = pickRandom(yourField, [mateId]);
    if (pick) setCandidateId(pick.id);
  };

  const randomizeOpponent = () => {
    const pick = pickRandom(theirField);
    if (pick) setOpponentId(pick.id);
  };

  const previewGame = useMemo(() => {
    return createGame({
      party,
      candidateId,
      opponentId,
      difficultyId,
      leans: baseLeans,
      stateAdjustments: adjust,
      nationalGeneric: national,
      runningMateId: mateId,
      weighted: true,
      thirdMode, scenarioId, modeId, opponentParty: theirParty,
      indieSenate,
      houseRule,
      electoralRule,
      votingRuleId,
    });
  }, [party, candidateId, opponentId, difficultyId, baseLeans, adjust, national, mateId, thirdMode, scenarioId, indieSenate, houseRule, electoralRule, votingRuleId, modeId, theirParty]);
  const previewRows = useMemo(() => snapshot({ ...previewGame, noise: {} }).rows, [previewGame]);

  const setNudge = (abbr, delta) => {
    if (!stateEditsEnabled) return;
    setAdjust((prev) => ({ ...prev, [abbr]: Math.round(delta * 10) / 10 }));
  };

  const theirCand = theirField.find((c) => c.id === opponentId);
  const mate = mates.find((m) => m.id === mateId);

  const runQuickOutcomes = async () => {
    setQuickReportOpen(true);
    setQuickReport(null);
    setQuickProgress(0);
    setQuickError('');
    setQuickBusy(true);
    try {
      const game = createGame({
        party,
        candidateId,
        opponentId,
        difficultyId,
        leans: baseLeans,
        stateAdjustments: adjust,
        nationalGeneric: national,
        runningMateId: mateId,
        weighted: true,
        thirdMode, scenarioId, modeId, opponentParty: theirParty,
        indieSenate,
        startId,
        popularVote,
        houseRule,
        electoralRule,
        votingRuleId,
        randomness,
      });
      const report = await simulateQuickOutcomes(game, {
        draws: QUICK_SIMULATION_DRAWS,
        sweepEnvironment: quickEnvironmentSweep,
        onProgress: setQuickProgress,
      });
      setQuickReport(report);
    } catch (error) {
      setQuickError(error?.message || 'The outcome simulation could not finish.');
    } finally {
      setQuickBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="relative mb-6 text-center">
        <p className="mb-2 inline-block rotate-[-1.5deg] rounded-sm border-2 border-dashed border-primary/60 bg-primary/10 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">
          {startChoice.label} → November 7, 2028
        </p>
        <h1 className="font-heading text-4xl leading-none text-white sm:text-6xl">
          270<span className="text-primary">·</span>Twenty Eight
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm font-medium text-slate-400">
          {startChoice.totalWeeks} weeks. Fifty states, {SENATE_RACES.length} Senate seats, {GOVERNOR_RACES.length}{' '}
          governors and all 435 House seats — plus a rogue AI with 40 million followers and two third parties who will
          not go away.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          <span className="chip chip-gold">Generic ballot {leadLabel(national)}</span>
          <span className="chip">House + governors</span>
          <span className="chip">Third parties</span>
          <span className="chip">Polling misses</span>
        </div>
        <button type="button" onClick={() => setTutorialOpen(true)} className="btn-outline mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold">
          <CircleHelp className="h-3.5 w-3.5" /> How to play
        </button>
      </header>

      {hasSave && (
        <div className="panel mb-4 border-primary/40 p-3 sm:flex sm:items-center sm:justify-between">
          <p className="text-[13px] font-bold text-white">You have a campaign in progress.</p>
          <div className="mt-2 flex gap-2 sm:mt-0">
            <button type="button" onClick={onResume} className="btn-gold px-4 py-1.5 text-[13px]">
              Resume
            </button>
            <button
              type="button"
              onClick={onDiscardSave}
              className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-[12px] font-bold"
            >
              <RotateCcw className="h-3 w-3" /> Discard
            </button>
          </div>
        </div>
      )}

      <section className="mb-3 grid gap-3 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.5fr)]" aria-label="Difficulty and starting map">
        <Step n="B" title="How difficult should this be?" tilt={-0.15}>
          <DifficultyPicker value={difficultyId} onChange={changeDifficulty} />
        </Step>
        <Step n="A" title="Set the starting map" note={`The ${DIFFICULTIES[difficultyId].label} profile starts at ${leadLabel(defaultStartEnvironment.nationalGeneric)}. Changing party or difficulty resets the starting environment.`}>
          {nationalCustomized && <button type="button" onClick={() => { setNationalCustomized(false); setNational(defaultStartEnvironment.nationalGeneric); }} className="mb-2 rounded-full border border-primary/40 px-3 py-1 text-[10px] font-extrabold text-primary hover:bg-primary/10">Reset to {DIFFICULTIES[difficultyId].label} profile ({leadLabel(defaultStartEnvironment.nationalGeneric)})</button>}
          <MapTuner
            leans={leans} adjust={adjust} onAdjust={setNudge} national={national} onNational={handleNational}
            nationalRangeMin={nationalRangeMin}
            nationalAllowedMin={allowedNationalMin} nationalAllowedMax={allowedNationalMax}
            stateEditsEnabled={stateEditsEnabled}
            stateEditNote="State-by-state adjustments are limited to Cupcake and Easy."
            capNote={capDem == null ? null : `The ${DIFFICULTIES[difficultyId].label} cap limits player-favorable starting conditions to ${leadLabel(capDem)}.`}
            randomness={randomness} onRandomness={setRandomness} onReroll={() => setChaosSeed(Math.floor(Math.random() * 99991) + 1)}
            qualityDelta={qualityDelta} previewRows={previewRows} showExact={DIFFICULTIES[difficultyId].showExact}
          />
        </Step>
      </section>

      <div className="space-y-3">
        <Step n="1" title="Which party are you running for?">
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {activeParties.map((id) => {
              const meta = scenarioPartyMeta(scenarioId, id);
              const label = meta?.name || THIRD_PARTIES[id]?.label || (id === 'dem' ? 'Democratic Party' : 'Republican Party');
              const p = { id, label, sub: field(id).length + (field(id).length === 1 ? ' candidate' : ' candidates') };
              const accent = accentFor(id);
              return (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`party-${p.id}`}
                  onClick={() => pickParty(p.id)}
                  className="panel-lite p-3 text-left transition-transform duration-150 hover:-translate-y-[2px] hover:rotate-[-0.6deg] hover:bg-white/10"
                  style={
                    party === p.id
                      ? { borderColor: accent, backgroundColor: `${accent}24`, boxShadow: `inset 0 0 0 1px ${accent}88` }
                      : undefined
                  }
                >
                  <span className="mb-1.5 block h-1.5 w-10 rounded-full" style={{ backgroundColor: accent }} />
                  <p className="font-heading text-[13.5px] leading-tight text-white">{p.label}</p>
                  <p className="text-[11px] font-bold text-slate-500">{p.sub}</p>
                </button>
              );
            })}
          </div>
          {isThirdParty(party) && (
            <p className="mt-2 rounded-lg border border-dashed border-white/25 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400">
              {scenarioPartyMeta(scenarioId, party)?.description || THIRD_PARTIES[party]?.blurb || 'This ticket campaigns wherever it has ballot access.'} You will need a major-party rival to beat.
            </p>
          )}
        </Step>

        <Step n="2" title="Pick your nominee" note="Poll pull is based on early 2028 national surveys and prediction markets.">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={randomizeNominee}
              className="btn-ghost flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold"
            >
              <Dices className="h-3 w-3" /> Roll a nominee
            </button>
          </div>
          <CandidatePicker
            candidates={orderCandidatesForSelection(yourField, party)}
            selected={candidateId}
            onSelect={pickNominee}
            accent={accentFor(party)}
            prefix="cand"
          />
          <CoalitionPreview party={party} candidateId={candidateId} />
        </Step>

        <Step
          n="3"
          title="Pick your running mate"
          note="The bottom of the ticket is a map decision: a home state, its neighbours, a regional pull — paid for nationally. A running mate cannot come from your nominee's own state: each state's electors get one vote."
          tilt={-0.25}
        >
          {mates.length ? <RunningMatePicker mates={mates} selected={mateId} onSelect={setMateId} accent={accentFor(party)} /> : <p className="text-sm text-slate-400">This scenario ticket has a single named nominee.</p>}
          {mate && (
            <p className="mt-2 text-[11px] font-bold text-slate-500">
              {mate.short} carries {mate.states ? Object.keys(mate.states).map((a) => STATE_BY_ABBR[a]?.name || a).join(', ') : '—'} and the{' '}
              {Object.keys(mate.region || {})[0]} region, and costs you {mate.nat > 0 ? 'nothing' : `${Math.abs(mate.nat).toFixed(1)} nationally`}.
            </p>
          )}
        </Step>

        <Step
          n="4"
          title="Who are you running against?"
          note={
            isThirdParty(party)
              ? 'You share a ballot with all three of them. Pick the one you most want to beat — the other two run their own seven-action campaigns every week.'
              : 'Both fields are open — you can also run a fantasy matchup.'
          }
          tilt={0.2}
        >
          {isThirdParty(party) && (
            <div className="mb-2 grid grid-cols-3 gap-1.5">
              {rivalParties.map((p) => (
                <button
                  key={p}
                  type="button"
                  data-testid={`rival-${p}`}
                  onClick={() => pickRival(p)}
                  className="truncate rounded-lg border px-2 py-1 text-[11px] font-extrabold"
                  style={
                    theirParty === p
                      ? { borderColor: ACCENT[p], backgroundColor: `${ACCENT[p]}22`, color: '#fff' }
                      : { borderColor: 'rgba(255,255,255,0.16)', color: '#B9C4D6' }
                  }
                >
                  {p === 'dem' ? 'A Democrat' : p === 'rep' ? 'A Republican' : (scenarioPartyMeta(scenarioId, p)?.label || THIRD_PARTIES[p].short)}
                </button>
              ))}
            </div>
          )}
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={randomizeOpponent}
              className="btn-ghost flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold"
            >
              <Dices className="h-3 w-3" /> Roll a rival
            </button>
          </div>
          <CandidatePicker
            candidates={orderCandidatesForSelection(theirField, theirParty)}
            selected={opponentId}
            onSelect={setOpponentId}
            accent={ACCENT[theirParty]}
            prefix="opp"
          />
        </Step>

        <details className="panel p-3 sm:p-4">
          <summary className="flex cursor-pointer list-none flex-col gap-1 rounded-lg px-2 py-1 outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-primary sm:flex-row sm:items-center sm:justify-between">
            <span className="font-heading text-[17px] text-white">Advanced Options</span>
            <span className="text-[11px] font-semibold text-slate-400">
              {DIFFICULTIES[difficultyId].label} · {startChoice.label} · {leadLabel(national)} generic ballot ·{' '}
              {[
                popularVote ? 'Popular vote decides the presidency' : null,
                houseRule === 'mmp' ? 'House: 870 seats, MMP, 5% national threshold' : houseRule === 'pr' ? 'House: 435 seats, PR, 5% national threshold' : 'House: 435 seats, district system',
                electoralRule === 'proportional' ? 'Electoral College: proportional, 5% state threshold' : electoralRule === 'district' ? 'Electoral College: district electors in all states' : 'Electoral College: standard state allocation',
                thirdMode === 'surge' ? 'third parties surging' : null,
                indieSenate ? 'independent Senate candidates' : null,
                randomness ? `${randomness}% map shuffle` : null,
                simulateElection ? 'AI simulation' : null,
              ].filter(Boolean).join(' · ') || 'standard election settings'}
            </span>
          </summary>
          <div className="mt-3 space-y-3">
        <Step n="C" title="Election mode and voting rules">
          <Build40ModePicker modeId={modeId} onChange={(id) => {
            setModeId(id);
            const next = normalizeBuild40Mode(id);
            const nextParties = scenarioPartyIds(id);
            const nextParty = nextParties.includes(party) ? party : 'dem';
            const candidates = byParty(nextParty, next.scenarioId);
            const nominee = candidates.find((candidate) => candidate.id === candidateId) || candidates[0];
            if (!nominee) return;
            if (nextParty !== party) {
              setNationalCustomized(false);
              setNational(startingNationalEnvironment({ difficultyId, playerParty: nextParty, modeMaximumEnvironment: DIFFICULTIES[difficultyId]?.startEnvironment }).nationalGeneric);
            }
            if (!['cupcake', 'easy'].includes(difficultyId)) setAdjust({});
            setParty(nextParty);
            setCandidateId(nominee.id);
            const opponentParty = nextParty === 'dem' ? 'rep' : nextParty === 'rep' ? 'dem'
              : nextParties.includes(rivalParty) && rivalParty !== nextParty ? rivalParty : 'rep';
            const opponents = byParty(opponentParty, next.scenarioId);
            setRivalParty(opponentParty);
            setOpponentId((opponents.find((candidate) => candidate.id === opponentId) || opponents[0])?.id || '');
          }} />
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="block text-sm">Voting rules
              <select className="ml-2 bg-slate-900" value={votingRuleId} onChange={(event) => setVotingRuleId(event.target.value)}>
                {VOTING_RULES.map((rule) => <option key={rule.id} value={rule.id}>{rule.label}</option>)}
              </select>
              <span className="block text-xs text-slate-400">{VOTING_RULES.find((rule) => rule.id === votingRuleId)?.description}</span>
            </label>
            <Toggle on={popularVote} onChange={setPopularVote} label="Decide it by the popular vote"
              blurb="The national popular vote decides the presidency." color="#4C7BFF" />
            <Toggle
              on={indieSenate}
              onChange={setIndieSenate}
              label="Independents in ND, SD and ID"
              blurb={`${INDIE_SENATE_RACES.ND.name}, ${INDIE_SENATE_RACES.SD.name} and ${INDIE_SENATE_RACES.ID.name} run as independents instead of Democrats — and poll better doing it.`}
              color="#3FBF6F"
            />
          </div>
          <p className="mt-2 rounded-lg border border-dashed border-fuchsia-400/40 bg-fuchsia-400/5 px-2.5 py-1.5 text-[11px] font-semibold text-fuchsia-200">
            Utah is already set: no Democrat on the Senate ballot, and Evan McMullin running as an independent with
            Democratic help.
          </p>
        </Step>

        <Step
          n="D"
          title="When does this start — and how is it decided?"
          note="Every campaign ends on the same election night. Starting earlier means more weeks of events, more money, and more chances to lose the plot."
          tilt={0.15}
        >
          <div className="grid grid-cols-3 gap-2">
            {START_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                data-testid={`start-${o.id}`}
                onClick={() => setStartId(o.id)}
                className="panel-lite p-2.5 text-left transition-transform duration-150 hover:-translate-y-[2px] hover:bg-white/10"
                style={
                  startId === o.id
                    ? { borderColor: '#F7C145', boxShadow: 'inset 0 0 0 1px #F7C14588', backgroundColor: '#F7C14518' }
                    : undefined
                }
              >
                <p className="font-heading text-[13px] leading-tight text-white">{o.label}</p>
                <p className="num text-[10.5px] font-extrabold text-slate-400">{o.totalWeeks} weeks</p>
                <p className="mt-1 text-[10px] font-semibold leading-snug text-slate-500">{o.blurb}</p>
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="panel-lite p-2.5">
              <p className="mb-1 font-heading text-[13px] text-white">House rule</p>
              <div className="grid grid-cols-3 gap-1">
                {[
                  ['standard', '435 seats', 'Constituency-style map'],
                  ['pr', 'Proportional', 'Statewide PR · 5% national threshold'],
                  ['mmp', 'MMP · 870', '435 constituency + 435 list seats'],
                ].map(([value, label, detail]) => (
                  <button key={value} type="button" onClick={() => setHouseRule(value)} className={`rounded-lg border px-2 py-2 text-left transition-colors ${houseRule === value ? 'border-amber-300 bg-amber-300/10' : 'border-white/10 bg-black/20 hover:bg-white/5'}`}>
                    <span className="block font-heading text-[11px] text-white">{label}</span>
                    <span className="mt-0.5 block text-[9px] font-semibold leading-snug text-slate-400">{detail}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="panel-lite p-2.5">
              <p className="mb-1 font-heading text-[13px] text-white">Electoral College rule</p>
              <div className="grid grid-cols-3 gap-1">
                {[
                  ['standard', 'Standard', 'Winner-take-all; ME and NE split'],
                  ['proportional', 'Proportional', 'Each state allocates by vote share'],
                  ['district', 'District plan', '2 statewide + House district electors'],
                ].map(([value, label, detail]) => (
                  <button key={value} type="button" onClick={() => setElectoralRule(value)} className={`rounded-lg border px-2 py-2 text-left transition-colors ${electoralRule === value ? 'border-blue-300 bg-blue-300/10' : 'border-white/10 bg-black/20 hover:bg-white/5'}`}>
                    <span className="block font-heading text-[11px] text-white">{label}</span>
                    <span className="mt-0.5 block text-[9px] font-semibold leading-snug text-slate-400">{detail}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-slate-500">These settings are independent. The popular-vote option in Panel C still decides the presidency when selected.</p>
          {!popularVote && (
            <p className="mt-2 rounded-lg border border-dashed border-white/25 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400">
              If nobody reaches 270 electors, the election goes to the House of Representatives, which votes by state
              delegation — one vote per state. Whoever controls the most delegations wins the White House.
            </p>
          )}
          <div className="mt-2">
            <Toggle
              on={simulateElection}
              onChange={setSimulateElection}
              label="Simulate election · all campaigns run by AI"
              blurb="Both major tickets and the other campaigns make their own moves. Weeks advance automatically to election night."
              color="#F7C145"
            />
          </div>
        </Step>
            <div className="panel-lite p-3">
              <QuickSweepControl checked={quickEnvironmentSweep} onChange={setQuickEnvironmentSweep} draws={QUICK_SIMULATION_DRAWS} disabled={quickBusy} />
            </div>
          </div>
        </details>

      </div>

      <div className="sticky bottom-3 mt-5">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            data-testid="launch"
            onClick={() =>
              onStart({
                party,
                candidateId,
                opponentId,
                difficultyId,
                leans: baseLeans,
                stateAdjustments: adjust,
                nationalGeneric: national,
                runningMateId: mateId,
                weighted: true,
                thirdMode, scenarioId, modeId, opponentParty: theirParty,
                indieSenate,
                startId,
                popularVote,
                houseRule,
                electoralRule,
                votingRuleId,
                simulateElection,
                randomness,
              })
            }
            className="btn-gold w-full px-6 py-4 text-[18px]"
          >
            {simulateElection ? 'Run AI election simulation' : 'Launch the campaign'}
            <ArrowRight className="ml-2 inline h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={runQuickOutcomes}
            disabled={quickBusy}
            className="btn-outline flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-extrabold disabled:cursor-wait disabled:opacity-60"
          >
            {quickBusy ? `${Math.round(quickProgress / QUICK_SIMULATION_DRAWS * 100)}%` : '50,000 quick outcomes'}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] font-bold text-slate-500">
          {yourCand?.short} & {mate?.short || ''} vs. {theirCand?.short} · {DIFFICULTIES[difficultyId].label} mode ·{' '}
          {leadLabel(national)} generic ballot
          {randomness ? ` · ${randomness}% shuffled` : ''} ·{' '}
          {thirdMode === 'surge' ? 'third parties surging' : 'third parties as usual'} ·{' '}
          {popularVote ? 'popular vote decides' : `${electoralRule} electors`} · {houseRule === 'standard' ? '435-seat House' : houseRule === 'pr' ? 'House PR' : '870-seat MMP House'} · {startChoice.label} start
        </p>
      </div>
      <TutorialDialog open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      <QuickOutcomeReport
        open={quickReportOpen}
        onClose={() => setQuickReportOpen(false)}
        report={quickReport}
        progress={quickProgress}
        busy={quickBusy}
        error={quickError}
      />
    </div>
  );
}
