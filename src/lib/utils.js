export const DAILY_LIMIT = 5
export const TOTAL_THRESHOLD = 30

export function calcPct(counts) {
  const total = counts.A + counts.B
  const pctA = total > 0 ? Math.round((counts.A / total) * 100) : 50
  const pctB = total > 0 ? 100 - pctA : 50
  return { pctA, pctB, total }
}
