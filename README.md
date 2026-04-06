# FEATNESS

Le repas parfait apres ton effort.

FEATNESS repose maintenant sur deux experiences complementaires :
- une app mobile Expo pour le sportif
- une app web unique pour l'utilisateur et l'administration

## Architecture

| App | Role | Stack | Port |
| --- | --- | --- | --- |
| mobile | Experience sportif mobile | Expo + React Native | - |
| dashboard | App web FEATNESS unique (`/app` + `/admin`) | Next.js 14 | 3001 |
| kiosk | Borne de distribution / demo terrain | Next.js 14 | 3000 |
| shared | Algo nutrition + types | TypeScript | - |

## Prerequis

- Node 18+
- npm 9+
- un projet Supabase
- un compte Stripe en mode test si tu veux valider le paiement borne
- Expo Go pour tester le mobile

## Installation

```bash
git clone https://github.com/kenams/FEATNESS.git
cd FEATNESS
npm install
```

## Configuration Supabase

1. Cree un projet sur `supabase.com`
2. Renseigne les `.env.local` de :
   - `apps/dashboard`
   - `apps/kiosk`
   - `apps/mobile`
3. Dans `Supabase Dashboard -> SQL Editor`, execute dans l'ordre :
   - `supabase/migrations/001_featness_core.sql`
   - `supabase/migrations/002_featness_seed.sql`
   - `supabase/migrations/003_payments.sql`
   - `supabase/migrations/004_owner_role.sql`
   - `supabase/migrations/005_push_tokens.sql`
   - `supabase/migrations/006_user_preferences_and_meal_selection.sql`
   - `supabase/migrations/007_profile_health_inputs.sql`
4. Cree un compte admin FEATNESS :

```sql
update public.profiles
set role = 'owner'
where email = 'votre-email@example.com';
```

## Configuration Stripe

Variables utiles uniquement pour la borne `apps/kiosk` :

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Webhook local :

```bash
stripe listen --forward-to localhost:3000/api/payment/webhook
```

## Lancement local

```bash
# Web FEATNESS unique
npm run dev:web

# Borne
npm run dev:kiosk

# Mobile
npm run dev:mobile
```

Applications :

- web FEATNESS : `http://localhost:3001`
- espace utilisateur : `http://localhost:3001/app`
- espace admin : `http://localhost:3001/admin/overview`
- borne demo : `http://localhost:3000`

## Parcours MVP recommande

### 1. Web utilisateur

1. Ouvre `http://localhost:3001/login`
2. Cree un compte utilisateur
3. Complete la fiche sante dans `/app`
4. Choisis une seance suggeree
5. Valide un plat recommande
6. Genere un QR uniquement si necessaire

### 2. Web admin

1. Connecte-toi avec un compte `owner`
2. Va sur `/admin/overview`
3. Gere les bornes, commandes et menu

### 3. Mobile

1. Lance Expo avec `npm run dev:mobile`
2. Ouvre Expo Go
3. Connecte-toi ou cree un compte
4. Complete la fiche sante
5. Choisis une seance suggeree
6. Valide un plat
7. Genere le QR seulement si tu veux poursuivre sur la borne

### 4. Borne

1. Ouvre `http://localhost:3000`
2. Utilise `Mode demo` ou scanne un QR FEATNESS
3. Passe par le flow repas -> paiement -> distribution

## Notes utiles

- le web FEATNESS est maintenant la surface la plus simple a deployer sur Vercel
- le mobile reste le produit principal pour l'utilisateur final
- l'espace admin vit dans la meme app web que l'espace utilisateur
- la borne reste disponible comme experience terrain / demo
- le guide de demonstration rapide est dans `DEMO.md`

## Verification

```bash
npm run check
npm run build:web
npm run build:kiosk
cd apps/mobile && npx expo export
```
