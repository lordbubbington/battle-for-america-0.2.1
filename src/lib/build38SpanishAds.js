/** Audience-average an existing signed ad effect; does not modify turnout directly. */
/** @param {{language?:string, issueId?:string, stanceIndex?:number, channel?:string, baseEffect?:number, hispanicFraction?:number}} [options] */
export function spanishAdEffect({ language = 'en', issueId, stanceIndex, channel, baseEffect, hispanicFraction = 0 } = {}) {
  if (!Number.isFinite(baseEffect) || !Number.isFinite(hispanicFraction) || hispanicFraction < 0 || hispanicFraction > 1) {
    throw new Error('baseEffect and a 0–1 hispanicFraction are required');
  }
  if (!channel) throw new Error('Existing ad effect channel is required');
  if (language !== 'es') return { channel, effect: baseEffect, audienceEffects: [{ audience: 'all', fraction: 1, multiplier: 1, effect: baseEffect }] };
  const positionMultiplier = issueId === 'immigration' ? (stanceIndex === 0 ? 2 : -1) : 1;
  const hispanicMultiplier = 5;
  const nonHispanicMultiplier = 0.1;
  const audienceEffects = [
    { audience: 'hispanic', fraction: hispanicFraction, multiplier: hispanicMultiplier, effect: baseEffect * hispanicMultiplier },
    { audience: 'non-hispanic', fraction: 1 - hispanicFraction, multiplier: nonHispanicMultiplier, effect: baseEffect * nonHispanicMultiplier },
  ];
  const audienceAdjustedEffect = audienceEffects.reduce((total, item) => total + item.fraction * item.effect, 0);
  return { channel, effect: audienceAdjustedEffect * positionMultiplier, audienceAdjustedEffect, positionMultiplier, audienceEffects,
    immigrationPosition: issueId === 'immigration' ? (stanceIndex === 0 ? 'left' : stanceIndex === 1 ? 'center treated as non-left' : 'right') : null };
}
