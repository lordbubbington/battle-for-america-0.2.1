/** Receipt-backed bridge from triggered content into existing game resolvers. */

import { resolveTriggeredEventChoiceCommands } from '../data/triggeredEventChains.js';
import { resolveVanceSuccessionChoice } from '../data/vanceSuccessionStory.js';
import { build34CampaignEffectBatch } from './build34CommandRouter.js';

/** Route a triggered choice while retaining both choice-level and effect-level receipts. */
export function routeTriggeredEventChoice({
  campaignId,
  week,
  starterEventId,
  choice,
  starterReceipt,
  resolvedChoiceReceiptIds = [],
  appliedEffectReceiptIds = [],
} = {}) {
  const resolvedChoice = resolveTriggeredEventChoiceCommands({
    campaignId,
    starterEventId,
    choice,
    starterReceipt,
    resolvedChoiceReceiptIds,
  });
  const effectBatch = build34CampaignEffectBatch({
    campaignId,
    week,
    sourceId: resolvedChoice.receiptId,
    sourceType: 'triggered-event-choice',
    commands: resolvedChoice.commands,
    appliedReceiptIds: appliedEffectReceiptIds,
  });
  return { ...resolvedChoice, effectBatch };
}

/** Route one eligible Vance story choice through the same voter-model channel. */
export function routeVanceSuccessionChoice({
  campaignId,
  week,
  appliedVanceReceiptIds = [],
  appliedEffectReceiptIds = [],
  ...choiceInput
} = {}) {
  const result = resolveVanceSuccessionChoice({
    ...choiceInput,
    campaignId,
    appliedReceiptIds: appliedVanceReceiptIds,
  });
  if (!result.command) return { ...result, effectBatch: null };
  const effectBatch = build34CampaignEffectBatch({
    campaignId,
    week,
    sourceId: result.command.sourceEventId,
    sourceType: 'vance-succession-choice',
    commands: [{
      ...result.command,
      receiptId: `${campaignId}:${result.command.sourceEventId}:${result.command.choiceId}:effect`,
    }],
    appliedReceiptIds: appliedEffectReceiptIds,
  });
  return { ...result, effectBatch };
}

