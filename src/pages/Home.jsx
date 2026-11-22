import { captureActionLayout, restoreActionLayout } from '@/lib/build39ActionLayout';
import { scenarioPartyMeta } from '@/lib/build39Scenarios';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import SetupScreen from '@/components/game/SetupScreen';
import GameScreen from '@/components/game/GameScreen';
import ResultsScreen from '@/components/game/ResultsScreen';
import ElectionNight from '@/components/game/ElectionNight';
import {
  createGame,
  applyChoice,
  acknowledgeCampaignNews,
  applyAction,
  purchaseGroundGame,
  groundLevel,
  constrainPolicyPolling,
  runAdBlitz,
  opponentTurn,
  advanceWeek,
  advanceDecisionEvent,
  prepareDecisionWeekClose,
  decisionPending,
  answerDebate,
  debateDefinition,
  changeStance,
  snapshot,
  loadGame,
  saveGame,
  clearSave,
  forceEvent,
  giveCash,
  developerAction,
  PARTY_COLOR,
  ACTIONS,
} from '@/lib/gameEngine';
import {
  decayCampaignStrategy,
  recordCampaignStrategy,
} from '@/lib/campaignOperations';
import { CANDIDATE_BY_ID } from '@/data/candidates';
import { STATE_BY_ABBR } from '@/data/states';
import { ISSUE_BY_ID } from '@/data/platform';
import { movementFor } from '@/lib/campaignPulse';
import { withReactionSummary } from '@/lib/reactions';
import { spinStory } from '@/lib/news';
import { recordIncident } from '@/lib/incidentLedger';
import { checkSaveModCompatibility, getModState, loadAndApplyMods, subscribeModRegistry } from '@/lib/modRegistry';

function impactLabel(game, next, context) {
  const stateName = context.abbr ? STATE_BY_ABBR[context.abbr]?.name : null;
  if (context.type === 'action') {
    if (context.actionId === 'ops') return stateName ? `Ground Game in ${stateName}` : 'Ground Game';
    const label = ACTIONS.find((action) => action.id === context.actionId)?.label || 'Campaign action';
    return stateName ? `${label} in ${stateName}` : label;
  }
  if (context.type === 'ad') {
    const names = (context.abbrs || []).map((abbr) => STATE_BY_ABBR[abbr]?.name).filter(Boolean);
    return names.length === 1 ? `Advertising in ${names[0]}` : 'Advertising';
  }
  if (context.type === 'choice') {
    return `Response to ${game.currentEventData?.title || 'the campaign event'}`;
  }
  if (context.type === 'stance') return `Position on ${ISSUE_BY_ID[context.issueId]?.label?.toLowerCase() || 'an issue'}`;
  if (context.type === 'spin') return stateName ? `Press work in ${stateName}` : 'Press work';
  if (context.type === 'debate') return 'Debate answer';
  return next.lastAction || 'Campaign work';
}

function trackMapImpact(previous, next, context) {
  if (!previous || !next || previous === next || previous.finished) return next;
  const beforeRows = new Map(snapshot(previous).rows.map((row) => [row.abbr, row]));
  const changes = {};
  snapshot(next).rows.forEach((row) => {
    const amount = movementFor(row, beforeRows.get(row.abbr), previous.party);
    if (Math.abs(amount) >= 0.03) changes[row.abbr] = Math.round(amount * 1000) / 1000;
  });
  if (!Object.keys(changes).length) return next;

  const current = previous.campaignTrail?.week === previous.week ? previous.campaignTrail.entries || [] : [];
  return {
    ...next,
    campaignTrail: {
      week: previous.week,
      entries: [...current, { label: impactLabel(previous, next, context), changes }].slice(-16),
    },
  };
}

function choiceValue(choice) {
  if (Number.isFinite(choice?.build40Score)) return choice.build40Score;
  const effects = choice?.effects || {};
  return (effects.mom || 0) + (effects.oppMom || 0) * 0.7 + (effects.funds || 0) * 0.12
    - (effects.risk || 0) * 8 + (effects.corruptionAd ? 7 : 0)
    + (effects.freeAds || 0) * 0.8 + (effects.groundState ? 2 : 0)
    + (effects.stanceContract ? 4 + (effects.stanceContract.donation || 0) * 0.1 : 0)
    + (effects.issueFavor || 0) * 2;
}

export default function Home() {
  const [game, setGame] = useState(null);
  const actionLayout = useRef(null);
  useLayoutEffect(() => {
    if (!actionLayout.current) return;
    restoreActionLayout(actionLayout.current);
    actionLayout.current = null;
  }, [game]);
  const [showSetup, setShowSetup] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [config, setConfig] = useState(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [modRevision, setModRevision] = useState(0);
  const [activeModCount, setActiveModCount] = useState(() => getModState().activeDescriptors.length);

  useEffect(() => {
    const unsub = subscribeModRegistry((st) => {
      setModRevision(st.revision);
      setActiveModCount(st.activeDescriptors.length);
    });
    loadAndApplyMods();
    return unsub;
  }, []);

  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      setGame(saved);
      setShowSetup(false);
      setConfig({
        party: saved.party,
        candidateId: saved.candidateId,
        opponentId: saved.opponentId,
        difficultyId: saved.difficultyId,
        leans: saved.leans,
        nationalGeneric: saved.startingNationalGeneric ?? saved.natGeneric ?? 0,
        weighted: saved.weighted,
        thirdMode: saved.thirdMode || 'fringe',
        startId: saved.startId,
        popularVote: saved.popularVote,
        houseRule: saved.houseRule || 'standard',
        electoralRule: saved.electoralRule || 'standard',
        simulateElection: !!saved.simulateElection,
        randomness: saved.randomness || 0,
        indieSenate: saved.indieSenate
          ? !!(saved.indieSenate.ND || saved.indieSenate.SD || saved.indieSenate.ID)
          : false,
      });
    }
  }, []);

  useEffect(() => {
    if (game) setSaveFailed(!saveGame(game));
  }, [game]);

  useEffect(() => {
    if (!game?.simulateElection || game.finished || showSetup || showResults) return undefined;
    const timer = window.setTimeout(() => {
      setGame((current) => {
        if (!current?.simulateElection || current.finished) return current;
        let next = acknowledgeCampaignNews(current);
        const answerCurrentDecision = (state) => {
          const event = state.currentEventData;
          const choice = event?.choices?.filter((option) => !option.unavailable && (!option.build38AdWork || state.funds >= option.build38AdWork.costM)).sort((a, b) => choiceValue(b) - choiceValue(a))[0];
          return choice ? applyChoice(state, choice, event.id) : state;
        };
        while (decisionPending(next)) {
          const decided = answerCurrentDecision(next);
          if (decided === next) return next;
          next = advanceDecisionEvent(decided);
        }
        let debateSteps = 0;
        while (next.debate && !next.debate.done && debateSteps++ < 6) {
          const definition = debateDefinition(next);
          const question = definition?.questions?.[next.debate.step];
          if (!question?.answers?.length) break;
          const answer = question.answers.filter((option) => !option.unavailable).sort((a, b) => choiceValue(b) - choiceValue(a))[0];
          next = answerDebate(next, answer);
        }
        next = prepareDecisionWeekClose(next);
        while (decisionPending(next)) {
          const decided = answerCurrentDecision(next);
          if (decided === next) return next;
          next = prepareDecisionWeekClose(decided);
        }
        return advanceWeek(recordIncident(next, opponentTurn(next), { type: 'opponent' }));
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [game, showSetup, showResults]);

  // Ctrl/Cmd + Shift + D unlocks the local developer panel on this device.
  const [devUnlocked, setDevUnlocked] = useState(false);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setDevUnlocked((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const isDev = devUnlocked;

  const handleTriggerEvent = (eventId) => {
    setGame((g) => forceEvent(g, eventId));
  };

  const handleGiveCash = (amount) => {
    setGame((g) => giveCash(g, amount));
  };

  const handleDeveloperAction = (actionId, amount) => {
    setGame((g) => developerAction(g, actionId, amount));
  };

  const snap = useMemo(() => (game ? snapshot(game) : null), [game]);

  const you = game ? CANDIDATE_BY_ID[game.candidateId] : null;
  const them = game ? CANDIDATE_BY_ID[game.opponentId] : null;
  const accent = game ? scenarioPartyMeta(game.build39?.scenario?.id, game.party)?.color || PARTY_COLOR[game.party] : '#3D5AF1';
  const oppAccent = them ? PARTY_COLOR[them.party] : '#F2603C';

  const begin = (cfg) => {
    const fresh = createGame(cfg);
    setConfig(cfg);
    setGame(fresh);
    setShowSetup(false);
    setShowResults(false);
  };

  // Every decision is scored in one place: the engine makes the change, and the
  // coalition and faction reaction is read straight off that change.
  const commit = (run, context) => {
    actionLayout.current = captureActionLayout();
    setGame((g) => {
      const ctx = typeof context === 'function' ? context(g) : context || { type: 'none' };
      if (ctx.type !== 'choice' && decisionPending(g)) {
        actionLayout.current = null;
        return g;
      }
      const resolved = run(g);
      if (resolved === g) {
        actionLayout.current = null;
        return g;
      }
      const next = recordCampaignStrategy(g, recordIncident(g, resolved, ctx), ctx);
      const reacted = withReactionSummary(g, next, ctx);
      if (ctx.type === 'stance') constrainPolicyPolling(g, reacted, resolved.build39.lastPolicyResponse.pollPoints);
      return advanceDecisionEvent(trackMapImpact(g, reacted, ctx));
    });
  };

  const handleChoose = (choice, eventId) => commit((g) => applyChoice(g, choice, eventId), { type: 'choice' });

  const handleAction = (actionId, abbr) =>
    commit((g) => applyAction(g, actionId, abbr), { type: 'action', actionId, abbr });

  const handleTownHall = (abbr, score, issues, answers) =>
    commit((g) => applyAction(g, 'townhall', abbr, { score, answers }), { type: 'townhall', abbr, score, issues, answers });

  const handleAdBlitz = (cfg) =>
    commit((g) => runAdBlitz(g, cfg), { type: 'ad', issueId: cfg.issueId, adTypeId: cfg.typeId, kind: cfg.kind, language: cfg.language, abbrs: cfg.abbrs || [cfg.abbr] });

  const handleDebate = (answer) => commit((g) => answerDebate(g, answer), { type: 'debate' });

  const handleGroundGame = (plan, confirmationKey) =>
    commit((g) => purchaseGroundGame(g, plan, confirmationKey), (g) => ({
      type: 'action',
      actionId: 'ops',
      abbrs: Object.keys(plan).filter((abbr) => plan[abbr] > groundLevel(g, abbr)),
    }));

  const handleShift = (issueId, optionIndex) =>
    commit((g) => changeStance(g, issueId, optionIndex), (g) => ({
      type: 'stance',
      issueId,
      from: g.stances?.[issueId] ?? 1,
      to: optionIndex,
    }));


  // Working the local press costs money, not an action, so it never touches the
  // action counter or the coalition reaction.
  const handleSpin = (abbr, storyId, mode) =>
    setGame((g) => {
      if (decisionPending(g)) return g;
      const context = { type: 'spin', abbr, storyId, spinMode: mode };
      const next = recordCampaignStrategy(g, recordIncident(g, spinStory(g, abbr, storyId, mode), context), context);
      return advanceDecisionEvent(trackMapImpact(g, next, context));
    });

  const handleAdvance = () => {
    setGame((g) => {
      if (decisionPending(g)) return g;
      const closing = prepareDecisionWeekClose(g);
      if (decisionPending(closing)) return closing;
      const withRivalReceipt = recordIncident(closing, opponentTurn(closing), { type: 'opponent' });
      return decayCampaignStrategy(advanceWeek(withRivalReceipt));
    });
  };

  // The national desk is read, not answered: closing it uncovers the week's card.
  const handleAckNews = () => setGame(acknowledgeCampaignNews);

  const handlePathMapChange = (pathMap) => setGame((g) => (g ? { ...g, pathMap } : g));

  const handleQuit = () => {
    setShowSetup(true);
  };

  const handleDiscard = () => {
    clearSave();
    setGame(null);
    setShowSetup(true);
    setShowResults(false);
  };

  if (showSetup || !game) {
    const modCompat = game ? checkSaveModCompatibility(game) : { compatible: true, missing: [], versionMismatch: [] };
    const saveModWarning = !modCompat.compatible
      ? `Saved campaign used mods that are missing or changed: ${[
          ...modCompat.missing.map((m) => `${m.name || m.id} (disabled/missing)`),
          ...modCompat.versionMismatch.map((m) => `${m.saved.name || m.saved.id} (version/content changed)`),
        ].join(', ')}.`
      : '';
    return (
      <SetupScreen
        key={`setup-mod-${modRevision}`}
        onStart={begin}
        hasSave={!!game}
        onResume={() => setShowSetup(false)}
        onDiscardSave={handleDiscard}
        activeModCount={activeModCount}
        saveModWarning={saveModWarning}
      />
    );
  }

  if (game.finished && !showResults) {
    return (
      <ElectionNight
        game={game}
        you={you}
        them={them}
        accent={accent}
        oppAccent={oppAccent}
        onDone={() => setShowResults(true)}
      />
    );
  }

  if (game.finished) {
    return (
      <ResultsScreen
        game={game}
        snap={snap}
        you={you}
        them={them}
        accent={accent}
        oppAccent={oppAccent}
        onOfferVP={(party) => setGame((current) => ({
          ...current,
          electoralAlliance: party || null,
          electoralAllianceResolved: true,
        }))}
        onReplay={() =>
          begin({
            ...config,
            leans: game.leans,
            runningMateId: game.runningMateId,
            thirdMode: game.thirdMode,
            indieSenate: !!(game.indieSenate?.ND || game.indieSenate?.SD || game.indieSenate?.ID),
          })
        }
        onNewGame={handleDiscard}
      />
    );
  }

  return (
    <>{saveFailed && <p role="alert" className="mx-auto max-w-6xl p-3 text-sm text-amber-200">The campaign could not be saved to this device. Keep this window open to continue playing.</p>}
    <GameScreen
      game={game}
      snap={snap}
      you={you}
      them={them}
      accent={accent}
      oppAccent={oppAccent}
      onChoose={handleChoose}
      onAction={handleAction}
      onTownHall={handleTownHall}
      onAdBlitz={handleAdBlitz}
      onDebate={handleDebate}
      onGroundGame={handleGroundGame}
      onShift={handleShift}
      onSpin={handleSpin}
      onAdvance={handleAdvance}
      onQuit={handleQuit}
      isDev={isDev}
      onTriggerEvent={handleTriggerEvent}
      onGiveCash={handleGiveCash}
      onDeveloperAction={handleDeveloperAction}
      onAckNews={handleAckNews}
      onPathMapChange={handlePathMapChange}
    /></>
  );
}
