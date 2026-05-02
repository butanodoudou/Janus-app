import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { QUESTIONS, CATEGORIES } from '../data/questions.js'
import { calcPct } from '../lib/utils.js'
import { shareResult } from '../lib/share.js'
import Comments from './Comments.jsx'
import AuthScreen from './AuthScreen.jsx'

const STATUS_TABS = [
  { key: 'pending',  label: 'En attente', color: '#BA7517', bg: '#FFF8E7' },
  { key: 'approved', label: 'Approuvés',  color: '#1D9E75', bg: '#F0FBF7' },
  { key: 'rejected', label: 'Refusés',    color: '#E53E3E', bg: '#FFF5F5' },
]

const SIDE_FILTERS = [
  { key: 'all',      label: 'Tous' },
  { key: 'majority', label: 'Majorité' },
  { key: 'minority', label: 'Minorité' },
]

export default function Activity({ user, userId, onReformulate }) {
  const [mainTab, setMainTab] = useState('responses')

  if (!user) {
    return (
      <AuthScreen
        title="Rejoins d·lemm"
        subtitle="Crée un compte pour accéder à ton activité."
      />
    )
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Mon activité</h2>

      <div style={styles.mainTabs}>
        {[{ key: 'responses', label: 'Réponses' }, { key: 'submissions', label: 'Soumissions' }].map(t => (
          <button
            key={t.key}
            style={{
              ...styles.mainTab,
              color: mainTab === t.key ? '#7F77DD' : '#aaa',
              borderBottom: mainTab === t.key ? '2px solid #7F77DD' : '2px solid transparent',
            }}
            onClick={() => setMainTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mainTab === 'responses'   && <ResponsesTab userId={userId} />}
      {mainTab === 'submissions' && <SubmissionsTab userId={userId} onReformulate={onReformulate} />}
    </div>
  )
}

// ─── Onglet Réponses ───────────────────────────────────────────────────────────

function ResponsesTab({ userId }) {
  const [history, setHistory] = useState(null)
  const [selected, setSelected] = useState(null)
  const [sideFilter, setSideFilter] = useState('all')

  useEffect(() => {
    async function load() {
      const { data: votes } = await supabase
        .from('votes')
        .select('question_id, choice, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!votes?.length) { setHistory([]); return }

      const unknownIds = votes.map(v => v.question_id).filter(id => !QUESTIONS.find(q => q.id === id))
      let approvedSubs = []
      if (unknownIds.length > 0) {
        const { data: subs } = await supabase
          .from('submissions')
          .select('id, category, text, option_a, option_b')
          .in('id', unknownIds)
          .eq('status', 'approved')
        approvedSubs = subs || []
      }
      const allQuestions = [...QUESTIONS, ...approvedSubs]

      const qIds = [...new Set(votes.map(v => v.question_id))]
      const { data: allVotes } = await supabase
        .from('votes')
        .select('question_id, choice')
        .in('question_id', qIds)

      const countsMap = {}
      for (const v of allVotes || []) {
        if (!countsMap[v.question_id]) countsMap[v.question_id] = { A: 0, B: 0 }
        countsMap[v.question_id][v.choice]++
      }

      const entries = votes.map(vote => {
        const question = allQuestions.find(q => q.id === vote.question_id)
        if (!question) return null
        const counts = countsMap[vote.question_id] || { A: 1, B: 0 }
        const { pctA, pctB } = calcPct(counts)
        const chosenPct = vote.choice === 'A' ? pctA : pctB
        const side = chosenPct >= 50 ? 'majority' : 'minority'
        return { vote, question, counts, side }
      }).filter(Boolean)

      setHistory(entries)
    }
    load()
  }, [userId])

  if (history === null) {
    return <div style={styles.center}><div style={styles.loader} /></div>
  }

  let filtered = history
  if (sideFilter !== 'all') filtered = filtered.filter(e => e.side === sideFilter)

  return (
    <>
      <div style={styles.sideFilterRow}>
        {SIDE_FILTERS.map(f => (
          <button
            key={f.key}
            style={{
              ...styles.sideBtn,
              background: sideFilter === f.key ? '#111' : '#f4f4f4',
              color: sideFilter === f.key ? '#fff' : '#666',
            }}
            onClick={() => setSideFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <span style={styles.filterCount}>{filtered.length} réponse{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <div style={styles.empty}>
          <p>Aucune réponse dans ce filtre.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {filtered.map(({ vote, question, counts, side }) => (
            <HistoryCard
              key={vote.question_id}
              question={question}
              choice={vote.choice}
              counts={counts}
              side={side}
              onTap={() => setSelected({ question, choice: vote.choice, counts })}
            />
          ))}
        </div>
      )}

      {selected && (
        <DetailModal
          question={selected.question}
          choice={selected.choice}
          counts={selected.counts}
          userId={userId}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

function HistoryCard({ question, choice, counts, side, onTap }) {
  const cat = CATEGORIES[question.category] || { label: question.category, color: '#7F77DD' }
  const { pctA, pctB, total } = calcPct(counts)
  const chosenPct = choice === 'A' ? pctA : pctB
  const otherPct  = choice === 'A' ? pctB : pctA
  const isMajority = side === 'majority'

  return (
    <button style={styles.historyCard} onClick={onTap}>
      <div style={styles.historyTop}>
        <div style={styles.historyTopLeft}>
          <span style={{ ...styles.badge, background: cat.color }}>{cat.label}</span>
          <span style={{
            ...styles.sidePill,
            background: isMajority ? '#e8f7f1' : '#fff0f3',
            color:      isMajority ? '#1D9E75' : '#D4537E',
          }}>
            {isMajority ? 'Majorité' : 'Minorité'}
          </span>
        </div>
        <span style={styles.historyTotal}>{total.toLocaleString('fr-FR')} votes</span>
      </div>

      {question.text && <p style={styles.historyQuestion}>{question.text}</p>}

      <div style={styles.barsBlock}>
        <div style={styles.barRow}>
          <span style={{ ...styles.barLabel, color: cat.color }}>{choice}</span>
          <div style={styles.barTrack}>
            <div style={{ ...styles.barFill, width: `${chosenPct}%`, background: cat.color }} />
          </div>
          <span style={{ ...styles.barPct, color: cat.color }}>{chosenPct}%</span>
        </div>
        <div style={styles.barRow}>
          <span style={styles.barLabel}>{choice === 'A' ? 'B' : 'A'}</span>
          <div style={styles.barTrack}>
            <div style={{ ...styles.barFill, width: `${otherPct}%`, background: '#e0e0e0' }} />
          </div>
          <span style={{ ...styles.barPct, color: '#bbb' }}>{otherPct}%</span>
        </div>
      </div>
    </button>
  )
}

function DetailModal({ question, choice, counts, userId, onClose }) {
  const cat = CATEGORIES[question.category] || { label: question.category, color: '#7F77DD' }
  const { pctA, pctB, total } = calcPct(counts)
  const [sharing, setSharing] = useState(false)
  const [shareImageUrl, setShareImageUrl] = useState(null)

  async function handleShare() {
    if (sharing) return
    setSharing(true)
    const url = await shareResult({ question, counts, choice })
    if (url) setShareImageUrl(url)
    setSharing(false)
  }

  return (
    <>
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={e => e.stopPropagation()}>
          <div style={styles.handle} />
          <div style={styles.modalScroll}>
            <div style={styles.modalHeader}>
              <span style={{ ...styles.badge, background: cat.color }}>{cat.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: cat.color, fontWeight: 700 }}>
                  Tu as choisi {choice}
                </span>
                <button
                  style={{ ...styles.shareBtn, opacity: sharing ? 0.5 : 1 }}
                  onClick={handleShare}
                  disabled={sharing}
                  aria-label="Partager"
                >
                  {sharing ? '…' : <ShareIcon />}
                </button>
              </div>
            </div>
            {question.text && <p style={styles.modalQuestion}>{question.text}</p>}
            <div style={styles.modalBars}>
              {[
                { label: 'A', text: question.option_a, pct: pctA, chosen: choice === 'A' },
                { label: 'B', text: question.option_b, pct: pctB, chosen: choice === 'B' },
              ].map(opt => (
                <div key={opt.label} style={{
                  ...styles.modalBar,
                  borderColor: opt.chosen ? cat.color : '#e5e5e5',
                  opacity: opt.chosen ? 1 : 0.6,
                }}>
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '12px',
                    width: `${opt.pct}%`, background: opt.chosen ? cat.color : '#f0f0f0',
                    opacity: 0.15, transition: 'width 0.6s ease',
                  }} />
                  <span style={{
                    ...styles.modalBarLabel,
                    background: opt.chosen ? cat.color : '#e5e5e5',
                    color: opt.chosen ? '#fff' : '#888',
                  }}>{opt.label}</span>
                  <span style={styles.modalBarText}>{opt.text}</span>
                  <span style={{ ...styles.modalBarPct, color: opt.chosen ? cat.color : '#bbb' }}>
                    {opt.pct}%
                  </span>
                </div>
              ))}
            </div>
            <p style={styles.modalTotal}>
              {total.toLocaleString('fr-FR')} personne{total > 1 ? 's' : ''} ont répondu
            </p>
            <Comments
              questionId={question.id}
              userChoice={choice}
              categoryColor={cat.color}
              userId={userId}
            />
          </div>
        </div>
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
    </>
  )
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

// ─── Onglet Soumissions ────────────────────────────────────────────────────────

function SubmissionsTab({ userId, onReformulate }) {
  const [submissions, setSubmissions] = useState(null)
  const [activeTab, setActiveTab] = useState('pending')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('submissions')
        .select('id, category, text, option_a, option_b, status, rejection_reason, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      setSubmissions(data || [])
    }
    load()
  }, [userId])

  if (submissions === null) {
    return <div style={styles.center}><div style={styles.loader} /></div>
  }

  const counts = {}
  for (const tab of STATUS_TABS) {
    counts[tab.key] = submissions.filter(s => s.status === tab.key).length
  }
  const filtered = submissions.filter(s => s.status === activeTab)

  return (
    <>
      <div style={styles.statusTabs}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            style={{
              ...styles.statusTab,
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
            <SubmissionCard key={s.id} submission={s} onReformulate={() => onReformulate(s)} />
          ))}
        </div>
      )}
    </>
  )
}

function SubmissionCard({ submission: s, onReformulate }) {
  const cat = CATEGORIES[s.category] || { label: s.category, color: '#7F77DD' }
  const tab = STATUS_TABS.find(t => t.key === s.status) || STATUS_TABS[0]

  return (
    <div style={styles.subCard}>
      <div style={styles.historyTop}>
        <span style={{ ...styles.badge, background: cat.color }}>{cat.label}</span>
        <span style={{ ...styles.sidePill, background: tab.bg, color: tab.color }}>{tab.label}</span>
      </div>
      {s.text && <p style={styles.subText}>{s.text}</p>}
      <div style={styles.subOptions}>
        <span style={styles.subOption}><b>A</b> {s.option_a}</span>
        <span style={styles.subOption}><b>B</b> {s.option_b}</span>
      </div>
      {s.status === 'rejected' && s.rejection_reason && (
        <div style={styles.reason}>
          <p style={styles.reasonLabel}>Motif de refus</p>
          <p style={styles.reasonText}>{s.rejection_reason}</p>
        </div>
      )}
      {s.status === 'rejected' && (
        <button style={styles.reformulateBtn} onClick={onReformulate}>
          Reformuler ce dlemm →
        </button>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container: { padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' },
  heading: { fontSize: '24px', fontWeight: 800, color: '#111', margin: 0 },

  mainTabs: { display: 'flex', borderBottom: '1px solid #eee' },
  mainTab: {
    flex: 1, padding: '10px 0', background: 'none', border: 'none',
    fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    transition: 'color 0.15s, border-color 0.15s',
  },

  sideFilterRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  sideBtn: {
    padding: '6px 14px', borderRadius: '20px', border: 'none',
    fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    transition: 'background 0.15s, color 0.15s',
  },
  filterCount: { fontSize: '12px', color: '#bbb', fontWeight: 600, marginLeft: 'auto' },

  statusTabs: { display: 'flex', borderBottom: '1px solid #eee' },
  statusTab: {
    flex: 1, padding: '10px 4px', background: 'none', border: 'none',
    fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabCount: {
    fontSize: '11px', fontWeight: 700, padding: '1px 6px',
    borderRadius: '10px', transition: 'background 0.15s, color 0.15s',
  },

  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  empty: { textAlign: 'center', color: '#aaa', fontSize: '14px', fontWeight: 500, padding: '40px 0' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' },
  loader: {
    width: '32px', height: '32px', border: '3px solid #eee',
    borderTop: '3px solid #7F77DD', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },

  historyCard: {
    background: '#fff', borderRadius: '16px', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '10px',
    border: '1px solid #eee', cursor: 'pointer', textAlign: 'left',
    fontFamily: 'inherit', width: '100%',
  },
  historyTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  historyTopLeft: { display: 'flex', alignItems: 'center', gap: '6px' },
  historyTotal: { fontSize: '11px', color: '#bbb', fontWeight: 600 },
  sidePill: {
    fontSize: '10px', fontWeight: 700, padding: '2px 8px',
    borderRadius: '10px', letterSpacing: '0.02em',
  },
  badge: { padding: '3px 10px', borderRadius: '20px', color: '#fff', fontSize: '11px', fontWeight: 700 },
  historyQuestion: { fontSize: '14px', fontWeight: 700, color: '#111', lineHeight: 1.4 },
  barsBlock: { display: 'flex', flexDirection: 'column', gap: '6px' },
  barRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  barLabel: { fontSize: '12px', fontWeight: 800, color: '#888', width: '14px', flexShrink: 0 },
  barTrack: { flex: 1, height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '3px', transition: 'width 0.6s ease' },
  barPct: { fontSize: '12px', fontWeight: 700, width: '32px', textAlign: 'right', flexShrink: 0 },

  subCard: {
    background: '#fff', borderRadius: '16px', padding: '16px',
    border: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: '10px',
  },
  subText: { fontSize: '14px', fontWeight: 700, color: '#111', lineHeight: 1.4 },
  subOptions: { display: 'flex', flexDirection: 'column', gap: '4px' },
  subOption: { fontSize: '13px', color: '#666', lineHeight: 1.4 },
  reason: { background: '#FFF5F5', borderRadius: '10px', padding: '12px', border: '1px solid #FFE0E0' },
  reasonLabel: { fontSize: '11px', fontWeight: 700, color: '#E53E3E', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' },
  reasonText: { fontSize: '13px', color: '#555', lineHeight: 1.5, margin: 0 },
  reformulateBtn: {
    background: 'none', border: '2px solid #7F77DD', borderRadius: '10px',
    color: '#7F77DD', fontSize: '14px', fontWeight: 700, padding: '10px 14px',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  },

  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
  },
  modal: {
    width: '100%', maxWidth: '430px', background: '#fafafa',
    borderRadius: '20px 20px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column',
  },
  handle: { width: '36px', height: '4px', background: '#ddd', borderRadius: '2px', margin: '12px auto 4px', flexShrink: 0 },
  modalScroll: { overflowY: 'auto', padding: '12px 20px 40px', display: 'flex', flexDirection: 'column', gap: '16px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalQuestion: { fontSize: '20px', fontWeight: 800, color: '#111', lineHeight: 1.3 },
  modalBars: { display: 'flex', flexDirection: 'column', gap: '10px' },
  modalBar: {
    position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center',
    gap: '12px', padding: '14px', background: '#fff', border: '2px solid',
    borderRadius: '12px', minHeight: '64px',
  },
  modalBarLabel: {
    flexShrink: 0, width: '30px', height: '30px', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 800, zIndex: 1,
  },
  modalBarText: { flex: 1, fontSize: '14px', fontWeight: 600, color: '#222', lineHeight: 1.4, zIndex: 1 },
  modalBarPct: { fontSize: '18px', fontWeight: 800, flexShrink: 0, zIndex: 1 },
  modalTotal: { fontSize: '13px', color: '#aaa', fontWeight: 600, textAlign: 'center' },

  shareBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '30px', height: '30px', flexShrink: 0,
    background: '#7F77DD', border: 'none', borderRadius: '8px',
    color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: '13px', fontWeight: 700,
  },
  shareOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 400, padding: '24px',
  },
  shareModal: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '16px', width: '100%', maxWidth: '380px',
  },
  shareHint: { fontSize: '14px', color: '#fff', fontWeight: 600, textAlign: 'center' },
  shareImage: { width: '100%', borderRadius: '16px', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' },
  shareCloseBtn: {
    padding: '12px 32px', background: 'rgba(255,255,255,0.15)',
    border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '12px',
    color: '#fff', fontSize: '14px', fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
}
