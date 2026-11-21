import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';

const STEPS = [
  {
    title: 'Win the map',
    text: 'Win 270 electoral votes to become president. Maine and Nebraska split some votes by district. If you choose popular-vote rules at setup, the national vote decides instead.',
  },
  {
    title: 'Read the board',
    text: 'The map shows the current polling picture. Focus on close states, but watch the House, Senate, and governor races too. Higher difficulty hides exact margins and makes polling less reliable.',
  },
  {
    title: 'Spend your week',
    text: 'You have seven campaign actions each week. Visits, town halls, field work, fundraising, promises, and debate prep each cost an action. Advertising costs money but does not use an action.',
  },
  {
    title: 'Fit the state',
    text: 'Your policy positions change how well your message fits voters. A strong issue match can help in a state; changing a position costs momentum and can upset groups that trusted your old stance.',
  },
  {
    title: 'Use your team',
    text: 'Choose three advisors alongside your Chief of Staff. Choose from traditional advisors and the three specialists offered at setup. Open Staff to compare priorities and set one agenda before acting. The matching action can use the agenda bonus once.',
  },
  {
    title: 'Build a coalition',
    text: 'The campaign calendar shows debates, early voting, and state election deadlines. Campaign map colors show voter preferences. Turnout and ballots already cast affect the election result.',
  },
  {
    title: 'Keep adapting',
    text: 'Opponents study your campaign. They can challenge your strongest message, contest states you leave alone, and use broken promises against you. Review the weekly news, then decide whether to act or advance.',
  },
];

export default function TutorialDialog({ open, onClose }) {
  const [index, setIndex] = useState(0);
  if (!open) return null;
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm" role="presentation">
      <section className="panel w-full max-w-xl border-primary/40 p-4 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="label-xs text-primary">Campaign field guide · {index + 1} of {STEPS.length}</p>
            <h2 id="tutorial-title" className="mt-1 font-heading text-2xl text-white">{step.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost flex h-8 w-8 items-center justify-center rounded-full p-0" aria-label="Close tutorial">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-1" aria-hidden="true">
          {STEPS.map((item, stepIndex) => (
            <span key={item.title} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: stepIndex <= index ? '#F7C145' : 'rgba(255,255,255,0.12)' }} />
          ))}
        </div>

        <p className="mt-5 min-h-24 text-sm font-semibold leading-relaxed text-slate-300">{step.text}</p>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0} className="btn-ghost flex items-center gap-1 px-3 py-2 text-xs font-extrabold disabled:opacity-40">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <button type="button" onClick={last ? onClose : () => setIndex((value) => Math.min(STEPS.length - 1, value + 1))} className="btn-gold flex items-center gap-1 px-4 py-2 text-xs">
            {last ? <><Check className="h-3.5 w-3.5" /> Ready</> : <>Next <ArrowRight className="h-3.5 w-3.5" /></>}
          </button>
        </div>
      </section>
    </div>
  );
}
