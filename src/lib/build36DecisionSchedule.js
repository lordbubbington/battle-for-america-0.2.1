export const DECISION_SCHEDULE_VERSION = 1;

export function decisionCountForWeek(week, totalWeeks, roll) {
  if (week === 0) return 0;
  if (week === totalWeeks - 1) return 5;
  if (roll < 0.5) return 1;
  return roll < 0.8 ? 2 : 3;
}

export function decisionSlots(count, actionsPerWeek) {
  let checkpoints;
  switch (count) {
    case 1: checkpoints = [0]; break;
    case 2: checkpoints = [0, 3]; break;
    case 3: checkpoints = [0, 3, actionsPerWeek]; break;
    case 5: checkpoints = [0, 3, Math.min(4, actionsPerWeek), Math.min(6, actionsPerWeek), actionsPerWeek]; break;
    default: checkpoints = [];
  }
  return checkpoints.map((afterActions) => ({ status: 'pending', afterActions }));
}

export function eventChoiceKey(event, index, game) {
  return [game.build34CampaignId, 'decision', game.week, index, event.id].join(':');
}

export function currentChoiceFor(event, submitted) {
  const id = submitted?.id || submitted?.choiceId;
  if (id) return event?.choices?.find((choice) => (choice.id || choice.choiceId) === id) || null;
  return event?.choices?.find((choice) => choice.label === submitted?.label) || null;
}
