import { useState } from 'react'

export default function PinModal({ onConfirm, onClose }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  function handleKey(digit) {
    if (pin.length >= 6) return
    const next = pin + digit
    setPin(next)
    setError(false)

    if (next.length === 4) {
      const ok = onConfirm(next)
      if (!ok) {
        setError(true)
        if (navigator.vibrate) navigator.vibrate(200)
        setTimeout(() => { setPin(''); setError(false) }, 300)
      }
    }
  }

  function handleDelete() {
    setPin(prev => prev.slice(0, -1))
    setError(false)
  }

  const dots = Array.from({ length: 4 }, (_, i) => ({
    filled: i < pin.length,
    error,
  }))

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <p style={styles.title}>Code admin</p>

        <div style={styles.dots}>
          {dots.map((d, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                background: d.filled ? (d.error ? '#e53e3e' : '#7F77DD') : '#e0e0e0',
                transform: d.filled ? 'scale(1.1)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        <div style={styles.grid}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
            <button
              key={i}
              style={{ ...styles.key, opacity: k === '' ? 0 : 1 }}
              disabled={k === ''}
              onClick={() => k === '⌫' ? handleDelete() : handleKey(k)}
            >
              {k}
            </button>
          ))}
        </div>

        <button style={styles.cancel} onClick={onClose}>Annuler</button>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    width: '100%',
    maxWidth: '430px',
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    padding: '28px 24px 40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  title: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#111',
  },
  dots: {
    display: 'flex',
    gap: '14px',
  },
  dot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    transition: 'background 0.15s, transform 0.15s',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    width: '100%',
    maxWidth: '280px',
  },
  key: {
    padding: '16px',
    fontSize: '22px',
    fontWeight: 600,
    fontFamily: 'inherit',
    background: '#f4f4f4',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    color: '#111',
  },
  cancel: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#999',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}
