export function DIcon({ size = 28, bg = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" style={{ flexShrink: 0, display: 'block' }}>
      <path d="M12 8 L12 72 L40 72 Q68 72 68 40 Q68 8 40 8 Z" fill="#7F77DD" />
      <path d="M22 18 L22 62 L39 62 Q56 62 56 40 Q56 18 39 18 Z" fill={bg} />
      <line x1="8" y1="62" x2="72" y2="18" stroke={bg} strokeWidth="5" strokeLinecap="round" />
      <circle cx="40" cy="40" r="3" fill="#0e0e0e" />
    </svg>
  )
}

export default function Logo({ onClick, size = 28 }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
      onClick={onClick}
    >
      <DIcon size={size} bg="#fff" />
      <div style={{ width: 1, height: size * 0.6, background: '#e5e5e5', flexShrink: 0 }} />
      <span style={{
        fontFamily: "'Unbounded', system-ui, sans-serif",
        fontSize: size * 0.77,
        fontWeight: 900,
        color: '#0e0e0e',
        letterSpacing: '-1px',
        lineHeight: 1,
      }}>
        lemm
      </span>
    </div>
  )
}
