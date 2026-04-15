const TABS = [
  { id: 'feed',    label: 'Feed',     icon: IconFeed },
  { id: 'submit',  label: 'Proposer', icon: IconPlus },
  { id: 'profile', label: 'Profil',   icon: IconUser },
]

export default function Nav({ view, setView, adminUnlocked }) {
  const tabs = adminUnlocked
    ? [...TABS, { id: 'admin', label: 'Admin', icon: IconShield }]
    : TABS

  return (
    <nav style={styles.nav}>
      {tabs.map(tab => {
        const active = view === tab.id
        return (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              color: active ? '#7F77DD' : '#999',
              background: active ? 'rgba(127, 119, 221, 0.08)' : 'transparent',
              borderRadius: active ? '12px' : '0',
            }}
            onClick={() => setView(tab.id)}
          >
            <tab.icon active={active} />
            <span style={styles.label}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function IconFeed({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function IconPlus({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function IconUser({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconShield({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '430px',
    display: 'flex',
    gap: '4px',
    padding: '6px 8px',
    borderTop: '1px solid #eee',
    background: '#fafafa',
    paddingBottom: 'calc(6px + env(safe-area-inset-bottom))',
    zIndex: 100,
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
    padding: '8px 0',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'color 0.15s, background 0.15s',
  },
  label: {
    fontSize: '12px',
    fontWeight: 700,
  },
}
