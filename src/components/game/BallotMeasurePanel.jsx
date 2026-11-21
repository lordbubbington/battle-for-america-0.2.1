import React from 'react';
import { CalendarDays, ClipboardList } from 'lucide-react';
import { STATE_BY_ABBR } from '@/data/states';
import { BALLOT_MEASURE_REFERENCE_2028, BALLOT_MEASURE_REFERENCE_CHECKED_ON } from '@/data/ballotMeasureReference';

export default function BallotMeasurePanel() {
  return (
    <section className="mt-2" aria-label="2028 ballot measure references">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="font-heading text-[15px] text-white">2028 ballot measure tracker</h3>
        </div>
        <span className="label-xs">Official sources checked {BALLOT_MEASURE_REFERENCE_CHECKED_ON}</span>
      </div>

      <p className="mb-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[10.5px] font-semibold leading-relaxed text-slate-400">
        These are source-checked ballot references, not campaign decisions. The campaign-event system only activates from legally validated, qualified measure data; no public polling is supplied here.
      </p>

      <div className="space-y-2">
        {BALLOT_MEASURE_REFERENCE_2028.map((measure) => (
          <article key={measure.id} className="panel-lite p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-500">
                  {STATE_BY_ABBR[measure.state]?.name || measure.state} · {measure.measureType}
                </p>
                <h4 className="mt-0.5 font-heading text-[13px] leading-snug text-white">{measure.title}</h4>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[9px] font-extrabold ${measure.statusTone === 'amber' ? 'border-amber-300/30 bg-amber-300/10 text-amber-100' : 'border-slate-300/20 bg-white/5 text-slate-300'}`}>
                {measure.status}
              </span>
            </div>
            <p className="mt-1.5 text-[10.5px] font-medium leading-relaxed text-slate-300">{measure.summary}</p>
            <p className="mt-1 text-[10px] font-semibold leading-relaxed text-slate-400">{measure.statusDetail}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-2">
              <span className="flex items-center gap-1 text-[9.5px] font-bold text-slate-400"><CalendarDays className="h-3 w-3" /> Election {measure.electionDate}</span>
              {measure.signatureThreshold != null && <span className="num text-[9.5px] font-bold text-slate-400">Verified signature threshold {measure.signatureThreshold.toLocaleString()}</span>}
              <span className="text-[9px] font-bold text-slate-500">No public poll in this tracker</span>
              <a className="ml-auto text-[9.5px] font-extrabold text-primary underline decoration-primary/40 underline-offset-2" href={measure.source.url} target="_blank" rel="noreferrer">
                {measure.source.title}
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
