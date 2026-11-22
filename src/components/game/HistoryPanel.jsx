import React, { useState } from 'react';
import { weekLabel, totalWeeksOf } from '@/lib/gameEngine';
import { EVENT_BY_ID } from '@/data/events';
import { ISSUE_BY_ID } from '@/data/platform';
import { Check, Landmark } from 'lucide-react';
import SpotArt from '@/components/ui/spot-art';

const DEM = '#4C7BFF';
const REP = '#E8433C';

function Side({ name, color, children }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide" style={{ color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {name}
      </p>
      <div className="mt-1 space-y-0.5">{children}</div>
    </div>
  );
}

function Line({ children, tone = 'normal' }) {
  const cls =
    tone === 'choice'
      ? 'font-heading text-[11.5px] leading-snug text-white'
      : 'text-[11px] font-semibold leading-snug text-slate-400';
  return (
    <p className={`flex items-start gap-1 ${cls}`}>
      <Check className="mt-[3px] h-2.5 w-2.5 shrink-0 opacity-60" strokeWidth={3} />
      <span>{children}</span>
    </p>
  );
}

function OutsideCampaignReport({ outside, receipt, accent, oppAccent }) {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const ads = [...(receipt?.aggregates || [])].sort((a, b) =>
    String(a.pacId).localeCompare(String(b.pacId)) || String(a.stateId).localeCompare(String(b.stateId)));
  const pageCount = Math.max(1, Math.ceil(ads.length / pageSize));
  const visibleAds = ads.slice(page * pageSize, (page + 1) * pageSize);
  const proxyVisits = outside.proxyVisits || [];
  const endorsements = outside.endorsements || [];

  return (
    <Side name="Outside groups · weekly activity" color={outside.helpsYou ? accent : oppAccent}>
      <Line>{outside.text || `Outside groups aired ${outside.totalAds} ads across ${outside.stateCount} states.`}</Line>
      <details className="mt-1 rounded-lg border border-white/10 bg-black/15 px-2 py-1.5">
        <summary className="cursor-pointer text-[10px] font-bold text-slate-300">
          View grouped ad activity, surrogate stops, and {endorsements.length} endorsements
        </summary>
        <p className="mt-1 text-[9px] font-semibold text-slate-500">
          {outside.digest?.attackAds || 0} attack · {outside.digest?.proAds || 0} candidate ads · {proxyVisits.length} stops
        </p>
        <div className="mt-1 space-y-0.5">
          {visibleAds.map((ad) => (
            <p key={ad.effectReceiptId || ad.placementId} className="text-[9px] font-semibold leading-snug text-slate-400">
              {ad.placementCount} placement{ad.placementCount === 1 ? '' : 's'} · {ad.pacId} · {ad.stateId} · {ISSUE_BY_ID[ad.issueId]?.label || ad.issueId} · {ad.adType} · {ad.beneficiaryParty}{ad.targetParty ? ' → ' + ad.targetParty : ''} · {ad.totalGeneralFatiguePoints} general fatigue
            </p>
          ))}
          {visibleAds.length === 0 && <p className="text-[9px] text-slate-500">{outside.totalAds ? 'Individual records from older weeks are not shown.' : 'No PAC ads aired this week.'}</p>}
        </div>
        {pageCount > 1 && (
          <div className="mt-1 flex items-center justify-between text-[9px] font-bold text-slate-500">
            <button type="button" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} className="disabled:opacity-40">Previous</button>
            <span>Page {page + 1} of {pageCount}</span>
            <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} className="disabled:opacity-40">Next</button>
          </div>
        )}
        {proxyVisits.map((visit) => (
          <p key={visit.visitId} className="mt-1 text-[9px] font-semibold text-slate-400">
            {visit.personId} campaigned in {visit.stateId} for {visit.party}.
          </p>
        ))}
        {endorsements.map((endorsement) => (
          <p key={endorsement.endorserId} className="mt-1 text-[9px] font-semibold leading-snug text-slate-400">
            {endorsement.name} endorsed{endorsement.state ? ` in ${endorsement.state}` : ' nationally'} · {endorsement.factionId} faction
            {endorsement.activelyCampaigning ? ' · actively campaigning' : ''}
            {endorsement.proxyUnlocked ? ' · real campaign surrogate unlocked for next week' : ''}
            {endorsement.fictionalComposite ? ' · fictional scenario composite' : ''}
          </p>
        ))}
      </details>
    </Side>
  );
}

export default function HistoryPanel({ game, you, them, accent, oppAccent }) {
  const entries = [...(game.history || [])].reverse();
  const currentEvent = game.currentEventData || (game.currentEventId ? EVENT_BY_ID[game.currentEventId] : null);
  const yourParty = game.party;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-[15px] text-white">Campaign log</h3>
        <span className="label-xs">{entries.length} weeks filed</span>
      </div>

      <div className="panel-lite border-primary/40 p-2.5">
        <div className="flex items-center justify-between">
          <p className="label-xs">
            Week {Math.min(game.week + 1, totalWeeksOf(game))} · {weekLabel(game, game.week)} · in progress
          </p>
          <p className="num text-[10px] font-extrabold text-slate-400">
            {you.short} {game.momentum} · {them.short} {game.oppMomentum}
          </p>
        </div>
        {currentEvent && (
          <p className="mt-1 font-heading text-[12px] text-white">
            <span className="inline-flex items-center gap-1"><SpotArt symbol={currentEvent.icon} className="h-4 w-4" />{currentEvent.title}</span>
          </p>
        )}
        {(game.weekLog || []).length === 0 ? (
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Nothing filed yet — your week is still being written.
          </p>
        ) : (
          <div className="mt-1 space-y-0.5">
            {game.weekLog.map((line, i) => (
              <Line key={i}>{line}</Line>
            ))}
          </div>
        )}
      </div>

      {entries.length === 0 && (
        <p className="text-center text-[11px] font-bold text-slate-500">
          The log fills up as the weeks go by — both campaigns, every decision.
        </p>
      )}

      {entries.map((e) => {
        const yourEV = yourParty === 'dem' ? e.demEV : e.repEV;
        const theirEV = yourParty === 'dem' ? e.repEV : e.demEV;
        const debrief = game.staffing?.briefingHistory?.find((entry) => entry.week === e.week);
        return (
          <div key={e.week} className="panel-lite p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="label-xs">
                Week {e.week + 1} · {weekLabel(game, e.week)}
              </p>
              <p className="num flex items-center gap-1 text-[10px] font-extrabold">
                <span style={{ color: accent }}>{yourEV}</span>
                <span className="text-slate-600">EV</span>
                <span style={{ color: oppAccent }}>{theirEV}</span>
              </p>
            </div>

            {e.eventTitle && (
              <p className="mt-0.5 font-heading text-[12px] leading-snug text-slate-200">
                {e.eventTitle}
              </p>
            )}

            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              <Side name={you.short} color={accent}>
                {e.decisions?.length ? e.decisions.map((decision) => (
                  <Line key={decision.decisionKey || decision.id} tone="choice">
                    {decision.title + ' · ' + decision.choice}
                  </Line>
                )) : e.choice ? <Line tone="choice">{e.choice}</Line> : null}
                {e.decisionEventShortfall > 0 && <Line>{e.decisionEventShortfall} decision slot{e.decisionEventShortfall === 1 ? '' : 's'} had no eligible event.</Line>}
                {e.actions.map((a, i) => (
                  <Line key={i}>{a}</Line>
                ))}
                {debrief?.dialogue && (
                  <Line>{debrief.dialogue}</Line>
                )}
                {e.debate ? (
                  <Line tone="choice">
                    {e.debate.night}: {e.debate.verdict ? e.debate.verdict.label : 'debated'}
                  </Line>
                ) : null}
                {!e.choice && e.actions.length === 0 && !e.debate ? (
                  <p className="text-[11px] font-semibold text-slate-600">Laid low. No moves filed.</p>
                ) : null}
              </Side>

              <Side name={them.short} color={oppAccent}>
                {e.opp ? (
                  <>
                    <Line tone="choice">{e.opp.choice}</Line>
                    <Line>during {e.opp.eventTitle}</Line>
                    {e.opp.contextWhy ? <Line>{e.opp.contextWhy}</Line> : null}
                  </>
                ) : null}
                {e.oppRival?.strategy && (
                  <Line>
                    Plan: {e.oppRival.strategy.label}. {e.oppRival.strategy.reason}
                  </Line>
                )}
                {(e.oppRival?.moves || []).map((m, i) => (
                  <Line key={i}>{m.text || m.type}</Line>
                ))}
                {!e.opp && !(e.oppRival?.moves || []).length ? (
                  <p className="text-[11px] font-semibold text-slate-600">No read on them this week.</p>
                ) : null}
              </Side>

              {(e.rivals || []).map((r) => (
                <Side key={r.party} name={r.short} color={r.color}>
                  {r.moves.map((m, i) => (
                    <Line key={i}>{m.text}</Line>
                  ))}
                </Side>
              ))}

              {e.outside?.totalAds !== undefined ? (
                <OutsideCampaignReport outside={e.outside} receipt={game.build34SuperPacReceiptsByWeek?.[e.outside.pacWeek || Number(e.week) + 1]} accent={accent} oppAccent={oppAccent} />
              ) : e.outside ? (
                <Side
                  name={e.outside.helpsYou ? 'Outside money · for you' : 'Outside money · against you'}
                  color={e.outside.helpsYou ? accent : oppAccent}
                >
                  <Line>
                    {e.outside.group} spent ${e.outside.swing.toFixed(1)}M on{' '}
                    {e.outside.issueLabel.toLowerCase()} in {e.outside.name}
                  </Line>
                </Side>
              ) : null}
            </div>

            <div className="mt-1.5 flex items-center gap-2 border-t border-white/10 pt-1.5 text-[10px] font-bold text-slate-500">
              <span className="num">Momentum {e.momentum}</span>
              <span className="num">·</span>
              <span className="num">${e.funds}M banked</span>
              <span className="ml-auto flex items-center gap-1">
                <Landmark className="h-2.5 w-2.5" /> Senate net {(e.senateNet || 0) >= 0 ? '+' : '−'}
                {Math.abs(e.senateNet || 0)} D
              </span>
            </div>
          </div>
        );
      })}

      <p className="text-[10px] leading-snug text-slate-600">
        Rows are filed at the end of each week: all four parties, seven actions each, and where the map stood.
      </p>
    </div>
  );
}
