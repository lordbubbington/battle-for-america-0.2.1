import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MATE_BY_ID as VP_BY_ID } from '@/data/runningMates';
import { CANDIDATE_BY_ID } from '@/data/candidates';
import { STATE_BY_ABBR } from '@/data/states';
import {
  DIFFICULTIES,
  totalWeeksOf,
  senateSnapshot,
  houseSnapshot,
  govSnapshot,
  debateDefinition,
} from '@/lib/gameEngine';
import HudBar from '@/components/game/HudBar';
import StaffWorkspace from '@/components/game/StaffWorkspace';
import BoardPanel from '@/components/game/BoardPanel';
import EventCard from '@/components/game/EventCard';
import CandidateDecisionRecaps from '@/components/game/CandidateDecisionRecaps';
import NationwideCard from '@/components/game/NationwideCard';
import FallingMessages from '@/components/game/FallingMessages';
import ActionBar from '@/components/game/ActionBar';
import NationalEnvironment from '@/components/game/NationalEnvironment';
import EnvironmentPanel from '@/components/game/EnvironmentPanel';
import StateFocusPanel from '@/components/game/StateFocusPanel';
import DownballotPanel from '@/components/game/DownballotPanel';
import VoterGroupsPanel from '@/components/game/VoterGroupsPanel';
import PartyFactionsPanel from '@/components/game/PartyFactionsPanel';
import CampaignOffice from '@/components/game/CampaignCalendar';
import NewsCyclePanel from '@/components/game/NewsCyclePanel';
import AdBackfireCard from '@/components/game/AdBackfireCard';
import AdBlitzPanel from '@/components/game/AdBlitzPanel';
import Build40StatePoll from '@/components/game/Build40StatePoll';
import GroundGamePanel from '@/components/game/GroundGamePanel';
import TownHallPanel from '@/components/game/TownHallPanel';
import ShiftPolicyPanel from '@/components/game/ShiftPolicyPanel';
import PlatformCard from '@/components/game/PlatformCard';
import DebateCard from '@/components/game/DebateCard';
import NationalNewsCard from '@/components/game/NationalNewsCard';
import { nationalNewsCard } from '@/lib/nationalNews';
import DevPanel from '@/components/dev/DevPanel';
import WikiDialog from '@/components/wiki/WikiDialog';
import { BookOpen, CircleHelp, LogOut } from 'lucide-react';
import TutorialDialog from '@/components/game/TutorialDialog';
import { useElectionForecast } from '@/lib/useElectionForecast';

const BALLOT_TABS = { senate: 'senate', house: 'house', gov: 'gov' };

export default function GameScreen({
  game,
  snap,
  you,
  them,
  accent,
  oppAccent,
  onChoose,
  onAction,
  onTownHall,
  onAdvance,
  onQuit,
  onAdBlitz,
  onGroundGame,
  onDebate,
  onShift,
  onSetAgenda,
  onSpin,
  isDev,
  onTriggerEvent,
  onGiveCash,
  onDeveloperAction,
  onAckNews,
  onPathMapChange,
}) {
  const [selected, setSelected] = useState(null);
  const [panel, setPanel] = useState(null);
  const [adAbbrs, setAdAbbrs] = useState([]);
  const [tab, setTab] = useState('pres');
  const [staffFocus, setStaffFocus] = useState(null);
  const [devOpen, setDevOpen] = useState(false);
  const [wikiOpen, setWikiOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // Every action reports itself as one line that drops from the bottom of the
  // map and falls away, instead of a growing list inside a panel.
  const [messages, setMessages] = useState([]);
  const [anchor, setAnchor] = useState(null);
  const boardRef = useRef(null);
  const filed = useRef({ week: null, len: 0 });

  useEffect(() => {
    const log = game.weekLog || [];
    const prev = filed.current;
    if (prev.week !== game.week) {
      filed.current = { week: game.week, len: log.length };
      setMessages([]);
      return;
    }
    if (log.length <= prev.len) {
      filed.current = { week: game.week, len: log.length };
      return;
    }
    const fresh = log.slice(prev.len);
    filed.current = { week: game.week, len: log.length };
    const rect = boardRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ left: rect.left, width: rect.width, bottom: rect.bottom });
    setMessages((list) => [
      ...list,
      ...fresh.map((text, i) => ({ id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`, text })),
    ]);
    setTimeout(() => setMessages((list) => list.slice(fresh.length)), 2500);
  }, [game.weekLog, game.week]);

  const event = game.currentEventData;
  // The national desk files first, every week, whether or not anybody asked.
  const news = nationalNewsCard(game);
  const newsOpen = !!news;
  // Decision cards share the campaign workspace and pause only the action controls.
  const choiceEvent = event && !event.auto ? event : null;
  const eventOpen = !!(choiceEvent && !game.outcome);
  const diff = DIFFICULTIES[game.difficultyId];
  const senate = useMemo(() => senateSnapshot(game), [game]);
  const house = useMemo(() => houseSnapshot(game), [game]);
  const gov = useMemo(() => govSnapshot(game), [game]);
  const { forecast, status: forecastStatus } = useElectionForecast(game);
  const debateDef = game.debate ? debateDefinition(game) : null;
  const debateLive = !!(debateDef && game.debate && !game.debate.done);
  const vp = game.runningMateId ? CANDIDATE_BY_ID[game.runningMateId] || VP_BY_ID[game.runningMateId] : null;
  const oppVp = game.oppMates?.[them?.party] || null;
  const isLastWeek = game.week >= totalWeeksOf(game) - 1;
  const targetAbbr = selected && selected.includes('-') ? selected.split('-')[0] : selected;

  // The state the environment tracker is following, if one is picked.
  const selRow = selected
    ? snap.districts.find((d) => d.id === selected) || snap.rows.find((r) => r.abbr === selected) || null
    : null;
  const selStateName = selRow ? STATE_BY_ABBR[selRow.abbr]?.name || selRow.abbr : null;

  const downballot = BALLOT_TABS[tab]
    ? { kind: tab, data: tab === 'house' ? house : tab === 'gov' ? gov : senate }
    : null;

  const handleAdvance = () => {
    setPanel(null);
    onAdvance();
  };

  const pickState = (abbr) => setSelected(abbr === selected ? null : abbr);

  // Every state in the buy is toggled in one place, so the picker inside the
  // panel and the map outside it are always the same list.
  const toggleAdState = (abbr) =>
    setAdAbbrs((prev) =>
      prev.includes(abbr) ? (prev.length > 1 ? prev.filter((a) => a !== abbr) : prev) : [...prev, abbr]
    );
  const openPanel = (id) => {
    setStaffFocus(null);
    if (id === 'ads') setAdAbbrs(targetAbbr ? [targetAbbr] : []);
    setPanel(id);
  };

  const openStaffAction = (actionId, targetId, options) => {
    setStaffFocus({ actionId, targetId, ...options, request: Date.now() });
    setSelected(targetId);
    if (actionId === 'ad') setAdAbbrs([targetId]);
    setPanel(actionId === 'ad' ? 'ads' : ['townhall', 'shift'].includes(actionId) ? actionId : null);
  };

  useEffect(() => {
    if (!staffFocus) return undefined;
    const { actionId, storyId, spinMode } = staffFocus;
    const id = actionId === 'spin' ? 'story-' + storyId + '-' + spinMode
      : ['ad', 'townhall', 'shift'].includes(actionId) ? 'staff-focus-' + actionId : 'campaign-action-' + actionId;
    const timer = setTimeout(() => {
      const element = document.getElementById(id);
      element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      element?.focus({ preventScroll: true });
    }, 40);
    return () => clearTimeout(timer);
  }, [staffFocus]);

  // Buying airtime takes the action panel's place at the top of the column, and
  // the actions slip underneath it with their own close-and-advance controls
  // intact; closing the buy puts everything back where it was.
  const adOpen = panel === 'ads' && adAbbrs.length > 0;
  const adPanel = adOpen ? (
    <AdBlitzPanel
      key={staffFocus?.actionId === 'ad' ? staffFocus.request : 'ad'}
      initial={staffFocus?.actionId === 'ad' ? staffFocus : undefined}
      game={game}
      abbrs={adAbbrs}
      onToggle={toggleAdState}
      accent={accent}
      onClose={() => setPanel(null)}
      onRun={onAdBlitz}
    />
  ) : null;
  const actionPanel = game.simulateElection ? (
    <section className="panel p-4" aria-live="polite">
      <p className="label-xs">All campaigns are controlled by AI</p>
      <h3 className="mt-1 font-heading text-[16px] text-white">Election simulation running</h3>
      <p className="mt-1 text-[11px] font-semibold text-slate-400">Week {game.week + 1} of {totalWeeksOf(game)} · advancing automatically to election night</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, ((game.week + 1) / totalWeeksOf(game)) * 100)}%` }} />
      </div>
    </section>
  ) : (
    <ActionBar
      game={game}
      selected={selected}
      onAction={(id) => onAction(id, targetAbbr)}
      onOpenPanel={openPanel}
      onAdvance={handleAdvance}
      accent={accent}
      isLastWeek={isLastWeek}
      paused={eventOpen}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-heading text-lg leading-none text-white sm:text-xl">
            270<span className="text-primary">·</span>Twenty Eight
          </span>
          <span className="hidden sm:inline-flex">
            <span className="chip">
              {you.short} vs. {them.short}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            className="btn-ghost flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
            title="Game tutorial"
          >
            <CircleHelp className="h-3 w-3" /> Help
          </button>
          {isDev && (
            <button
              type="button"
              onClick={() => setDevOpen((v) => !v)}
              className="flex items-center gap-1 rounded-full border border-primary/60 bg-primary/15 px-2.5 py-1 font-mono text-[10px] font-extrabold tracking-[0.12em] text-primary"
            >
              DEV
            </button>
          )}
          <button
            type="button"
            onClick={() => setWikiOpen(true)}
            className="btn-ghost flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
            title="The encyclopedia"
          >
            <BookOpen className="h-3 w-3" /> Wiki
          </button>
          <button
            type="button"
            onClick={onQuit}
            className="btn-ghost flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
          >
            <LogOut className="h-3 w-3" /> Quit
          </button>
        </div>
      </div>

      <HudBar
        game={game}
        snap={snap}
        senate={senate}
        house={house}
        gov={gov}
        forecast={forecast}
        forecastStatus={forecastStatus}
        vp={vp}
        oppVp={oppVp}
        you={you}
        them={them}
        accent={accent}
        oppAccent={oppAccent}
        onOpenDownballot={setTab}
      />

      {newsOpen && <NationalNewsCard card={news} game={game} onContinue={onAckNews} isNew={!game.natNewsSeen} />}
      {(game.pendingInterrupts || []).length > 0 && (
        <div className="mt-2 rounded-lg border border-fuchsia-300/30 bg-fuchsia-300/5 px-3 py-2 text-[11px] font-semibold text-fuchsia-100" role="status">
          <span className="font-extrabold">{game.pendingInterrupts.length} campaign response{game.pendingInterrupts.length === 1 ? '' : 's'} still developing.</span>{' '}
          {game.pendingInterrupts[0]?.event?.receiptRecap || 'A recorded campaign incident is waiting for a decision slot.'} It will appear at the next scheduled safe point.
        </div>
      )}

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
        {/* ----------------------------------------------------------- left */}
        <div className="order-2 space-y-3 lg:order-1">
          <div ref={boardRef}>
            {debateLive ? (
            <DebateCard
              hero
              def={debateDef}
              debate={game.debate}
              you={you}
              them={them}
              accent={accent}
              oppAccent={oppAccent}
              onAnswer={game.simulateElection ? () => {} : onDebate}
              prep={game.debatePrep || 0}
            />
          ) : (
            <BoardPanel
              game={game}
              snap={snap}
              senate={senate}
              house={house}
              gov={gov}
              forecast={forecast}
              you={you}
              them={them}
              selected={selected}
              onSelect={setSelected}
              showExact={diff.showExact}
              accent={accent}
              oppAccent={oppAccent}
              tab={tab}
              onTab={setTab}
              adMode={adOpen}
              adSelected={adAbbrs}
              onAdToggle={toggleAdState}
              onPathMapChange={onPathMapChange}
              staffContent={<StaffWorkspace game={game} paused={eventOpen || game.simulateElection}
                onSetAgenda={onSetAgenda} onOpenAction={openStaffAction} />}
            />
            )}
          </div>

          <StateFocusPanel game={game} snap={snap} selected={selected} showExact={diff.showExact} />

          <NationalEnvironment
            game={game}
            snap={snap}
            showExact={diff.showExact}
            row={selRow}
            stateName={selStateName}
          />

          <EnvironmentPanel game={game} rows={snap.rows} accent={accent} onSelect={setSelected} />
        </div>

        {/* ---------------------------------------------------------- right */}
        <div className="order-1 space-y-3 lg:order-2">
          {choiceEvent && (
            <EventCard
              game={game}
              key={`${choiceEvent.id}-${game.week}`}
              event={choiceEvent}
              onChoose={(choice) => onChoose(choice, choiceEvent.id)}
              disabled={game.simulateElection || !!game.outcome}
              why={game.eventWhy || choiceEvent.evidenceSnapshot?.recap || choiceEvent.receiptRecap}
              outcome={game.outcome}
              progress={!event.context?.candidateEventMandatory && (game.eventSchedule?.length || 0) > 1 ? { current: (game.eventScheduleIndex || 0) + 1, total: game.eventSchedule?.length || game.decisionEventCount } : null}
            />
          )}
          {game.eventScheduleShortfall > 0 && (
            <p className="panel p-2.5 text-xs text-slate-400">No eligible decision matched {game.eventScheduleShortfall} scheduled {game.eventScheduleShortfall === 1 ? 'checkpoint' : 'checkpoints'} this week.</p>
          )}
          <CandidateDecisionRecaps game={game} />
          {downballot ? (
            <DownballotPanel
              kind={downballot.kind}
              data={downballot.data}
              forecast={forecast}
              game={game}
              selected={tab === 'house' ? selected : targetAbbr}
              onSelect={pickState}
              showExact={diff.showExact}
              accent={accent}
              onAdvance={handleAdvance}
              isLastWeek={isLastWeek}
            />
          ) : (
            <>
              {adPanel}
              {panel === 'ground-game' && (
                <GroundGamePanel game={game} onInvest={onGroundGame} onClose={() => setPanel(null)} accent={accent} />
              )}
              {panel === 'detailed-polling' && (
                <Build40StatePoll game={game} stateId={targetAbbr}
                  shares={snap.rows.find((row) => row.abbr === targetAbbr)?.shares}
                  onSelectState={setSelected} onClose={() => setPanel(null)} accent={accent} />
              )}
              {actionPanel}
              {panel === 'townhall' && targetAbbr && (
                <TownHallPanel
                  game={game}
                  abbr={targetAbbr}
                  accent={accent}
                  onClose={() => setPanel(null)}
                  onFinish={(score, issues, answers) => {
                    onTownHall(targetAbbr, score, issues, answers);
                    setPanel(null);
                  }}
                />
              )}
              {panel === 'shift' && (
                <ShiftPolicyPanel
                  game={game}
                  accent={accent}
                  onClose={() => setPanel(null)}
                  onShift={(issueId, optionIndex) => {
                    onShift(issueId, optionIndex);
                    setPanel(null);
                  }}
                />
              )}
            </>
          )}

          <NewsCyclePanel game={game} abbr={targetAbbr} accent={accent} onSpin={onSpin} />

          {game.debate && debateDef && game.debate.done && (
            <DebateCard
              def={debateDef}
              debate={game.debate}
              you={you}
              them={them}
              accent={accent}
              oppAccent={oppAccent}
              onAnswer={game.simulateElection ? () => {} : onDebate}
            />
          )}

          {event && event.auto && <NationwideCard key={event.id + game.week} event={event} />}

          {game.adBackfire && (
            <AdBackfireCard
              key={`${game.adBackfire.abbr}-${game.adBackfire.week}`}
              backfire={game.adBackfire}
            />
          )}

        </div>
      </div>

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-3">
        <PlatformCard game={game} abbr={targetAbbr} accent={accent} />
        <VoterGroupsPanel game={game} accent={accent} />
        <PartyFactionsPanel game={game} accent={accent} />
      </div>

      <div className="mt-3">
        <CampaignOffice
          game={game}
          accent={accent}
          onFocusState={(abbr) => {
            setSelected(abbr);
            boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
      </div>

      <FallingMessages messages={messages} anchor={anchor} />

      <WikiDialog open={wikiOpen} onClose={() => setWikiOpen(false)} />
      <TutorialDialog open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      {isDev && devOpen && (
        <DevPanel
          game={game}
          party={game.party}
          funds={game.funds}
          onGiveCash={onGiveCash}
          onDeveloperAction={onDeveloperAction}
          onClose={() => setDevOpen(false)}
          onTrigger={(id) => {
            setDevOpen(false);
            onTriggerEvent(id);
          }}
        />
      )}
    </div>
  );
}
