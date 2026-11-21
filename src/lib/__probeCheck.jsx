import React from 'react';
import { renderToString } from 'react-dom/server';
import { createGame, startTurn, advanceWeek, opponentTurn, snapshot, PARTY_COLOR, EV_TO_WIN } from '@/lib/gameEngine';
import { CANDIDATE_BY_ID } from '@/data/candidates';
import { buildNight, nightAt } from '@/lib/night';
import ElectionNight from '@/components/game/ElectionNight';
import BoardPanel from '@/components/game/BoardPanel';
import PresidencyCall from '@/components/game/night/PresidencyCall';
import { senateSnapshot, houseSnapshot, govSnapshot } from '@/lib/gameEngine';

let g = startTurn(
  createGame({ party: 'dem', candidateId: 'shapiro', opponentId: 'vance', difficultyId: 'medium', startId: 'aug' })
);

// --- week 1 vs the setup projection -----------------------------------------
const projection = snapshot({ ...g, noise: {} }).rows;
const week1 = snapshot(g).rows;
const err = (a, b) => Math.max(...a.map((r, i) => Math.abs(r.margin - b[i].margin)));
const mean = (a, b) => a.reduce((s, r, i) => s + Math.abs(r.margin - b[i].margin), 0) / a.length;
console.log('week1 vs projection: max', err(week1, projection).toFixed(2), 'mean', mean(week1, projection).toFixed(2));

for (let i = 0; i < 30 && !g.finished; i++) g = advanceWeek(opponentTurn(g));

// --- the count: swing sizes and convergence ---------------------------------
const plan = buildNight(g);
const finalOf = Object.fromEntries(plan.states.map((s) => [s.abbr, s]));
const nearest = {};
let wild = 0;
for (let t = 0; t <= plan.end; t += 1) {
  const n = nightAt(plan, t);
  n.rows.forEach((r) => {
    if (!r.reporting) return;
    const dev = Math.abs(r.margin - finalOf[r.abbr].margin);
    if (r.pct < 45 && dev > wild) wild = dev;
    [80, 90].forEach((target) => {
      const cur = nearest[`${target}-${r.abbr}`];
      if (!cur || Math.abs(r.pct - target) < Math.abs(cur.pct - target)) {
        nearest[`${target}-${r.abbr}`] = { pct: r.pct, dev };
      }
    });
  });
}
const at = (target) => {
  const vals = Object.keys(nearest)
    .filter((k) => k.startsWith(`${target}-`))
    .map((k) => nearest[k].dev);
  return { max: Math.max(...vals).toFixed(2), n: vals.length };
};
console.log('wildest early deviation', wild.toFixed(2), '| at 80%', at(80), '| at 90%', at(90));

// --- render ------------------------------------------------------------------
const you = CANDIDATE_BY_ID[g.candidateId];
const them = CANDIDATE_BY_ID[g.opponentId];
const mid = nightAt(plan, plan.end * 0.7);
const page = renderToString(
  React.createElement(ElectionNight, {
    game: g,
    you,
    them,
    accent: PARTY_COLOR[g.party],
    oppAccent: PARTY_COLOR[them.party],
    onDone: () => {},
  })
);
const banner = renderToString(
  React.createElement(PresidencyCall, { name: you.name, dem: 291, rep: 247, pct: 74.2, onDismiss: () => {} })
);
const snap = snapshot(g);
const board = renderToString(
  React.createElement(BoardPanel, {
    game: g,
    snap,
    senate: senateSnapshot(g),
    house: houseSnapshot(g),
    gov: govSnapshot(g),
    you,
    them,
    selected: 'PA',
    onSelect: () => {},
    showExact: true,
    accent: PARTY_COLOR[g.party],
    oppAccent: PARTY_COLOR[them.party],
    tab: 'pres',
    onTab: () => {},
    adMode: true,
    adSelected: ['PA', 'MI', 'WI'],
    onAdToggle: () => {},
  })
);
console.log('renders ok', page.length, banner.length, board.length, 'evwin', EV_TO_WIN, 'mid rows', mid.rows.length);