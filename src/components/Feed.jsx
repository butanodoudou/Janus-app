import { useState, useEffect } from 'react'
import QuestionCard from './QuestionCard.jsx'
import AuthScreen from './AuthScreen.jsx'
import { QUESTIONS } from '../data/questions.js'
import { supabase } from '../lib/supabase.js'

const TODAY = new Date().toISOString().slice(0, 10)
const GUEST_LIMIT = 5

export default function Feed({ userId, isGuest }) {
  const [votedIds, setVotedIds] = useState(null)
  const [allQuestions, setAllQuestions] = useState([])
  const [current, setCurrent] = useState(null)
  const [guestCount, setGuestCount] = useState(() =>
    isGuest ? parseInt(localStorage.getItem('dlemm_guest_count') || '0', 10) : 0
  )

  useEffect(() => {
    async function load() {
      const [votesRes, submissionsRes] = await Promise.all([
        supabase.from('votes').select('question_id').eq('user_id', userId),
        supabase.from('submissions').select('id, category, text, option_a, option_b').eq('status', 'approved').order('created_at', { ascending: true }),
      ])

      const ids = new Set()
      if (votesRes.data) votesRes.data.forEach(v => ids.add(v.question_id))
      setVotedIds(ids)

      const approved = (submissionsRes.data || []).map(s => ({
        id: s.id,
        category: s.category,
        text: s.text || '',
        option_a: s.option_a,
        option_b: s.option_b,
        _community: true,
      }))

      const merged = [...QUESTIONS, ...approved]
      for (let i = merged.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[merged[i], merged[j]] = [merged[j], merged[i]]
      }
      setAllQuestions(merged)
    }
    load()
  }, [userId])

  // Initialise la question courante une fois les données chargées
  useEffect(() => {
    if (allQuestions.length > 0 && votedIds !== null && !current) {
      const first = allQuestions.find(q => !votedIds.has(q.id))
      if (first) setCurrent(first)
    }
  }, [allQuestions, votedIds])

  if (votedIds === null) {
    return (
      <div style={styles.center}>
        <div style={styles.loader} />
        <p style={styles.loadingText}>Chargement des dlemms…</p>
      </div>
    )
  }

  if (isGuest && guestCount >= GUEST_LIMIT && votedIds !== null) {
    return (
      <div style={styles.wall}>
        <p style={styles.wallEmoji}>🔒</p>
        <AuthScreen
          title="Tu as répondu à 5 dlemms !"
          subtitle="Crée un compte gratuit pour continuer sans limite."
        />
      </div>
    )
  }

  if (!current) {
    return (
      <div style={styles.center}>
        <p style={styles.emptyEmoji}>🎉</p>
        <p style={styles.emptyTitle}>Tous les dlemms répondus !</p>
        <p style={styles.emptyText}>Reviens bientôt pour de nouvelles questions.</p>
      </div>
    )
  }

  function handleVoted(questionId) {
    setVotedIds(prev => new Set([...prev, questionId]))
    if (isGuest) {
      const next = guestCount + 1
      setGuestCount(next)
      localStorage.setItem('dlemm_guest_count', next)
    }
  }

  function handleNext() {
    const next = allQuestions.find(q => !votedIds.has(q.id) && q.id !== current.id)
    setCurrent(next || null)
  }

  return (
    <QuestionCard
      key={current.id}
      question={current}
      userId={userId}
      onVoted={handleVoted}
      onNext={handleNext}
    />
  )
}

const styles = {
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'calc(100vh - 130px)',
    padding: '24px',
    gap: '10px',
    textAlign: 'center',
  },
  loader: {
    width: '32px',
    height: '32px',
    border: '3px solid #eee',
    borderTop: '3px solid #7F77DD',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '13px',
    color: '#aaa',
    marginTop: '4px',
  },
  emptyEmoji: { fontSize: '52px', lineHeight: 1 },
  emptyTitle: { fontSize: '20px', fontWeight: 800, color: '#111' },
  emptyText: { fontSize: '14px', color: '#888', maxWidth: '240px' },
  wall: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  wallEmoji: {
    fontSize: '48px',
    textAlign: 'center',
    marginTop: '40px',
  },
}
