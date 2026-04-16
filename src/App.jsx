import { useState, useEffect } from 'react'
import Feed from './components/Feed.jsx'
import SubmitForm from './components/SubmitForm.jsx'
import Profile from './components/Profile.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import Nav from './components/Nav.jsx'
import { supabase } from './lib/supabase.js'
import { getUserId } from './lib/userId.js'

const ADMIN_ID = import.meta.env.VITE_ADMIN_ID

export default function App() {
  const [session, setSession] = useState(undefined) // undefined=chargement, null=invité
  const [view, setView] = useState('feed')

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
        {view === 'feed' && <Feed userId={userId} isGuest={isGuest} userBadge={userBadge} />}
        {view === 'submit' && <SubmitForm userId={userId} onBack={() => setView('feed')} />}
        {view === 'profile' && <Profile user={user} userId={userId} />}
        {view === 'admin' && isAdmin && <AdminPanel />}
      </main>

      <Nav view={view} setView={setView} isAdmin={isAdmin} />
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
    borderBottom: '1px solid #efefef',
    background: '#fafafa',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  logo: {
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
