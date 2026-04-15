import { useState, useEffect } from 'react'
import QuestionCard from './QuestionCard.jsx'
import DailyLimitScreen from './DailyLimitScreen.jsx'
import { QUESTIONS } from '../data/questions.js'
import { getUserId } from '../lib/userId.js'
import { supabase } from '../lib/supabase.js'

const TODAY = new Date().toISOString().slice(0, 10)
const DAILY_LIMIT = 5
const TOTAL_THRESHOLD = 30

export default function Feed() {
  const [votedIds, setVotedIds] = useState(null)
  const [allQuestions, setAllQuestions] = useState([])
  const [todayCount, setTodayCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [index, setIndex] = useState(0)

  const userId = getUserId()

  useEffect(() => {
    async function load() {
      // Charge votes et soumissions approuvées en parallèle
      const [votesRes, submissionsRes] = await Promise.all([
        supabase.from('votes').select('question_id, date').eq('user_id', userId),
        supabase.from('submissions').select('id, category, text, option_a, option_b').eq('status', 'approved').order('created_at', { ascending: true }),
      ])

      const ids = new Set()
      let today = 0
      if (votesRes.data) {
        votesRes.data.forEach(v => ids.add(v.question_id))
        today = votesRes.data.filter(v => v.date === TODAY).length
        setTodayCount(today)
        setTotalCount(votesRes.data.length)
      }
      setVotedIds(ids)

      // Fusionne questions fixes + soumissions approuvées
      const approved = (submissionsRes.data || []).map(s => ({
        id: s.id,
        category: s.category,
        text: s.text || '',
        option_a: s.option_a,
        option_b: s.option_b,
      }))
      setAllQuestions([...QUESTIONS, ...approved])
    }
    load()
  }, [])

  if (votedIds === null) {
    return (
      <div style={styles.center}>
        <div style={styles.loader} />
        <p style={styles.loadingText}>Chargement des dlemms…</p>
      </div>
    )
  }

  const limitActive = totalCount >= TOTAL_THRESHOLD && todayCount >= DAILY_LIMIT
  if (limitActive) return <DailyLimitScreen />

  const queue = allQuestions.filter(q => !votedIds.has(q.id))

  if (queue.length === 0) {
    return (
      <div style={styles.center}>
        <p style={styles.emptyEmoji}>🎉</p>
        <p style={styles.emptyTitle}>Tous les dlemms répondus !</p>
        <p style={styles.emptyText}>Reviens bientôt pour de nouvelles questions.</p>
      </div>
    )
  }

  const question = queue[Math.min(index, queue.length - 1)]

  function handleVoted(questionId) {
    setVotedIds(prev => new Set([...prev, questionId]))
    setTodayCount(prev => prev + 1)
    setTotalCount(prev => prev + 1)
  }

  function handleNext() {
    const nextIndex = index + 1
    setIndex(nextIndex >= queue.length - 1 ? 0 : nextIndex)
  }

  return (
    <QuestionCard
      key={question.id}
      question={question}
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
  emptyEmoji: {
    fontSize: '52px',
    lineHeight: 1,
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#111',
  },
  emptyText: {
    fontSize: '14px',
    color: '#888',
    maxWidth: '240px',
  },
  loadingText: {
    fontSize: '13px',
    color: '#aaa',
    marginTop: '4px',
  },
}
