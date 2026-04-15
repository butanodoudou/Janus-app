import { useState, useEffect } from 'react'

function getMsUntilMidnight() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight - now
}

function formatCountdown(ms) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

export default function DailyLimitScreen() {
  const [remaining, setRemaining] = useState(getMsUntilMidnight())

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(getMsUntilMidnight())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={styles.container}>
      <div style={styles.emoji}>⏳</div>
      <h2 style={styles.title}>C'est tout pour aujourd'hui</h2>
      <p style={styles.subtitle}>Tu as répondu à tes 5 dlemms du jour.</p>

      <div style={styles.countdown}>
        <p style={styles.countdownLabel}>Prochain dlemm dans</p>
        <p style={styles.countdownTime}>{formatCountdown(remaining)}</p>
      </div>

      <p style={styles.hint}>Reviens demain pour continuer !</p>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '70vh',
    padding: '32px 24px',
    gap: '16px',
    textAlign: 'center',
  },
  emoji: {
    fontSize: '56px',
    lineHeight: 1,
  },
  title: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#111',
  },
  subtitle: {
    fontSize: '15px',
    color: '#666',
    maxWidth: '260px',
  },
  countdown: {
    marginTop: '8px',
    padding: '20px 32px',
    background: '#fff',
    borderRadius: '16px',
    border: '1px solid #eee',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  countdownLabel: {
    fontSize: '13px',
    color: '#888',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  countdownTime: {
    fontSize: '38px',
    fontWeight: 800,
    color: '#7F77DD',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-1px',
  },
  hint: {
    fontSize: '14px',
    color: '#aaa',
  },
}
