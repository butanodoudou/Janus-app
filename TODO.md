# d·lemm — TODO

## À faire maintenant (bêta)

- [x] **Réactions rapides** — 5 emojis post-vote (😱 🤔 😈 🫶 🤯), agrégat affiché sous les %

- [ ] **Contenu** — générer 30-40 dlemms via Claude + injection SQL pour avoir un vrai feed

- [ ] **OG image** — convertir `/public/og-image.svg` en `/public/og-image.png`

## MCP Supabase

- [ ] Ouvrir un **nouveau chat** Claude Code (pas continuer une session) pour activer le MCP
  - Le `.mcp.json` est configuré avec le token (ignoré par git)
  - Une fois actif : Claude peut créer les tables SQL lui-même

## Agent de modération IA

- [ ] Cron job soir → fetch `submissions` pending → Claude évalue → résumé à l'admin
- [ ] Choisir canal de notif : Email (Resend) / Telegram / Slack
- [ ] Ajouter colonnes `ai_recommendation` et `ai_reason` à la table `submissions`

## V1 (après bêta)

- [ ] Auth email / Google (Supabase Auth)
- [ ] % en temps réel (Supabase Realtime)
- [ ] Carte de partage générée côté serveur (Satori + Sharp)
- [ ] Générateur de dlemms IA dans l'admin (pour le stock quotidien)
- [ ] Questions sponsorisées
- [ ] Passe orthographique via LLM avant lancement alpha

## Idées à discuter

- [ ] Réactions + commentaires courts (140 car.) — Option A/B/C à trancher
- [ ] Leaderboard anonyme par nb de dlemms répondus
- [ ] Badges de personnalité partageables ("Rebelle", "Consensuel", "Imprévisible")
