import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { QUESTIONS, CATEGORIES } from '../data/questions.js'
import { calcStreak, STREAK_MILESTONES } from '../lib/utils.js'
import { calcVoteBadge, calcContribBadge, getCategoryColor, CATEGORY_KEYS, LEVEL_DOTS } from '../lib/badges.js'
import AuthScreen from './AuthScreen.jsx'

export default function Profile({ user, userId }) {
  const [stats, setStats] = useState(null)
  const [communityStats, setCommunityStats] = useState(null)
  const [history, setHistory] = useState([])
  const [contribCounts, setContribCounts] = useState({})
  const [selectingBadge, setSelectingBadge] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [deleteStep, setDeleteStep] = useState(0)

  const username = user?.user_metadata?.username
  const selectedBadge = user?.user_metadata?.selected_badge || null

  useEffect(() => {
    if (!user) return
    async function load() {
      const TODAY = new Date().toISOString().slice(0, 10)

      const [userVotesRes, totalVotesRes, submissionsRes] = await Promise.all([
        supabase.from('votes').select('question_id, choice, date, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('votes').select('user_id', { count: 'exact', head: false }),
        supabase.from('submissions').select('category, status').eq('user_id', userId),
      ])

      const uniqueUsers = new Set((totalVotesRes.data || []).map(v => v.user_id)).size
      setCommunityStats({ totalVotes: totalVotesRes.count || 0, uniqueUsers })

      const allSubs = submissionsRes.data || []
      const counts = {}
      for (const s of allSubs.filter(s => s.status === 'approved')) {
        counts[s.category] = (counts[s.category] || 0) + 1
      }
      setContribCounts(counts)

      const data = userVotesRes.data
      if (data !== undefined) {
        const total = (data || []).length
        const todayCount = (data || []).filter(v => v.date === TODAY).length
        const allDates = (data || []).map(v => v.date).filter(Boolean)
        setStats({ total, todayCount, streak: calcStreak(allDates) })

        // Historique minimal pour le calcul des badges (pas besoin des counts)
        const entries = (data || []).map(vote => {
          const question = QUESTIONS.find(q => q.id === vote.question_id)
          if (!question) return null
          return { vote, question }
        }).filter(Boolean)
        setHistory(entries)
      }
    }
    load()
  }, [userId])

  if (!user) {
    return (
      <AuthScreen
        title="Rejoins d·lemm"
        subtitle="Crée un compte pour sauvegarder ta progression et accéder à ton historique."
      />
    )
  }

  if (!stats) {
    return (
      <div style={styles.center}>
        <div style={styles.loader} />
      </div>
    )
  }

  const voteBadges = CATEGORY_KEYS.map(cat => calcVoteBadge(cat, history)).filter(Boolean)
  const contribBadges = CATEGORY_KEYS.map(cat => calcContribBadge(cat, contribCounts[cat] || 0)).filter(Boolean)

  async function handleDeleteAccount() {
    setDeleteStep(2)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('https://ngoaeixwijvddkhqpcij.supabase.co/functions/v1/delete-account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      await supabase.auth.signOut()
    } else {
      setDeleteStep(3)
    }
  }

  async function handleSelectBadge(badge) {
    if (selectingBadge) return
    setSelectingBadge(true)
    const newBadge = selectedBadge?.id === badge.id ? null : badge
    await supabase.auth.updateUser({ data: { selected_badge: newBadge } })
    setSelectingBadge(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.headingRow}>
        <div>
          <h2 style={styles.heading}>{username || 'Mon profil'}</h2>
          {selectedBadge && (
            <p style={{ ...styles.badgeTitle, color: getCategoryColor(selectedBadge.category) }}>
              {selectedBadge.label} {LEVEL_DOTS[selectedBadge.level]}
            </p>
          )}
        </div>
        {showLogoutConfirm ? (
          <div style={styles.logoutConfirm}>
            <span style={styles.logoutConfirmText}>Déconnexion ?</span>
            <button style={{ ...styles.logoutConfirmBtn, color: '#e53e3e' }} onClick={() => supabase.auth.signOut()}>Oui</button>
            <button style={styles.logoutConfirmBtn} onClick={() => setShowLogoutConfirm(false)}>Non</button>
          </div>
        ) : (
          <button style={styles.logoutBtn} onClick={() => setShowLogoutConfirm(true)}>
            Déconnexion
          </button>
        )}
      </div>

      <StreakCard streak={stats.streak} />

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

      <BadgesSection
        voteBadges={voteBadges}
        contribBadges={contribBadges}
        selectedBadgeId={selectedBadge?.id}
        onSelect={handleSelectBadge}
      />


      <button style={styles.userId} onClick={() => navigator.clipboard?.writeText(user.email)}>
        <span style={styles.userIdLabel}>{user.email}</span>
        <span style={styles.userIdValue}>Copier</span>
      </button>

      <DeleteAccountSection
        step={deleteStep}
        onStart={() => setDeleteStep(1)}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteStep(0)}
      />

    </div>
  )
}

function StreakCard({ streak }) {
  const { current, record } = streak
  const active = current >= 3
  const earned = STREAK_MILESTONES.filter(m => current >= m.days)
  const next = STREAK_MILESTONES.find(m => current < m.days)
  const prev = earned[earned.length - 1]

  return (
    <div style={{
      ...streakStyles.card,
      background: active ? '#fff9f0' : '#fff',
      borderColor: active ? '#FF6B1A30' : '#e5e5e5',
    }}>
      <div style={streakStyles.top}>
        <div style={streakStyles.left}>
          <span style={{
            fontSize: '40px',
            lineHeight: 1,
            display: 'inline-block',
            animation: active ? 'flicker 1.4s ease-in-out infinite' : 'none',
          }}>
            {current === 0 ? '🩶' : current < 3 ? '🔥' : prev?.emoji || '🔥'}
          </span>
          <div>
            <p style={{ ...streakStyles.days, color: active ? '#FF6B1A' : '#111' }}>
              {current} jour{current > 1 ? 's' : ''}
            </p>
            <p style={streakStyles.label}>
              {current === 0 ? 'Commence aujourd\'hui !' : current < 3 ? 'Continue !' : prev?.label}
            </p>
          </div>
        </div>
        {record > current && (
          <div style={streakStyles.record}>
            <p style={streakStyles.recordVal}>{record}</p>
            <p style={streakStyles.recordLabel}>record</p>
          </div>
        )}
      </div>

      {next && (
        <div style={streakStyles.progressRow}>
          <div style={streakStyles.progressTrack}>
            <div style={{
              ...streakStyles.progressFill,
              width: `${Math.min(100, (current / next.days) * 100)}%`,
              background: active ? '#FF6B1A' : '#7F77DD',
            }} />
          </div>
          <p style={streakStyles.progressLabel}>
            {next.emoji} {next.label} dans {next.days - current} jour{next.days - current > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {!next && current >= 100 && (
        <p style={{ ...streakStyles.progressLabel, textAlign: 'center', color: '#FF6B1A', fontWeight: 800 }}>
          💀 Tu es une légende
        </p>
      )}
    </div>
  )
}

const streakStyles = {
  card: {
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'background 0.3s',
  },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  left: { display: 'flex', alignItems: 'center', gap: '14px' },
  days: { fontSize: '26px', fontWeight: 800, lineHeight: 1 },
  label: { fontSize: '13px', color: '#888', fontWeight: 600, marginTop: '2px' },
  record: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },
  recordVal: { fontSize: '20px', fontWeight: 800, color: '#aaa' },
  recordLabel: { fontSize: '11px', color: '#ccc', fontWeight: 600, textTransform: 'uppercase' },
  progressRow: { display: 'flex', flexDirection: 'column', gap: '6px' },
  progressTrack: { height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '3px', transition: 'width 0.6s ease' },
  progressLabel: { fontSize: '12px', color: '#aaa', fontWeight: 600 },
}

const TOTAL_BADGES = CATEGORY_KEYS.length * 2 // 7 vote + 7 contrib

function BadgesSection({ voteBadges, contribBadges, selectedBadgeId, onSelect }) {
  const earned = voteBadges.length + contribBadges.length
  const hasAny = earned > 0

  return (
    <div style={styles.badgesSection}>
      <div style={styles.badgesHeader}>
        <h3 style={styles.historyHeading}>Mes badges</h3>
        <span style={styles.badgesCount}>{earned} / {TOTAL_BADGES}</span>
      </div>
      {!hasAny ? (
        <p style={styles.badgesEmpty}>
          Réponds à 5 dlemms par catégorie pour débloquer tes badges de vote !
        </p>
      ) : (
        <>
          {voteBadges.length > 0 && (
            <div style={styles.badgesGroup}>
              <p style={styles.badgesSubLabel}>Tendance de vote</p>
              <div style={styles.badgesGrid}>
                {voteBadges.map(badge => (
                  <BadgePill
                    key={badge.id}
                    badge={badge}
                    selected={badge.id === selectedBadgeId}
                    onSelect={() => onSelect(badge)}
                  />
                ))}
              </div>
            </div>
          )}
          {contribBadges.length > 0 && (
            <div style={styles.badgesGroup}>
              <p style={styles.badgesSubLabel}>Contributions</p>
              <div style={styles.badgesGrid}>
                {contribBadges.map(badge => (
                  <BadgePill
                    key={badge.id}
                    badge={badge}
                    selected={badge.id === selectedBadgeId}
                    onSelect={() => onSelect(badge)}
                  />
                ))}
              </div>
            </div>
          )}
          <p style={styles.badgesHint}>Appuie sur un badge pour l'utiliser comme titre de profil</p>
        </>
      )}
    </div>
  )
}

function badgeEarnedText(badge) {
  if (badge.type === 'contrib') {
    return `${badge.count} soumission${badge.count > 1 ? 's' : ''} approuvée${badge.count > 1 ? 's' : ''}`
  }
  if (badge.side === 'neutral') return `${badge.count} dlemms · trop imprévisible !`
  const sideLabel = badge.side === 'majority' ? 'avec la majorité' : 'contre la majorité'
  return `${badge.count} dlemms · ${badge.pct}% ${sideLabel}`
}

function BadgePill({ badge, selected, onSelect }) {
  const color = getCategoryColor(badge.category)
  const catLabel = CATEGORIES[badge.category]?.label || badge.category

  return (
    <button
      style={{
        ...styles.badgePill,
        borderColor: selected ? color : '#e5e5e5',
        background: selected ? `${color}18` : '#fff',
      }}
      onClick={onSelect}
    >
      <div style={styles.badgePillTop}>
        <span style={styles.badgePillCat}>{catLabel}</span>
        {selected && <span style={{ fontSize: '12px', color }}>✓</span>}
      </div>
      <p style={{ ...styles.badgePillName, color }}>{badge.label}</p>
      <p style={{ ...styles.badgePillDots, color: selected ? color : '#ccc' }}>
        {LEVEL_DOTS[badge.level]}
      </p>
      <p style={styles.badgePillHow}>{badgeEarnedText(badge)}</p>
    </button>
  )
}

function DeleteAccountSection({ step, onStart, onConfirm, onCancel }) {
  if (step === 0) {
    return (
      <button style={deleteStyles.trigger} onClick={onStart}>
        Supprimer mon compte et mes données
      </button>
    )
  }
  if (step === 1) {
    return (
      <div style={deleteStyles.box}>
        <p style={deleteStyles.warning}>
          ⚠️ Cette action est irréversible. Tous tes votes, soumissions et ton compte seront définitivement supprimés.
        </p>
        <div style={deleteStyles.btns}>
          <button style={deleteStyles.cancelBtn} onClick={onCancel}>Annuler</button>
          <button style={deleteStyles.confirmBtn} onClick={onConfirm}>Oui, supprimer</button>
        </div>
      </div>
    )
  }
  if (step === 2) {
    return <p style={deleteStyles.loading}>Suppression en cours…</p>
  }
  return <p style={deleteStyles.error}>Une erreur est survenue. Réessaie ou contacte le support.</p>
}

const deleteStyles = {
  trigger: {
    background: 'none', border: 'none', color: '#ccc', fontSize: '12px',
    fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
    textDecoration: 'underline', alignSelf: 'center', padding: '4px 0',
  },
  box: {
    background: '#fff', border: '1.5px solid #e53e3e22', borderRadius: '14px',
    padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px',
  },
  warning: { fontSize: '13px', color: '#666', lineHeight: 1.5 },
  btns: { display: 'flex', gap: '10px' },
  cancelBtn: {
    flex: 1, padding: '12px', background: '#f4f4f4', border: 'none',
    borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', color: '#444',
  },
  confirmBtn: {
    flex: 1, padding: '12px', background: '#e53e3e', border: 'none',
    borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', color: '#fff',
  },
  loading: { fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '8px 0' },
  error: { fontSize: '13px', color: '#e53e3e', textAlign: 'center', padding: '8px 0' },
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
  headingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  heading: { fontSize: '24px', fontWeight: 800, color: '#111', margin: 0 },
  badgeTitle: { fontSize: '14px', fontWeight: 700, marginTop: '4px' },
  logoutBtn: {
    background: 'none', border: '1px solid #e5e5e5', borderRadius: '8px',
    padding: '6px 12px', fontSize: '13px', color: '#888', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
  },
  logoutConfirm: {
    display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
  },
  logoutConfirmText: { fontSize: '13px', color: '#888', fontWeight: 600 },
  logoutConfirmBtn: {
    background: 'none', border: '1px solid #e5e5e5', borderRadius: '8px',
    padding: '4px 10px', fontSize: '13px', color: '#444', fontWeight: 700,
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

  // Badges
  badgesSection: { display: 'flex', flexDirection: 'column', gap: '14px' },
  badgesHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badgesCount: { fontSize: '13px', fontWeight: 700, color: '#aaa' },
  badgesGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  badgesSubLabel: {
    fontSize: '11px', color: '#aaa', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0,
  },
  badgesGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' },
  badgePill: {
    background: '#fff', border: '2px solid #e5e5e5', borderRadius: '12px',
    padding: '12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    width: '100%', transition: 'border-color 0.2s, background 0.2s',
  },
  badgePillTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  badgePillCat: { fontSize: '10px', color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' },
  badgePillName: { fontSize: '14px', fontWeight: 800, margin: 0, lineHeight: 1.2 },
  badgePillDots: { fontSize: '11px', fontWeight: 700, margin: '4px 0 0', letterSpacing: '1px' },
  badgePillHow: { fontSize: '10px', color: '#bbb', fontWeight: 500, margin: '4px 0 0', lineHeight: 1.3 },
  badgesEmpty: { fontSize: '13px', color: '#aaa', fontWeight: 500 },
  badgesHint: { fontSize: '11px', color: '#ccc', fontWeight: 500, textAlign: 'center', margin: 0 },

  historyHeading: { fontSize: '18px', fontWeight: 800, color: '#111', margin: 0 },
  userId: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', background: '#fff', borderRadius: '12px',
    border: '1px solid #e5e5e5', cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left',
  },
  userIdLabel: { fontSize: '13px', color: '#888', fontWeight: 500 },
  userIdValue: { fontSize: '12px', color: '#aaa', fontFamily: 'monospace' },
}
