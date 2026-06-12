-- ============================================================
-- Migration 0071 — Landing Page LEADER
-- Tables : landing_config, services, testimonials, landing_sections
-- ============================================================

-- ── 1. landing_config — paramètres globaux de la landing ──────────
CREATE TABLE IF NOT EXISTS landing_config (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         TEXT UNIQUE NOT NULL,
  value       TEXT NOT NULL DEFAULT '',
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Valeurs par défaut
INSERT OR IGNORE INTO landing_config (key, value) VALUES
  ('hero_title',        'Révéler. Prospérer. Inspirer.'),
  ('hero_subtitle',     'Un écosystème unique de services pensé pour révéler votre potentiel, accélérer votre prospérité et inspirer ceux qui vous entourent.'),
  ('hero_cta_label',    'Accéder à mon espace'),
  ('hero_cta_url',      '/login'),
  ('hero_cta2_label',   'Découvrir les services'),
  ('hero_cta2_url',     '#services'),
  ('stats_members',     '12 000+'),
  ('stats_members_label', 'Membres actifs'),
  ('stats_countries',   '47'),
  ('stats_countries_label', 'Pays'),
  ('stats_services',    '14'),
  ('stats_services_label', 'Services'),
  ('stats_years',       '5+'),
  ('stats_years_label', 'Années d''excellence'),
  ('about_title',       'Un écosystème pensé pour les ambitieux'),
  ('about_text',        'LEADER réunit sous un même toit les meilleurs outils pour former, financer, développer et élever chaque membre de notre communauté mondiale.'),
  ('services_title',    'Nos Services'),
  ('services_subtitle', 'Des solutions complètes pour chaque dimension de votre réussite'),
  ('testimonials_title','Ils ont transformé leur vie'),
  ('testimonials_subtitle', 'Des milliers de membres témoignent de leur transformation'),
  ('cta_final_title',   'Prêt à rejoindre l''aventure LEADER ?'),
  ('cta_final_subtitle','Rejoignez une communauté internationale d''entrepreneurs ambitieux.'),
  ('cta_final_label',   'Rejoindre LEADER'),
  ('cta_final_url',     '/register'),
  ('footer_tagline',    'Révéler. Prospérer. Inspirer.'),
  ('meta_title',        'LEADER — Révéler. Prospérer. Inspirer.'),
  ('meta_description',  'LEADER est un écosystème unique de 14 services pour révéler votre potentiel, accélérer votre prospérité et inspirer votre entourage.'),
  ('landing_active',    '1');

-- ── 2. services — les 16 services LEADER ──────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  url           TEXT NOT NULL DEFAULT '',
  logo_url      TEXT NOT NULL DEFAULT '',
  logo_data_uri TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','coming_soon','inactive')),
  display_order INTEGER NOT NULL DEFAULT 0,
  category      TEXT NOT NULL DEFAULT 'general',
  bg_color      TEXT NOT NULL DEFAULT '#1A1A26',
  text_color    TEXT NOT NULL DEFAULT '#FFFFFF',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Les 16 services
INSERT OR IGNORE INTO services (name, slug, description, url, logo_url, status, display_order, category, bg_color) VALUES
  ('Campus',              'campus',           'La plateforme de formation en ligne de référence pour développer vos compétences.', 'https://www.leaderbackoffice.com/campus', 'https://www.genspark.ai/api/files/s/7McAtYcm', 'active', 1,  'formation',    '#FFFFFF'),
  ('Ezra',                'ezra',             'Votre assistant IA personnel pour booster votre productivité quotidienne.', 'https://app.ezra-app.com', 'https://www.genspark.ai/api/files/s/yLhIGHTp', 'active', 2,  'technologie',  '#FFFFFF'),
  ('Finstrategia',        'finstrategia',     'Stratégies financières expertes pour optimiser et sécuriser votre patrimoine.', 'https://finstrategia.com', 'https://www.genspark.ai/api/files/s/AdSYmzvF', 'active', 3,  'finance',      '#FFFFFF'),
  ('Will Be Coaching',    'will-be-coaching', 'Coaching professionnel et personnel pour atteindre vos objectifs les plus ambitieux.', 'https://willbecoaching.com', 'https://www.genspark.ai/api/files/s/IqBP6I1l', 'active', 4,  'coaching',     '#FFFFFF'),
  ('Université de l''IA', 'universite-ia',    'Maîtrisez l''intelligence artificielle avec les meilleures formations disponibles.', 'https://luniversitedelia.com', 'https://www.genspark.ai/api/files/s/Dx0xJHZj', 'active', 5,  'formation',    '#1E0A3C'),
  ('Luxia',               'luxia',            'Services de conciergerie haut de gamme pour un mode de vie d''exception.', 'https://luxia-elite-flow.base44.app', 'https://www.genspark.ai/api/files/s/QQg63yML', 'active', 6,  'lifestyle',    '#FFFFFF'),
  ('Élan',                'elan',             'Programme d''accompagnement premium pour propulser votre croissance personnelle.', 'https://elan.leaderbackoffice.com', 'https://www.genspark.ai/api/files/s/q3SfywOM', 'active', 7,  'coaching',     '#0D1B3E'),
  ('Eventys',             'eventys',          'La billetterie événementielle de référence pour tous vos événements LEADER.', 'https://willbe.tickets-partners.com/', 'https://www.genspark.ai/api/files/s/Bd5LySHT', 'active', 8,  'evenements',   '#FFFFFF'),
  ('Stars',               'stars',            'Le programme élite réservé aux membres les plus performants de l''écosystème.', 'https://luxia-elite-flow.base44.app', 'https://www.genspark.ai/api/files/s/Lmf8vGZr', 'active', 9,  'elite',        '#F5F0E8'),
  ('Entreprendre',        'entreprendre',     'L''incubateur LEADER pour lancer et accélérer vos projets entrepreneuriaux.', 'https://willbecoaching.com/Incubateur', 'https://www.genspark.ai/api/files/s/HmLISJ1j', 'active', 10, 'entrepreneuriat', '#FFFFFF'),
  ('LeadX',               'leadx',            'La marketplace globale pour développer votre business à l''international.', 'https://scktch-gh.myshopify.com/?country=RE', 'https://www.genspark.ai/api/files/s/7VYc45OP', 'active', 11, 'marketplace',  '#1A1A1A'),
  ('Spark',               'spark',            'La prochaine révolution au sein de l''écosystème LEADER. Bientôt disponible.', '', 'https://www.genspark.ai/api/files/s/ogQslXWG', 'coming_soon', 12, 'technologie',  '#FFFFFF'),
  ('Will Be Pay',         'will-be-pay',      'La solution de paiement nouvelle génération pensée pour les membres LEADER.', '', 'https://www.genspark.ai/api/files/s/2i7I8Z98', 'coming_soon', 13, 'finance',      '#0D1B3E'),
  ('Will Be Call',        'will-be-call',     'La plateforme de communication unifiée de l''écosystème LEADER.', '', 'https://www.genspark.ai/api/files/s/oN5WhCMy', 'coming_soon', 14, 'technologie',  '#FFFFFF'),
  ('Nexora',              'nexora',           'Une nouvelle dimension de l''écosystème LEADER. Restez connectés.', '', 'https://www.genspark.ai/api/files/s/wHeEdWWg', 'coming_soon', 15, 'technologie',  '#CC0000'),
  ('Will Be Immo',        'will-be-immo',     'L''immobilier premium au service des membres de l''écosystème LEADER.', '', 'https://www.genspark.ai/api/files/s/tBw82mI4', 'coming_soon', 16, 'immobilier',   '#FFFFFF');

-- ── 3. testimonials ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimonials (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  author_name    TEXT NOT NULL,
  author_role    TEXT NOT NULL DEFAULT '',
  author_country TEXT NOT NULL DEFAULT '',
  author_photo   TEXT NOT NULL DEFAULT '',
  content        TEXT NOT NULL,
  rating         INTEGER NOT NULL DEFAULT 5 CHECK(rating BETWEEN 1 AND 5),
  transformation TEXT NOT NULL DEFAULT '',
  source         TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','trustpilot')),
  is_featured    INTEGER NOT NULL DEFAULT 0,
  display_order  INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Témoignages initiaux (à enrichir via admin)
INSERT OR IGNORE INTO testimonials (author_name, author_role, author_country, content, rating, transformation, is_featured, display_order) VALUES
  ('Marie L.',     'Entrepreneuse',           'France',         'LEADER a complètement transformé ma façon d''entreprendre. En 18 mois, j''ai multiplié mes revenus par 4 grâce à l''écosystème Campus et Finstrategia.', 5, 'Revenus ×4 en 18 mois',     1, 1),
  ('Jean-Paul M.', 'Consultant',              'Belgique',       'L''université de l''IA m''a permis de me repositionner sur le marché. Les formations sont d''une qualité exceptionnelle et les résultats sont immédiats.', 5, 'Reconversion réussie en 6 mois', 1, 2),
  ('Amina K.',     'Coach professionnelle',   'Maroc',          'Will Be Coaching et Élan m''ont donné les outils pour devenir la meilleure version de moi-même. Je recommande à 100%.', 5, 'Libérée financièrement',    1, 3),
  ('Thomas R.',    'Investisseur',            'Suisse',         'Finstrategia a optimisé mon patrimoine de façon remarquable. Une expertise financière sans équivalent dans l''écosystème LEADER.', 5, 'Patrimoine optimisé',       1, 4),
  ('Sophie D.',    'Directrice commerciale',  'Canada',         'L''écosystème LEADER est unique. En un seul endroit, j''ai accès à tout ce dont j''ai besoin pour grandir : formation, coaching, réseau, outils.', 5, 'Chiffre d''affaires doublé', 0, 5),
  ('Karim B.',     'Chef de projet',          'Tunisie',        'LeadX m''a ouvert des portes que je ne soupçonnais même pas. Le marketplace global LEADER est une vraie révolution pour le développement business.', 5, 'Expansion internationale',  0, 6);

-- ── 4. landing_sections — sections visibles/cachées/ordonnées ─────
CREATE TABLE IF NOT EXISTS landing_sections (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  section_key   TEXT UNIQUE NOT NULL,
  label         TEXT NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO landing_sections (section_key, label, is_active, display_order) VALUES
  ('hero',         'Hero — Titre principal',       1, 1),
  ('stats',        'Statistiques clés',            1, 2),
  ('about',        'À propos de LEADER',           1, 3),
  ('services',     'Grille des services',          1, 4),
  ('testimonials', 'Témoignages membres',          1, 5),
  ('cta_final',    'Appel à l''action final',      1, 6),
  ('footer',       'Pied de page',                 1, 7);

-- ── Index ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_services_status        ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_order         ON services(display_order);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured  ON testimonials(is_featured);
CREATE INDEX IF NOT EXISTS idx_testimonials_active    ON testimonials(is_active);
CREATE INDEX IF NOT EXISTS idx_landing_config_key     ON landing_config(key);
