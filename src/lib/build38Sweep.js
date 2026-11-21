export const BUILD38_QUICK_OUTCOMES_COMMAND_ID = 'quick-outcomes';
export const BUILD38_QUICK_OUTCOMES_DRAWS = 50000;

/** Keep the R/D environment sweep exclusive to the fixed 50,000-draw command. */
/** @param {{commandId?:string, draws?:number, sweepRequested?:boolean}} [options] */
export function resolveSweep({ commandId, draws, sweepRequested } = {}) {
  if (!sweepRequested) return { enabled: false, reason: null };
  if (commandId !== BUILD38_QUICK_OUTCOMES_COMMAND_ID) return { enabled: false, reason: 'command-not-quick-outcomes' };
  if (draws !== BUILD38_QUICK_OUTCOMES_DRAWS) return { enabled: false, reason: 'requires-50000-draws' };
  return { enabled: true, reason: null };
}
