import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { CATEGORIES } from '../data/questions.js'

export default function AdminPanel() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    load()
  }, [filter])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('status', filter)
      .order('created_at', { ascending: false })
    setSubmissions(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('submissions').update({ status }).eq('id', id)
    setSubmissions(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Modération</h2>

      <div style={styles.filters}>
        {['pending', 'approved', 'rejected'].map(f => (
          <button
            key={f}
            style={{
              ...styles.filterBtn,
              background: filter === f ? '#7F77DD' : '#f0f0f0',
              color: filter === f ? '#fff' : '#555',
            }}
            onClick={() => setFilter(f)}
          >
            {f === 'pending' ? 'En attente' : f === 'approved' ? 'Publiés' : 'Refusés'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.center}>
          <div style={styles.loader} />
        </div>
      ) : submissions.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>Aucune soumission {filter === 'pending' ? 'en attente' : filter === 'approved' ? 'publiée' : 'refusée'}.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {submissions.map(s => (
            <SubmissionCard
              key={s.id}
              submission={s}
              filter={filter}
              onApprove={() => updateStatus(s.id, 'approved')}
              onReject={() => updateStatus(s.id, 'rejected')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SubmissionCard({ submission: s, filter, onApprove, onReject }) {
  const cat = CATEGORIES[s.category] || { label: s.category, color: '#888' }

  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <span style={{ ...styles.badge, background: cat.color }}>{cat.label}</span>
        <span style={styles.date}>{new Date(s.created_at).toLocaleDateString('fr-FR')}</span>
      </div>

      <p style={styles.cardText}>{s.text}</p>

      <div style={styles.options}>
        <div style={styles.option}>
          <span style={styles.optionLetter}>A</span>
          <span style={styles.optionText}>{s.option_a}</span>
        </div>
        <div style={styles.option}>
          <span style={{ ...styles.optionLetter, background: '#f0f0f0', color: '#444' }}>B</span>
          <span style={styles.optionText}>{s.option_b}</span>
        </div>
      </div>

      {filter === 'pending' && (
        <div style={styles.actions}>
          <button style={styles.rejectBtn} onClick={onReject}>Refuser</button>
          <button style={styles.approveBtn} onClick={onApprove}>Publier</button>
        </div>
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
  heading: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#111',
  },
  filters: {
    display: 'flex',
    gap: '8px',
  },
  filterBtn: {
    padding: '8px 14px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s, color 0.15s',
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px',
  },
  loader: {
    width: '28px',
    height: '28px',
    border: '3px solid #eee',
    borderTop: '3px solid #7F77DD',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  empty: {
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyText: {
    color: '#aaa',
    fontSize: '14px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '1px solid #eee',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    padding: '3px 10px',
    borderRadius: '20px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
  },
  date: {
    fontSize: '12px',
    color: '#aaa',
  },
  cardText: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#111',
    lineHeight: 1.4,
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  option: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
  },
  optionLetter: {
    minWidth: '24px',
    height: '24px',
    borderRadius: '6px',
    background: '#7F77DD',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 800,
    flexShrink: 0,
  },
  optionText: {
    fontSize: '13px',
    color: '#555',
    lineHeight: 1.4,
    paddingTop: '4px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  rejectBtn: {
    flex: 1,
    padding: '10px',
    background: '#fff',
    border: '2px solid #eee',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 700,
    color: '#e53e3e',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  approveBtn: {
    flex: 1,
    padding: '10px',
    background: '#1D9E75',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}
