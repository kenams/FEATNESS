# FEATNESS

Le repas parfait apres ton effort.

FEATNESS combine une app mobile, une borne de distribution et un dashboard B2B
pour transformer une seance de sport en recommandation nutritionnelle payable
et distribuable sur place.

## Architecture

| App | Role | Stack | Port |
| --- | --- | --- | --- |
| mobile | App sportif | Expo + React Native | - |
| kiosk | Interface borne physique | Next.js 14 | 3000 |
| dashboard | Dashboard gerant B2B | Next.js 14 | 3001 |
| shared | Algo nutrition + types | TypeScript | - |

## Prerequis

Node 18+, npm 9+, compte Supabase, compte Stripe en mode test, Expo CLI

## Installation

```bash
git clone <repo>
cd nutrition-kiosk-mvp
npm install
```

## Configuration Supabase

1. Creer un projet sur `supabase.com`
2. Copier l'URL et les cles dans les `.env.local` de chaque app
3. Aller dans `Supabase Dashboard -> SQL Editor`
4. Executer les migrations dans l'ordre :
   - `supabase/migrations/001_featness_core.sql`
   - `supabase/migrations/002_featness_seed.sql`
   - `supabase/migrations/003_payments.sql`
   - `supabase/migrations/004_owner_role.sql`
   - `supabase/migrations/005_push_tokens.sql`
5. Creer un compte owner :
   - creer un utilisateur dans Supabase Auth avec email/password
   - puis executer :

```sql
update public.profiles
set role = 'owner'
where id = '<user_id>';
```

## Configuration Stripe

1. Creer un compte sur `stripe.com`
2. Recuperer les cles test dans `Dashboard -> Developers -> API keys`
3. Renseigner :
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
4. Pour tester le webhook en local :

```bash
stripe listen --forward-to localhost:3000/api/payment/webhook
```

5. Copier le `whsec_...` affiche dans `STRIPE_WEBHOOK_SECRET`

## Lancement

```bash
# Terminal 1 — Borne
cd apps/kiosk
npm run dev

# Terminal 2 — Dashboard B2B
cd apps/dashboard
npm run dev

# Terminal 3 — App mobile
cd apps/mobile
npx expo start
```

## Flux de demo complet (sans materiel physique)

1. Ouvrir la borne sur `http://localhost:3000`
2. Cliquer `Mode demo` en bas a droite
3. Cliquer `Tester directement sur cette borne ->`
4. Selectionner un repas puis confirmer
5. Sur l'ecran de paiement, cliquer `Payer ... Carte test ****4242`
6. Observer la distribution simulee
7. Verifier dans le dashboard `/orders` que la commande apparait

## Flux reel (avec app mobile)

1. Creer un compte dans l'app mobile
2. Renseigner le profil
3. Creer une seance et obtenir le QR code
4. Sur la borne, scanner le QR code
5. Selectionner un repas, payer, puis recuperer le repas

## Notes utiles

- Le dashboard n'a pas d'inscription publique : les comptes `owner` sont crees
  manuellement dans Supabase.
- La borne utilise `NEXT_PUBLIC_KIOSK_ID` comme identifiant physique unique.
- Le mode demo cree un profil FEATNESS fictif stable par borne.
- Pour les checks locaux :

```bash
npm run check
npm run build --workspace @featness/kiosk
cd apps/mobile && npx expo export
```
