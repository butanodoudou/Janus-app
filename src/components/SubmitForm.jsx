import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { CATEGORIES } from '../data/questions.js'

const STEP_LABELS = ['Le dlemm', 'Les options', 'Catégorie', 'Confirmation']

export default function SubmitForm({ userId, onBack, initialData = null, editId = null, onDone = null }) {
  const isEdit = Boolean(editId)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(
    initialData
      ? { text: initialData.text || '', option_a: initialData.option_a || '', option_b: initialData.option_b || '', category: initialData.category || '' }
      : { text: '', option_a: '', option_b: '', category: '' }
  )
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  function next() {
    if (step === 0 && !form.text.trim()) return setError('Écris ton dlemm.')
    if (step === 1 && (!form.option_a.trim() || !form.option_b.trim())) return setError('Les deux options sont requises.')
    if (step === 2 && !form.category) return setError('Choisis une catégorie.')
    setStep(s => s + 1)
  }

  async function submit() {
    setSubmitting(true)
    const payload = {
      text: form.text.trim(),
      option_a: form.option_a.trim(),
      option_b: form.option_b.trim(),
      category: form.category,
      status: 'pending',
    }
    const { error: err } = isEdit
      ? await supabase.from('submissions').update({ ...payload, rejection_reason: null }).eq('id', editId)
      : await supabase.from('submissions').insert({ ...payload, user_id: userId || null })
    setSubmitting(false)
    if (err) {
      setError("Erreur lors de l'envoi. Réessaie.")
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div style={styles.done}>
        <div style={styles.doneEmoji}>🙌</div>
        <h2 style={styles.doneTitle}>{isEdit ? 'Dlemm mis à jour !' : 'Dlemm soumis !'}</h2>
        <p style={styles.doneText}>
          {isEdit ? 'Ta nouvelle version sera examinée.' : 'Il sera examiné avant d\'apparaître dans le feed.'}
        </p>
        <button style={styles.backBtn} onClick={onDone || onBack}>
          {isEdit ? 'Voir mes dlemms' : 'Retour au feed'}
        </button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backLink} onClick={step === 0 ? onBack : () => setStep(s => s - 1)}>
          ← {step === 0 ? 'Feed' : 'Retour'}
        </button>

        {/* Step indicator numéroté */}
        <div style={styles.stepIndicator}>
          {STEP_LABELS.map((_, i) => (
            <div key={i} style={styles.stepItem}>
              <div style={{
                ...styles.stepNum,
                background: i < step ? '#7F77DD' : i === step ? '#7F77DD' : '#e5e5e5',
                color: i <= step ? '#fff' : '#aaa',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div style={{
                  ...styles.stepLine,
                  background: i < step ? '#7F77DD' : '#e5e5e5',
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.content}>
        {step === 0 && (
          <>
            <label style={styles.label}>Ton dlemm</label>
            <p style={styles.hint}>Une situation difficile sans bonne réponse évidente.</p>
            <textarea
              style={styles.textarea}
              placeholder="Ex : Tu peux sauver une vie en appuyant sur un bouton…"
              value={form.text}
              onChange={e => update('text', e.target.value)}
              rows={4}
              maxLength={200}
              autoFocus
            />
            <p style={{
              ...styles.counter,
              color: form.text.length > 170 ? '#e53e3e' : '#ccc',
              fontWeight: form.text.length > 170 ? 700 : 400,
            }}>
              {form.text.length}/200
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <label style={styles.label}>Les deux options</label>
            <p style={styles.hint}>Deux choix opposés, aussi difficiles l'un que l'autre.</p>
            <div style={styles.optionRow}>
              <span style={styles.optionBadge}>A</span>
              <textarea
                style={styles.optionInput}
                placeholder="Première option…"
                value={form.option_a}
                onChange={e => update('option_a', e.target.value)}
                rows={3}
                maxLength={150}
              />
            </div>
            <div style={styles.optionRow}>
              <span style={{ ...styles.optionBadge, background: '#f0f0f0', color: '#444' }}>B</span>
              <textarea
                style={styles.optionInput}
                placeholder="Deuxième option…"
                value={form.option_b}
                onChange={e => update('option_b', e.target.value)}
                rows={3}
                maxLength={150}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <label style={styles.label}>Catégorie</label>
            <p style={styles.hint}>Quel thème correspond le mieux à ton dlemm ?</p>
            <div style={styles.categories}>
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <button
                  key={key}
                  style={{
                    ...styles.catBtn,
                    background: form.category === key ? cat.color : '#f4f4f4',
                    color: form.category === key ? '#fff' : '#444',
                    border: form.category === key ? `2px solid ${cat.color}` : '2px solid transparent',
                  }}
                  onClick={() => update('category', key)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <label style={styles.label}>Confirme ton dlemm</label>
            <div style={styles.preview}>
              <div style={{
                ...styles.previewBadge,
                background: form.category ? CATEGORIES[form.category].color : '#7F77DD',
              }}>
                {form.category ? CATEGORIES[form.category].label : ''}
              </div>
              <p style={styles.previewText}>{form.text}</p>
              <div style={styles.previewOption}>
                <span style={styles.previewLetter}>A</span>
                <span style={styles.previewOptionText}>{form.option_a}</span>
              </div>
              <div style={styles.previewOption}>
                <span style={{ ...styles.previewLetter, background: '#f0f0f0', color: '#444' }}>B</span>
                <span style={styles.previewOptionText}>{form.option_b}</span>
              </div>
            </div>
            <button style={styles.editBtn} onClick={() => setStep(0)}>
              ← Modifier le dlemm
            </button>
          </>
        )}

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={{ ...styles.nextBtn, opacity: submitting ? 0.6 : 1 }}
          onClick={step === 3 ? submit : next}
          disabled={submitting}
        >
          {step === 3 ? (submitting ? 'Envoi…' : 'Envoyer') : 'Suivant →'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    minHeight: '80vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backLink: {
    fontSize: '15px',
    color: '#7F77DD',
    fontWeight: 600,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 0,
  },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
  },
  stepNum: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    transition: 'background 0.2s, color 0.2s',
  },
  stepLine: {
    width: '16px',
    height: '2px',
    transition: 'background 0.2s',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
  },
  label: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#111',
  },
  hint: {
    fontSize: '14px',
    color: '#888',
    marginTop: '-4px',
  },
  textarea: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontFamily: 'inherit',
    border: '2px solid #e5e5e5',
    borderRadius: '12px',
    resize: 'none',
    outline: 'none',
    background: '#fff',
    color: '#111',
    lineHeight: 1.5,
    transition: 'border-color 0.15s',
  },
  counter: {
    fontSize: '12px',
    textAlign: 'right',
    marginTop: '-8px',
    transition: 'color 0.15s',
  },
  optionRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  optionBadge: {
    minWidth: '32px',
    height: '32px',
    borderRadius: '8px',
    background: '#7F77DD',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 800,
    marginTop: '4px',
  },
  optionInput: {
    flex: 1,
    padding: '12px',
    fontSize: '15px',
    fontFamily: 'inherit',
    border: '2px solid #e5e5e5',
    borderRadius: '12px',
    resize: 'none',
    outline: 'none',
    background: '#fff',
    color: '#111',
    lineHeight: 1.5,
  },
  categories: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginTop: '4px',
  },
  catBtn: {
    padding: '14px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s, color 0.15s',
    textAlign: 'center',
  },
  nextBtn: {
    marginTop: 'auto',
    padding: '16px',
    background: '#7F77DD',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    width: '100%',
  },
  editBtn: {
    fontSize: '14px',
    color: '#7F77DD',
    fontWeight: 600,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 0,
    alignSelf: 'flex-start',
  },
  error: {
    fontSize: '14px',
    color: '#e53e3e',
    fontWeight: 500,
  },
  preview: {
    background: '#fff',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    border: '1px solid #e5e5e5',
  },
  previewBadge: {
    alignSelf: 'flex-start',
    padding: '4px 12px',
    borderRadius: '20px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
  },
  previewText: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#111',
    lineHeight: 1.4,
  },
  previewOption: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  previewLetter: {
    minWidth: '28px',
    height: '28px',
    borderRadius: '7px',
    background: '#7F77DD',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 800,
  },
  previewOptionText: {
    fontSize: '14px',
    color: '#555',
    lineHeight: 1.4,
    paddingTop: '4px',
  },
  done: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '70vh',
    padding: '32px 24px',
    gap: '16px',
    textAlign: 'center',
  },
  doneEmoji: { fontSize: '56px', lineHeight: 1 },
  doneTitle: { fontSize: '24px', fontWeight: 800, color: '#111' },
  doneText: { fontSize: '15px', color: '#666', maxWidth: '260px' },
  backBtn: {
    marginTop: '8px',
    padding: '14px 32px',
    background: '#7F77DD',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}
