import { useState, useEffect, useRef, memo, useMemo } from 'react'
import { supabase } from '../lib/supabase.js'
import { CATEGORIES } from '../data/questions.js'
import { calcPct } from '../lib/utils.js'
import { shareResult } from '../lib/share.js'
import Comments from './Comments.jsx'

const TODAY = new Date().toISOString().slice(0, 10)
const THRESHOLD = 90

export default function QuestionCard({ question, userId, userBadge, onVoted, onNext }) {
  const [voted, setVoted] = useState(null)
  const [counts, setCounts] = useState({ A: 0, B: 0 })
  const [validation, setValidation] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [shareImageUrl, setShareImageUrl] = useState(null)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const afterVoteRef = useRef(null)
  const startXRef = useRef(null)
  const isDraggingRef = useRef(false)
  const currentDragXRef = useRef(0)
  const triggerVoteRef = useRef(null)

  // Swipe hint animation au premier lancement
  useEffect(() => {
    if (localStorage.getItem('dlemm_swipe_shown')) return
    const t1 = setTimeout(() => setDragX(30), 800)
    const t2 = setTimeout(() => setDragX(0), 1200)
    const t3 = setTimeout(() => localStorage.setItem('dlemm_swipe_shown', '1'), 1400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  // Randomise l'ordre A/B pour éviter le biais de position
  const flipped = useMemo(() => Math.random() < 0.5, [question.id])
  const displayA = flipped ? question.option_b : question.option_a
  const displayB = flipped ? question.option_a : question.option_b
  // Reconvertit le choix affiché (A/B) en choix réel (option_a/option_b)
  function toRealChoice(displayChoice) {
    if (!flipped) return displayChoice
    return displayChoice === 'A' ? 'B' : 'A'
  }

  const category = CATEGORIES[question.category] || { label: question.category, color: '#7F77DD' }
  const { pctA, pctB, total } = calcPct(flipped ? { A: counts.B, B: counts.A } : counts)
  const dragProgress = Math.max(-1, Math.min(1, dragX / THRESHOLD))
  const aOpacity = Math.max(0, dragProgress)
  const bOpacity = Math.max(0, -dragProgress)

  async function triggerVote(displayChoice) {
    if (voted) return
    setDragX(displayChoice === 'A' ? 600 : -600)
    isDraggingRef.current = false
    setIsDragging(false)
    await new Promise(r => setTimeout(r, 260))
    await castVote(displayChoice)
    setDragX(0)
  }
  triggerVoteRef.current = triggerVote

  async function castVote(displayChoice) {
    if (voted) return
    const realChoice = toRealChoice(displayChoice)
    setCounts(prev => ({ ...prev, [realChoice]: prev[realChoice] + 1 }))
    setVoted(displayChoice)
    onVoted(question.id)

    setTimeout(() => {
      afterVoteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 350)

    await supabase.from('votes').insert({
      user_id: userId,
      question_id: question.id,
      choice: realChoice,
      date: TODAY,
    })

    const { data } = await supabase
      .from('votes')
      .select('choice')
      .eq('question_id', question.id)

    if (data && data.length > 0) {
      setCounts({
        A: data.filter(v => v.choice === 'A').length,
        B: data.filter(v => v.choice === 'B').length,
      })
    }
  }

  // Window-level mouse events so drag doesn't break on fast moves
  useEffect(() => {
    function onMouseMove(e) {
      if (!isDraggingRef.current) return
      const dx = e.clientX - startXRef.current
      currentDragXRef.current = dx
      setDragX(dx)
    }
    function onMouseUp() {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      setIsDragging(false)
      const dx = currentDragXRef.current
      if (dx > THRESHOLD) triggerVoteRef.current('A')
      else if (dx < -THRESHOLD) triggerVoteRef.current('B')
      else setDragX(0)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  function handleMouseDown(e) {
    if (voted) return
    e.preventDefault()
    startXRef.current = e.clientX
    currentDragXRef.current = 0
    isDraggingRef.current = true
    setIsDragging(true)
  }

  function handleTouchStart(e) {
    if (voted) return
    startXRef.current = e.touches[0].clientX
    currentDragXRef.current = 0
    isDraggingRef.current = true
    setIsDragging(true)
  }

  function handleTouchMove(e) {
    if (!isDraggingRef.current) return
    const dx = e.touches[0].clientX - startXRef.current
    currentDragXRef.current = dx
    setDragX(dx)
  }

  function handleTouchEnd() {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    setIsDragging(false)
    const dx = currentDragXRef.current
    if (Math.abs(dx) < 8) { setDragX(0); return } // tap, not swipe
    if (dx > THRESHOLD) triggerVoteRef.current('A')
    else if (dx < -THRESHOLD) triggerVoteRef.current('B')
    else setDragX(0)
  }

  async function handleShare() {
    if (sharing) return
    setSharing(true)
    const url = await shareResult({ question, counts, choice: voted ? toRealChoice(voted) : 'A' })
    if (url) setShareImageUrl(url)
    setSharing(false)
  }

  const cardStyle = {
    ...styles.card,
    transform: voted ? 'none' : `translateX(${dragX}px) rotate(${dragX * 0.025}deg)`,
    transition: isDragging
      ? 'none'
      : Math.abs(dragX) > THRESHOLD
        ? 'transform 0.26s cubic-bezier(0.4, 0, 1, 1)'
        : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    cursor: voted ? 'default' : isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
  }

  return (
    <div style={styles.wrapper}>
      <div
        style={cardStyle}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe overlays */}
        {!voted && (
          <>
            <div style={{
              ...styles.swipeOverlay,
              background: `linear-gradient(to left, ${category.color}35, transparent)`,
              opacity: aOpacity,
            }} />
            <div style={{
              ...styles.swipeOverlay,
              background: `linear-gradient(to right, ${category.color}35, transparent)`,
              opacity: bOpacity,
            }} />

            {/* Stamps */}
            <div style={{
              ...styles.stamp,
              right: 20, left: 'auto',
              borderColor: category.color,
              color: category.color,
              opacity: aOpacity,
              transform: `rotate(-8deg) scale(${0.7 + aOpacity * 0.3})`,
            }}>A</div>
            <div style={{
              ...styles.stamp,
              left: 20, right: 'auto',
              borderColor: category.color,
              color: category.color,
              opacity: bOpacity,
              transform: `rotate(8deg) scale(${0.7 + bOpacity * 0.3})`,
            }}>B</div>
          </>
        )}

        {/* Category */}
        <div style={{ ...styles.categoryBadge, background: category.color }}>
          {category.label}
        </div>

        {question.text && <p style={styles.question}>{question.text}</p>}

        {/* Pre-vote: options display */}
        {!voted && (
          <>
            <div style={styles.options}>
              <div
                style={styles.option}
                onClick={() => triggerVoteRef.current('A')}
              >
                <span style={{ ...styles.optionLabel, background: category.color, color: '#fff' }}>A</span>
                <span style={styles.optionText}>{displayA}</span>
              </div>

              <div style={styles.orRow}>
                <div style={styles.orLine} />
                <span style={styles.orText}>ou</span>
                <div style={styles.orLine} />
              </div>

              <div
                style={styles.option}
                onClick={() => triggerVoteRef.current('B')}
              >
                <span style={{ ...styles.optionLabel, background: '#111', color: '#fff' }}>B</span>
                <span style={styles.optionText}>{displayB}</span>
              </div>
            </div>

            <div style={styles.swipeHint}>
              <span>← B</span>
              <span style={{ color: '#ddd' }}>·</span>
              <span>A →</span>
            </div>
          </>
        )}

        {/* Post-vote: results */}
        {voted && (
          <>
            <div style={styles.results}>
              <ResultBar label="A" text={displayA} pct={pctA} chosen={voted === 'A'} color={category.color} />
              <ResultBar label="B" text={displayB} pct={pctB} chosen={voted === 'B'} color={category.color} />
            </div>

            <div ref={afterVoteRef} style={styles.afterVote}>
              <p style={styles.totalVotes}>
                <span style={{ color: category.color, fontWeight: 800, fontSize: '16px' }}>
                  {voted === 'A' ? pctA : pctB}%
                </span>
                {' '}des gens ont choisi comme toi · {total.toLocaleString('fr-FR')} votes
              </p>
              <div style={styles.actionBtns}>
                <button
                  style={{ ...styles.shareBtn, opacity: sharing ? 0.6 : 1 }}
                  onClick={handleShare}
                  disabled={sharing}
                  title="Partager"
                  aria-label="Partager"
                >
                  {sharing ? '…' : <ShareIcon />}
                </button>
                <button style={{ ...styles.nextBtn, background: category.color }} onClick={onNext}>
                  Suivant <ChevronIcon />
                </button>
              </div>

              <ValidationRow
                questionId={question.id}
                userId={userId}
                validation={validation}
                onValidate={setValidation}
              />

              <Comments
                questionId={question.id}
                userChoice={voted}
                categoryColor={category.color}
                userId={userId}
              />
            </div>
          </>
        )}
      </div>

      {shareImageUrl && (
        <div style={styles.shareOverlay} onClick={() => setShareImageUrl(null)}>
          <div style={styles.shareModal} onClick={e => e.stopPropagation()}>
            <p style={styles.shareHint}>Appuie long sur l'image pour la sauvegarder</p>
            <img src={shareImageUrl} alt="Carte d·lemm" style={styles.shareImage} />
            <button style={styles.shareCloseBtn} onClick={() => setShareImageUrl(null)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  )
}

const ResultBar = memo(function ResultBar({ label, text, pct, chosen, color }) {
  const [displayPct, setDisplayPct] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDisplayPct(pct), 60)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div style={{
      ...styles.resultBar,
      borderColor: chosen ? color : '#e5e5e5',
      opacity: chosen ? 1 : 0.55,
    }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '14px',
        width: `${displayPct}%`,
        background: chosen ? color : '#f0f0f0',
        opacity: 0.18,
        transition: 'width 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
      }} />
      <span style={{
        ...styles.resultLabel,
        background: chosen ? color : '#e5e5e5',
        color: chosen ? '#fff' : '#888',
        zIndex: 1,
      }}>{label}</span>
      <span style={{ ...styles.resultText, zIndex: 1 }}>{text}</span>
      <span style={{ ...styles.resultPct, color: chosen ? color : '#bbb', zIndex: 1 }}>
        {displayPct}%
      </span>
    </div>
  )
})

function ValidationRow({ questionId, userId, validation, onValidate }) {
  async function handleValidation(value) {
    if (validation !== null) return
    onValidate(value)
    await supabase.from('validations').upsert({
      user_id: userId,
      question_id: questionId,
      value,
    }, { onConflict: 'user_id,question_id' })
  }

  if (validation !== null) {
    return (
      <p style={styles.validationThanks}>
        {validation === 1 ? '👍 Merci pour ton retour !' : '👎 Noté, on prend en compte.'}
      </p>
    )
  }

  return (
    <div style={styles.validationRow}>
      <span style={styles.validationLabel}>Ce dlemm était bon ?</span>
      <button style={styles.validationBtn} onClick={() => handleValidation(1)}>👍</button>
      <button style={styles.validationBtn} onClick={() => handleValidation(-1)}>👎</button>
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
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
  wrapper: {
    minHeight: 'calc(100vh - 130px)',
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    animation: 'cardEnter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  card: {
    background: '#fff',
    borderRadius: '24px',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
    position: 'relative',
    overflow: 'hidden',
    flex: 1,
  },
  swipeOverlay: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    borderRadius: '24px',
    transition: 'opacity 0.1s',
  },
  stamp: {
    position: 'absolute',
    top: 24,
    padding: '6px 14px',
    border: '3px solid',
    borderRadius: '10px',
    fontSize: '22px',
    fontWeight: 900,
    letterSpacing: '0.05em',
    pointerEvents: 'none',
    transition: 'opacity 0.1s',
  },
  categoryBadge: {
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
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    flex: 1,
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '18px 16px',
    background: '#f8f8f8',
    borderRadius: '16px',
    cursor: 'pointer',
    flex: 1,
  },
  optionLabel: {
    flexShrink: 0,
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 800,
  },
  optionText: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#222',
    lineHeight: 1.4,
  },
  orRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 0',
  },
  orLine: {
    flex: 1,
    height: '1px',
    background: '#eee',
  },
  orText: {
    fontSize: '12px',
    color: '#ccc',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  swipeHint: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 4px',
    fontSize: '12px',
    color: '#ccc',
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  resultBar: {
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: '#fff',
    border: '2px solid',
    borderRadius: '14px',
    minHeight: '70px',
  },
  resultLabel: {
    flexShrink: 0,
    width: '34px',
    height: '34px',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 800,
  },
  resultText: {
    flex: 1,
    fontSize: '15px',
    fontWeight: 600,
    color: '#222',
    lineHeight: 1.4,
  },
  resultPct: {
    fontSize: '20px',
    fontWeight: 800,
    flexShrink: 0,
    fontVariantNumeric: 'tabular-nums',
    transition: 'color 0.2s',
  },
  afterVote: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  totalVotes: {
    fontSize: '13px',
    color: '#aaa',
    fontWeight: 600,
    textAlign: 'center',
    lineHeight: 1.5,
  },
  actionBtns: {
    display: 'flex',
    gap: '10px',
  },
  shareBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '52px',
    flexShrink: 0,
    padding: '14px',
    background: '#7F77DD',
    border: 'none',
    borderRadius: '12px',
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
  validationRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 0',
  },
  validationLabel: {
    flex: 1,
    fontSize: '13px',
    color: '#888',
    fontWeight: 600,
  },
  validationBtn: {
    fontSize: '20px',
    background: 'none',
    border: '1.5px solid #e5e5e5',
    borderRadius: '10px',
    padding: '6px 12px',
    cursor: 'pointer',
    lineHeight: 1,
  },
  validationThanks: {
    fontSize: '13px',
    color: '#888',
    fontWeight: 600,
    textAlign: 'center',
    padding: '4px 0',
  },
  shareOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
    padding: '24px',
  },
  shareModal: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    width: '100%',
    maxWidth: '380px',
  },
  shareHint: {
    fontSize: '14px',
    color: '#fff',
    fontWeight: 600,
    textAlign: 'center',
  },
  shareImage: {
    width: '100%',
    borderRadius: '16px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
  },
  shareCloseBtn: {
    padding: '12px 32px',
    background: 'rgba(255,255,255,0.15)',
    border: '1.5px solid rgba(255,255,255,0.3)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}
