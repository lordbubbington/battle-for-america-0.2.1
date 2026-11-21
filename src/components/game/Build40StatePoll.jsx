import React from 'react';
import { STATES, STATE_BY_ABBR } from '@/data/states';
import { getDetailedPolling } from '@/lib/gameEngine';
import { BarChart3, Clock3, X } from 'lucide-react';

export default function Build40StatePoll({ game, stateId, shares, onSelectState, onClose, accent = '#F7C145' }) {
  const state = STATE_BY_ABBR[stateId];
  const report = state && shares ? getDetailedPolling(game, stateId, shares) : null;
  const rows = Object.entries(report?.results || {}).sort((a, b) => b[1].share - a[1].share);

  return (
    <section className="panel panel-gold animate-pop-in p-4" aria-labelledby="build40-state-poll-title" data-testid="build40-state-poll">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label-xs">Campaign intelligence · live snapshot</p>
          <h2 id="build40-state-poll-title" className="font-heading text-xl text-white">Detailed Polling</h2>
          <p className="mt-1 max-w-2xl text-[12px] font-semibold text-slate-400">A free modeled voter sample, refreshed from the current campaign snapshot whenever the game changes. This readout never uses an action or changes support, turnout, or votes.</p>
        </div>
        {onClose && <button type="button" onClick={onClose} className="btn-ghost rounded-lg p-1.5" aria-label="Close detailed polling"><X className="h-4 w-4" /></button>}
      </div>

      <label className="mt-3 block text-[11px] font-extrabold uppercase tracking-wide text-slate-400" htmlFor="build40-poll-state">State</label>
      <select id="build40-poll-state" data-testid="state-poll-state" value={stateId || ''} onChange={(event) => onSelectState?.(event.target.value)}
        className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm font-bold text-white sm:max-w-sm" style={{ accentColor: accent }}>
        <option value="" disabled>Select a state</option>
        {STATES.map(({ abbr, name }) => <option key={abbr} value={abbr}>{name}</option>)}
      </select>

      {state && report && <div className="mt-3" data-testid="state-poll-report">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-400">
          <span className="chip">{state.name}</span><span className="chip">Week {report.week + 1}</span>
          <span className="chip"><Clock3 className="h-3 w-3" />{report.sampledAt || 'Current campaign snapshot'}</span>
          <span className="chip">n = {report.sampleSize}</span>
          <span className="chip text-emerald-200"><BarChart3 className="h-3 w-3" />Free · current</span>
        </div>
        <div className="space-y-1.5">
          {rows.map(([party, value]) => <div key={party} className="panel-lite flex flex-wrap items-center justify-between gap-2 px-3 py-2" data-testid={`poll-result-${party}`}>
            <span className="font-heading text-[13px] capitalize text-white">{party}</span>
            <span className="num text-[13px] font-extrabold text-white">{value.share.toFixed(1)}%</span>
            <span className="num text-[10px] font-bold text-slate-400">±{value.marginOfError.toFixed(1)} points · {value.count} sampled</span>
          </div>)}
        </div>
        {report.insights?.length > 0 && <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2.5">
          <p className="label-xs">Modeled insights</p>
          {report.insights.map((insight, index) => <p key={`${index}-${insight.label || insight}`} className="mt-1 text-[11px] font-semibold text-slate-300">{typeof insight === 'string' ? insight : `${insight.label}: ${insight.value}`}</p>)}
        </div>}
        <p className="mt-2 text-[10px] font-semibold text-slate-500">Approximate 95% sampling margin for each reported share. The report follows the latest modeled state support and leaves the live forecast unchanged.</p>
      </div>}
    </section>
  );
}
