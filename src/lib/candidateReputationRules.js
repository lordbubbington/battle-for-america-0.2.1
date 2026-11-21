/** Small reputation modifier for corruption-story selection. */

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export const DEFAULT_PERCEIVED_CORRUPTION_SCORE = 25;

/**
 * Convert the 0-100 perceived-corruption reputation into a bounded story-weight
 * multiplier. 0 is the clean end, 25 is neutral, and 100 is the high-risk end.
 */
export function perceivedCorruptionStoryMultiplier(score) {
  const parsedScore = Number(score);
  const boundedScore = clamp(Number.isFinite(parsedScore) ? parsedScore : DEFAULT_PERCEIVED_CORRUPTION_SCORE, 0, 100);
  return Math.round((0.9 + boundedScore * 0.004) * 1000) / 1000;
}

/** Apply the reputation factor only after the native event-context gate.
 * @param {{ baseWeight?: number, perceivedCorruptionScore?: number, isCorruptionStory?: boolean }} options
 */
export function adjustCorruptionStoryWeight({
  baseWeight,
  perceivedCorruptionScore = DEFAULT_PERCEIVED_CORRUPTION_SCORE,
  isCorruptionStory = false,
} = {}) {
  const base = Math.max(0, Number(baseWeight) || 0);
  if (!isCorruptionStory) return base;
  return base * perceivedCorruptionStoryMultiplier(perceivedCorruptionScore);
}
