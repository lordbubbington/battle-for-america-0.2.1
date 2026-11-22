import { NONTRADITIONAL_STAFF_BY_ID } from '@/data/nonTraditionalStaffRoster';
import { previewTraditionalPortraits, validateTraditionalStaffing } from '@/lib/traditionalStaffRules';
import { createNonTraditionalStaffState, sampleNonTraditionalSelectionPool } from '@/lib/nonTraditionalStaffRules';

const array = (value) => Array.isArray(value) ? value : [];
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const validId = (catalog, id) => typeof id === 'string' && Object.hasOwn(catalog, id);
const unique = (values) => [...new Set(values)];

function rebuildPortraits(campaignId, activeIds, saved) {
  const previews = previewTraditionalPortraits(campaignId);
  const unused = new Set(Object.values(previews));
  const result = {};
  for (const id of activeIds) {
    const portrait = saved?.[id];
    if (unused.delete(portrait)) result[id] = portrait;
  }
  for (const id of activeIds) {
    if (result[id]) continue;
    const portrait = unused.has(previews[id]) ? previews[id] : unused.values().next().value;
    unused.delete(portrait);
    result[id] = portrait;
  }
  return result;
}

function activeHistory(history, activeIds) {
  return array(history).filter((entry) => entry && (!entry.staffId || activeIds.has(entry.staffId)))
    .slice(-8)
    .map((entry) => entry.unmetPriority?.staffId && !activeIds.has(entry.unmetPriority.staffId)
      ? { ...entry, unmetPriority: null }
      : entry);
}

export function migrateBuild36Staffing(game) {
  const saved = object(game.staffing);
  const campaignId = game.build34CampaignId;
  const legacy = saved.schemaVersion !== 2;
  const setupPending = saved.initialSelectionComplete === false;
  if (setupPending) {
    const storedPool = saved.nonTraditionalSelectionPoolIds || saved.nonTraditionalOfferIds;
    const pool = array(storedPool);
    const reusable = pool.length === 3 && unique(pool).length === 3 && pool.every((id) => validId(NONTRADITIONAL_STAFF_BY_ID, id));
    return {
      staffing: createNonTraditionalStaffState(reusable ? pool : sampleNonTraditionalSelectionPool(campaignId)),
      staffNativeEffectsFromWeek: null,
    };
  }

  const selectedNonTraditional = [...array(saved.nonTraditionalActiveIds || saved.hiredNonTraditionalIds)];
  const originalTraditional = Array.isArray(saved.traditionalActiveIds)
    ? saved.traditionalActiveIds
    : Object.keys(object(game.staff));
  // Never recruit unchosen catalog entries while loading a campaign.
  const activeTraditional = [...originalTraditional];
  const active = new Set([...activeTraditional, ...selectedNonTraditional]);
  const agenda = object(saved.agendaByWeek || game.staffAgendaByWeek);
  const staffing = {
    schemaVersion: 2,
    selectionPolicyVersion: saved.selectionPolicyVersion ?? 0,
    traditionalActiveIds: activeTraditional,
    traditionalPortraitByRole: rebuildPortraits(campaignId, activeTraditional, saved.traditionalPortraitByRole),
    nonTraditionalActiveIds: selectedNonTraditional,
    initialSelectionComplete: true,
    agendaByWeek: Object.fromEntries(Object.entries(agenda).filter(([week, item]) => /^\d+$/.test(week) && active.has(item?.staffId))),
    briefingHistory: activeHistory(saved.briefingHistory || game.staffBriefHistory, active),
  };
  const errors = validateTraditionalStaffing(staffing);
  if (errors.length) throw new Error('Invalid migrated Build 36 staff: ' + errors.join('; '));
  return {
    staffing,
    staffNativeEffectsFromWeek: legacy ? Number(game.week || 0) + 1 : game.staffNativeEffectsFromWeek ?? null,
  };
}
