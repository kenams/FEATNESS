# FEATNESS Demo Script

Ce document sert a derouler une demonstration propre, courte et reproductible de FEATNESS.

## Compte de demonstration

- email : `featness.user.demo@mailinator.com`
- mot de passe : `test123456`

## Donnees attendues avant demo

Verifier dans Supabase que le compte demo possede :

- `age`
- `weight_kg`
- `height_cm`
- `primary_objective`
- `preferred_sport`
- `preferred_goal`
- au moins un `favorite_meal_ids`

Verifier aussi qu'au moins une `workout_session` recente contient :

- `recommended_blend`
- `selected_meal_blend_id`

## Recette UX telephone

Objectif : valider que le parcours utilisateur tient en quelques clics et reste lisible.

1. Ouvrir l'app mobile dans Expo Go.
2. Utiliser `Connexion test`.
3. Verifier le bandeau `Le chemin le plus court vers ton repas`.
4. Verifier que la fiche sante affiche age, poids, taille, objectif et IMC.
5. Choisir une seance suggeree.
6. Verifier que 3 plats recommandes apparaissent immediatement.
7. Ouvrir le detail du premier plat.
8. Cliquer `Valider ce plat`.
9. Verifier que le bloc QR apparait ensuite comme etape secondaire.
10. Verifier que l'historique remonte le plat retenu.

Points de controle :

- aucun texte ne doit parler du scan avant le choix du plat
- le QR doit rester secondaire
- le premier plat doit etre selectionnable en un clic
- le feedback utilisateur doit rester court et lisible

## Demo investisseur en 5 minutes

### 1. Mobile

Narratif :

- FEATNESS reduit le parcours a l'essentiel
- l'utilisateur remplit une fiche sante minimale
- FEATNESS suggere une seance utile
- puis recommande immediatement le bon plat

Sequence :

1. `Connexion test`
2. montrer la fiche sante et l'IMC
3. lancer une seance suggeree
4. montrer les 3 plats recommandes
5. valider le premier plat
6. montrer que le QR ne vient qu'apres

### 2. Dashboard utilisateur

Narratif :

- le meme parcours reste coherent sur le web
- les choix remontent entre mobile et dashboard

Sequence :

1. ouvrir `http://localhost:3001/app`
2. montrer la fiche sante
3. montrer la derniere seance
4. montrer le plat retenu
5. montrer le QR en seconde intention

### 3. Dashboard admin

Narratif :

- l'admin pilote ventes, catalogue, bornes et utilisateurs depuis une seule surface

Sequence :

1. ouvrir `http://localhost:3001/admin/overview`
2. passer par `Analytics`
3. montrer les filtres et l'export CSV
4. ouvrir `Users`
5. montrer les preferences utilisateur et le plat retenu
6. ouvrir `Menu` puis `Kiosks` pour illustrer la supervision

## Checklist de preparation demo

- lancer `npm run dev:web`
- lancer `npm run dev:kiosk`
- lancer `npm run dev:mobile`
- verifier que Supabase repond
- verifier que le compte demo se connecte
- verifier qu'au moins trois `drink_blends` sont presents
- fermer les anciennes sessions Expo Go avant de rescanner

## Checklist de remise au propre

Avant une demo importante :

- se reconnecter avec le compte demo
- relancer une seance courte
- choisir un seul plat
- verifier le dashboard user
- verifier le dashboard admin
- verifier qu'aucun message d'erreur n'est visible
