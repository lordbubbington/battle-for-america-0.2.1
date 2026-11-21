import React, { useMemo, useState } from 'react';
import { ISSUES_BY_WEIGHT, stateIssueAlignment } from '@/data/platform';
import { STATE_BY_ABBR } from '@/data/states';
import { adOutlook, freeAdsForIssue } from '@/lib/gameEngine';
import AdTypeGrid from '@/components/game/AdTypeGrid';
import AdStatePicker from '@/components/game/AdStatePicker';
import { X, Megaphone, Swords } from 'lucide-react';
import SpotArt from '@/components/ui/spot-art';

const round1 = (v) => Math.round(v * 10) / 10;

export default function AdBlitzPanel({ game, abbrs, onToggle, onRun, onClose, accent, initial }) {
  const [issueId, setIssueId] = useState(initial?.issueId || ISSUES_BY_WEIGHT[0].id);
  const [kind, setKind] = useState(initial?.adKind || 'pro');
  const [typeId, setTypeId] = useState(initial?.adTypeId || 'tv');
  const [language, setLanguage] = useState('en');
  const corruptionAd = !!game.campaignPerks?.corruptionAd;
  const activeIssueId = corruptionAd ? 'corruption' : issueId;
  const activeKind = corruptionAd ? 'pro' : kind;

  // The list itself lives with the map, so a click there and a tap here are the
  // same click.
  const toggleState = onToggle;

  // Every selected state is read on its own: its own price, its own room for the
  // message, and — once the money is spent — its own roll.
  const outlooks = abbrs.map((a) => adOutlook(game, a, activeIssueId, activeKind, typeId));
  const type = outlooks[0].type;
  const freeAdCount = freeAdsForIssue(game, activeIssueId);
  const cost = corruptionAd ? 0 : round1(outlooks.reduce((sum, o, index) => sum + (index < freeAdCount ? 0 : o.cost), 0));
  const affordable = corruptionAd || cost <= game.funds;
  const persuades = type.strength > 0;
  const riskier = activeKind === 'attack';
  const multi = abbrs.length > 1;
  const low = Math.min(...outlooks.map((o) => o.low));
  const high = Math.max(...outlooks.map((o) => o.high));
  const fitLow = Math.min(...outlooks.map((o) => o.fit));
  const fitHigh = Math.max(...outlooks.map((o) => o.fit));
  const evs = abbrs.reduce((sum, a) => sum + (STATE_BY_ABBR[a]?.ev || 0), 0);
  const heading = multi ? `${abbrs.length} states` : STATE_BY_ABBR[abbrs[0]].name;

  const sorted = useMemo(
    () =>
      ISSUES_BY_WEIGHT.map((issue) => ({
        ...issue,
        fit:
          abbrs.reduce((sum, a) => sum + stateIssueAlignment(a, issue.id, game.stances?.[issue.id] ?? 1), 0) / abbrs.length,
      })).sort((a, b) => b.weight * b.fit - a.weight * a.fit),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [abbrs.join('|'), game.stances]
  );

  return (
    <div id="staff-focus-ad" tabIndex={-1} className="panel panel-gold animate-pop-in p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="label-xs">Buying airtime</p>
          <h3 className="font-heading text-lg text-white">
            {heading} <span className="text-[12px] text-slate-400">{evs} EV</span>
          </h3>
        </div>
        <button type="button" onClick={onClose} className="btn-ghost rounded-lg p-1.5">
          <X className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        disabled={!affordable || (corruptionAd && abbrs.length !== 1)}
        onClick={() => onRun({ abbrs, issueId: activeIssueId, kind: activeKind, typeId, language })}
        className="btn-gold mt-3 w-full py-2.5 text-[14px]"
      >
        {affordable && (!corruptionAd || abbrs.length === 1)
          ? corruptionAd
            ? `Run free corruption ad in ${STATE_BY_ABBR[abbrs[0]].name}`
            : freeAdCount > 0 && cost === 0
              ? `Run free ${ISSUES_BY_WEIGHT.find((issue) => issue.id === activeIssueId)?.label || 'issue'} ad in ${multi ? `${abbrs.length} states` : STATE_BY_ABBR[abbrs[0]].name}`
              : `Buy ${type.label.toLowerCase()} in ${multi ? `${abbrs.length} states` : STATE_BY_ABBR[abbrs[0]].name} · $${cost}M`
          : corruptionAd && abbrs.length !== 1 ? 'Select exactly one state' : affordable
            ? `Buy ${type.label.toLowerCase()} in ${multi ? `${abbrs.length} states` : STATE_BY_ABBR[abbrs[0]].name} · $${cost}M`
            : `Need $${cost}M`}
      </button>
      <p className="mt-1.5 text-center text-[10px] font-semibold text-slate-500">
        Costs money, not an action. Airtime gets more expensive every week until election day.
      </p>

      <div className="mt-3">
        {corruptionAd && (
          <p className="mb-2 rounded-lg border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-[11px] font-bold leading-snug text-amber-100">
            Free anti-corruption ad ready. Select exactly one state. Outcomes: 50% no movement, 40% +5 state margin, 10% mega viral with +5 turnout, +1 across the region, and a free regional ground-game follow-up next week.
          </p>
        )}
        {!corruptionAd && freeAdCount > 0 && (
          <p className="mb-2 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-[10px] font-bold leading-snug text-emerald-100">
            {freeAdCount} free {ISSUES_BY_WEIGHT.find((issue) => issue.id === activeIssueId)?.label || 'issue'} ad credit{freeAdCount === 1 ? '' : 's'} available for this message.
          </p>
        )}
        <p className="label-xs mb-1.5">
          Which states? {abbrs.length} selected — tap to add or remove
        </p>
        <AdStatePicker game={game} selected={abbrs} onToggle={toggleState} accent={accent} />
      </div>

      <div className="mt-3">
        <p className="label-xs mb-1.5">Where does the money go?</p>
        <AdTypeGrid game={game} abbrs={abbrs} kind={kind} value={typeId} onChange={setTypeId} accent={accent} />
      </div>

      <div className="mt-3">
        <p className="label-xs mb-1.5">Ad language</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[['en', 'English'], ['es', 'Spanish']].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setLanguage(value)}
              className="panel-lite px-2.5 py-2 text-left text-[11px] font-extrabold text-white hover:bg-white/10"
              style={language === value ? { borderColor: accent, backgroundColor: `${accent}26` } : undefined}
              aria-pressed={language === value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="label-xs mb-1.5">Which issue?</p>
        <div className="grid max-h-[220px] grid-cols-1 gap-1.5 overflow-y-auto pr-1">
          {sorted.map((i) => {
            const active = activeIssueId === i.id;
            return (
              <button
                key={i.id}
                type="button"
                disabled={corruptionAd && i.id !== 'corruption'}
                onClick={() => setIssueId(i.id)}
                className="panel-lite flex items-center gap-1.5 px-2 py-1.5 text-left transition-colors hover:bg-white/10"
                style={active ? { borderColor: accent, backgroundColor: `${accent}26` } : undefined}
              >
                <SpotArt symbol={i.icon} className="h-5 w-5" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-extrabold text-white">{i.label}</span>
                  <span className="block text-[9.5px] font-bold text-slate-400">
                    Issue weight {(i.weight / 10).toFixed(2)} ·{' '}
                    {multi ? 'these states agree with you' : 'the state agrees with you'}{' '}
                    {Math.round(i.fit * 100)}%
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <p className="label-xs mb-1.5">Promote, or attack?</p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={corruptionAd}
            onClick={() => setKind('pro')}
            className="panel-lite flex items-center gap-2 px-2.5 py-2 text-left hover:bg-white/10"
            style={activeKind === 'pro' ? { borderColor: accent, backgroundColor: `${accent}26` } : undefined}
          >
            <Megaphone className="h-4 w-4" style={{ color: accent }} />
            <span>
              <span className="block text-[12px] font-extrabold text-white">Pro-candidate</span>
              <span className="block text-[9.5px] font-bold text-slate-400">Lifts your turnout, rarely blows up</span>
            </span>
          </button>
          <button
            type="button"
            disabled={corruptionAd}
            onClick={() => setKind('attack')}
            className="panel-lite flex items-center gap-2 px-2.5 py-2 text-left hover:bg-white/10"
            style={activeKind === 'attack' ? { borderColor: '#F0B429', backgroundColor: 'rgba(240,180,41,0.16)' } : undefined}
          >
            <Swords className="h-4 w-4 text-amber-400" />
            <span>
              <span className="block text-[12px] font-extrabold text-white">Attack ad</span>
              <span className="block text-[9.5px] font-bold text-slate-400">Suppresses their turnout, backfires far more often</span>
            </span>
          </button>
        </div>
      </div>

      <div className="panel-sunken mt-3 space-y-1 p-2.5 text-[11.5px] font-semibold text-slate-300">
        <div className="flex items-center justify-between">
          <span>
            <span className="inline-flex items-center gap-1"><SpotArt symbol={type.icon} className="h-4 w-4" />{type.label} in {heading}</span>
          </span>
          <span className="num text-[13px] font-extrabold text-white">${cost}M</span>
        </div>
        {persuades ? (
          <div className="flex items-center justify-between">
            <span>{kind === 'attack' ? 'Their turnout' : 'Your turnout'}</span>
            <span className="num font-extrabold" style={{ color: accent }}>
              {round1(low * 2)} to +{round1(high * 2)} pts
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span>Turnout</span>
            <span className="num font-extrabold" style={{ color: accent }}>
              +{type.turnout} points, no persuasion
            </span>
          </div>
        )}
        {persuades && (
          <div className="flex items-center justify-between">
            <span>Room for the message</span>
            <span className="num font-extrabold text-slate-200">
              {Math.round(fitLow * 100)}%{multi && fitHigh !== fitLow ? `–${Math.round(fitHigh * 100)}%` : ''}
            </span>
          </div>
        )}
        {type.rural && !multi && (
          <div className="flex items-center justify-between">
            <span>Rural share of the state</span>
            <span className="num font-extrabold text-slate-200">{outlooks[0].rural}%</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span>Backfire risk</span>
          <span className="num font-extrabold" style={{ color: riskier ? '#FCA5A5' : '#6EE7B7' }}>
            {riskier ? 'Higher' : 'Lower'}
          </span>
        </div>
        <p className="pt-1 text-[10px] font-semibold leading-snug text-slate-500">
          {type.roll === 'wild'
            ? 'Digital swings furthest and has an even chance of going either way.'
            : type.strength === 0
              ? 'Mailers persuade nobody. They get your own voters to the polls, and they never wear out.'
              : type.fatigue
                ? 'Ads are a gamble: a dud wastes the money and the swing.'
                : 'Cheap, quiet and untiring — the state never gets sick of these.'}{' '}
          {multi
            ? 'Each state is priced on its own and rolls its own answer, so the same buy can land in one state and bomb in the next.'
            : 'A buy only moves the state it runs in.'}{' '}
          When one backfires it costs vote share and turnout there — and the worst ones follow you out of the state. Attack
          ads backfire more often than positive ones.
        </p>
      </div>

    </div>
  );
}
