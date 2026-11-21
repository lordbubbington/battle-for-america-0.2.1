import { groundCost } from '@/data/states';
import { groundGameSetupCostM, groundGameUpkeepM } from '@/lib/campaignBalanceRules';

const round1 = (value) => Math.round(value * 10) / 10;

export function groundSetupCost(abbr) {
  return round1(groundGameSetupCostM(groundCost(abbr) * 2));
}

export function groundWeeklyCost(abbr, level = 1) {
  return round1(groundGameUpkeepM(groundCost(abbr) * 0.5 * Math.max(0, Number(level) || 0)));
}
