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
- Système de streak et gamification
- Questions sponsorisées
- Faire apparaître les soumissions approuvées dans le feed

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
