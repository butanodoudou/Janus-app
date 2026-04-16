import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function AuthScreen({ title, subtitle }) {
  const [mode, setMode] = useState('signup')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!email || !password) return
    if (mode === 'signup' && !username.trim()) return

    setError('')
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: username.trim() } },
      })
      if (error) setError(translateError(error.message))
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) setError(translateError(error.message))
    }

    setLoading(false)
  }

  function translateError(msg) {
    if (msg.includes('already registered')) return 'Cet email est déjà utilisé.'
    if (msg.includes('Invalid login')) return 'Email ou mot de passe incorrect.'
    if (msg.includes('Password should')) return 'Mot de passe trop court (6 caractères min).'
    return 'Une erreur est survenue, réessaie.'
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div style={styles.container}>
      {title && <p style={styles.title}>{title}</p>}
      {subtitle && <p style={styles.subtitle}>{subtitle}</p>}

      <div style={styles.form}>
        {mode === 'signup' && (
          <input
            style={styles.input}
            placeholder="Ton pseudo"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoCapitalize="none"
            onKeyDown={handleKey}
          />
        )}
        <input
          style={styles.input}
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoCapitalize="none"
          autoComplete="email"
          onKeyDown={handleKey}
        />
        <input
          style={styles.input}
          placeholder="Mot de passe"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          onKeyDown={handleKey}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={{ ...styles.submitBtn, opacity: loading ? 0.6 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '…' : mode === 'signup' ? 'Créer mon compte' : 'Me connecter'}
        </button>
      </div>

      <button
        style={styles.toggle}
        onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError('') }}
      >
        {mode === 'signup'
          ? 'Déjà un compte ? Connecte-toi'
          : 'Pas encore de compte ? Inscris-toi'}
      </button>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '32px 24px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#111',
    lineHeight: 1.3,
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    marginTop: '-12px',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  input: {
    padding: '14px 16px',
    fontSize: '15px',
    fontFamily: 'inherit',
    border: '2px solid #e5e5e5',
    borderRadius: '12px',
    outline: 'none',
    background: '#fff',
    color: '#111',
  },
  error: {
    fontSize: '13px',
    color: '#e53e3e',
    fontWeight: 600,
  },
  submitBtn: {
    padding: '16px',
    background: '#7F77DD',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: '4px',
    transition: 'opacity 0.15s',
  },
  toggle: {
    background: 'none',
    border: 'none',
    fontSize: '14px',
    color: '#7F77DD',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'center',
  },
}
