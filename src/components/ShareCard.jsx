import { forwardRef } from 'react'
import { CATEGORIES } from '../data/questions.js'
import { calcPct } from '../lib/utils.js'

const ShareCard = forwardRef(function ShareCard({ question, counts, userChoice }, ref) {
  const cat = CATEGORIES[question.category] || { label: question.category, color: '#7F77DD' }
  const { pctA, pctB, total } = calcPct(counts)

  return (
    <div ref={ref} style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.brand}>d·lemm</span>
        <span style={{ ...styles.badge, background: cat.color }}>{cat.label}</span>
      </div>

      {/* Question */}
      {question.text && <p style={styles.question}>{question.text}</p>}

      {/* Options + barres */}
      <div style={styles.bars}>
        {[
          { label: 'A', text: question.option_a, pct: pctA, chosen: userChoice === 'A' },
          { label: 'B', text: question.option_b, pct: pctB, chosen: userChoice === 'B' },
        ].map(opt => (
          <div key={opt.label} style={styles.barRow}>
            <span style={{
              ...styles.barLabel,
              background: opt.chosen ? cat.color : '#e5e5e5',
              color: opt.chosen ? '#fff' : '#888',
            }}>
              {opt.label}
            </span>
            <div style={styles.barTrack}>
              <div style={{
                ...styles.barFill,
                width: `${opt.pct}%`,
                background: opt.chosen ? cat.color : '#e0e0e0',
              }} />
            </div>
            <span style={{
              ...styles.barPct,
              color: opt.chosen ? cat.color : '#bbb',
            }}>
              {opt.pct}%
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <span style={{ color: cat.color, fontWeight: 700, fontSize: '13px' }}>
          J'ai choisi {userChoice}
        </span>
        <span style={styles.total}>
          {total.toLocaleString('fr-FR')} réponses
        </span>
      </div>
    </div>
  )
})

export default ShareCard

const styles = {
  card: {
    width: '340px',
    background: '#fff',
    borderRadius: '20px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#7F77DD',
    letterSpacing: '-0.5px',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '20px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  question: {
    fontSize: '17px',
    fontWeight: 800,
    color: '#111',
    lineHeight: 1.35,
    margin: 0,
  },
  bars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  barLabel: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 800,
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: '8px',
    background: '#f0f0f0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '4px',
  },
  barPct: {
    fontSize: '14px',
    fontWeight: 800,
    width: '36px',
    textAlign: 'right',
    flexShrink: 0,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '4px',
    borderTop: '1px solid #f0f0f0',
  },
  total: {
    fontSize: '12px',
    color: '#bbb',
    fontWeight: 600,
  },
}
