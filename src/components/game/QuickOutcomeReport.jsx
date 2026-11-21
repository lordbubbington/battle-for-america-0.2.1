import React from 'react';
import { X } from 'lucide-react';
import QuickOutcomeMap from '@/components/game/QuickOutcomeMap';
import { PARTY_COLOR } from '@/lib/downballot';
import { SpotGlyph } from '@/components/ui/spot-art';

const PARTIES = [
  { id: 'dem', short: 'D', name: 'Democrats', color: PARTY_COLOR.dem },
  { id: 'rep', short: 'R', name: 'Republicans', color: PARTY_COLOR.rep },
  { id: 'lib', short: 'L', name: 'Libertarians', color: PARTY_COLOR.lib },
  { id: 'grn', short: 'G', name: 'Greens', color: PARTY_COLOR.grn },
  { id: 'ind', short: 'I', name: 'Independents', color: PARTY_COLOR.ind },
];

const CHARTS = [
  ['ev', 'Electoral votes', 'electoralVotes', 'president'],
  ['house', 'House seats', 'houseSeats', 'house'],
  ['senate', 'Senate seats', 'senateSeats', 'senate'],
  ['governors', 'Governorships', 'governorships', 'governors'],
];

function Histogram({ title, icon, data, draws }) {
  const parties = PARTIES.filter(({ id }) => data[id]?.some((bin) => bin.count));
  const maxPct = Math.max(1, ...parties.flatMap(({ id }) => data[id].map((bin) => bin.pct)));
  const step = parties[0] ? (data[parties[0].id].find((bin) => bin.count)?.high ?? 0) - (data[parties[0].id].find((bin) => bin.count)?.low ?? 0) + 1 : 1;
  return (
    <section className="panel-lite p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="inline-flex items-center gap-1.5 font-heading text-[14px] text-white"><SpotGlyph symbol={icon} className="h-3.5 w-3.5" />{title}</h3>
        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">share of {draws.toLocaleString()}</span>
      </div>
      <div className="space-y-2">
        {parties.map((party) => (
          <div key={party.id} className="grid grid-cols-[30px_1fr] items-center gap-2">
            <span className="text-right text-[10px] font-extrabold" style={{ color: party.color }}>{party.short}</span>
            <div className="flex h-8 items-end gap-px border-b border-white/10" aria-label={`${party.name} ${title} distribution`}>
              {data[party.id].map((bin) => (
                <span
                  key={`${bin.low}-${bin.high}`}
                  className="min-w-[1px] flex-1 rounded-t-[2px] opacity-90"
                  style={{ height: `${Math.max(bin.count ? 2 : 0, bin.pct / maxPct * 100)}%`, backgroundColor: party.color }}
                  title={`${party.name}: ${bin.low}${bin.high !== bin.low ? `–${bin.high}` : ''} · ${bin.pct.toFixed(2)}% (${bin.count.toLocaleString()} elections)`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 pl-8 text-[9px] font-semibold text-slate-600">Bars are outcome bins ({step}-unit steps)</div>
    </section>
  );
}

export default function QuickOutcomeReport({ open, onClose, report, progress, busy, error }) {
  if (!open) return null;
  const activeParties = PARTIES.filter(({ id }) => report && (
    report.average.electoralVotes[id] > 0 || report.average.houseSeats[id] > 0 || report.average.senateSeats[id] > 0 || report.average.governorships[id] > 0
  ));

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/85 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="max-h-[96vh] w-full max-w-6xl overflow-hidden rounded-t-2xl border border-white/15 bg-[#101a2b] shadow-2xl sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="quick-outcome-title">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
          <div>
            <p className="label-xs text-primary">Outcome model</p>
            <h2 id="quick-outcome-title" className="font-heading text-xl text-white">50,000 quick election simulations</h2>
            {report && <p className="mt-1 text-[11px] font-semibold text-slate-400">{report.sweepEnvironment ? 'Includes a balanced R+5 to D+5 environment sweep around the setup environment.' : 'Uses the current setup environment with national, regional, and state polling error.'}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close outcome report" className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-white/10 disabled:opacity-40"><X className="h-4 w-4" /></button>
        </header>

        <div className="max-h-[calc(96vh-66px)] overflow-y-auto p-3 sm:p-5">
          {busy && (
            <div className="panel-lite mb-3 p-4">
              <div className="flex justify-between gap-3 text-[12px] font-bold text-white"><span>Simulating elections…</span><span>{progress.toLocaleString()} / 50,000</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress / 500}%` }} /></div>
              <p className="mt-2 text-[10px] font-semibold text-slate-500">No individual election records are saved.</p>
            </div>
          )}
          {error && <p className="mb-3 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-[12px] font-bold text-red-200">{error}</p>}
          {report && !busy && (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <div className="panel-lite p-2.5"><p className="label-xs">Average national D−R</p><p className="num mt-1 text-[18px] font-extrabold text-white">{report.average.popularDemRepMargin > 0 ? 'D' : 'R'} +{Math.abs(report.average.popularDemRepMargin).toFixed(1)}</p></div>
                {PARTIES.filter(({ id }) => report.average.presidentialWinPct[id] > 0.01).map((party) => (
                  <div key={party.id} className="panel-lite p-2.5"><p className="label-xs">{party.name} win chance</p><p className="num mt-1 text-[18px] font-extrabold" style={{ color: party.color }}>{report.average.presidentialWinPct[party.id].toFixed(1)}%</p></div>
                ))}
              </div>

              <QuickOutcomeMap stateRows={report.stateRows} parties={activeParties.map((party) => party.id)} />

              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                {CHARTS.map(([key, title, , icon]) => <Histogram key={key} title={title} icon={icon} data={report.histograms[key]} draws={report.draws} />)}
              </div>

              <section className="panel-lite overflow-hidden">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 p-3">
                  <div><h3 className="font-heading text-[15px] text-white">State-by-state outcomes</h3><p className="text-[10px] font-semibold text-slate-500">Win likelihood and average Democratic–Republican vote margin</p></div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">{activeParties.map((party) => <span key={party.id} className="text-[9px] font-extrabold" style={{ color: party.color }}>{party.short} win</span>)}</div>
                </div>
                <div className="max-h-[48vh] overflow-auto">
                  <table className="w-full min-w-[540px] border-collapse text-left text-[10px]">
                    <thead className="sticky top-0 bg-[#152238] text-slate-400"><tr><th className="px-3 py-2">State</th><th className="px-3 py-2 text-right">Avg D−R</th>{activeParties.map((party) => <th key={party.id} className="px-3 py-2 text-right" style={{ color: party.color }}>{party.short}</th>)}</tr></thead>
                    <tbody>{report.stateRows.map((state) => (
                      <tr key={state.abbr} className="border-t border-white/5 hover:bg-white/[0.03]"><td className="px-3 py-1.5 font-bold text-white">{state.name} <span className="text-slate-600">{state.abbr}</span></td><td className={`num px-3 py-1.5 text-right font-bold ${state.averageDemRepMargin >= 0 ? 'text-blue-300' : 'text-red-300'}`}>{state.averageDemRepMargin > 0 ? '+' : ''}{state.averageDemRepMargin.toFixed(1)}</td>{activeParties.map((party) => <td key={party.id} className="num px-3 py-1.5 text-right font-semibold text-slate-200">{state.winPct[party.id].toFixed(1)}%</td>)}</tr>
                    ))}</tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          {!report && !busy && !error && <p className="p-8 text-center text-sm font-semibold text-slate-400">Preparing the outcome model…</p>}
        </div>
      </section>
    </div>
  );
}
