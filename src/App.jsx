import { useState, useEffect } from 'react'
import Feed from './components/Feed.jsx'
import SubmitForm from './components/SubmitForm.jsx'
import Profile from './components/Profile.jsx'
import Activity from './components/Activity.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import Nav from './components/Nav.jsx'
import { supabase } from './lib/supabase.js'
import { getUserId } from './lib/userId.js'

const ADMIN_ID = import.meta.env.VITE_ADMIN_ID

export default function App() {
  const [session, setSession] = useState(undefined) // undefined=chargement, null=invité
  const [view, setView] = useState('feed')
  const [reformulateData, setReformulateData] = useState(null) // { id, text, option_a, option_b, category }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div style={styles.loading}>
        <div style={styles.loader} />
      </div>
    )
  }

  const user = session?.user || null
  const isGuest = !user
  const userId = user?.id || getUserId()
  const isAdmin = Boolean(ADMIN_ID && user?.id === ADMIN_ID)
  const userBadge = user?.user_metadata?.selected_badge || null

  return (
    <div className="app">
      <header style={styles.header}>
        <span style={styles.logo}>d·lemm</span>
      </header>

      <main style={styles.main}>
        <div key={view} style={{ animation: 'fadeIn 0.18s ease-out' }}>
          {view === 'feed' && <Feed userId={userId} isGuest={isGuest} userBadge={userBadge} />}
          {view === 'submit' && (
            <SubmitForm
              userId={userId}
              onBack={() => setView('feed')}
              initialData={reformulateData}
              editId={reformulateData?.id || null}
              onDone={() => { setReformulateData(null); setView('activity') }}
            />
          )}
          {view === 'activity' && (
            <Activity
              user={user}
              userId={userId}
              onReformulate={s => { setReformulateData(s); setView('submit') }}
            />
          )}
          {view === 'profile' && <Profile user={user} userId={userId} />}
          {view === 'admin' && isAdmin && <AdminPanel />}
        </div>
      </main>

      <Nav view={view} setView={v => { setReformulateData(null); setView(v) }} isAdmin={isAdmin} />
    </div>
  )
}

const styles = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  loader: {
    width: '32px',
    height: '32px',
    border: '3px solid #eee',
    borderTop: '3px solid #7F77DD',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  header: {
    padding: '16px 20px 14px',
    boxShadow: '0 1px 0 #ebebeb',
    background: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  logo: {
    fontFamily: "'Syne', system-ui, sans-serif",
    fontSize: '22px',
    fontWeight: 800,
    color: '#7F77DD',
    letterSpacing: '-0.5px',
    userSelect: 'none',
  },
  main: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: 'calc(70px + env(safe-area-inset-bottom))',
  },
}
