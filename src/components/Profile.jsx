import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { getUserId } from '../lib/userId.js'

const TODAY = new Date().toISOString().slice(0, 10)
const DAILY_LIMIT = 5
const TOTAL_THRESHOLD = 30

export default function Profile() {
  const [stats, setStats] = useState(null)
  const userId = getUserId()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('votes')
        .select('date')
        .eq('user_id', userId)

      if (data) {
        const total = data.length
        const todayCount = data.filter(v => v.date === TODAY).length
        const limitActive = total >= TOTAL_THRESHOLD
        const remaining = limitActive ? Math.max(0, DAILY_LIMIT - todayCount) : null
        setStats({ total, todayCount, remaining, limitActive })
      }
    }
    load()
  }, [])

  if (!stats) {
    return (
      <div style={styles.center}>
        <div style={styles.loader} />
      </div>
    )
  }

  const progressPct = Math.min(100, Math.round((stats.total / 100) * 100))

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Mon profil</h2>

      <div style={styles.cards}>
        <StatCard label="Dilemmes répondus" value={stats.total} accent="#7F77DD" />
        <StatCard label="Aujourd'hui" value={stats.todayCount} accent="#D4537E" />
        {stats.limitActive && (
          <StatCard
            label="Restants aujourd'hui"
            value={stats.remaining}
            accent="#1D9E75"
          />
        )}
      </div>

      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <span style={styles.progressLabel}>Progression</span>
          <span style={styles.progressCount}>{stats.total} / 100</span>
        </div>
        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progressPct}%`,
            }}
          />
        </div>
        {!stats.limitActive && (
          <p style={styles.progressHint}>
            Encore {TOTAL_THRESHOLD - stats.total} réponses pour débloquer la limite quotidienne
          </p>
        )}
      </div>

      <div style={styles.userId}>
        <span style={styles.userIdLabel}>ID anonyme</span>
        <span style={styles.userIdValue}>{userId.slice(0, 8)}…</span>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ ...styles.card, borderTop: `3px solid ${accent}` }}>
      <p style={{ ...styles.cardValue, color: accent }}>{value}</p>
      <p style={styles.cardLabel}>{label}</p>
    </div>
  )
}

const styles = {
  container: {
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#111',
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '60vh',
  },
  loader: {
    width: '32px',
    height: '32px',
    border: '3px solid #eee',
    borderTop: '3px solid #7F77DD',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '12px',
  },
  card: {
    background: '#fff',
    borderRadius: '14px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  cardValue: {
    fontSize: '36px',
    fontWeight: 800,
    lineHeight: 1,
  },
  cardLabel: {
    fontSize: '13px',
    color: '#888',
    fontWeight: 500,
  },
  progressSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#111',
  },
  progressCount: {
    fontSize: '13px',
    color: '#888',
    fontWeight: 600,
  },
  progressTrack: {
    height: '8px',
    background: '#eee',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#7F77DD',
    borderRadius: '4px',
    transition: 'width 0.6s ease',
  },
  progressHint: {
    fontSize: '12px',
    color: '#aaa',
  },
  userId: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #eee',
  },
  userIdLabel: {
    fontSize: '13px',
    color: '#888',
    fontWeight: 500,
  },
  userIdValue: {
    fontSize: '13px',
    color: '#aaa',
    fontFamily: 'monospace',
  },
}
