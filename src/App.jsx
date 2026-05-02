import { useState, useEffect } from 'react'
import Feed from './components/Feed.jsx'
import SubmitForm from './components/SubmitForm.jsx'
import Profile from './components/Profile.jsx'
import Activity from './components/Activity.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import PinModal from './components/PinModal.jsx'
import Nav from './components/Nav.jsx'
import Logo from './components/Logo.jsx'
import { supabase } from './lib/supabase.js'
import { getUserId } from './lib/userId.js'

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN

export default function App() {
  const [session, setSession] = useState(undefined)
  const [view, setView] = useState('feed')
  const [reformulateData, setReformulateData] = useState(null)
  const [deepLinkId] = useState(() => new URLSearchParams(window.location.search).get('q'))
  const [tapCount, setTapCount] = useState(0)
  const [showPin, setShowPin] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

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
  const userBadge = user?.user_metadata?.selected_badge || null

  function handleLogoTap() {
    const next = tapCount + 1
    setTapCount(next)
    if (next >= 5) {
      setTapCount(0)
      setShowPin(true)
    }
  }

  function handlePinConfirm(pin) {
    if (pin === ADMIN_PIN) {
      setIsAdmin(true)
      setShowPin(false)
      setView('admin')
      return true
    }
    return false
  }

  return (
    <div className="app">
      <header style={styles.header}>
        <Logo onClick={handleLogoTap} size={28} />
      </header>

      {showPin && (
        <PinModal
          onConfirm={handlePinConfirm}
          onClose={() => { setShowPin(false); setTapCount(0) }}
        />
      )}

      <main style={styles.main}>
        <div key={view} style={{ animation: 'fadeIn 0.18s ease-out' }}>
          {view === 'feed' && <Feed userId={userId} isGuest={isGuest} userBadge={userBadge} deepLinkId={deepLinkId} />}
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
  main: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: 'calc(70px + env(safe-area-inset-bottom))',
  },
}
