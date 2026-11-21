export const PULSE_THRESHOLD = 0.15;

// Major-party campaigns read map movement as a change in their two-party
// margin. Third-party campaigns need their own vote share because the major-
// party margin is not a measure of their support.
export function movementFor(row, baseline, party) {
  if (!row || !baseline) return 0;
  if (party === 'dem') return row.margin - baseline.margin;
  if (party === 'rep') return baseline.margin - row.margin;
  return (row.shares?.[party] || 0) - (baseline.shares?.[party] || 0);
}

export function movementLabel(amount, party) {
  const sign = amount > 0 ? '+' : '−';
  const value = `${sign}${Math.abs(amount).toFixed(1)}`;
  if (party === 'dem' || party === 'rep') {
    return `${value} ${amount >= 0 ? 'toward' : 'away from'} your ticket`;
  }
  return `${value} share points`;
}
