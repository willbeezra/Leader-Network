-- Migration 0080: Campus intégré
-- Tables: campus_categories, campus_courses, campus_modules, campus_lessons, campus_progress, campus_course_instructors

-- ============================================================
-- TABLE: campus_categories
-- ============================================================
CREATE TABLE IF NOT EXISTS campus_categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#791E15',
  icon TEXT DEFAULT 'fa-graduation-cap',
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_campus_categories_slug ON campus_categories(slug);
CREATE INDEX IF NOT EXISTS idx_campus_categories_order ON campus_categories(display_order);

-- ============================================================
-- TABLE: campus_courses
-- ============================================================
CREATE TABLE IF NOT EXISTS campus_courses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  category_id TEXT REFERENCES campus_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT,
  description TEXT,
  instructor TEXT,
  instructor_bio TEXT,
  thumbnail_url TEXT,
  trailer_url TEXT,
  trailer_type TEXT DEFAULT 'youtube',  -- youtube | vimeo | drive
  price_usd REAL DEFAULT 0,
  is_free INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  is_featured INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  level TEXT DEFAULT 'all',             -- all | beginner | intermediate | advanced
  language TEXT DEFAULT 'fr',
  tags TEXT,                            -- JSON array
  meta_title TEXT,
  meta_description TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_campus_courses_slug ON campus_courses(slug);
CREATE INDEX IF NOT EXISTS idx_campus_courses_category ON campus_courses(category_id);
CREATE INDEX IF NOT EXISTS idx_campus_courses_active ON campus_courses(is_active);
CREATE INDEX IF NOT EXISTS idx_campus_courses_featured ON campus_courses(is_featured);
CREATE INDEX IF NOT EXISTS idx_campus_courses_order ON campus_courses(display_order);

-- ============================================================
-- TABLE: campus_modules
-- ============================================================
CREATE TABLE IF NOT EXISTS campus_modules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  course_id TEXT NOT NULL REFERENCES campus_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_campus_modules_course ON campus_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_campus_modules_order ON campus_modules(display_order);

-- ============================================================
-- TABLE: campus_lessons
-- ============================================================
CREATE TABLE IF NOT EXISTS campus_lessons (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  module_id TEXT NOT NULL REFERENCES campus_modules(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES campus_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_type TEXT DEFAULT 'youtube',   -- youtube | vimeo | drive | url
  duration_seconds INTEGER DEFAULT 0,
  duration_label TEXT,                 -- ex: "01:48:39"
  display_order INTEGER DEFAULT 0,
  is_free INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  transcript TEXT,
  resources TEXT,                      -- JSON array of {title, url}
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_campus_lessons_module ON campus_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_campus_lessons_course ON campus_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_campus_lessons_order ON campus_lessons(display_order);

-- ============================================================
-- TABLE: campus_progress
-- ============================================================
CREATE TABLE IF NOT EXISTS campus_progress (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL,
  course_id TEXT NOT NULL REFERENCES campus_courses(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES campus_lessons(id) ON DELETE CASCADE,
  completed INTEGER DEFAULT 0,
  progress_seconds INTEGER DEFAULT 0,
  completed_at DATETIME,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  UNIQUE(member_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_campus_progress_member ON campus_progress(member_id);
CREATE INDEX IF NOT EXISTS idx_campus_progress_course ON campus_progress(member_id, course_id);
CREATE INDEX IF NOT EXISTS idx_campus_progress_lesson ON campus_progress(lesson_id);

-- ============================================================
-- TABLE: campus_enrollments
-- ============================================================
CREATE TABLE IF NOT EXISTS campus_enrollments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL,
  course_id TEXT NOT NULL REFERENCES campus_courses(id) ON DELETE CASCADE,
  enrolled_at DATETIME DEFAULT (datetime('now')),
  completed_at DATETIME,
  is_active INTEGER DEFAULT 1,
  UNIQUE(member_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_campus_enrollments_member ON campus_enrollments(member_id);
CREATE INDEX IF NOT EXISTS idx_campus_enrollments_course ON campus_enrollments(course_id);

-- ============================================================
-- SEED: Catégories
-- ============================================================
INSERT OR IGNORE INTO campus_categories (id, name, slug, description, color, icon, display_order) VALUES
  ('cat-webinar-001', 'Webinar', 'webinar', 'Sessions live de leadership, mentorat, éducation financière et mindset', '#1a56a0', 'fa-video', 1),
  ('cat-leadership-001', 'Leadership', 'leadership', 'Développez votre leadership avec les plus grands experts mondiaux', '#791E15', 'fa-crown', 2),
  ('cat-mindset-001', 'Développement Personnel & Mindset', 'developpement-personnel-mindset', 'Transformez votre mindset et développez votre potentiel intérieur', '#2d6a4f', 'fa-brain', 3),
  ('cat-entreprise-001', 'Entreprise', 'entreprise', 'Maîtrisez les clés du succès entrepreneurial et économique', '#b5501e', 'fa-briefcase', 4);

-- ============================================================
-- SEED: Cours WEBINAR
-- ============================================================
INSERT OR IGNORE INTO campus_courses (id, category_id, title, slug, subtitle, description, instructor, is_free, display_order, total_lessons, language, thumbnail_url) VALUES
  ('course-webinar-001', 'cat-webinar-001', 'Webinar', 'webinar',
   'Sessions live Leadership, Mentorat, Éducation Financière & Mindset',
   'Nous donnerons à chaque étudiant désireux la possibilité d''enrichir sa vie grâce à la formation et à l''éducation en ligne. Accédez aux enregistrements complets de tous nos appels : Leadership Call, Mentorat, Éducation Financière, World Leadership et Q&A.',
   'Équipe LEADER', 1, 1, 84, 'fr', NULL);

-- ============================================================
-- SEED: Cours LEADERSHIP
-- ============================================================
INSERT OR IGNORE INTO campus_courses (id, category_id, title, slug, subtitle, description, instructor, is_free, display_order, total_lessons, language, thumbnail_url) VALUES
  ('course-lead-001', 'cat-leadership-001', '21 Lois du Leadership', '21-lois-du-leadership',
   'Les principes essentiels qui font d''un individu un leader efficace',
   'Dans Les 21 lois du leadership, John C. Maxwell révèle les principes essentiels qui font d''un individu un leader efficace. Chaque loi, comme la loi de l''influence, la loi du magnétisme et la loi de la navigation, offre des stratégies pratiques pour guider, inspirer et motiver les autres. Maxwell démontre que le leadership n''est pas un titre, mais une série de compétences à développer. Cette formation est une véritable boîte à outils pour ceux qui souhaitent renforcer leur impact, améliorer leurs compétences en gestion et bâtir des équipes performantes.',
   'John C. Maxwell', 1, 1, 8, 'fr', NULL),

  ('course-lead-002', 'cat-leadership-001', 'Élever Votre Niveau de Leadership', 'elever-votre-niveau-de-leadership',
   'Développez et affinez vos compétences de leader à travers des principes éprouvés',
   'John C. Maxwell nous enseigne comment développer et affiner nos compétences de leader à travers des principes éprouvés. Il explore les étapes nécessaires pour devenir un leader plus influent, inspirer les autres et créer un impact durable. Maxwell montre que le leadership est une compétence qui peut être cultivée, peu importe où l''on commence.',
   'John C. Maxwell', 1, 2, 4, 'fr', NULL),

  ('course-lead-003', 'cat-leadership-001', 'Keys to Becoming a Leader', 'keys-to-becoming-a-leader',
   'Les clés du leadership : devenez un leader inspirant et responsable',
   'Dr. Myles Munroe explique que le leadership n''est pas réservé à une élite, mais qu''il peut être développé par chacun. Il explore les qualités fondamentales d''un vrai leader, comme la vision, l''intégrité et la capacité à inspirer les autres. Son approche met en avant l''importance de la responsabilité et du service pour devenir un leader respecté et efficace.',
   'Dr Myles Munroe', 1, 3, 1, 'en', NULL),

  ('course-lead-004', 'cat-leadership-001', 'Les Cinq Niveaux du Leadership', 'les-cinq-niveaux-du-leadership',
   'De la position de base à l''influence authentique',
   'John C. Maxwell décompose le leadership en cinq étapes essentielles, allant de la position de base à l''influence authentique. Chaque niveau représente un progrès dans la manière dont un leader inspire et influence les autres. Maxwell nous guide à travers les compétences nécessaires pour gravir ces étapes et devenir un leader respecté et véritablement efficace.',
   'John C. Maxwell', 1, 4, 6, 'en', NULL),

  ('course-lead-005', 'cat-leadership-001', 'The 7 C''s to Success', 'the-7-cs-to-success',
   'Les 7 clés du succès selon Brian Tracy',
   'Brian Tracy partage les 7 principes fondamentaux qui permettent à chacun d''atteindre l''excellence et le succès durable dans tous les domaines de la vie.',
   'Brian Tracy', 1, 5, 1, 'en', NULL),

  ('course-lead-006', 'cat-leadership-001', 'Vision Make a Difference', 'vision-make-a-difference',
   'Comment votre vision peut transformer le monde',
   'John C. Maxwell explore comment une vision claire et puissante peut transformer non seulement votre vie, mais aussi celle de toute une organisation. La vision est le moteur du changement.',
   'John C. Maxwell', 1, 6, 1, 'en', NULL),

  ('course-lead-007', 'cat-leadership-001', 'Why Leaders Eat Last', 'why-leaders-eat-last',
   'Le leadership au service de l''humain',
   'Simon Sinek explore l''importance de l''empathie et du service dans le leadership. Il explique que les vrais leaders placent le bien-être de leurs équipes avant leur propre intérêt, créant ainsi une culture de confiance, de sécurité et de collaboration. Selon Sinek, le leadership ne consiste pas à donner des ordres, mais à nourrir les personnes pour qu''elles puissent atteindre leur potentiel maximal.',
   'Simon Sinek', 1, 7, 1, 'en', NULL);

-- ============================================================
-- SEED: Cours DÉVELOPPEMENT PERSONNEL & MINDSET
-- ============================================================
INSERT OR IGNORE INTO campus_courses (id, category_id, title, slug, subtitle, description, instructor, is_free, display_order, total_lessons, language, thumbnail_url) VALUES
  ('course-dp-001', 'cat-mindset-001', '7 Habits of Highly Effective People', '7-habits-of-highly-effective-people',
   'Les clés du succès et du leadership personnel',
   'Êtes-vous prêt à transformer votre vie personnelle et professionnelle ? Les 7 habitudes des gens efficaces de Stephen Covey vous offre des outils pratiques pour prendre le contrôle de votre temps, de vos priorités et de vos actions. Découvrez comment des habitudes simples peuvent mener à un succès durable et à une vie plus épanouie. Ce cours n''est pas seulement une liste de conseils, mais une méthode éprouvée pour devenir plus organisé, plus productif et plus aligné avec vos valeurs.',
   'Stephen Covey', 1, 1, 7, 'en', NULL),

  ('course-dp-002', 'cat-mindset-001', 'Bob Proctor — Eleven Universal Law', 'bob-proctor-eleven-universal-law',
   'Maîtrisez les principes du succès avec Bob Proctor',
   'Êtes-vous prêt à découvrir les lois qui régissent l''univers et influencent votre succès ? Dans Les Onze Lois Universelles, Bob Proctor vous guide à travers des principes puissants qui vous permettront de manifester vos désirs et d''attirer l''abondance. Apprenez comment ces lois invisibles façonnent votre réalité et comment les utiliser à votre avantage.',
   'Bob Proctor', 1, 2, 1, 'en', NULL),

  ('course-dp-003', 'cat-mindset-001', 'Bob Proctor — Law of Attraction', 'bob-proctor-law-of-attraction',
   'Manifestez l''abondance avec la Loi de l''Attraction',
   'Vous avez le pouvoir d''attirer tout ce que vous désirez ! Dans La Loi de l''Attraction, Bob Proctor vous montre comment vos pensées et émotions façonnent votre réalité. Apprenez à maîtriser cette loi universelle pour attirer l''abondance, le succès et le bonheur dans votre vie.',
   'Bob Proctor', 1, 3, 1, 'en', NULL),

  ('course-dp-004', 'cat-mindset-001', 'Bob Proctor — You Were Born Rich', 'bob-proctor-you-were-born-rich',
   'Libérez votre potentiel et attirez l''abondance',
   'Saviez-vous que vous êtes déjà riche en potentiel ? Dans You Were Born Rich, Bob Proctor vous montre comment libérer votre plein potentiel intérieur pour créer la vie que vous méritez. Découvrez les clés de la richesse mentale, émotionnelle et financière qui vous permettront de réussir et de prospérer.',
   'Bob Proctor', 1, 4, 6, 'en', NULL),

  ('course-dp-005', 'cat-mindset-001', 'Comment prendre sa vie en main', 'comment-prendre-sa-vie-en-main',
   'Les clés du succès avec Jim Rohn',
   'Vous avez le pouvoir de changer votre vie dès aujourd''hui ! Dans son cours Comment prendre sa vie en main, Jim Rohn vous guide à travers les principes fondamentaux qui vous permettront de prendre des décisions conscientes et de prendre le contrôle total de votre destin.',
   'Jim Rohn', 1, 5, 2, 'fr', NULL),

  ('course-dp-006', 'cat-mindset-001', 'L''Intelligence Émotionnelle', 'l-intelligence-emotionnelle',
   'Maîtrisez vos émotions pour réussir',
   'Et si votre réussite ne dépendait pas seulement de votre QI, mais surtout de votre capacité à comprendre et gérer vos émotions ? Dans L''Intelligence Émotionnelle, Daniel Goleman révèle comment cette compétence essentielle influence vos relations, votre carrière et votre bien-être.',
   'Daniel Goleman', 1, 6, 1, 'fr', NULL),

  ('course-dp-007', 'cat-mindset-001', 'Invest in Yourself — Dr Joe Dispenza', 'invest-in-yourself-dr-joe-dispenza',
   'Reprogrammez votre esprit et revitalisez votre corps',
   'Et si votre transformation commençait par vous-même ? Dans Invest in Yourself, Nurture Your Body and Mind, Dr. Joe Dispenza vous montre comment reprogrammer votre esprit et revitaliser votre corps pour atteindre votre plein potentiel. Grâce à la neuroscience et à la méditation, découvrez comment vos pensées influencent votre réalité.',
   'Dr Joe Dispenza', 1, 7, 1, 'en', NULL),

  ('course-dp-008', 'cat-mindset-001', 'Le Courage d''être soi — Jacques Salomé', 'le-courage-d-etre-soi-jacques-salome',
   'Vivez en accord avec votre essence',
   'Être pleinement soi-même demande du courage. Dans Le courage d''être soi au présent de sa vie, Jacques Salomé nous invite à nous libérer des peurs, des conditionnements et des attentes extérieures pour enfin vivre en accord avec notre essence. Apprenez à vous écouter, à vous affirmer et à construire une vie qui vous ressemble.',
   'Jacques Salomé', 1, 8, 1, 'fr', NULL),

  ('course-dp-009', 'cat-mindset-001', 'Les Brown — Emotional Stories', 'les-brown-emotional-stories',
   'Des histoires qui inspirent et transforment',
   'Les Brown partage des histoires émotionnelles puissantes qui vous laisseront sans voix et vous inspireront à surmonter tous les obstacles pour atteindre votre grandeur.',
   'Les Brown', 1, 9, 1, 'en', NULL),

  ('course-dp-010', 'cat-mindset-001', 'Sagesse Intemporelle', 'sagesse-intemporelle',
   'Les enseignements universels des grands penseurs',
   'Un voyage à travers la sagesse intemporelle des grands philosophes et penseurs qui ont façonné notre compréhension du monde et de l''existence humaine.',
   'Équipe LEADER', 1, 10, 1, 'fr', NULL),

  ('course-dp-011', 'cat-mindset-001', 'Être Adulte', 'etre-adulte',
   'La maturité émotionnelle et relationnelle',
   'Une exploration profonde de ce que signifie vraiment être adulte dans nos relations, nos choix et notre responsabilité envers nous-mêmes et les autres.',
   'Thomas d''Ansembourg', 1, 11, 1, 'fr', NULL),

  ('course-dp-012', 'cat-mindset-001', 'Together Is Better', 'together-is-better',
   'La force du collectif et de la collaboration',
   'Simon Sinek explore comment travailler ensemble et cultiver des relations authentiques nous permet d''accomplir bien plus que nous ne pourrions jamais réaliser seuls.',
   'Simon Sinek', 1, 12, 1, 'en', NULL),

  ('course-dp-013', 'cat-mindset-001', 'Thomas d''Ansembourg — Réenchanter le Monde', 'thomas-d-ansembourg-reenchanter-le-monde',
   'Communication Non Violente pour transformer vos relations',
   'Dans Réenchanter le Monde, Thomas d''Ansembourg nous invite à redécouvrir la puissance de la communication non violente. Ce cours explore comment exprimer nos besoins et émotions de manière authentique, tout en respectant ceux des autres.',
   'Thomas d''Ansembourg', 1, 13, 1, 'fr', NULL),

  ('course-dp-014', 'cat-mindset-001', 'Cessez d''être gentil, soyez vrai !', 'cessez-d-etre-gentil-soyez-vrai',
   'Osez l''authenticité avec la Communication Non Violente',
   'Thomas d''Ansembourg nous invite à sortir du désir de plaire à tout prix pour embrasser une communication authentique et sincère. Il explique comment exprimer ses besoins et ses émotions sans culpabilité ni agressivité.',
   'Thomas d''Ansembourg', 1, 14, 3, 'fr', NULL),

  ('course-dp-015', 'cat-mindset-001', 'Être Heureux n''est pas nécessairement confortable', 'etre-heureux-pas-necessairement-confortable',
   'Transformez votre vie avec Thomas d''Ansembourg',
   'Et si le vrai bonheur passait par l''inconfort ? Dans Être heureux n''est pas nécessairement confortable, Thomas d''Ansembourg explique comment sortir de nos habitudes et remettre en question nos schémas limitants pour accéder à une vie plus épanouie.',
   'Thomas d''Ansembourg', 1, 15, 1, 'fr', NULL),

  ('course-dp-016', 'cat-mindset-001', 'White Head et la Theory du Process', 'white-head-theory-du-process',
   'Comprendre l''évolution constante de l''univers',
   'Alfred North Whitehead, philosophe et mathématicien, a développé la théorie du processus, qui propose que la réalité est en constante évolution. Selon lui, tout dans l''univers est constitué d''événements, plutôt que d''objets fixes, et ces événements sont en perpétuel changement, interconnexion et développement.',
   'Alfred North Whitehead', 1, 16, 3, 'fr', NULL);

-- ============================================================
-- SEED: Cours ENTREPRISE
-- ============================================================
INSERT OR IGNORE INTO campus_courses (id, category_id, title, slug, subtitle, description, instructor, is_free, display_order, total_lessons, language, thumbnail_url) VALUES
  ('course-ent-001', 'cat-entreprise-001', 'Effondrement Économique, Monétaire & Civilisationnel', 'effondrement-economique-monetaire-civilisationnel',
   'Comprendre et anticiper les crises mondiales',
   'L''effondrement économique, monétaire et civilisationnel fait référence à une série de phénomènes interconnectés pouvant mener à une déstabilisation à grande échelle des systèmes économiques, financiers et sociaux. Cet effondrement pourrait être causé par une multitude de facteurs tels que l''endettement excessif, la dévaluation des monnaies, la perte de confiance dans les institutions financières et gouvernementales.',
   'Équipe LEADER', 1, 1, 1, 'fr', NULL),

  ('course-ent-002', 'cat-entreprise-001', 'How to Start a Startup', 'how-to-start-a-startup',
   'De l''idée initiale à la croissance rapide',
   'Créer une entreprise prospère repose sur des principes fondamentaux, de l''idée initiale à la croissance rapide. Ce parcours exige une vision claire, un produit solide, une stratégie efficace pour attirer des investisseurs et une équipe performante. Pensé pour les entrepreneurs ambitieux, cet aperçu fournit les clés essentielles pour transformer une idée en un projet florissant.',
   'Sam Altman & Peter Thiel', 1, 2, 5, 'en', NULL),

  ('course-ent-003', 'cat-entreprise-001', 'L''Intelligence Émotionnelle dans l''Entreprise', 'intelligence-emotionnelle-dans-l-entreprise',
   'La clé du leadership émotionnel en milieu professionnel',
   'L''intelligence émotionnelle est désormais reconnue comme un facteur clé de succès en entreprise. Apprenez à identifier, comprendre et gérer les émotions au sein de vos équipes pour créer un environnement de travail plus harmonieux et productif.',
   'Équipe LEADER', 1, 3, 1, 'fr', NULL),

  ('course-ent-004', 'cat-entreprise-001', 'La Mécanique de la Machine Économique', 'la-mecanique-de-la-machine-economique',
   'Comprendre les moteurs de l''économie mondiale',
   'Ray Dalio nous plonge dans l''analyse approfondie des forces qui façonnent l''économie mondiale. Il explique comment les cycles économiques, les politiques monétaires et les actions des gouvernements influencent les marchés et la société. Cette compréhension permet de mieux anticiper les fluctuations économiques et de prendre des décisions plus éclairées.',
   'Ray Dalio', 1, 4, 1, 'en', NULL);

-- ============================================================
-- SEED: Modules et Leçons — Webinar (formation-zoom) 
-- ============================================================
INSERT OR IGNORE INTO campus_modules (id, course_id, title, description, display_order) VALUES
  ('mod-webinar-001', 'course-webinar-001', 'Leadership Call 2024', 'Appels hebdomadaires de leadership — Avril à Décembre 2024', 1),
  ('mod-webinar-002', 'course-webinar-001', 'Mentorat LEADER 2024', 'Sessions de mentorat individuel et collectif 2024', 2),
  ('mod-webinar-003', 'course-webinar-001', 'Éducation Financière 2024', 'Sessions d''éducation financière 2024', 3),
  ('mod-webinar-004', 'course-webinar-001', 'World Leadership 2024', 'Appels World Leadership 2024', 4),
  ('mod-webinar-005', 'course-webinar-001', 'Leader Mindset 2024', 'Sessions Mindset LEADER 2024', 5),
  ('mod-webinar-006', 'course-webinar-001', 'Sessions 2025', 'Toutes les sessions 2025', 6),
  ('mod-webinar-007', 'course-webinar-001', 'Sessions Spéciales', 'Appels et sessions spéciales', 7);

-- Leçons Webinar — Module 1: Leadership Call 2024
INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, duration_label, display_order) VALUES
  ('lesson-w-001', 'mod-webinar-001', 'course-webinar-001', 'LeaderShip Call 14.04.24', '01:48:39', 1),
  ('lesson-w-002', 'mod-webinar-001', 'course-webinar-001', 'Leadership call 21.04.24 - Quel est le process pour atteindre le succès?', '01:16:00', 2),
  ('lesson-w-003', 'mod-webinar-001', 'course-webinar-001', 'Leadership call 05.05.24', '01:04:12', 3),
  ('lesson-w-004', 'mod-webinar-001', 'course-webinar-001', 'Les Bases du momentum 12.05.24', '01:50:34', 4),
  ('lesson-w-005', 'mod-webinar-001', 'course-webinar-001', 'Leader Call 26.05.24 - Comment créer du momentum', '02:02:09', 5),
  ('lesson-w-006', 'mod-webinar-001', 'course-webinar-001', 'Comment influencer instantanément la décision d''adhésion du prospect !', '01:53:42', 6),
  ('lesson-w-007', 'mod-webinar-001', 'course-webinar-001', 'La motivation - 23.06.24', '01:56:41', 7),
  ('lesson-w-008', 'mod-webinar-001', 'course-webinar-001', 'LeaderShip call du 30.06.24 - Le suivi', '02:34:28', 8);

-- Leçons Webinar — Module 2: Mentorat 2024
INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, duration_label, display_order) VALUES
  ('lesson-w-009', 'mod-webinar-002', 'course-webinar-001', 'Leader Mentorat du 02.09.24', '01:22:34', 1),
  ('lesson-w-010', 'mod-webinar-002', 'course-webinar-001', 'Q&A du 06.09.24', '51:56', 2),
  ('lesson-w-011', 'mod-webinar-002', 'course-webinar-001', 'Leader Mentorat du 09.09.24', '01:01:56', 3),
  ('lesson-w-012', 'mod-webinar-002', 'course-webinar-001', 'L''incroyable parcours de notre Co fondateur, James Wick Francois', '01:16:21', 4),
  ('lesson-w-013', 'mod-webinar-002', 'course-webinar-001', 'Leader Mentorat 23.09.24', '01:10:16', 5),
  ('lesson-w-014', 'mod-webinar-002', 'course-webinar-001', 'Leader Mentorat 30.09.24', '01:09:45', 6),
  ('lesson-w-015', 'mod-webinar-002', 'course-webinar-001', 'Leader Mentorat 07.10.24', '57:58', 7),
  ('lesson-w-016', 'mod-webinar-002', 'course-webinar-001', 'Leader Mentorat 14.10.2024', '54:28', 8),
  ('lesson-w-017', 'mod-webinar-002', 'course-webinar-001', 'Leader Mentorat 21.10.24', '01:17:45', 9),
  ('lesson-w-018', 'mod-webinar-002', 'course-webinar-001', 'Leader Mentorat 28.10.24', '01:10:19', 10),
  ('lesson-w-019', 'mod-webinar-002', 'course-webinar-001', 'Leader Mentorat 04.11.24', '01:31:04', 11),
  ('lesson-w-020', 'mod-webinar-002', 'course-webinar-001', 'Leader Mentorat 18.11.24', '01:16:02', 12),
  ('lesson-w-021', 'mod-webinar-002', 'course-webinar-001', 'Leader Mentorat 25.11.24', '58:27', 13),
  ('lesson-w-022', 'mod-webinar-002', 'course-webinar-001', '4 étapes pour créer une armée d''administrateurs', '54:16', 14),
  ('lesson-w-023', 'mod-webinar-002', 'course-webinar-001', 'Leader Mentorat 02.12.24', '02:00:28', 15),
  ('lesson-w-024', 'mod-webinar-002', 'course-webinar-001', 'Leader Mentorat 10.12.24', '01:04:49', 16),
  ('lesson-w-025', 'mod-webinar-002', 'course-webinar-001', 'Leader Mentorat 16.12.24', '01:31:31', 17),
  ('lesson-w-026', 'mod-webinar-002', 'course-webinar-001', 'Leader Mentorat 23.12.24', '01:19:30', 18);

-- Leçons Webinar — Module 3: Éducation Financière 2024
INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, duration_label, display_order) VALUES
  ('lesson-w-027', 'mod-webinar-003', 'course-webinar-001', 'Education Financiere du 19.09.24', '01:51:35', 1),
  ('lesson-w-028', 'mod-webinar-003', 'course-webinar-001', 'Education Financiere 03.10.24', '01:26:29', 2),
  ('lesson-w-029', 'mod-webinar-003', 'course-webinar-001', 'Education financiere 10.10.24', '01:22:56', 3),
  ('lesson-w-030', 'mod-webinar-003', 'course-webinar-001', 'Education Financiere 17.10.24', '01:26:55', 4),
  ('lesson-w-031', 'mod-webinar-003', 'course-webinar-001', 'Education Financiere 24.10.24', '01:27:59', 5),
  ('lesson-w-032', 'mod-webinar-003', 'course-webinar-001', 'Education Financiere 28.11.24', '01:26:04', 6),
  ('lesson-w-033', 'mod-webinar-003', 'course-webinar-001', 'Education Financiere 12.12.24', '01:47:37', 7),
  ('lesson-w-034', 'mod-webinar-003', 'course-webinar-001', 'Education Financiere 19.12.24', '01:11:02', 8);

-- Leçons Webinar — Module 4: World Leadership 2024
INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, duration_label, display_order) VALUES
  ('lesson-w-035', 'mod-webinar-004', 'course-webinar-001', 'World Leadership call 01.09.24', '02:41:44', 1),
  ('lesson-w-036', 'mod-webinar-004', 'course-webinar-001', 'World Leadership call du 15.09.24', '01:18:44', 2),
  ('lesson-w-037', 'mod-webinar-004', 'course-webinar-001', 'World Leadership 06.10.24', '01:39:40', 3),
  ('lesson-w-038', 'mod-webinar-004', 'course-webinar-001', 'World Leadership call 13.10.24', '01:36:59', 4),
  ('lesson-w-039', 'mod-webinar-004', 'course-webinar-001', 'World Leadership Call 27.10.24', '01:24:37', 5),
  ('lesson-w-040', 'mod-webinar-004', 'course-webinar-001', 'World Leadership 17.11.24', '01:09:42', 6),
  ('lesson-w-041', 'mod-webinar-004', 'course-webinar-001', 'World Leadership 24.11.24', '01:55:58', 7),
  ('lesson-w-042', 'mod-webinar-004', 'course-webinar-001', 'World Leadership 15.12.24', '01:51:55', 8),
  ('lesson-w-043', 'mod-webinar-004', 'course-webinar-001', 'World Leadership 29.12.24', '01:50:25', 9);

-- Leçons Webinar — Module 5: Mindset 2024
INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, duration_label, display_order) VALUES
  ('lesson-w-044', 'mod-webinar-005', 'course-webinar-001', 'Leader Mindset du 20.09.24', '01:14:44', 1),
  ('lesson-w-045', 'mod-webinar-005', 'course-webinar-001', 'Leader Mindset 04.10.24', '01:13:37', 2),
  ('lesson-w-046', 'mod-webinar-005', 'course-webinar-001', 'Leader Mindset 18.10.24', '58:39', 3),
  ('lesson-w-047', 'mod-webinar-005', 'course-webinar-001', 'Leader Mindset 01.11.24', '01:09:58', 4),
  ('lesson-w-048', 'mod-webinar-005', 'course-webinar-001', 'Q&A Mindset 08.11.24', '01:23:33', 5),
  ('lesson-w-049', 'mod-webinar-005', 'course-webinar-001', 'Leader Mindset 15.11.24', '01:38:53', 6),
  ('lesson-w-050', 'mod-webinar-005', 'course-webinar-001', 'Leader Mindset 27.12.24', '01:12:31', 7),
  ('lesson-w-051', 'mod-webinar-005', 'course-webinar-001', 'Leader Mentorat 30.12.24', '01:28:17', 8);

-- Leçons Webinar — Module 6: Sessions 2025
INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, duration_label, display_order) VALUES
  ('lesson-w-052', 'mod-webinar-006', 'course-webinar-001', 'Les clés pour réussir votre année 2025 !', '02:29:10', 1),
  ('lesson-w-053', 'mod-webinar-006', 'course-webinar-001', 'World Leadership 19.01.25', '01:24:08', 2),
  ('lesson-w-054', 'mod-webinar-006', 'course-webinar-001', 'Leader Mentorat 20.01.25', '00:00', 3),
  ('lesson-w-055', 'mod-webinar-006', 'course-webinar-001', 'Education Financiere 23.01.25', '01:30:49', 4),
  ('lesson-w-056', 'mod-webinar-006', 'course-webinar-001', 'World Leadership 26.01.25', '01:16:10', 5),
  ('lesson-w-057', 'mod-webinar-006', 'course-webinar-001', 'Leader Mentorat 27.01.25', '01:09:09', 6),
  ('lesson-w-058', 'mod-webinar-006', 'course-webinar-001', 'World Leadership 02.02.25', '01:33:44', 7),
  ('lesson-w-059', 'mod-webinar-006', 'course-webinar-001', 'Leader Mentorat 03.02.25', '45:29', 8),
  ('lesson-w-060', 'mod-webinar-006', 'course-webinar-001', 'Education Financiere 06.02.25', '01:35:58', 9),
  ('lesson-w-061', 'mod-webinar-006', 'course-webinar-001', 'Leader Mentorat 10.02.25', '01:00:20', 10),
  ('lesson-w-062', 'mod-webinar-006', 'course-webinar-001', 'World Leadership 16.02.25', '01:33:22', 11),
  ('lesson-w-063', 'mod-webinar-006', 'course-webinar-001', 'Leader Mentorat 17.02.25', '01:05:59', 12),
  ('lesson-w-064', 'mod-webinar-006', 'course-webinar-001', 'Education Financiere 20.02.25', '01:27:22', 13),
  ('lesson-w-065', 'mod-webinar-006', 'course-webinar-001', 'World Leadership 23.02.25', '01:14:47', 14),
  ('lesson-w-066', 'mod-webinar-006', 'course-webinar-001', 'Leader Mentorat 25.02.25', '52:03', 15),
  ('lesson-w-067', 'mod-webinar-006', 'course-webinar-001', 'Education Financiere 27.02.25', '01:10:02', 16),
  ('lesson-w-068', 'mod-webinar-006', 'course-webinar-001', 'World Leadership 30.03.25', '02:24:02', 17),
  ('lesson-w-069', 'mod-webinar-006', 'course-webinar-001', 'Education Financiere 10.04.25', '01:33:08', 18),
  ('lesson-w-070', 'mod-webinar-006', 'course-webinar-001', 'World Leadership 13.04.25', '01:29:01', 19),
  ('lesson-w-071', 'mod-webinar-006', 'course-webinar-001', 'Education Financiere 17.04.25', '01:17:23', 20),
  ('lesson-w-072', 'mod-webinar-006', 'course-webinar-001', 'World Leadership 20.04.25', '50:00', 21),
  ('lesson-w-073', 'mod-webinar-006', 'course-webinar-001', 'Education Financiere 24.04.25', '59:53', 22),
  ('lesson-w-074', 'mod-webinar-006', 'course-webinar-001', 'Education Financiere 01.05.25', '01:16:18', 23),
  ('lesson-w-075', 'mod-webinar-006', 'course-webinar-001', 'Education Financiere 15.05.25', '01:32:20', 24),
  ('lesson-w-076', 'mod-webinar-006', 'course-webinar-001', 'Leader Mindset partie 1 Par Jean Marc 16.05.25', '01:20:02', 25),
  ('lesson-w-077', 'mod-webinar-006', 'course-webinar-001', 'World Leadership 18.05.25', '01:21:45', 26),
  ('lesson-w-078', 'mod-webinar-006', 'course-webinar-001', 'Leader Mindset partie 2 Par Jean Marc 23.05.25', '01:20:41', 27),
  ('lesson-w-079', 'mod-webinar-006', 'course-webinar-001', 'World Leadership 25.05.25', '01:42:24', 28);

-- Leçons Webinar — Module 7: Sessions Spéciales
INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, duration_label, display_order) VALUES
  ('lesson-w-080', 'mod-webinar-007', 'course-webinar-001', 'Finstrategia', '02:10:11', 1),
  ('lesson-w-081', 'mod-webinar-007', 'course-webinar-001', 'Synex', '01:34:58', 2),
  ('lesson-w-082', 'mod-webinar-007', 'course-webinar-001', 'Call Special 28.04.25', '01:48:30', 3);

-- ============================================================
-- SEED: Modules et Leçons — 21 Lois du Leadership
-- ============================================================
INSERT OR IGNORE INTO campus_modules (id, course_id, title, description, display_order) VALUES
  ('mod-lead-001', 'course-lead-001', '21 LOIS DU LEADERSHIP DE JOHN C.MAXWELL', 'Les 21 lois fondamentales du leadership selon John C. Maxwell', 1);

INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, display_order) VALUES
  ('lesson-lead-001-1', 'mod-lead-001', 'course-lead-001', '1. Introduction', 1),
  ('lesson-lead-001-2', 'mod-lead-001', 'course-lead-001', '2. La loi du couvercle', 2),
  ('lesson-lead-001-3', 'mod-lead-001', 'course-lead-001', '3. La loi de l''influence', 3),
  ('lesson-lead-001-4', 'mod-lead-001', 'course-lead-001', '4. La loi du processus', 4),
  ('lesson-lead-001-5', 'mod-lead-001', 'course-lead-001', '5. La loi de la navigation', 5),
  ('lesson-lead-001-6', 'mod-lead-001', 'course-lead-001', '6. La loi de EF Hutton', 6),
  ('lesson-lead-001-7', 'mod-lead-001', 'course-lead-001', '7. La loi du respect', 7),
  ('lesson-lead-001-8', 'mod-lead-001', 'course-lead-001', '8. La loi de l''intuition', 8);

-- ============================================================
-- SEED: Modules et Leçons — Élever Votre Niveau de Leadership
-- ============================================================
INSERT OR IGNORE INTO campus_modules (id, course_id, title, description, display_order) VALUES
  ('mod-lead-002', 'course-lead-002', 'Elever votre niveau de Leadership', 'Programme complet en 4 parties', 1);

INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, display_order) VALUES
  ('lesson-lead-002-1', 'mod-lead-002', 'course-lead-002', 'Elever votre niveau de Leadership Partie 1', 1),
  ('lesson-lead-002-2', 'mod-lead-002', 'course-lead-002', 'Elever votre niveau de Leadership Partie 2', 2),
  ('lesson-lead-002-3', 'mod-lead-002', 'course-lead-002', 'Elever votre niveau de Leadership Partie 3', 3),
  ('lesson-lead-002-4', 'mod-lead-002', 'course-lead-002', 'Elever votre niveau de Leadership Partie 4', 4);

-- ============================================================
-- SEED: Modules et Leçons — Keys to Becoming a Leader
-- ============================================================
INSERT OR IGNORE INTO campus_modules (id, course_id, title, description, display_order) VALUES
  ('mod-lead-003', 'course-lead-003', 'Keys to becoming a leader', 'Les clés essentielles du leadership', 1);

INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, display_order) VALUES
  ('lesson-lead-003-1', 'mod-lead-003', 'course-lead-003', 'Keys to becoming a leader', 1);

-- ============================================================
-- SEED: Modules et Leçons — 5 Niveaux du Leadership
-- ============================================================
INSERT OR IGNORE INTO campus_modules (id, course_id, title, description, display_order) VALUES
  ('mod-lead-004', 'course-lead-004', 'Les cinq niveaux du Leadership', 'De la position à l''influence authentique', 1);

INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, display_order) VALUES
  ('lesson-lead-004-1', 'mod-lead-004', 'course-lead-004', 'Introduction to the 5 levels of Leadership', 1),
  ('lesson-lead-004-2', 'mod-lead-004', 'course-lead-004', 'Level 1 - The position level', 2),
  ('lesson-lead-004-3', 'mod-lead-004', 'course-lead-004', 'Level 2 - The permission level', 3),
  ('lesson-lead-004-4', 'mod-lead-004', 'course-lead-004', 'Level 3 - The production level', 4),
  ('lesson-lead-004-5', 'mod-lead-004', 'course-lead-004', 'Level 4 - The people development level', 5),
  ('lesson-lead-004-6', 'mod-lead-004', 'course-lead-004', 'Level 5 - The pinnacle level', 6);

-- ============================================================
-- SEED: Modules et Leçons — 7 C's to Success (Brian Tracy)
-- ============================================================
INSERT OR IGNORE INTO campus_modules (id, course_id, title, display_order) VALUES
  ('mod-lead-005', 'course-lead-005', 'The 7 C''s to Success', 1);
INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, display_order) VALUES
  ('lesson-lead-005-1', 'mod-lead-005', 'course-lead-005', 'The 7 C''s to Success with Brian Tracy', 1);

-- ============================================================
-- SEED: Modules et Leçons — Vision Make a Difference
-- ============================================================
INSERT OR IGNORE INTO campus_modules (id, course_id, title, display_order) VALUES
  ('mod-lead-006', 'course-lead-006', 'Vision Make a Difference', 1);
INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, display_order) VALUES
  ('lesson-lead-006-1', 'mod-lead-006', 'course-lead-006', 'Vision Make a Difference', 1);

-- ============================================================
-- SEED: Modules et Leçons — Why Leaders Eat Last
-- ============================================================
INSERT OR IGNORE INTO campus_modules (id, course_id, title, display_order) VALUES
  ('mod-lead-007', 'course-lead-007', 'Why Leaders eat last', 1);
INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, display_order) VALUES
  ('lesson-lead-007-1', 'mod-lead-007', 'course-lead-007', 'Why Leaders eat last', 1);

-- ============================================================
-- SEED: Modules et Leçons — 7 Habits (Stephen Covey)
-- ============================================================
INSERT OR IGNORE INTO campus_modules (id, course_id, title, display_order) VALUES
  ('mod-dp-001', 'course-dp-001', '7 Habits of highly effective people', 1);
INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, display_order) VALUES
  ('lesson-dp-001-1', 'mod-dp-001', 'course-dp-001', 'Habit 1 - Be Proactive', 1),
  ('lesson-dp-001-2', 'mod-dp-001', 'course-dp-001', 'Habit 2 - Begin with the end in mind', 2),
  ('lesson-dp-001-3', 'mod-dp-001', 'course-dp-001', 'Habit 3 - Put first things first', 3),
  ('lesson-dp-001-4', 'mod-dp-001', 'course-dp-001', 'Habit 4 - Think win win', 4),
  ('lesson-dp-001-5', 'mod-dp-001', 'course-dp-001', 'Habit 5 - Seek first to understand, then to be understood', 5),
  ('lesson-dp-001-6', 'mod-dp-001', 'course-dp-001', 'Habit 6 - Synergize', 6),
  ('lesson-dp-001-7', 'mod-dp-001', 'course-dp-001', 'Habit 7 - Sharpen the saw', 7);

-- ============================================================
-- SEED: Modules et Leçons — Bob Proctor (3 cours)
-- ============================================================
INSERT OR IGNORE INTO campus_modules (id, course_id, title, display_order) VALUES
  ('mod-dp-002', 'course-dp-002', 'Bob Proctor - Eleven Universal Law', 1),
  ('mod-dp-003', 'course-dp-003', 'Bob Proctor - Law of Attraction', 1),
  ('mod-dp-004', 'course-dp-004', 'Bob Proctor - You were born rich', 1);

INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, display_order) VALUES
  ('lesson-dp-002-1', 'mod-dp-002', 'course-dp-002', 'Eleven Universal Law', 1),
  ('lesson-dp-003-1', 'mod-dp-003', 'course-dp-003', 'Law of Attraction', 1),
  ('lesson-dp-004-1', 'mod-dp-004', 'course-dp-004', 'You were born rich part 1', 1),
  ('lesson-dp-004-2', 'mod-dp-004', 'course-dp-004', 'You were born rich part 2', 2),
  ('lesson-dp-004-3', 'mod-dp-004', 'course-dp-004', 'You were born rich part 3', 3),
  ('lesson-dp-004-4', 'mod-dp-004', 'course-dp-004', 'You were born rich part 4', 4),
  ('lesson-dp-004-5', 'mod-dp-004', 'course-dp-004', 'You were born rich part 5', 5),
  ('lesson-dp-004-6', 'mod-dp-004', 'course-dp-004', 'You were born Rich Part 6', 6);

-- ============================================================
-- SEED: Modules et Leçons — Jim Rohn, Goleman, Dispenza, Salomé
-- ============================================================
INSERT OR IGNORE INTO campus_modules (id, course_id, title, display_order) VALUES
  ('mod-dp-005', 'course-dp-005', 'Comment prendre sa vie en main', 1),
  ('mod-dp-006', 'course-dp-006', 'L''Intelligence Émotionnelle', 1),
  ('mod-dp-007', 'course-dp-007', 'Invest in yourself, nurture your body and mind', 1),
  ('mod-dp-008', 'course-dp-008', 'Le courage d''être soi au présent de sa vie', 1);

INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, display_order) VALUES
  ('lesson-dp-005-1', 'mod-dp-005', 'course-dp-005', 'Comment prendre sa vie en main partie 1', 1),
  ('lesson-dp-005-2', 'mod-dp-005', 'course-dp-005', 'Comment prendre sa vie en main partie 2', 2),
  ('lesson-dp-006-1', 'mod-dp-006', 'course-dp-006', 'L''intelligence emotionelle', 1),
  ('lesson-dp-007-1', 'mod-dp-007', 'course-dp-007', 'Invest in yourself, nurture your body and mind', 1),
  ('lesson-dp-008-1', 'mod-dp-008', 'course-dp-008', 'Le courage d''être soi au présent de sa vie', 1);

-- ============================================================
-- SEED: Modules et Leçons — Les Brown, Sagesse, Adulte, Together
-- ============================================================
INSERT OR IGNORE INTO campus_modules (id, course_id, title, display_order) VALUES
  ('mod-dp-009', 'course-dp-009', 'Les Brown — Emotional Stories', 1),
  ('mod-dp-010', 'course-dp-010', 'Sagesse Intemporelle', 1),
  ('mod-dp-011', 'course-dp-011', 'Être Adulte', 1),
  ('mod-dp-012', 'course-dp-012', 'Together Is Better', 1);

INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, display_order) VALUES
  ('lesson-dp-009-1', 'mod-dp-009', 'course-dp-009', 'Les Brown Emotional Stories', 1),
  ('lesson-dp-010-1', 'mod-dp-010', 'course-dp-010', 'Sagesse Intemporelle', 1),
  ('lesson-dp-011-1', 'mod-dp-011', 'course-dp-011', 'Être Adulte', 1),
  ('lesson-dp-012-1', 'mod-dp-012', 'course-dp-012', 'Together Is Better', 1);

-- ============================================================
-- SEED: Modules et Leçons — Thomas d'Ansembourg (3 cours)
-- ============================================================
INSERT OR IGNORE INTO campus_modules (id, course_id, title, display_order) VALUES
  ('mod-dp-013', 'course-dp-013', 'Thomas d''Ansembourg — Réenchanter le Monde', 1),
  ('mod-dp-014', 'course-dp-014', 'Cessez d''être gentil, soyez vrai !', 1),
  ('mod-dp-015', 'course-dp-015', 'Être Heureux n''est pas nécessairement confortable', 1);

INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, display_order) VALUES
  ('lesson-dp-013-1', 'mod-dp-013', 'course-dp-013', 'Réenchanter le Monde', 1),
  ('lesson-dp-014-1', 'mod-dp-014', 'course-dp-014', '« Cessez d''être gentil, soyez vrai ! » partie 1', 1),
  ('lesson-dp-014-2', 'mod-dp-014', 'course-dp-014', '« Cessez d''être gentil, soyez vrai ! » partie 2', 2),
  ('lesson-dp-014-3', 'mod-dp-014', 'course-dp-014', '« Cessez d''être gentil, soyez vrai ! » partie 3', 3),
  ('lesson-dp-015-1', 'mod-dp-015', 'course-dp-015', 'Être Heureux n''est pas nécessairement confortable', 1);

-- ============================================================
-- SEED: Modules et Leçons — White Head Theory du Process
-- ============================================================
INSERT OR IGNORE INTO campus_modules (id, course_id, title, display_order) VALUES
  ('mod-dp-016', 'course-dp-016', 'White Head et la theory du process', 1);

INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, display_order) VALUES
  ('lesson-dp-016-1', 'mod-dp-016', 'course-dp-016', 'White Head et la theory du process partie 1', 1),
  ('lesson-dp-016-2', 'mod-dp-016', 'course-dp-016', 'White Head et la theory du process partie 2', 2),
  ('lesson-dp-016-3', 'mod-dp-016', 'course-dp-016', 'White Head et la theory du process partie 3', 3);

-- ============================================================
-- SEED: Modules et Leçons — ENTREPRISE
-- ============================================================
INSERT OR IGNORE INTO campus_modules (id, course_id, title, display_order) VALUES
  ('mod-ent-001', 'course-ent-001', 'Effondrement économique, monétaire & civilisationnel', 1),
  ('mod-ent-002', 'course-ent-002', 'How to start a Startup', 1),
  ('mod-ent-003', 'course-ent-003', 'Intelligence Émotionnelle en Entreprise', 1),
  ('mod-ent-004', 'course-ent-004', 'La Mécanique de la Machine Économique', 1);

INSERT OR IGNORE INTO campus_lessons (id, module_id, course_id, title, display_order) VALUES
  ('lesson-ent-001-1', 'mod-ent-001', 'course-ent-001', 'Effondrement économique, monétaire & civilisation', 1),
  ('lesson-ent-002-1', 'mod-ent-002', 'course-ent-002', 'How to start a Startup - Lecture 1', 1),
  ('lesson-ent-002-2', 'mod-ent-002', 'course-ent-002', '2. Team and Execution - Lecture 2', 2),
  ('lesson-ent-002-3', 'mod-ent-002', 'course-ent-002', '3. Before the startup - Lecture 3', 3),
  ('lesson-ent-002-4', 'mod-ent-002', 'course-ent-002', '4. Building Product, Talking to users and Growing - Lecture 4', 4),
  ('lesson-ent-002-5', 'mod-ent-002', 'course-ent-002', '5. Competition is for losers Peter Thiel - Lecture 5', 5),
  ('lesson-ent-003-1', 'mod-ent-003', 'course-ent-003', 'L''Intelligence émotionnelle dans l''entreprise', 1),
  ('lesson-ent-004-1', 'mod-ent-004', 'course-ent-004', 'LA MÉCANIQUE DE LA MACHINE ÉCONOMIQUE', 1);

-- ============================================================
-- UPDATE total_lessons counts
-- ============================================================
UPDATE campus_courses SET total_lessons = (
  SELECT COUNT(*) FROM campus_lessons WHERE course_id = campus_courses.id
);
