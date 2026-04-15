# d·lemm — CLAUDE.md

## Concept

**d·lemm** est une web app mobile-first de dlemms (dilemmes moraux A/B).
L'utilisateur répond à des questions clivantes sans bonne réponse évidente, voit les % de votes des autres en temps réel, et peut soumettre ses propres dlemms.

> Le mot "dilemme" est remplacé partout dans l'interface par **"dlemm"** — c'est le nom de marque propre au projet.

---

## Stack

| Couche | Techno |
|---|---|
| Frontend | React + Vite |
| Backend / DB | Supabase (PostgreSQL + REST) |
| Déploiement | Vercel |
| Auth | Anonyme — UUID persistant en localStorage |

---

## Base de données Supabase

### Table `votes`
| Colonne | Type | Description |
|---|---|---|
| id | uuid | Clé primaire |
| user_id | text | UUID anonyme du navigateur |
| question_id | text | Identifiant de la question (ex: "q1") |
| choice | char(1) | "A" ou "B" |
| date | text | Date du vote YYYY-MM-DD (limite daily) |
| created_at | timestamptz | Timestamp automatique |

### Table `submissions`
| Colonne | Type | Description |
|---|---|---|
| id | uuid | Clé primaire |
| category | text | Catégorie (moral, amour, etc.) |
| text | text | Texte de la question |
| option_a | text | Option A |
| option_b | text | Option B |
| status | text | "pending", "approved", "rejected" |
| created_at | timestamptz | Timestamp automatique |

RLS activé sur les deux tables, lecture et écriture publiques.

---

## Variables d'environnement

```
VITE_SB_URL=https://<project>.supabase.co
VITE_SB_KEY=<anon-key>
VITE_ADMIN_PIN=<pin-4-chiffres>
```

---

## Architecture fichiers

```
src/
├── App.jsx                  # Routing, admin tap logic (5 taps logo + PIN)
├── main.jsx
├── index.css
├── data/
│   └── questions.js         # 10 dlemms seedés + catégories avec couleurs
├── lib/
│   ├── supabase.js          # Client Supabase singleton
│   └── userId.js            # UUID anonyme via localStorage
└── components/
    ├── Feed.jsx             # Container du feed, gestion limite daily
    ├── QuestionCard.jsx     # Card avec vote A/B + animation % (optimistic update)
    ├── DailyLimitScreen.jsx # Écran limite + compte à rebours jusqu'à minuit
    ├── SubmitForm.jsx       # Formulaire soumission en 4 étapes
    ├── AdminPanel.jsx       # Modération des soumissions (pending/approved/rejected)
    ├── Profile.jsx          # Stats + historique des dlemms répondus
    ├── Nav.jsx              # Navigation bas (Feed / Proposer / Profil / Admin)
    └── PinModal.jsx         # Modal PIN pour accès admin
```

---

## Fonctionnalités V0

- **Feed** — dlemms un par un, vote A/B, animation % fond, compteur votes, Partager / Suivant
- **Limite daily** — 5 dlemms/jour après 30 réponses au total, compte à rebours minuit
- **Soumission** — formulaire guidé 4 étapes → status "pending"
- **Admin caché** — 5 taps sur le logo → PIN → panel de modération
- **Profil** — stats (total, aujourd'hui, restants) + historique des réponses avec %

---

## Catégories et couleurs

| Clé | Label | Couleur |
|---|---|---|
| moral | Moral | #7F77DD |
| amour | Amour | #D4537E |
| identite | Identité | #BA7517 |
| societe | Société | #378ADD |
| travail | Travail | #1D9E75 |
| vie | Vie | #0F6E56 |

---

## Design

- Mobile-first, max-width 430px
- Fond #fafafa, accent violet #7F77DD
- Typographie system-ui, poids 700/800
- Pas de lib CSS externe — tout en inline styles JS

---

## Règles de développement

- **Toujours demander confirmation** avant d'implémenter une idée ou une interprétation
- Pas de refactor au-delà de ce qui est demandé
- Pas de lib supplémentaire sans validation
- Le mot "dilemme" ne doit jamais apparaître dans l'UI — toujours "dlemm"

---

## Roadmap V1

- Auth email / Google (Supabase Auth)
- Vrais % en temps réel (Supabase Realtime)
- Carte de partage générée côté serveur (Satori + Sharp)
- Questions sponsorisées
- ~~Faire apparaître les soumissions approuvées dans le feed~~ ✅ Fait

---

## À discuter — Gamification

### Objectif
Donner envie de revenir, de progresser, de se comparer — sans trahir l'esprit brut et clivant du jeu.

### Pistes à explorer

**Streaks**
- Flamme si l'utilisateur répond au moins 1 dlemm par jour
- Récompense visuelle (badge, animation) aux paliers : 3j, 7j, 30j
- Question : faut-il pénaliser la perte de streak ou juste montrer le record ?

**Niveaux / titres**
- Basés sur le nombre total de dlemms répondus
- Ex : Novice → Penseur → Philosophe → Oracle
- S'affichent dans le profil, peut-être sur la card de partage

**Badges de personnalité**
- Analysés à partir des choix : si l'utilisateur vote souvent contre la majorité → badge "Rebelle"
- Si toujours avec la majorité → "Consensuel"
- Si ses choix sont imprévisibles → "Imprévisible"
- Fort potentiel viral (partageable)

**Classements**
- Leaderboard anonyme par nombre de dlemms répondus
- Ou par catégorie : "Top votants Moral cette semaine"
- Question : est-ce que ça colle avec l'anonymat actuel ?

**Dlemm du jour**
- Une question mise en avant chaque jour, identique pour tous
- Crée un moment collectif, booste l'engagement matinal
- Nécessite une colonne `featured_date` dans la table

---

## À discuter — Réactions & Commentaires

### Objectif
Permettre à l'utilisateur de réagir aux résultats — notamment quand les % sont surprenants ou choquants — sans créer un système de commentaires lourd à modérer.

### Option A — Réactions rapides (émojis)
Post-vote, l'utilisateur choisit une réaction parmi 4-5 :
- 😱 Choqué · 🤔 Mitigé · 😈 J'assume · 🫶 Je comprends · 🤯 Incroyable
- Affiché en agrégat sous les % ("32% 😱 · 18% 😈")
- Simple, rapide, pas de modération
- **Table à créer :** `reactions` (user_id, question_id, emoji, created_at)

### Option B — Commentaires courts
- Texte limité à 140 caractères, anonyme
- Affiché sous les résultats, triés par votes ("utile")
- Nécessite modération (+ agent IA ?)
- **Table à créer :** `comments` (user_id, question_id, text, created_at)

### Option C — Les deux
- Réactions toujours visibles (pas de modération)
- Commentaires optionnels, cachés derrière un "Voir les réactions" pour ne pas alourdir la card

### Questions ouvertes
- Est-ce qu'on veut de l'anonymat total ou un pseudo ?
- Modération : automatique (IA) ou manuelle ?
- Les commentaires sont-ils visibles avant ou après avoir voté ?

---

## À implémenter — Agent de modération IA

### Concept
Un agent Claude tourne chaque soir via un cron job. Il se connecte à Supabase via MCP, analyse toutes les soumissions `pending`, et envoie un résumé avec ses recommandations (approuver / refuser + justification) à l'admin. L'admin valide ou corrige, l'agent met à jour Supabase.

### Flow cible
1. Cron job soir → déclenche l'agent Claude
2. Agent fetch les `submissions` avec `status = 'pending'` via MCP Supabase
3. Claude évalue chaque dlemm (pertinence, qualité, originalité, respect des règles)
4. Push un résumé à l'admin avec recommandations
5. L'admin valide → l'agent met à jour les statuts dans Supabase

### Canal de notification
**À décider** — options : Email (Resend), Telegram bot, Slack, WhatsApp (Twilio)
Le canal conditionne aussi la façon dont l'admin répond pour valider.

### Tables à modifier
Ajouter à `submissions` :
- `ai_recommendation` text — "approved" | "rejected" | null
- `ai_reason` text — justification de l'IA
