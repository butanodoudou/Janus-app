export function calcPct(counts) {
  const total = counts.A + counts.B
  const pctA = total > 0 ? Math.round((counts.A / total) * 100) : 50
  const pctB = total > 0 ? 100 - pctA : 50
  return { pctA, pctB, total }
}

export function calcStreak(voteDates) {
  const unique = [...new Set(voteDates)].sort().reverse()
  if (unique.length === 0) return { current: 0, record: 0 }

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  function dayDiff(a, b) {
    return (new Date(a) - new Date(b)) / 86400000
  }

  let current = 0
  if (unique[0] === today || unique[0] === yesterday) {
    current = 1
    for (let i = 0; i < unique.length - 1; i++) {
      if (dayDiff(unique[i], unique[i + 1]) === 1) current++
      else break
    }
  }

  let record = 0, run = 1
  for (let i = 0; i < unique.length - 1; i++) {
    if (dayDiff(unique[i], unique[i + 1]) === 1) { run++; if (run > record) record = run }
    else run = 1
  }
  record = Math.max(record, run, current)

  return { current, record }
}

export const STREAK_MILESTONES = [
  { days: 3,   label: 'En feu',        emoji: '🔥' },
  { days: 7,   label: 'Une semaine',   emoji: '🔥' },
  { days: 30,  label: 'Obsessionnel',  emoji: '⚡' },
  { days: 100, label: 'Légende',       emoji: '💀' },
]
