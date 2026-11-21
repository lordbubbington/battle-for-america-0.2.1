import React, { useMemo } from 'react';
import { FATIGUE_PARTIES, OWN_PER_POINT, TOTAL_PER_POINT } from '@/lib/fatigue';

const PARTY_TAG = { dem: 'D', rep: 'R', lib: 'L', grn: 'G' };
const PARTY_INK = { dem: '#4C7BFF', rep: '#E8433C', lib: '#F5C542', grn: '#3FBF6F' };

// The hidden half of the campaign: who has worn out which state, and by how much.
export default function FatigueTable({ game }) {
  const rows = useMemo(() => {
    const fatigue = game?.fatigue || {};
    const total = game?.totalFatigue || {};
    const states = new Set(Object.keys(total));
    Object.values(fatigue).forEach((byState) => {
      Object.keys(byState || {}).forEach((abbr) => states.add(abbr));
    });

    return [...states]
      .map((abbr) => {
        const parties = {};
        let live = 0;
        FATIGUE_PARTIES.forEach((party) => {
          const entry = fatigue[party]?.[abbr] || {};
          const trio = [entry.stop || 0, entry.promise || 0, entry.ad || 0];
          live += trio.reduce((sum, v) => sum + v, 0);
          parties[party] = trio;
        });
        return { abbr, parties, live, total: total[abbr] || 0 };
      })
      .filter((r) => r.live > 0 || r.total > 0)
      .sort((a, b) => b.total - a.total || b.live - a.live)
      .slice(0, 24);
  }, [game]);

  return (
    <div>
      {rows.length === 0 ? (
        <p className="text-[11px] font-semibold text-slate-500">No fatigue banked yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[10px]">
            <thead>
              <tr className="text-slate-500">
                <th className="py-1 pr-1 text-left font-bold">ST</th>
                {FATIGUE_PARTIES.map((p) => (
                  <th key={p} className="px-1 text-center font-bold" style={{ color: PARTY_INK[p] }}>
                    {PARTY_TAG[p]}
                  </th>
                ))}
                <th className="pl-1 text-right font-bold">TOT</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.abbr} className="border-t border-white/5">
                  <td className="py-0.5 pr-1 text-left font-bold text-slate-300">{r.abbr}</td>
                  {FATIGUE_PARTIES.map((p) => {
                    const trio = r.parties[p];
                    const dead = trio.every((v) => v === 0);
                    return (
                      <td
                        key={p}
                        className={`px-1 text-center tabular-nums ${dead ? 'text-slate-700' : 'text-slate-300'}`}
                      >
                        {trio.join('/')}
                      </td>
                    );
                  })}
                  <td className="pl-1 text-right font-bold tabular-nums text-primary">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-1 font-mono text-[9px] leading-relaxed text-slate-500">
        s/p/a · −{Math.round(OWN_PER_POINT * 100)}% per own point · −{TOTAL_PER_POINT * 100}% per lifetime total · −1
        of each type per week
      </p>
    </div>
  );
}