-- ============================================================
-- Migration 0036 : Système de Support Client
-- ============================================================

-- ── 1. Tickets de support ────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id     TEXT NOT NULL REFERENCES members(id),
  ticket_number INTEGER,           -- numéro lisible ex: #1042
  category      TEXT NOT NULL DEFAULT 'other'
                CHECK(category IN ('wallet','commission','package','account','tree','license','other')),
  subject       TEXT NOT NULL,
  priority      TEXT NOT NULL DEFAULT 'normal'
                CHECK(priority IN ('low','normal','high','urgent')),
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK(status IN ('open','in_progress','waiting_member','resolved','closed')),
  assigned_to   TEXT REFERENCES admin_users(id),
  -- Snapshot contextuel du membre au moment de la création
  context_snapshot TEXT,           -- JSON : wallet, rang, dernières commissions
  -- Résolution
  resolved_at   TEXT,
  closed_at     TEXT,
  rating        INTEGER CHECK(rating BETWEEN 1 AND 5),
  rating_comment TEXT,
  -- Timestamps
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_reply_at TEXT,
  last_reply_by TEXT CHECK(last_reply_by IN ('member','admin'))
);

-- Auto-incrément pour ticket_number
CREATE TRIGGER IF NOT EXISTS support_tickets_number
  AFTER INSERT ON support_tickets
  BEGIN
    UPDATE support_tickets
    SET ticket_number = (SELECT COALESCE(MAX(ticket_number), 1000) + 1 FROM support_tickets WHERE id != NEW.id)
    WHERE id = NEW.id;
  END;

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_support_tickets_member   ON support_tickets(member_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status   ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created  ON support_tickets(created_at DESC);

-- ── 2. Messages / Thread ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_messages (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ticket_id    TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type  TEXT NOT NULL CHECK(sender_type IN ('member','admin')),
  sender_id    TEXT NOT NULL,     -- member.id ou admin_users.id
  sender_name  TEXT,              -- nom affiché (dénormalisé pour perf)
  content      TEXT NOT NULL,
  attachment_url TEXT,
  is_internal  INTEGER NOT NULL DEFAULT 0,  -- note privée admin (non visible membre)
  is_read      INTEGER NOT NULL DEFAULT 0,  -- lu par le destinataire
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket  ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_unread  ON support_messages(ticket_id, is_read, sender_type);

-- ── 3. Templates de réponses rapides ─────────────────────────
CREATE TABLE IF NOT EXISTS support_templates (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  category   TEXT DEFAULT 'general'
             CHECK(category IN ('wallet','commission','package','account','tree','license','general')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES admin_users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Templates par défaut
INSERT OR IGNORE INTO support_templates (id, title, content, category, sort_order) VALUES
  ('tpl-001', 'Accusé de réception',
   'Bonjour {{first_name}},

Nous avons bien reçu votre demande (ticket #{{ticket_number}}) et notre équipe la traite dans les meilleurs délais.

Temps de réponse habituel : 24 à 48 heures ouvrées.

Cordialement,
L''équipe LEADER Network', 'general', 1),

  ('tpl-002', 'Retrait en cours de traitement',
   'Bonjour {{first_name}},

Votre demande de retrait est actuellement en cours de traitement. Les virements sont effectués sous 2 à 5 jours ouvrés selon votre moyen de paiement.

Si vous n''avez pas reçu votre paiement passé ce délai, n''hésitez pas à nous recontacter.

Cordialement,
L''équipe LEADER Network', 'wallet', 2),

  ('tpl-003', 'Commission recalculée',
   'Bonjour {{first_name}},

Nous avons procédé au recalcul de vos commissions pour la période concernée. Vos nouveaux soldes sont désormais à jour dans votre espace membre.

N''hésitez pas à nous contacter si vous constatez une anomalie.

Cordialement,
L''équipe LEADER Network', 'commission', 3),

  ('tpl-004', 'Demande d''informations complémentaires',
   'Bonjour {{first_name}},

Afin de traiter votre demande dans les meilleures conditions, nous aurons besoin des informations complémentaires suivantes :

- 

Merci de nous répondre directement sur ce ticket.

Cordialement,
L''équipe LEADER Network', 'general', 4),

  ('tpl-005', 'Ticket résolu',
   'Bonjour {{first_name}},

Votre demande a été traitée et résolue. N''hésitez pas à nous laisser une évaluation de notre service, cela nous aide à nous améliorer.

Si vous avez d''autres questions, vous pouvez ouvrir un nouveau ticket.

Cordialement,
L''équipe LEADER Network', 'general', 5);

-- ── 4. Tags ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_ticket_tags (
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  tag       TEXT NOT NULL,
  PRIMARY KEY (ticket_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_support_tags ON support_ticket_tags(tag);

-- ── 5. FAQ / Base de connaissances ───────────────────────────
CREATE TABLE IF NOT EXISTS support_faq (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  category   TEXT NOT NULL DEFAULT 'general'
             CHECK(category IN ('wallet','commission','package','account','tree','license','general')),
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  views      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- FAQ par défaut
INSERT OR IGNORE INTO support_faq (id, category, question, answer, sort_order) VALUES
  ('faq-001', 'wallet',
   'Quel est le délai de traitement des retraits ?',
   'Les retraits sont traités sous 2 à 5 jours ouvrés après validation de votre demande. Vous recevrez une notification dès que le virement est effectué.', 1),

  ('faq-002', 'wallet',
   'Pourquoi mon solde en attente ne se crédite-t-il pas ?',
   'Les commissions en attente sont versées quotidiennement à 00h00 (heure Maurice). Si votre solde n''a pas été mis à jour après 24h, contactez le support.', 2),

  ('faq-003', 'commission',
   'Comment est calculée la Prime Leadership ?',
   'La Prime Leadership est calculée sur le volume BV de votre réseau selon votre rang actuel. Elle est créditée mensuellement et versée quotidiennement en fonction du montant total à distribuer.', 3),

  ('faq-004', 'commission',
   'Qu''est-ce que le Bonus d''Influence ?',
   'Le Bonus d''Influence est calculé en pourcentage de la prime totale de vos filleuls directs et indirects (jusqu''à 5 niveaux). Les taux varient selon le niveau : N1=5%, N2=4%, N3=3%, N4=2%, N5=2%.', 4),

  ('faq-005', 'package',
   'Comment upgrader mon package ?',
   'Vous pouvez upgrader votre package depuis la section "Packages" de votre espace membre. Vous ne payez que la différence entre votre package actuel et le nouveau.', 5),

  ('faq-006', 'account',
   'J''ai oublié mon PIN de retrait, que faire ?',
   'Rendez-vous dans votre profil, section "Sécurité", pour réinitialiser votre PIN. Un code de vérification vous sera envoyé par email.', 6),

  ('faq-007', 'tree',
   'Comment fonctionne le placement dans l''arbre binaire ?',
   'Dans l''arbre binaire, chaque membre occupe une position gauche ou droite sous son parrain. Le BV s''accumule des deux côtés et déclenche les primes selon le principe du côté faible.', 7);
