/** Small deterministic random helpers for reproducible campaign schedules. */

export function hashSeed(value) {
  const text = String(value ?? 'build34');
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0 || 1;
}

export function createSeededRandom(seed) {
  let state = typeof seed === 'number' ? (seed >>> 0) : hashSeed(seed);
  if (!state) state = 1;
  return function nextRandom() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

export function weightedPick(items, weightOf, random = Math.random) {
  const eligible = (items || []).map((item) => ({ item, weight: Math.max(0, Number(weightOf(item)) || 0) }))
    .filter(({ weight }) => weight > 0);
  if (!eligible.length) return null;
  const total = eligible.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = random() * total;
  for (const entry of eligible) {
    cursor -= entry.weight;
    if (cursor < 0) return entry.item;
  }
  return eligible[eligible.length - 1].item;
}
