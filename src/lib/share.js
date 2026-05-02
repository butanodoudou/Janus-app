import { calcPct } from './utils.js'
import { CATEGORIES } from '../data/questions.js'

export async function shareResult({ question, counts, choice }) {
  const cat = CATEGORIES[question.category] || { label: question.category, color: '#7F77DD' }
  const { pctA, pctB, total } = calcPct(counts)

  const ogUrl = new URL('/api/og', window.location.origin)
  ogUrl.searchParams.set('text',   question.text)
  ogUrl.searchParams.set('a',      question.option_a)
  ogUrl.searchParams.set('b',      question.option_b)
  ogUrl.searchParams.set('pctA',   String(pctA))
  ogUrl.searchParams.set('pctB',   String(pctB))
  ogUrl.searchParams.set('total',  String(total))
  ogUrl.searchParams.set('choice', choice)
  ogUrl.searchParams.set('cat',    cat.label)
  ogUrl.searchParams.set('color',  cat.color.replace('#', ''))

  try {
    const res = await fetch(ogUrl.toString())
    if (!res.ok) throw new Error('og')
    const blob = await res.blob()
    const file = new File([blob], 'dlemm.png', { type: 'image/png' })

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'd·lemm',
        url: `${window.location.origin}?q=${question.id}`,
      })
      return null
    }
    // canShare non supporté → modal image (jamais du texte si l'API a marché)
    return ogUrl.toString()
  } catch (e) {
    if (e.name === 'AbortError') return null
    // API indispo → partage l'URL de l'app (WhatsApp affiche le preview OG)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'd·lemm — ' + (question.text || 'Un dlemm sans bonne réponse'),
          text: `${question.option_a} ou ${question.option_b} ?`,
          url: `${window.location.origin}?q=${question.id}`,
        })
      } catch {}
    }
    return null
  }
}
