// One colour language for every map in the game.
//
// Winner mode paints a state the colour of the party that carried it. Margin
// mode paints how they carried it, on the same ladder everywhere: under two
// points is teal, two to five is the pale shade, five to ten the full shade,
// and ten or more the dark shade.

export const TOSSUP_MARGIN = 2;
export const COLOR_TOKENS = {
  dem: '#4C7BFF',
  rep: '#E8433C',
  lib: '#F5C542',
  grn: '#3FBF6F',
  independent: '#7B3FB0',
  tossup: '#0F8B8D',
  mcmullin: '#EE841F',
};
export const TOSSUP_COLOR = COLOR_TOKENS.tossup;

export const MARGIN_SCALE = {
  dem: { light: '#8EAAFA', mid: '#3D63E0', dark: '#1C2C88' },
  rep: { light: '#F0A9A2', mid: '#D13A32', dark: '#841811' },
  lib: { light: '#F7DE8C', mid: '#DFA51A', dark: '#87600C' },
  grn: { light: '#9EDFB4', mid: '#2C9B57', dark: '#12592F' },
  ind: { light: '#C8A9DD', mid: COLOR_TOKENS.independent, dark: '#472262' },
  mcmullin: { light: '#F9CA96', mid: COLOR_TOKENS.mcmullin, dark: '#8B4607' },
};

export const TIER_LABEL = { tossup: 'Tossup', light: 'Close', mid: 'Likely', dark: 'Solid' };

export function tierOf(lead = 0) {
  const abs = Math.abs(lead);
  if (abs < TOSSUP_MARGIN) return 'tossup';
  if (abs < 5) return 'light';
  if (abs < 10) return 'mid';
  return 'dark';
}

export function marginColor(family, lead = 0) {
  const tier = tierOf(lead);
  if (tier === 'tossup') return TOSSUP_COLOR;
  const scale = MARGIN_SCALE[family] || MARGIN_SCALE.ind;
  return scale[tier];
}

// Pale fills take dark ink, deep fills take white — the tier decides, not the party.
export function labelInk(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return '#0B1530';
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.62 ? '#0B1530' : '#FFFFFF';
}
