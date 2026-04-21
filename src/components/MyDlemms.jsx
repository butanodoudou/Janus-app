import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { CATEGORIES } from '../data/questions.js'
import AuthScreen from './AuthScreen.jsx'

const STATUS_TABS = [
  { key: 'pending',  label: 'En attente', color: '#BA7517', bg: '#FFF8E7' },
  { key: 'approved', label: 'Approuvés',  color: '#1D9E75', bg: '#F0FBF7' },
  { key: 'rejected', label: 'Refusés',    color: '#E53E3E', bg: '#FFF5F5' },
]

export default function MyDlemms({ user, userId, onReformulate }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data } = await supabase
        .from('submissions')
        .select('id, category, text, option_a, option_b, status, rejection_reason, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      setSubmissions(data || [])
      setLoading(false)
    }
    load()
  }, [userId, user])

  if (!user) {
    return (
      <AuthScreen
        title="Rejoins d·lemm"
        subtitle="Crée un compte pour suivre tes soumissions."
      />
    )
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.loader} />
      </div>
    )
  }

  const counts = {}
  for (const tab of STATUS_TABS) {
    counts[tab.key] = submissions.filter(s => s.status === tab.key).length
  }
  const filtered = submissions.filter(s => s.status === activeTab)

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Mes dlemms</h2>

      <div style={styles.tabs}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            style={{
              ...styles.tab,
              color: activeTab === tab.key ? tab.color : '#aaa',
              borderBottom: activeTab === tab.key ? `2px solid ${tab.color}` : '2px solid transparent',
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span style={{
                ...styles.tabCount,
                background: activeTab === tab.key ? tab.bg : '#f0f0f0',
                color: activeTab === tab.key ? tab.color : '#aaa',
              }}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={styles.empty}>
          {activeTab === 'pending'  && <p>Aucune soumission en attente.</p>}
          {activeTab === 'approved' && <p>Aucun dlemm approuvé pour l'instant.</p>}
          {activeTab === 'rejected' && <p>Aucun dlemm refusé.</p>}
        </div>
      ) : (
        <div style={styles.list}>
          {filtered.map(s => (
            <SubmissionCard
              key={s.id}
              submission={s}
              onReformulate={() => onReformulate(s)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SubmissionCard({ submission: s, onReformulate }) {
  const cat = CATEGORIES[s.category] || { label: s.category, color: '#7F77DD' }
  const tab = STATUS_TABS.find(t => t.key === s.status) || STATUS_TABS[0]

  return (
    <div style={cardStyles.card}>
      <div style={cardStyles.top}>
        <span style={{ ...cardStyles.catBadge, background: cat.color }}>{cat.label}</span>
        <span style={{ ...cardStyles.statusPill, color: tab.color, background: tab.bg }}>
          {tab.label}
        </span>
      </div>

      {s.text && <p style={cardStyles.text}>{s.text}</p>}

      <div style={cardStyles.options}>
        <span style={cardStyles.option}><b>A</b> {s.option_a}</span>
        <span style={cardStyles.option}><b>B</b> {s.option_b}</span>
      </div>

      {s.status === 'rejected' && s.rejection_reason && (
        <div style={cardStyles.reason}>
          <p style={cardStyles.reasonLabel}>Motif de refus</p>
          <p style={cardStyles.reasonText}>{s.rejection_reason}</p>
        </div>
      )}

      {s.status === 'rejected' && (
        <button style={cardStyles.reformulateBtn} onClick={onReformulate}>
          Reformuler ce dlemm →
        </button>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  heading: { fontSize: '24px', fontWeight: 800, color: '#111', margin: 0 },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #eee',
    marginBottom: '-1px',
  },
  tab: {
    flex: 1,
    padding: '10px 4px',
    background: 'none',
    border: 'none',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabCount: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '10px',
    transition: 'background 0.15s, color 0.15s',
  },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  empty: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: '14px',
    fontWeight: 500,
    padding: '40px 0',
  },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' },
  loader: {
    width: '32px', height: '32px',
    border: '3px solid #eee', borderTop: '3px solid #7F77DD',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
}

const cardStyles = {
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid #eee',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  catBadge: {
    padding: '3px 10px', borderRadius: '20px', color: '#fff',
    fontSize: '11px', fontWeight: 700,
  },
  statusPill: {
    fontSize: '11px', fontWeight: 700, padding: '3px 10px',
    borderRadius: '20px', letterSpacing: '0.02em',
  },
  text: { fontSize: '14px', fontWeight: 700, color: '#111', lineHeight: 1.4 },
  options: { display: 'flex', flexDirection: 'column', gap: '4px' },
  option: { fontSize: '13px', color: '#666', lineHeight: 1.4 },
  reason: {
    background: '#FFF5F5',
    borderRadius: '10px',
    padding: '12px',
    border: '1px solid #FFE0E0',
  },
  reasonLabel: {
    fontSize: '11px', fontWeight: 700, color: '#E53E3E',
    textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px',
  },
  reasonText: { fontSize: '13px', color: '#555', lineHeight: 1.5, margin: 0 },
  reformulateBtn: {
    background: 'none',
    border: '2px solid #7F77DD',
    borderRadius: '10px',
    color: '#7F77DD',
    fontSize: '14px',
    fontWeight: 700,
    padding: '10px 14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
  },
}
