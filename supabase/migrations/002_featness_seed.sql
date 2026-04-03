insert into public.drink_blends (slug, name, description, target_goal)
values
  (
    'hydration-electrolyte-mix',
    'Hydration Electrolyte Mix',
    'Melange hydratation pour efforts courts a moderes avec sodium et electrolytes.',
    'hydration'
  ),
  (
    'recovery-protein-mix',
    'Recovery Protein Mix',
    'Melange recuperation avec proteines et glucides pour les seances chargees.',
    'recovery'
  ),
  (
    'endurance-carb-blend',
    'Endurance Carb Blend',
    'Melange performance avec priorite glucidique pour les seances longues.',
    'performance'
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  target_goal = excluded.target_goal;
