import { useState, useEffect, useRef, memo } from 'react'
import { supabase } from '../lib/supabase.js'
import { CATEGORIES } from '../data/questions.js'
import { calcPct } from '../lib/utils.js'
import Comments from './Comments.jsx'

const TODAY = new Date().toISOString().slice(0, 10)

export default function QuestionCard({ question, userId, onVoted, onNext }) {
  const [voted, setVoted] = useState(null)
  const [counts, setCounts] = useState({ A: 0, B: 0 })
  const afterVoteRef = useRef(null)

  const category = CATEGORIES[question.category] || { label: question.category, color: '#7F77DD' }
  const { pctA, pctB, total } = calcPct(counts)

  async function handleVote(choice) {
    if (voted) return

    // Optimistic update — UI réagit immédiatement
    setCounts(prev => ({ ...prev, [choice]: prev[choice] + 1 }))
    setVoted(choice)
    onVoted(question.id)

    // Scroll vers les commentaires après un court délai (laisse le temps au DOM)
    setTimeout(() => {
      afterVoteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 350)

    // Sync Supabase en arrière-plan
    await supabase.from('votes').insert({
      user_id: userId,
      question_id: question.id,
      choice,
      date: TODAY,
    })

    // Récupère les vrais compteurs
    const { data } = await supabase
      .from('votes')
      .select('choice')
      .eq('question_id', question.id)

    if (data && data.length > 0) {
      const A = data.filter(v => v.choice === 'A').length
      const B = data.filter(v => v.choice === 'B').length
      setCounts({ A, B })
    }
  }

  function handleShare() {
    const text = [
      `d·lemm — ${question.text}`,
      '',
      `A: ${question.option_a}`,
      `B: ${question.option_b}`,
      '',
      `${pctA}% ont choisi A · ${pctB}% ont choisi B`,
    ].join('\n')

    if (navigator.share) {
      navigator.share({ title: 'd·lemm', text })
    } else {
      navigator.clipboard?.writeText(text)
    }
  }

  return (
    <div style={styles.card}>
      <div style={{ ...styles.badge, background: category.color }}>
        {category.label}
      </div>

      {question.text ? <p style={styles.question}>{question.text}</p> : null}

      <div style={styles.buttons}>
        <VoteButton
          label="A"
          text={question.option_a}
          voted={voted}
          isChosen={voted === 'A'}
          pct={pctA}
          color={category.color}
          onClick={() => handleVote('A')}
        />
        <VoteButton
          label="B"
          text={question.option_b}
          voted={voted}
          isChosen={voted === 'B'}
          pct={pctB}
          color={category.color}
          onClick={() => handleVote('B')}
        />
      </div>

      {voted && (
        <div ref={afterVoteRef} style={styles.afterVote}>
          <div style={styles.actionRow}>
            <p style={styles.totalVotes}>
              {total.toLocaleString('fr-FR')} personne{total > 1 ? 's' : ''} ont répondu
            </p>
            <div style={styles.actionBtns}>
              <button style={styles.shareBtn} onClick={handleShare}>
                <ShareIcon />
                Partager
              </button>
              <button
                style={{ ...styles.nextBtn, background: category.color }}
                onClick={onNext}
              >
                Suivant
                <ChevronIcon />
              </button>
            </div>
          </div>

          <Comments
            questionId={question.id}
            userChoice={voted}
            categoryColor={category.color}
            userId={userId}
          />
        </div>
      )}
    </div>
  )
}

const VoteButton = memo(function VoteButton({ label, text, voted, isChosen, pct, color, onClick }) {
  const [displayPct, setDisplayPct] = useState(0)

  useEffect(() => {
    if (voted) {
      const t = setTimeout(() => setDisplayPct(pct), 60)
      return () => clearTimeout(t)
    } else {
      setDisplayPct(0)
    }
  }, [voted, pct])

  return (
    <button
      style={{
        ...styles.voteBtn,
        borderColor: voted
          ? isChosen ? color : '#e5e5e5'
          : '#e5e5e5',
        cursor: voted ? 'default' : 'pointer',
        opacity: voted && !isChosen ? 0.55 : 1,
      }}
      onClick={onClick}
      disabled={!!voted}
    >
      {/* Animated background fill */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '14px',
          width: `${displayPct}%`,
          background: isChosen ? color : '#f0f0f0',
          opacity: voted ? 0.18 : 0,
          transition: 'width 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      <span
        style={{
          ...styles.voteBtnLabel,
          background: voted && isChosen ? color : voted ? '#e5e5e5' : '#111',
          color: voted && isChosen ? '#fff' : voted ? '#888' : '#fff',
        }}
      >
        {label}
      </span>

      <span style={styles.voteBtnText}>{text}</span>

      {voted && (
        <span style={{ ...styles.votePct, color: isChosen ? color : '#bbb' }}>
          {displayPct}%
        </span>
      )}
    </button>
  )
})

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

const styles = {
  card: {
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    minHeight: 'calc(100vh - 130px)',
  },
  badge: {
    alignSelf: 'flex-start',
    padding: '5px 14px',
    borderRadius: '20px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
  },
  question: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#111',
    lineHeight: 1.3,
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flex: 1,
  },
  voteBtn: {
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: '#fff',
    border: '2px solid',
    borderRadius: '14px',
    textAlign: 'left',
    fontFamily: 'inherit',
    transition: 'opacity 0.2s, border-color 0.2s',
    minHeight: '70px',
  },
  voteBtnLabel: {
    flexShrink: 0,
    width: '34px',
    height: '34px',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 800,
    transition: 'background 0.2s, color 0.2s',
    zIndex: 1,
  },
  voteBtnText: {
    flex: 1,
    fontSize: '15px',
    fontWeight: 600,
    color: '#222',
    lineHeight: 1.4,
    zIndex: 1,
  },
  votePct: {
    fontSize: '20px',
    fontWeight: 800,
    flexShrink: 0,
    fontVariantNumeric: 'tabular-nums',
    zIndex: 1,
    transition: 'color 0.2s',
  },
  afterVote: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  actionRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  totalVotes: {
    fontSize: '13px',
    color: '#aaa',
    fontWeight: 600,
    textAlign: 'center',
  },
  actionBtns: {
    display: 'flex',
    gap: '10px',
  },
  shareBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '14px 18px',
    background: '#7F77DD',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  nextBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '14px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}
