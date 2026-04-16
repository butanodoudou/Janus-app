import { CATEGORIES } from '../data/questions.js'

export const VOTE_BADGES = {
  moral:      { majority: ['Suiveur', 'Utilitariste', 'Gardien'],             minority: ['Questionneur', 'Déontologue', 'Résistant'] },
  amour:      { majority: ['Tendre', 'Romantique', 'Âme sœur'],               minority: ['Rêveur', 'Idéaliste', 'Poète'] },
  identite:   { majority: ['Miroir', 'Conformiste', 'Pilier'],                 minority: ['Différent', 'Singulier', 'Unique'] },
  societe:    { majority: ['Solidaire', 'Citoyen', 'Pilier social'],           minority: ['Critique', 'Dissident', 'Révolutionnaire'] },
  travail:    { majority: ['Collègue', 'Pragmatique', "Pilier d'équipe"],      minority: ['Indépendant', 'Visionnaire', 'Pionnier'] },
  vie:        { majority: ['Ancré', 'Réaliste', 'Sage'],                       minority: ['Libre', 'Philosophe', 'Oracle'] },
  superpower: { majority: ['Prudent', 'Calculateur', 'Stratège'],              minority: ['Casse-cou', 'Téméraire', 'Légende'] },
}

export const CONTRIB_BADGES = {
  moral:      ['Questionneur', 'Éthicien', 'Maître éthicien'],
  amour:      ['Conteur', 'Romantique', 'Poète du cœur'],
  identite:   ['Explorateur', 'Introspectif', 'Maître de soi'],
  societe:    ['Observateur', 'Militant', 'Visionnaire'],
  travail:    ['Stagiaire', 'Bâtisseur', 'Architecte'],
  vie:        ['Curieux', 'Sage', 'Maître de vie'],
  superpower: ['Stagiaire héros', 'Scénariste', 'Créateur de mondes'],
}

const VOTE_MIN = 5
const VOTE_THRESHOLDS = [60, 75, 90]
const CONTRIB_THRESHOLDS = [1, 3, 5]

// Returns earned vote badge for a category, or null if locked
export function calcVoteBadge(category, history) {
  const entries = history.filter(h => h.question.category === category)
  if (entries.length < VOTE_MIN) return null

  const badges = VOTE_BADGES[category]
  if (!badges) return null

  let withMajority = 0
  let counted = 0

  for (const { vote, counts } of entries) {
    const total = counts.A + counts.B
    if (total === 0) continue
    const majorityChoice = counts.A >= counts.B ? 'A' : 'B'
    if (vote.choice === majorityChoice) withMajority++
    counted++
  }

  if (counted === 0) return null

  const pctWith = (withMajority / counted) * 100
  const pctAgainst = 100 - pctWith

  let side, pct
  if (pctWith >= 60) { side = 'majority'; pct = pctWith }
  else if (pctAgainst >= 60) { side = 'minority'; pct = pctAgainst }
  else return { id: `vote_${category}_neutral`, label: 'Imprévisible', level: 0, side: 'neutral', category, type: 'vote', count: entries.length, pct: null }

  const level = pct >= VOTE_THRESHOLDS[2] ? 2 : pct >= VOTE_THRESHOLDS[1] ? 1 : 0
  return {
    id: `vote_${category}_${side}`,
    label: badges[side][level],
    level,
    side,
    category,
    type: 'vote',
    count: entries.length,
    pct: Math.round(pct),
  }
}

// Returns earned contribution badge for a category, or null if none
export function calcContribBadge(category, count) {
  if (!count || count === 0) return null
  const badges = CONTRIB_BADGES[category]
  if (!badges) return null

  const level = count >= CONTRIB_THRESHOLDS[2] ? 2 : count >= CONTRIB_THRESHOLDS[1] ? 1 : 0
  return {
    id: `contrib_${category}`,
    label: badges[level],
    level,
    category,
    type: 'contrib',
    count,
  }
}

export function getCategoryColor(category) {
  return CATEGORIES[category]?.color || '#7F77DD'
}

export const CATEGORY_KEYS = Object.keys(CATEGORIES)

export const LEVEL_DOTS = ['•', '••', '•••']
