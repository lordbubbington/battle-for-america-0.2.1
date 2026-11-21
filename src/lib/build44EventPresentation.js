import { STATE_BY_ABBR } from '@/data/states';

const number = (value) => String(Math.round(value * 10000) / 10000);
const signed = (value) => (value > 0 ? '+' : '') + number(value);
export const qualitativeChance = (chance) => chance <= 0.15 ? 'Small chance' : chance <= 0.4 ? 'Medium chance' : 'Large chance';

export function hiddenEffectInventory(events, maximum = 12) {
  const entries = events.flatMap((event) => event.choices.flatMap((choice) => choice.branches.flatMap((branch, branchIndex) =>
    branch.effects.flatMap((effect, effectIndex) => effect.hidden === true
      ? [{ eventId: event.id, choiceId: choice.id, branchIndex, effectIndex, kind: effect.kind }] : []))));
  if (entries.length > maximum) throw new Error('Explicitly hidden effects exceed ' + maximum + ': ' + entries.length);
  return entries;
}

export function effectPresentation(effect, { actual = false, chance = 1 } = {}) {
  const actor = effect.side === 'opponent' ? 'Rival' : 'Campaign';
  const targets = effect.states?.length === 51 ? 'nationwide' : effect.states?.map((state) => STATE_BY_ABBR[state]?.name || state).join(', ');
  const area = targets ? ' · ' + targets : '';
  const amount = effect.scalable && !actual
    ? signed(Math.min(effect.amount * 0.8, effect.amount * 1.2)) + ' to ' + signed(Math.max(effect.amount * 0.8, effect.amount * 1.2))
    : signed(effect.amount || 0);
  const family = { momentum: 'momentum', persuasion: 'persuasion', turnout: 'turnout', house: 'House support', ground: 'ground game', group: 'support', faction: 'approval' }[effect.kind];
  let text;
  if (effect.kind === 'cash') {
    const low = Math.abs(effect.amount) * (effect.scalable && !actual ? 0.8 : 1);
    const high = Math.abs(effect.amount) * (effect.scalable && !actual ? 1.2 : 1);
    text = actor + (effect.amount < 0 ? ' cost: ' : ' funds: +') + '$' + number(low) + (high !== low ? '–$' + number(high) : '') + 'M';
  } else if (effect.kind === 'scandal') {
    text = actual ? actor + ' scandal: momentum ' + signed(-effect.hit) + '; persuasion ' + signed(effect.persuasionAmount) + ' points nationwide'
      : (effect.probability === 1 ? 'Guaranteed' : qualitativeChance(effect.probability)) + ' ' + actor.toLowerCase() + ' scandal' + (effect.severity === 'double' ? ' (double severity)' : '');
  } else text = actor + ' ' + (effect.targetLabel ? effect.targetLabel + ' ' : '') + family + ' ' + amount + (effect.kind === 'ground' ? ' levels' : ' points') + area;
  if (!actual && chance < 1) text = qualitativeChance(chance) + ': ' + text;
  const beneficial = effect.kind === 'scandal' ? false : effect.amount > 0;
  return { text, tone: effect.amount === 0 ? 'neutral' : (beneficial !== (effect.side === 'opponent') ? 'positive' : 'negative') };
}

export function choicePresentation(choice, describe) {
  const effects = [];
  for (const branch of choice.branches) {
    if (branch.hidden === true) continue;
    const visible = branch.effects.filter((effect) => effect.hidden !== true);
    if (!visible.length && branch.effects.length === 0) effects.push({ text: qualitativeChance(branch.probability) + ': no additional effect', tone: 'neutral' });
    for (const effect of visible) effects.push(effectPresentation(describe(effect), { chance: branch.probability }));
  }
  return { effects: effects.filter((row, index) => effects.findIndex((other) => other.text === row.text) === index) };
}

export function outcomePresentation(applied) {
  return { effects: applied.filter((effect) => effect.hidden !== true).map((effect) => effectPresentation(effect, { actual: true })) };
}
