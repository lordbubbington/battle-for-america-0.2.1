// The weekly drag back toward the map.
//
// Nothing in this game drifts forever. Every state's presidential margin is
// measured against where it stood on the morning this campaign opened — the
// game's own starting map, not the map file's usual lean — and pulled back
// toward that number: three tenths of a point a week once it is more than five
// points away, half a point a week once it is ten. The downballot races are
// dragged the same way against their own openings. The whole thing is settled
// before any national average moves, so the news never sees a number the drag
// has not corrected.
//
// The map's own functions are handed in rather than imported: the engine owns
// them, and this module is only the rule.

const round1 = (v) => Math.round(v * 10) / 10;

// The presidency's ladder: past five points a gentle pull, at ten a firmer one.
export const PRES_DRAG_NEAR = 5;
export const PRES_DRAG_FAR = 10;
export const PRES_DRAG_STEP_NEAR = 0.3;
export const PRES_DRAG_STEP_FAR = 0.5;

// The downballot races keep their own, blunter rule.
export const DRAG_LIMIT = 10;
export const DRAG_STEP = 1;

export function presidentialDragStep(gap) {
  const away = Math.abs(gap);
  if (away >= PRES_DRAG_FAR) return PRES_DRAG_STEP_FAR;
  if (away > PRES_DRAG_NEAR) return PRES_DRAG_STEP_NEAR;
  return 0;
}

export function dragTowardBaseline(game, { pollMargin, raceMargin, governors = {} }) {
  const dragMods = { ...(game.dragMods || {}) };

  // The presidency: every state dragged toward its own opening margin.
  Object.keys(game.baseMargins || {}).forEach((abbr) => {
    const base = game.baseMargins[abbr];
    const gap = base - pollMargin(abbr, game);
    const step = presidentialDragStep(gap);
    if (step) dragMods[abbr] = round1((dragMods[abbr] || 0) + Math.sign(gap) * step);
  });

  // The downballot map is read with the presidential drag already applied: the
  // top of the ticket is what pushes those races around in the first place.
  const withTop = { ...game, dragMods };
  const marginOf = (abbr) => pollMargin(abbr, withTop);
  const dbDrag = { ...(game.dbDrag || {}) };

  Object.entries(game.raceBaseline || {}).forEach(([key, base]) => {
    const [kind, abbr] = key.split(':');
    const structural = kind === 'gov' ? governors[abbr]?.mod || 0 : 0;
    const gap = base - (raceMargin(abbr, kind, withTop, marginOf) + structural);
    if (Math.abs(gap) > DRAG_LIMIT) dbDrag[key] = (dbDrag[key] || 0) + Math.sign(gap) * DRAG_STEP;
  });

  return { dragMods, dbDrag };
}