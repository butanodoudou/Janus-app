import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { getUserId } from '../lib/userId.js'
import { QUESTIONS, CATEGORIES } from '../data/questions.js'

const TODAY = new Date().toISOString().slice(0, 10)
const DAILY_LIMIT = 5
const TOTAL_THRESHOLD = 30

export default function Profile() {
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const userId = getUserId()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('votes')
        .select('question_id, choice, date, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (data) {
        const total = data.length
        const todayCount = data.filter(v => v.date === TODAY).length
        const limitActive = total >= TOTAL_THRESHOLD
        const remaining = limitActive ? Math.max(0, DAILY_LIMIT - todayCount) : null
        setStats({ total, todayCount, remaining, limitActive })

        // Construit l'historique en joignant avec les questions locales
        const entries = data.map(vote => {
          const question = QUESTIONS.find(q => q.id === vote.question_id)
          if (!question) return null
          return { vote, question }
        }).filter(Boolean)

        // Pour chaque question, récupère les compteurs globaux
        const questionIds = [...new Set(data.map(v => v.question_id))]
        const { data: allVotes } = await supabase
          .from('votes')
          .select('question_id, choice')
          .in('question_id', questionIds)

        const countsMap = {}
        if (allVotes) {
          for (const v of allVotes) {
            if (!countsMap[v.question_id]) countsMap[v.question_id] = { A: 0, B: 0 }
            countsMap[v.question_id][v.choice]++
          }
        }

        setHistory(entries.map(e => ({
          ...e,
          counts: countsMap[e.question.id] || { A: 1, B: 0 },
        })))
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
          <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
        </div>
        {!stats.limitActive && stats.total < TOTAL_THRESHOLD && (
          <p style={styles.progressHint}>
            Encore {TOTAL_THRESHOLD - stats.total} réponses pour débloquer la limite quotidienne
          </p>
        )}
      </div>

      {history.length > 0 && (
        <div style={styles.historySection}>
          <h3 style={styles.historyHeading}>Mes réponses</h3>
          <div style={styles.historyList}>
            {history.map(({ vote, question, counts }) => (
              <HistoryCard
                key={vote.question_id}
                question={question}
                choice={vote.choice}
                counts={counts}
              />
            ))}
          </div>
        </div>
      )}

      <div style={styles.userId}>
        <span style={styles.userIdLabel}>ID anonyme</span>
        <span style={styles.userIdValue}>{userId.slice(0, 8)}…</span>
      </div>
    </div>
  )
}

function HistoryCard({ question, choice, counts }) {
  const cat = CATEGORIES[question.category] || { label: question.category, color: '#7F77DD' }
  const total = counts.A + counts.B
  const pctA = total > 0 ? Math.round((counts.A / total) * 100) : 50
  const pctB = total > 0 ? 100 - pctA : 50

  const chosenOption = choice === 'A' ? question.option_a : question.option_b
  const chosenPct = choice === 'A' ? pctA : pctB
  const otherPct = choice === 'A' ? pctB : pctA

  return (
    <div style={styles.historyCard}>
      <div style={styles.historyCardTop}>
        <span style={{ ...styles.badge, background: cat.color }}>{cat.label}</span>
        <span style={{ ...styles.choiceBadge, background: cat.color }}>
          Tu as choisi {choice}
        </span>
      </div>

      <p style={styles.historyQuestion}>{question.text}</p>

      <div style={styles.barRow}>
        <span style={styles.barLabel}>{choice}</span>
        <div style={styles.barTrack}>
          <div style={{ ...styles.barFill, width: `${chosenPct}%`, background: cat.color }} />
        </div>
        <span style={{ ...styles.barPct, color: cat.color }}>{chosenPct}%</span>
      </div>

      <div style={styles.barRow}>
        <span style={styles.barLabel}>{choice === 'A' ? 'B' : 'A'}</span>
        <div style={styles.barTrack}>
          <div style={{ ...styles.barFill, width: `${otherPct}%`, background: '#e0e0e0' }} />
        </div>
        <span style={{ ...styles.barPct, color: '#aaa' }}>{otherPct}%</span>
      </div>

      <p style={styles.historyOptionText}>{chosenOption}</p>
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
  historySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  historyHeading: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#111',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  historyCard: {
    background: '#fff',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    border: '1px solid #eee',
  },
  historyCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    padding: '3px 10px',
    borderRadius: '20px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
  },
  choiceBadge: {
    padding: '3px 10px',
    borderRadius: '20px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    opacity: 0.75,
  },
  historyQuestion: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#111',
    lineHeight: 1.4,
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  barLabel: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#888',
    width: '14px',
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: '6px',
    background: '#f0f0f0',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.6s ease',
  },
  barPct: {
    fontSize: '12px',
    fontWeight: 700,
    width: '32px',
    textAlign: 'right',
    flexShrink: 0,
  },
  historyOptionText: {
    fontSize: '12px',
    color: '#888',
    lineHeight: 1.4,
    fontStyle: 'italic',
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
