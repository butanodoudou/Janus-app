import { useState, useCallback } from 'react'
import Feed from './components/Feed.jsx'
import SubmitForm from './components/SubmitForm.jsx'
import Profile from './components/Profile.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import Nav from './components/Nav.jsx'
import PinModal from './components/PinModal.jsx'

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '1337'
const TAPS_REQUIRED = 5

export default function App() {
  const [view, setView] = useState('feed')
  const [logoTaps, setLogoTaps] = useState(0)
  const [showPin, setShowPin] = useState(false)
  const [adminUnlocked, setAdminUnlocked] = useState(false)

  const handleLogoTap = useCallback(() => {
    const next = logoTaps + 1
    if (next >= TAPS_REQUIRED) {
      setLogoTaps(0)
      setShowPin(true)
    } else {
      setLogoTaps(next)
    }
  }, [logoTaps])

  function handlePin(pin) {
    if (pin === ADMIN_PIN) {
      setAdminUnlocked(true)
      setShowPin(false)
      setView('admin')
      return true
    }
    return false
  }

  function handleSetView(v) {
    if (v === 'submit') {
      setView('submit')
    } else {
      setView(v)
    }
  }

  return (
    <div className="app">
      <header style={styles.header}>
        <button style={styles.logo} onClick={handleLogoTap} aria-label="d·lemm">
          d·lemm
        </button>
      </header>

      <main style={styles.main}>
        {view === 'feed' && <Feed />}
        {view === 'submit' && (
          <SubmitForm onBack={() => setView('feed')} />
        )}
        {view === 'profile' && <Profile />}
        {view === 'admin' && adminUnlocked && <AdminPanel />}
      </main>

      <Nav view={view} setView={handleSetView} adminUnlocked={adminUnlocked} />

      {showPin && (
        <PinModal
          onConfirm={handlePin}
          onClose={() => { setShowPin(false); setLogoTaps(0) }}
        />
      )}
    </div>
  )
}

const styles = {
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
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    userSelect: 'none',
  },
  main: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: 'calc(70px + env(safe-area-inset-bottom))',
  },
}
