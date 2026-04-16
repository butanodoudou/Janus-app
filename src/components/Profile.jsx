import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { QUESTIONS, CATEGORIES } from '../data/questions.js'
import { calcPct } from '../lib/utils.js'
import Comments from './Comments.jsx'

export default function Profile({ user, userId }) {
  const [stats, setStats] = useState(null)
  const [communityStats, setCommunityStats] = useState(null)
  const [history, setHistory] = useState([])
  const [selected, setSelected] = useState(null) // { question, choice, counts }

  const username = user?.user_metadata?.username

  useEffect(() => {
    async function load() {
      const TODAY = new Date().toISOString().slice(0, 10)

      const [userVotesRes, totalVotesRes] = await Promise.all([
        supabase.from('votes').select('question_id, choice, date, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('votes').select('user_id', { count: 'exact', head: false }),
      ])

      const uniqueUsers = new Set((totalVotesRes.data || []).map(v => v.user_id)).size
      setCommunityStats({ totalVotes: totalVotesRes.count || 0, uniqueUsers })

      const data = userVotesRes.data

      if (data !== undefined) {
        const total = (data || []).length
        const todayCount = (data || []).filter(v => v.date === TODAY).length
        setStats({ total, todayCount })

        const entries = (data || []).map(vote => {
          const question = QUESTIONS.find(q => q.id === vote.question_id)
          if (!question) return null
          return { vote, question }
        }).filter(Boolean)

        const questionIds = [...new Set((data || []).map(v => v.question_id))]
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

  return (
    <div style={styles.container}>
      <div style={styles.headingRow}>
        <h2 style={styles.heading}>{username || 'Mon profil'}</h2>
        {user && (
          <button style={styles.logoutBtn} onClick={() => supabase.auth.signOut()}>
            Déconnexion
          </button>
        )}
      </div>

      {communityStats && (
        <div style={styles.community}>
          <div style={styles.communityItem}>
            <span style={styles.communityValue}>{communityStats.uniqueUsers.toLocaleString('fr-FR')}</span>
            <span style={styles.communityLabel}>joueurs</span>
          </div>
          <div style={styles.communityDivider} />
          <div style={styles.communityItem}>
            <span style={styles.communityValue}>{communityStats.totalVotes.toLocaleString('fr-FR')}</span>
            <span style={styles.communityLabel}>réponses au total</span>
          </div>
        </div>
      )}

      <div style={{ ...styles.cards, gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <StatCard label="Dlemms répondus" value={stats.total} accent="#7F77DD" />
        <StatCard label="Aujourd'hui" value={stats.todayCount} accent="#D4537E" />
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
                onTap={() => setSelected({ question, choice: vote.choice, counts })}
              />
            ))}
          </div>
        </div>
      )}

      {user && (
        <button style={styles.userId} onClick={() => navigator.clipboard?.writeText(user.email)}>
          <span style={styles.userIdLabel}>{user.email}</span>
          <span style={styles.userIdValue}>Copier</span>
        </button>
      )}

      {/* Modale détail dlemm */}
      {selected && (
        <DetailModal
          question={selected.question}
          choice={selected.choice}
          counts={selected.counts}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function DetailModal({ question, choice, counts, onClose }) {
  const cat = CATEGORIES[question.category] || { label: question.category, color: '#7F77DD' }
  const { pctA, pctB, total } = calcPct(counts)

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div style={styles.handle} />

        <div style={styles.modalScroll}>
          {/* Header */}
          <div style={styles.modalHeader}>
            <span style={{ ...styles.badge, background: cat.color }}>{cat.label}</span>
            <span style={{ fontSize: '13px', color: cat.color, fontWeight: 700 }}>
              Tu as choisi {choice}
            </span>
          </div>

          {question.text && <p style={styles.modalQuestion}>{question.text}</p>}

          {/* Barres de résultats */}
          <div style={styles.modalBars}>
            {[
              { label: 'A', text: question.option_a, pct: pctA, chosen: choice === 'A' },
              { label: 'B', text: question.option_b, pct: pctB, chosen: choice === 'B' },
            ].map(opt => (
              <div key={opt.label} style={{
                ...styles.modalBar,
                borderColor: opt.chosen ? cat.color : '#e5e5e5',
                opacity: opt.chosen ? 1 : 0.6,
              }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '12px',
                  width: `${opt.pct}%`,
                  background: opt.chosen ? cat.color : '#f0f0f0',
                  opacity: 0.15,
                  transition: 'width 0.6s ease',
                }} />
                <span style={{
                  ...styles.modalBarLabel,
                  background: opt.chosen ? cat.color : '#e5e5e5',
                  color: opt.chosen ? '#fff' : '#888',
                }}>{opt.label}</span>
                <span style={styles.modalBarText}>{opt.text}</span>
                <span style={{ ...styles.modalBarPct, color: opt.chosen ? cat.color : '#bbb' }}>
                  {opt.pct}%
                </span>
              </div>
            ))}
          </div>

          <p style={styles.modalTotal}>
            {total.toLocaleString('fr-FR')} personne{total > 1 ? 's' : ''} ont répondu
          </p>

          {/* Commentaires */}
          <Comments
            questionId={question.id}
            userChoice={choice}
            categoryColor={cat.color}
          />
        </div>
      </div>
    </div>
  )
}

function HistoryCard({ question, choice, counts, onTap }) {
  const cat = CATEGORIES[question.category] || { label: question.category, color: '#7F77DD' }
  const { pctA, pctB, total } = calcPct(counts)
  const chosenPct = choice === 'A' ? pctA : pctB
  const otherPct = choice === 'A' ? pctB : pctA

  return (
    <button style={styles.historyCard} onClick={onTap}>
      <div style={styles.historyCardTop}>
        <span style={{ ...styles.badge, background: cat.color }}>{cat.label}</span>
        <div style={styles.historyCardRight}>
          <span style={styles.historyTotal}>{total.toLocaleString('fr-FR')} votes</span>
          <span style={{ ...styles.choiceLetter, color: cat.color }}>Choix {choice}</span>
        </div>
      </div>

      {question.text && <p style={styles.historyQuestion}>{question.text}</p>}

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

      <p style={styles.tapHint}>Appuie pour voir les commentaires →</p>
    </button>
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
  headingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontSize: '24px', fontWeight: 800, color: '#111' },
  logoutBtn: {
    background: 'none', border: '1px solid #e5e5e5', borderRadius: '8px',
    padding: '6px 12px', fontSize: '13px', color: '#888', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' },
  loader: {
    width: '32px', height: '32px',
    border: '3px solid #eee', borderTop: '3px solid #7F77DD',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  community: {
    display: 'flex', background: '#fff', borderRadius: '16px',
    padding: '16px', border: '1px solid #e5e5e5', alignItems: 'center',
  },
  communityItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },
  communityValue: { fontSize: '26px', fontWeight: 800, color: '#7F77DD' },
  communityLabel: { fontSize: '12px', color: '#aaa', fontWeight: 600 },
  communityDivider: { width: '1px', height: '36px', background: '#eee' },
  cards: { display: 'grid', gap: '12px' },
  card: {
    background: '#fff', borderRadius: '14px', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '4px',
  },
  cardValue: { fontSize: '28px', fontWeight: 800, lineHeight: 1 },
  cardLabel: { fontSize: '13px', color: '#888', fontWeight: 500 },
  historySection: { display: 'flex', flexDirection: 'column', gap: '14px' },
  historyHeading: { fontSize: '18px', fontWeight: 800, color: '#111' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  historyCard: {
    background: '#fff', borderRadius: '16px', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '10px',
    border: '1px solid #eee', cursor: 'pointer', textAlign: 'left',
    fontFamily: 'inherit', width: '100%',
  },
  historyCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  historyCardRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' },
  historyTotal: { fontSize: '11px', color: '#bbb', fontWeight: 600 },
  badge: { padding: '3px 10px', borderRadius: '20px', color: '#fff', fontSize: '11px', fontWeight: 700 },
  choiceLetter: { fontSize: '13px', fontWeight: 700 },
  historyQuestion: { fontSize: '14px', fontWeight: 700, color: '#111', lineHeight: 1.4 },
  barRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  barLabel: { fontSize: '12px', fontWeight: 800, color: '#888', width: '14px', flexShrink: 0 },
  barTrack: { flex: 1, height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '3px', transition: 'width 0.6s ease' },
  barPct: { fontSize: '12px', fontWeight: 700, width: '32px', textAlign: 'right', flexShrink: 0 },
  tapHint: { fontSize: '11px', color: '#ccc', textAlign: 'right', marginTop: '-4px' },
  userId: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', background: '#fff', borderRadius: '12px',
    border: '1px solid #e5e5e5', cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left',
  },
  userIdLabel: { fontSize: '13px', color: '#888', fontWeight: 500 },
  userIdValue: { fontSize: '12px', color: '#aaa', fontFamily: 'monospace' },

  // Modale
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
  },
  modal: {
    width: '100%', maxWidth: '430px', background: '#fafafa',
    borderRadius: '20px 20px 0 0', maxHeight: '88vh',
    display: 'flex', flexDirection: 'column',
  },
  handle: {
    width: '36px', height: '4px', background: '#ddd',
    borderRadius: '2px', margin: '12px auto 4px', flexShrink: 0,
  },
  modalScroll: {
    overflowY: 'auto', padding: '12px 20px 40px',
    display: 'flex', flexDirection: 'column', gap: '16px',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalQuestion: { fontSize: '20px', fontWeight: 800, color: '#111', lineHeight: 1.3 },
  modalBars: { display: 'flex', flexDirection: 'column', gap: '10px' },
  modalBar: {
    position: 'relative', overflow: 'hidden',
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '14px', background: '#fff', border: '2px solid',
    borderRadius: '12px', minHeight: '64px',
  },
  modalBarLabel: {
    flexShrink: 0, width: '30px', height: '30px', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 800, zIndex: 1,
  },
  modalBarText: { flex: 1, fontSize: '14px', fontWeight: 600, color: '#222', lineHeight: 1.4, zIndex: 1 },
  modalBarPct: { fontSize: '18px', fontWeight: 800, flexShrink: 0, zIndex: 1 },
  modalTotal: { fontSize: '13px', color: '#aaa', fontWeight: 600, textAlign: 'center' },
}
