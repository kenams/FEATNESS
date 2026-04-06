update public.drink_blends
set is_available = false
where slug in (
  'hydration-electrolyte-mix',
  'recovery-protein-mix',
  'endurance-carb-blend'
);

insert into public.drink_blends (
  slug,
  name,
  description,
  target_goal,
  price_eur,
  is_available
)
values
  (
    'bowl-poulet-riz-courgette',
    'Bowl poulet, riz, courgette',
    'Effort leger a moyen. Poulet maigre, riz basmati et courgette pour une recuperation simple et digeste.',
    'recovery',
    10.90,
    true
  ),
  (
    'omelette-sport-tartines-completes',
    'Omelette sport + tartines completes',
    'Effort leger. Oeufs, pain complet et legumes pour recuperer sans lourdeur.',
    'recovery',
    9.90,
    true
  ),
  (
    'skyr-bowl-banane-flocons-davoine',
    'Skyr bowl banane-flocons d''avoine',
    'Effort leger. Skyr, banane et avoine pour rehydrater et relancer doucement.',
    'hydration',
    8.90,
    true
  ),
  (
    'wrap-dinde-avocat',
    'Wrap dinde-avocat',
    'Effort leger. Dinde, avocat et tortilla complete pour un repas rapide et equilibre.',
    'recovery',
    10.40,
    true
  ),
  (
    'saumon-pommes-de-terre-haricots-verts',
    'Saumon, pommes de terre vapeur, haricots verts',
    'Effort leger a moyen. Saumon, pommes de terre et legumes verts pour recuperer proprement.',
    'recovery',
    12.90,
    true
  ),
  (
    'porridge-proteine-post-cardio',
    'Porridge proteine post-cardio',
    'Effort leger a moyen. Avoine, lait, skyr et banane pour recharger juste apres cardio.',
    'hydration',
    8.70,
    true
  ),
  (
    'poulet-patate-douce-brocoli',
    'Poulet, patate douce, brocoli',
    'Effort moyen. Reference FEATNESS avec glucides lents et proteines maigres.',
    'recovery',
    11.90,
    true
  ),
  (
    'bowl-quinoa-thon-avocat',
    'Bowl quinoa, thon, avocat',
    'Effort moyen. Bowl frais et complet avec quinoa, thon et avocat.',
    'hydration',
    11.40,
    true
  ),
  (
    'pates-completes-au-poulet',
    'Pates completes au poulet',
    'Effort moyen. Base glucidique genereuse avec poulet et sauce tomate nature.',
    'performance',
    11.70,
    true
  ),
  (
    'riz-boeuf-maigre-poivrons',
    'Riz, boeuf maigre, poivrons',
    'Effort moyen. Riz, boeuf maigre et poivrons pour remonter l''energie.',
    'performance',
    12.30,
    true
  ),
  (
    'chili-leger-recuperation',
    'Chili leger recuperation',
    'Effort moyen. Dinde, haricots rouges et riz pour recuperer avec un plat complet.',
    'recovery',
    11.30,
    true
  ),
  (
    'salade-lentilles-oeufs-feta',
    'Salade de lentilles, oeufs, feta',
    'Effort moyen. Option froide et proteinee avec legumes et lentilles.',
    'recovery',
    10.20,
    true
  ),
  (
    'burrito-bowl-dinde-riz',
    'Burrito bowl dinde-riz',
    'Effort moyen a intense. Riz, dinde et haricots pour remonter les glucides plus haut.',
    'performance',
    11.80,
    true
  ),
  (
    'cabillaud-semoule-legumes-rotis',
    'Cabillaud, semoule, legumes rotis',
    'Effort moyen. Poisson maigre, semoule complete et legumes rotis.',
    'recovery',
    12.10,
    true
  ),
  (
    'saumon-riz-complet-avocat',
    'Saumon, riz complet, avocat',
    'Effort intense. Saumon, riz complet et avocat pour recharger fort.',
    'performance',
    13.40,
    true
  ),
  (
    'poulet-teriyaki-maison-nouilles-de-riz',
    'Poulet teriyaki maison + nouilles de riz',
    'Effort intense. Gros focus glucides avec poulet, legumes et nouilles de riz.',
    'performance',
    12.90,
    true
  ),
  (
    'poke-bowl-thon-riz-mangue',
    'Poke bowl thon-riz-mangue',
    'Effort intense. Bowl frais avec thon, riz, mangue et edamame.',
    'performance',
    13.20,
    true
  ),
  (
    'gnocchis-dinde-sauce-tomate',
    'Gnocchis, dinde, sauce tomate',
    'Effort intense. Gnocchis et dinde pour recharger vite apres une grosse seance.',
    'performance',
    12.40,
    true
  ),
  (
    'curry-de-poulet-riz-coco-leger',
    'Curry de poulet, riz, coco leger',
    'Effort intense. Riz basmati, poulet et curry leger pour un repas rassasiant.',
    'performance',
    12.80,
    true
  ),
  (
    'bol-recovery-yaourt-granola-fruits-toast-oeufs',
    'Bol recovery yaourt + granola + fruits + toast oeufs',
    'Effort intense ou recovery complet. Yaourt, granola, fruits et toast oeufs.',
    'recovery',
    10.60,
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  target_goal = excluded.target_goal,
  price_eur = excluded.price_eur,
  is_available = excluded.is_available;
