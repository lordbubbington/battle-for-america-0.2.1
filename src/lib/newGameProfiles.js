/** Build 34 difficulty-dependent starting national environment contract. */

/** Major-party setup targets. Values are in player-relative margin points. */
export const DIFFICULTY_START_RULES = Object.freeze({
  cupcake: Object.freeze({ defaultPlayerMargin: 10, favorableCap: null, fundsM: 800, scoreMul: 0.01 }),
  easy: Object.freeze({ defaultPlayerMargin: 4, favorableCap: 7, fundsM: 300, scoreMul: 0.5 }),
  medium: Object.freeze({ defaultPlayerMargin: 0, favorableCap: 1, fundsM: 250, scoreMul: 1 }),
  hard: Object.freeze({ defaultPlayerMargin: -4, favorableCap: -3, fundsM: 250, scoreMul: 2.5 }),
  brutal: Object.freeze({ defaultPlayerMargin: -8, favorableCap: -8, fundsM: 250, scoreMul: 7.5 }),
  nightmare: Object.freeze({ defaultPlayerMargin: -20, favorableCap: -15, fundsM: 250, scoreMul: 20 }),
});

const isMajorParty = (party) => party === 'dem' || party === 'rep';
const partySign = (party) => party === 'rep' ? -1 : 1;

/** Clamp only the player-favorable side of a new starting value. */
/** @param {{difficultyId?: string, playerParty?: string, nationalGeneric?: number}} [options] */
export function clampStartingNationalEnvironment({ difficultyId, playerParty, nationalGeneric } = {}) {
  if (!Number.isFinite(nationalGeneric) || !isMajorParty(playerParty)) return nationalGeneric;
  const profile = DIFFICULTY_START_RULES[difficultyId === 'normal' ? 'medium' : difficultyId];
  if (!profile || profile.favorableCap === null) return nationalGeneric;
  const sign = partySign(playerParty);
  const playerRelative = nationalGeneric * sign;
  return playerRelative > profile.favorableCap ? profile.favorableCap * sign : nationalGeneric;
}

export function startingNationalEnvironment({
  difficultyId,
  playerParty,
  modeMaximumEnvironment,
}) {
  if (difficultyId === 'realistic') {
    return { nationalGeneric: 9, source: 'realistic-d-plus-9' };
  }
  const profile = DIFFICULTY_START_RULES[difficultyId === 'normal' ? 'medium' : difficultyId];
  if (profile && isMajorParty(playerParty)) {
    const sign = partySign(playerParty);
    return {
      nationalGeneric: profile.defaultPlayerMargin * sign,
      source: `${difficultyId}-player-relative-profile`,
    };
  }
  if (difficultyId === 'easy') {
    if (!playerParty) throw new Error('Easy start requires the player party');
    const nationalGeneric = playerParty === 'dem' ? 10 : playerParty === 'rep' ? -10 : 0;
    return { nationalGeneric, source: playerParty === 'dem' || playerParty === 'rep' ? 'easy-player-plus-10' : 'easy-third-party-neutral-generic' };
  }
  if (difficultyId === 'normal' || difficultyId === 'medium') {
    return { nationalGeneric: 0, source: 'normal-neutral' };
  }
  if (!modeMaximumEnvironment) {
    throw new Error(`Difficulty ${difficultyId} requires a maximum start from its game mode`);
  }
  const margin = Number(modeMaximumEnvironment.marginPoints);
  if (!Number.isFinite(margin) || margin < 0) {
    throw new Error(`Difficulty ${difficultyId} has an invalid starting-environment margin`);
  }
  if (playerParty !== 'dem' && playerParty !== 'rep') {
    return { nationalGeneric: 0, source: `${difficultyId}-third-party-neutral-generic` };
  }
  const legacyPartySign = playerParty === 'dem' ? 1 : -1;
  const directionSign = modeMaximumEnvironment.direction === 'opponent-favored' ? -1 : 1;
  return {
    nationalGeneric: legacyPartySign * directionSign * margin,
    source: `${difficultyId}-mode-profile`,
  };
}

/** Reset only on new-game creation; migration must preserve the saved value. */
export function shouldApplyStartingEnvironment({ isNewCampaign, hasSavedEnvironment }) {
  return Boolean(isNewCampaign) && !Boolean(hasSavedEnvironment);
}

/** Realistic and Nightmare share the strongest planner, without extra resources. */
export function aiPlanningProfileForDifficulty(difficultyId, currentProfiles = {}) {
  if (difficultyId === 'realistic' || difficultyId === 'nightmare') return 'nightmare';
  return currentProfiles[difficultyId] || 'standard';
}
