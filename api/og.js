import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const { searchParams } = new URL(req.url)

  const text    = searchParams.get('text')   ?? ''
  const optA    = searchParams.get('a')      ?? ''
  const optB    = searchParams.get('b')      ?? ''
  const pctA    = Number(searchParams.get('pctA')   ?? 50)
  const pctB    = Number(searchParams.get('pctB')   ?? 50)
  const total   = Number(searchParams.get('total')  ?? 0)
  const choice  = searchParams.get('choice') ?? 'A'
  const cat     = searchParams.get('cat')    ?? ''
  const color   = '#' + (searchParams.get('color') ?? '7F77DD')

  const fmtTotal = String(total).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

  let fontData
  try {
    const res = await fetch(
      'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2',
      { signal: AbortSignal.timeout(3000) }
    )
    fontData = await res.arrayBuffer()
  } catch {
    // continue without custom font
  }

  const opts = {
    width: 1080,
    height: 1080,
    ...(fontData ? { fonts: [{ name: 'Inter', data: fontData, weight: 400, style: 'normal' }] } : {}),
  }

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#fafafa',
        padding: '72px 80px',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>
        {/* DIcon + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <svg width="56" height="56" viewBox="0 0 80 80" fill="none">
            <path d="M12 8 L12 72 L40 72 Q68 72 68 40 Q68 8 40 8 Z" fill="#7F77DD" />
            <path d="M22 18 L22 62 L39 62 Q56 62 56 40 Q56 18 39 18 Z" fill="#fafafa" />
            <line x1="8" y1="62" x2="72" y2="18" stroke="#fafafa" strokeWidth="5" strokeLinecap="round" />
            <circle cx="40" cy="40" r="3" fill="#0e0e0e" />
          </svg>
          <div style={{ width: '2px', height: '32px', background: '#e5e5e5', flexShrink: 0, display: 'flex' }} />
          <span style={{ fontSize: '42px', fontWeight: 900, color: '#0e0e0e', letterSpacing: '-2px', lineHeight: '1', fontFamily: 'system-ui' }}>lemm</span>
        </div>
        {/* Catégorie */}
        <div style={{
          background: color,
          color: '#fff',
          padding: '12px 28px',
          borderRadius: '40px',
          fontSize: '22px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
        }}>
          {cat}
        </div>
      </div>

      {/* Question */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <p style={{
          fontSize: '54px',
          fontWeight: 800,
          color: '#111',
          lineHeight: 1.25,
          margin: 0,
        }}>
          {text}
        </p>
      </div>

      {/* Barres A/B */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginTop: '60px', marginBottom: '52px' }}>
        {/* Option A */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
            background: choice === 'A' ? color : '#e8e8e8',
            color: choice === 'A' ? '#fff' : '#aaa',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 800,
          }}>A</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '24px', fontWeight: 600, color: choice === 'A' ? '#111' : '#aaa', lineHeight: 1.3 }}>{optA}</span>
            <div style={{ width: '100%', height: '10px', background: '#e8e8e8', borderRadius: '5px', display: 'flex' }}>
              <div style={{ width: `${pctA}%`, height: '100%', background: choice === 'A' ? color : '#d0d0d0', borderRadius: '5px' }} />
            </div>
          </div>
          <span style={{
            fontSize: '40px', fontWeight: 800,
            color: choice === 'A' ? color : '#ccc',
            width: '90px', textAlign: 'right', flexShrink: 0,
          }}>{pctA}%</span>
        </div>

        {/* Option B */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
            background: choice === 'B' ? color : '#e8e8e8',
            color: choice === 'B' ? '#fff' : '#aaa',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 800,
          }}>B</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '24px', fontWeight: 600, color: choice === 'B' ? '#111' : '#aaa', lineHeight: 1.3 }}>{optB}</span>
            <div style={{ width: '100%', height: '10px', background: '#e8e8e8', borderRadius: '5px', display: 'flex' }}>
              <div style={{ width: `${pctB}%`, height: '100%', background: choice === 'B' ? color : '#d0d0d0', borderRadius: '5px' }} />
            </div>
          </div>
          <span style={{
            fontSize: '40px', fontWeight: 800,
            color: choice === 'B' ? color : '#ccc',
            width: '90px', textAlign: 'right', flexShrink: 0,
          }}>{pctB}%</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: '30px', borderTop: '1.5px solid #e8e8e8',
      }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color: color }}>J'ai choisi {choice}</span>
        <span style={{ fontSize: '20px', color: '#bbb', fontWeight: 600 }}>{fmtTotal} votes</span>
      </div>
    </div>,
    opts
  )
}
