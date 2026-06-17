-- Migration 0081 : Configs landing Campus dans landing_config
-- Toutes les valeurs de la page Campus membre sont paramétrables ici

INSERT OR IGNORE INTO landing_config (key, value) VALUES
  -- ── Textes hero ─────────────────────────────────────────────
  ('campus_hero_title',         'Club privé d''éducation'),
  ('campus_hero_title_accent',  'financière'),
  ('campus_hero_pillar_badge',  'Pilier n°1 — Éducation Financière'),
  ('campus_hero_slogan',        '"Ensemble, faisons une différence"'),
  ('campus_hero_desc',          'Campus LEADER est le 1er des 6 piliers de l''éducation financière de LEADER. Une plateforme exclusive réservée aux membres de notre communauté — des formations conçues par les meilleurs formateurs, coachs et conférenciers de la planète pour transformer ta façon de voir l''argent, les affaires et ta vie.'),

  -- ── Stats hero ──────────────────────────────────────────────
  ('campus_stat_courses',       '100+'),
  ('campus_stat_courses_label', 'Formations'),
  ('campus_stat_hours',         '1 000h+'),
  ('campus_stat_hours_label',   'De contenu'),
  ('campus_stat_cats_label',    'Catégories'),
  ('campus_stat_access',        '∞'),
  ('campus_stat_access_label',  'Accès illimité'),

  -- ── CTAs ────────────────────────────────────────────────────
  ('campus_cta_access',         'Accéder à mes formations'),
  ('campus_cta_get_access',     'Obtenir l''accès Campus'),
  ('campus_cta_explore',        'Explorer les formations'),
  ('campus_cta_scroll',         'Explorer'),

  -- ── Section formateurs ──────────────────────────────────────
  ('campus_coaches_title',      'Les meilleurs experts de la planète'),
  ('campus_coaches_desc',       'Nos formations sont conçues et animées par des formateurs d''exception — entrepreneurs millionnaires, investisseurs reconnus, coachs certifiés et conférenciers internationaux. Pas de théorie creuse : des méthodes éprouvées, des résultats concrets.'),
  ('campus_coaches_badge_1',    'Formateurs certifiés'),
  ('campus_coaches_badge_2',    'Conférenciers internationaux'),
  ('campus_coaches_badge_3',    'Entrepreneurs & investisseurs'),
  ('campus_coaches_badge_4',    'Coachs & mentors d''élite'),

  -- ── Bannière accès refusé ───────────────────────────────────
  ('campus_banner_title',       'Les formations ci-dessous sont verrouillées'),
  ('campus_banner_desc',        'L''accès Campus est inclus dans certains packages LEADER. Clique sur une formation pour en savoir plus.'),
  ('campus_banner_cta',         'Voir les packages'),

  -- ── 6 piliers ───────────────────────────────────────────────
  ('campus_pillars_title',      'Les 6 piliers de l''éducation financière'),
  ('campus_pillars_desc',       'Campus est le premier. Les 5 autres piliers arrivent bientôt.'),

  ('campus_pillar_1_label',     'S''Éduquer'),
  ('campus_pillar_1_icon',      'fa-graduation-cap'),
  ('campus_pillar_1_color',     '#c9a84c'),
  ('campus_pillar_1_active',    '1'),

  ('campus_pillar_2_label',     'Créer la richesse'),
  ('campus_pillar_2_icon',      'fa-seedling'),
  ('campus_pillar_2_color',     '#4ade80'),
  ('campus_pillar_2_active',    '0'),

  ('campus_pillar_3_label',     'Protéger sa richesse'),
  ('campus_pillar_3_icon',      'fa-shield-halved'),
  ('campus_pillar_3_color',     '#60a5fa'),
  ('campus_pillar_3_active',    '0'),

  ('campus_pillar_4_label',     'Multiplier sa richesse'),
  ('campus_pillar_4_icon',      'fa-chart-line'),
  ('campus_pillar_4_color',     '#a78bfa'),
  ('campus_pillar_4_active',    '0'),

  ('campus_pillar_5_label',     'Profiter de sa richesse'),
  ('campus_pillar_5_icon',      'fa-gem'),
  ('campus_pillar_5_color',     '#f472b6'),
  ('campus_pillar_5_active',    '0'),

  ('campus_pillar_6_label',     'Partager'),
  ('campus_pillar_6_icon',      'fa-heart-handshake'),
  ('campus_pillar_6_color',     '#fb923c'),
  ('campus_pillar_6_active',    '0');
