// Battle for America 0.2.2 balance helpers:
// - R08: Regional-mode ×10 persuasion gain multiplier (positive gains only, once).
// - R15: Player-only weighted draw for unscheduled events with a strictly good option.
// - R16: Two-party-only 60/40 player-favorable directional news rebalancing.

// Calibrated via paired seeded trials (step 0.05 up to 2.00, cap <= 2.0x per event ID).
export let STRICTLY_GOOD_EVENT_WEIGHT = 1.75;

export function setStrictlyGoodEventWeight(m) {
  STRICTLY_GOOD_EVENT_WEIGHT = m;
}

export function isRegionalMode(game) {
  return game?.build40?.modeId === 'regional-parties'
    || game?.build39?.scenario?.id === 'regional-parties';
}

export function isTwoPartyMajorMode(game) {
  const modeId = game?.build40?.modeId || game?.build39?.scenario?.id || 'two-parties';
  return (modeId === 'two-parties' || modeId === 'standard')
    && game?.thirdMode !== 'surge'
    && ['dem', 'rep'].includes(game?.party);
}

// R08: Multiply positive persuasion gains ×10 ONLY in regional mode, once.
export function scaleRegionalPersuasion(game, amount, alreadyScaled = false) {
  const val = Number(amount);
  if (!Number.isFinite(val) || val <= 0 || alreadyScaled) return val || 0;
  return isRegionalMode(game) ? val * 10 : val;
}

// R15: Classify a single available player-facing event choice by all actual outcomes.
// Strictly good: >= 1 positive gameplay effect AND every branch has 0 harmful
// effects, 0 costs, and 0 harmful risks (scandal, opponent gain, etc.).
export function classifyEventChoice(choice, playerParty = 'dem') {
  if (!choice || choice.unavailable || choice.disabled) {
    return { status: 'unavailable', strictlyGood: false, reason: 'unavailable' };
  }
  const cost = Number(choice.cost || choice.fundsCost || 0);
  if (cost > 0) {
    return { status: 'tradeoff', strictlyGood: false, reason: `cash cost ${cost}` };
  }
  const actionCost = Number(choice.actionCost || choice.actionsCost || 0);
  if (actionCost > 0) {
    return { status: 'tradeoff', strictlyGood: false, reason: `action cost ${actionCost}` };
  }
  const scandalRisk = Number(choice.scandalRisk || choice.risk || 0);
  if (scandalRisk > 0) {
    return { status: 'risky', strictlyGood: false, reason: `scandal/risk ${scandalRisk}` };
  }

  // Collect all effect lists across deterministic and probabilistic branches.
  const branches = [];
  if (Array.isArray(choice.effects)) branches.push(choice.effects);
  if (Array.isArray(choice.outcomes)) {
    for (const out of choice.outcomes) {
      if (out?.scandal || out?.scandalRisk > 0 || out?.harmful) {
        return { status: 'risky', strictlyGood: false, reason: 'branch scandal/harmful flag' };
      }
      if (Array.isArray(out?.effects)) branches.push(out.effects);
    }
  }
  if (Array.isArray(choice.branches)) {
    for (const br of choice.branches) {
      if (br?.scandal || br?.scandalRisk > 0 || br?.harmful) {
        return { status: 'risky', strictlyGood: false, reason: 'branch scandal/harmful flag' };
      }
      if (Array.isArray(br?.effects)) branches.push(br.effects);
    }
  }
  if (choice.successEffects || choice.failEffects || choice.failureEffects) {
    if (Array.isArray(choice.successEffects)) branches.push(choice.successEffects);
    if (Array.isArray(choice.failEffects)) branches.push(choice.failEffects);
    if (Array.isArray(choice.failureEffects)) branches.push(choice.failureEffects);
  }

  // Also check simple scalar effect fields on legacy/build40 choice objects.
  const flatEffects = [];
  for (const key of ['persuasion', 'turnout', 'momentum', 'funds', 'moderate', 'factionDelta']) {
    if (Number.isFinite(choice[key]) && choice[key] !== 0) {
      flatEffects.push({ kind: key, amount: choice[key], target: 'self' });
    }
  }
  if (flatEffects.length) branches.push(flatEffects);

  if (!branches.length) {
    return { status: 'unclassified', strictlyGood: false, reason: 'no inspectable structured effects' };
  }

  let hasPositive = false;
  for (const effList of branches) {
    for (const eff of effList) {
      if (!eff || typeof eff !== 'object') continue;
      const kind = String(eff.kind || eff.type || '').toLowerCase();
      if (kind.includes('scandal') || kind.includes('penalty') || kind.includes('backfire')) {
        return { status: 'harmful', strictlyGood: false, reason: `harmful effect kind ${kind}` };
      }
      const amt = Number(eff.amount ?? eff.value ?? eff.delta ?? 0);
      if (!Number.isFinite(amt)) {
        return { status: 'unclassified', strictlyGood: false, reason: `non-numeric effect ${kind}` };
      }
      if (amt === 0) continue;
      const targetsOpponent = eff.target === 'opponent' || eff.target === 'rival'
        || (eff.party && eff.party !== playerParty && eff.party !== 'self');
      // For opponent target, negative amount is positive for player; positive is harmful.
      const playerSigned = targetsOpponent ? -amt : amt;
      if (playerSigned < 0) {
        return { status: 'tradeoff', strictlyGood: false, reason: `negative player effect ${kind}:${playerSigned}` };
      }
      if (playerSigned > 0) hasPositive = true;
    }
  }

  if (!hasPositive) {
    return { status: 'neutral', strictlyGood: false, reason: 'only zero/neutral outcomes' };
  }
  return { status: 'strictly-good', strictlyGood: true, reason: 'positive effect with zero harmful branches' };
}

export function isStrictlyGoodEvent(event, playerParty = 'dem') {
  if (!event || !Array.isArray(event.choices)) return false;
  return event.choices.some((choice) => classifyEventChoice(choice, playerParty).strictlyGood);
}

export function drawWeightedPlayerEvent(pool, { random = Math.random, playerParty = 'dem', weightMultiplier = STRICTLY_GOOD_EVENT_WEIGHT } = {}) {
  if (!Array.isArray(pool) || !pool.length) return null;
  const m = Number.isFinite(weightMultiplier) && weightMultiplier >= 1 ? weightMultiplier : 1;
  const weights = pool.map((event) => (isStrictlyGoodEvent(event, playerParty) ? m : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return pool[0];
  let r = random() * total;
  for (let i = 0; i < pool.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// R16: Two-party-only 60/40 directional news rebalancing.
// Preserves neutral/mixed story weights and within-side relative weights.
export function classifyNationalCardDirection(card, playerParty) {
  if (!card || !['dem', 'rep'].includes(playerParty)) return 'neutral';
  const pov = playerParty === 'dem' ? 1 : -1;
  const nat = Number(card.nat || 0) * pov;
  const gen = Number(card.gen || 0) * pov;
  if ((nat > 0 && gen < 0) || (nat < 0 && gen > 0)) return 'mixed';
  const score = nat + gen;
  if (Math.abs(score) < 1e-6) return 'neutral';
  return score > 0 ? 'favorable' : 'unfavorable';
}

export function rebalanceTwoPartyDirectionalWeights(items, baseWeights, directions, targetFavorableShare = 0.6) {
  let favSum = 0;
  let unfavSum = 0;
  for (let i = 0; i < items.length; i += 1) {
    const w = Math.max(0, Number(baseWeights[i]) || 0);
    if (!w) continue;
    if (directions[i] === 'favorable') favSum += w;
    else if (directions[i] === 'unfavorable') unfavSum += w;
  }
  // If either directional side is absent, keep baseline weights untouched (never invent/flip).
  if (!(favSum > 0) || !(unfavSum > 0)) return baseWeights;

  const dirTotal = favSum + unfavSum;
  const favScale = (dirTotal * targetFavorableShare) / favSum;
  const unfavScale = (dirTotal * (1 - targetFavorableShare)) / unfavSum;

  return baseWeights.map((w, i) => {
    const clean = Math.max(0, Number(w) || 0);
    if (!clean) return 0;
    if (directions[i] === 'favorable') return clean * favScale;
    if (directions[i] === 'unfavorable') return clean * unfavScale;
    return clean;
  });
}
