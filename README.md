# 📝 Le petit blog

Un blog minimaliste pour enfant, hébergé gratuitement sur Cloudflare.
Inspiré par [pbnj](https://github.com/bhavnicksm/pbnj) — single auth key, zero account, déploiement en quelques minutes.

## Stack

- **Astro 5** (SSR sur Cloudflare Workers)
- **Cloudflare D1** (SQLite) pour les posts
- **Trix** comme éditeur rich text (~50 KB, output HTML propre)
- **sanitize-html** pour nettoyer le HTML avant insertion en base

## Features

- ✅ Liste publique des posts, page individuelle, sans JS côté visiteur
- ✅ Interface admin protégée par un mot de passe unique (`AUTH_KEY`)
- ✅ Éditeur rich text : titres, gras/italique, listes, blockquote, liens, code
- ✅ Slugs auto-générés depuis le titre (avec gestion de collisions)
- ✅ Sanitization stricte du HTML (XSS-safe)
- ✅ Suppression d'articles

## Pas dans le scope

- ❌ Pas d'images (l'enfant écrit, c'est tout)
- ❌ Pas de commentaires
- ❌ Pas de multi-user
- ❌ Pas de drafts

## Setup (5 minutes)

```bash
# 1. Installer
npm install

# 2. Créer la base D1
npx wrangler d1 create petit-blog-db
# → copier le database_id retourné dans wrangler.toml

# 3. Initialiser le schéma (local + remote)
npm run db:init
npm run db:init:remote

# 4. Définir le mot de passe admin
npx wrangler secret put AUTH_KEY
# → entrer un mot de passe robuste

# 5. Dev local
npm run dev

# 6. Déployer
npm run deploy
```

Ton blog est en ligne sur `https://petit-blog.<ton-compte>.workers.dev`.
L'admin est sur `/admin`.

## Architecture

```
src/
├── layouts/Public.astro        # layout public (header, fonts, palette)
├── pages/
│   ├── index.astro             # liste des posts
│   ├── [slug].astro            # post individuel
│   ├── admin/index.astro       # login + éditeur Trix
│   └── api/
│       ├── create.ts           # POST nouveau post
│       └── delete.ts           # supprimer un post
├── lib/db.ts                   # helpers D1 + sanitization + auth cookie
└── env.d.ts                    # types
```

~280 lignes au total. Pas de framework state, pas de hydration, pas de build complexe.

## Sécurité

- Auth via cookie `HttpOnly; Secure; SameSite=Strict`, valeur = AUTH_KEY
- HTML sanitisé avec une allowlist stricte avant insertion en DB
- Pas d'inputs utilisateur (visiteur) du tout, surface d'attaque minimale
- Pour révoquer un accès admin compromis : `wrangler secret put AUTH_KEY` (nouvelle valeur)

## Coût

D1 free tier : 500 MB / 5M reads jour / 100k writes jour.
À raison d'un post de 5 KB par jour, ça tient ~270 ans. Aucun risque de facturation.
