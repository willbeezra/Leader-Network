-- Migration 0063 : Système email premium
-- ─────────────────────────────────────────

-- Configuration SMTP/API email
CREATE TABLE IF NOT EXISTS email_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  type  TEXT NOT NULL DEFAULT 'text'  -- text | password | boolean | color
);

INSERT OR IGNORE INTO email_config (key, value, label, description, type) VALUES
  ('email_enabled',      '1',                          'Emails activés',           'Activer/désactiver tous les envois email', 'boolean'),
  ('resend_api_key',     '',                           'Clé API Resend',           'Clé API commençant par re_...', 'password'),
  ('from_email',         'noreply@entrepreneur0a1.com','Email expéditeur',         'Adresse email d''envoi', 'text'),
  ('from_name',          'Leader Network',             'Nom expéditeur',           'Nom affiché dans la boîte de réception', 'text'),
  ('reply_to',           '',                           'Reply-to',                 'Email de réponse (optionnel)', 'text'),
  ('support_email',      'support@entrepreneur0a1.com','Email support',            'Affiché dans le footer des emails', 'text'),
  ('brand_color',        '#7C3AED',                    'Couleur principale',        'Couleur brand des emails (hex)', 'color'),
  ('brand_logo_url',     '',                           'URL du logo',              'URL complète du logo (https://...)', 'text'),
  ('brand_name',         'Leader Network',             'Nom de la plateforme',     'Affiché dans le header et footer', 'text'),
  ('footer_address',     '',                           'Adresse (footer)',          'Adresse physique affichée en footer', 'text');

-- Templates email (modifiables depuis l'admin)
CREATE TABLE IF NOT EXISTS email_templates (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  subject     TEXT NOT NULL,
  body_html   TEXT NOT NULL,
  cta_label   TEXT DEFAULT '',
  cta_url     TEXT DEFAULT '',
  is_active   INTEGER DEFAULT 1,
  variables   TEXT DEFAULT '[]',   -- JSON array des variables disponibles
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- Logs d'envoi
CREATE TABLE IF NOT EXISTS email_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id     TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name  TEXT DEFAULT '',
  subject         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',  -- sent | failed | bounced
  resend_id       TEXT DEFAULT '',
  error_message   TEXT DEFAULT '',
  sent_at         TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at     ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_id ON email_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status      ON email_logs(status);

-- ─── INSERTION DES 14 TEMPLATES ──────────────────────────────

-- 1. Bienvenue (inscription)
INSERT OR IGNORE INTO email_templates (id, name, description, subject, body_html, cta_label, cta_url, variables) VALUES (
  'welcome',
  'Bienvenue — Inscription',
  'Envoyé automatiquement lors de l''inscription d''un nouveau membre',
  'Bienvenue sur {brand_name}, {prenom} !',
  '<p>Bonjour <strong>{prenom}</strong>,</p>
<p>Nous sommes ravis de vous accueillir sur <strong>{brand_name}</strong>. Votre compte a été créé avec succès.</p>
<p>Voici vos informations de connexion :</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:600;width:40%;">Identifiant membre</td><td style="padding:8px 12px;background:#f9f9f9;">{membre_id}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:600;">Email</td><td style="padding:8px 12px;">{email}</td></tr>
  <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:600;">Code PIN</td><td style="padding:8px 12px;background:#f9f9f9;font-size:20px;font-weight:700;letter-spacing:4px;">{pin}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:600;">Parrain</td><td style="padding:8px 12px;">{parrain}</td></tr>
</table>
<p style="color:#dc2626;font-size:13px;">Conservez ces informations en lieu sûr. Ne les partagez jamais.</p>
<p>Vous pouvez maintenant vous connecter à votre espace membre et commencer votre parcours.</p>',
  'Accéder à mon espace', '{login_url}',
  '["prenom", "nom", "email", "membre_id", "pin", "parrain", "login_url", "brand_name"]'
);

-- 2. KYC soumis
INSERT OR IGNORE INTO email_templates (id, name, description, subject, body_html, cta_label, cta_url, variables) VALUES (
  'kyc_submitted',
  'KYC — Dossier soumis',
  'Envoyé au membre quand il soumet son dossier KYC',
  'Votre dossier KYC a été reçu — {brand_name}',
  '<p>Bonjour <strong>{prenom}</strong>,</p>
<p>Nous avons bien reçu votre dossier de vérification d''identité (KYC Niveau {niveau}).</p>
<p>Notre équipe va l''examiner dans les <strong>{sla_heures} heures</strong> suivant votre soumission. Vous recevrez un email dès qu''une décision sera prise.</p>
<p style="color:#6b7280;font-size:13px;">Date de soumission : {date_soumission}</p>',
  'Voir mon dossier', '{dashboard_url}',
  '["prenom", "niveau", "sla_heures", "date_soumission", "dashboard_url", "brand_name"]'
);

-- 3. KYC approuvé
INSERT OR IGNORE INTO email_templates (id, name, description, subject, body_html, cta_label, cta_url, variables) VALUES (
  'kyc_approved',
  'KYC — Approuvé',
  'Envoyé au membre quand son KYC est approuvé par l''admin',
  'Votre identité a été vérifiée — Niveau {niveau}',
  '<p>Bonjour <strong>{prenom}</strong>,</p>
<p>Excellente nouvelle ! Votre dossier KYC a été <strong style="color:#16a34a;">approuvé</strong>.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 12px;background:#f0fdf4;font-weight:600;width:40%;">Niveau atteint</td><td style="padding:8px 12px;background:#f0fdf4;">Niveau {niveau} — {niveau_nom}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:600;">Validé le</td><td style="padding:8px 12px;">{date_approbation}</td></tr>
  <tr><td style="padding:8px 12px;background:#f0fdf4;font-weight:600;">Valide jusqu''au</td><td style="padding:8px 12px;background:#f0fdf4;">{date_expiration}</td></tr>
</table>
<p>Vous avez désormais accès à toutes les fonctionnalités associées à votre niveau de vérification.</p>',
  'Accéder à mon espace', '{dashboard_url}',
  '["prenom", "niveau", "niveau_nom", "date_approbation", "date_expiration", "dashboard_url", "brand_name"]'
);

-- 4. KYC rejeté
INSERT OR IGNORE INTO email_templates (id, name, description, subject, body_html, cta_label, cta_url, variables) VALUES (
  'kyc_rejected',
  'KYC — Rejeté',
  'Envoyé au membre quand son KYC est rejeté par l''admin',
  'Action requise — Votre dossier KYC nécessite des corrections',
  '<p>Bonjour <strong>{prenom}</strong>,</p>
<p>Après examen, votre dossier KYC Niveau {niveau} n''a pas pu être approuvé.</p>
<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:4px;">
  <p style="margin:0;font-weight:600;color:#dc2626;">Motif du rejet :</p>
  <p style="margin:8px 0 0;color:#374151;">{raison_rejet}</p>
</div>
<p>Vous pouvez soumettre un nouveau dossier en corrigeant les points mentionnés ci-dessus. Notre équipe reste disponible pour vous accompagner.</p>',
  'Corriger mon dossier', '{dashboard_url}',
  '["prenom", "niveau", "raison_rejet", "dashboard_url", "brand_name"]'
);

-- 5. Retrait demandé
INSERT OR IGNORE INTO email_templates (id, name, description, subject, body_html, cta_label, cta_url, variables) VALUES (
  'withdrawal_requested',
  'Retrait — Demande reçue',
  'Envoyé au membre quand il crée une demande de retrait',
  'Votre demande de retrait a été enregistrée — {brand_name}',
  '<p>Bonjour <strong>{prenom}</strong>,</p>
<p>Votre demande de retrait a bien été enregistrée et est en cours de traitement.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:600;width:40%;">Montant demandé</td><td style="padding:8px 12px;background:#f9f9f9;font-weight:700;font-size:18px;">{montant} {devise}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:600;">Adresse wallet</td><td style="padding:8px 12px;font-family:monospace;font-size:13px;">{wallet}</td></tr>
  <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:600;">Réseau</td><td style="padding:8px 12px;background:#f9f9f9;">{reseau}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:600;">Date de demande</td><td style="padding:8px 12px;">{date_demande}</td></tr>
</table>
<p style="color:#6b7280;font-size:13px;">Si vous n''êtes pas à l''origine de cette demande, contactez immédiatement le support.</p>',
  'Voir ma demande', '{dashboard_url}',
  '["prenom", "montant", "devise", "wallet", "reseau", "date_demande", "dashboard_url", "brand_name"]'
);

-- 6. Retrait approuvé
INSERT OR IGNORE INTO email_templates (id, name, description, subject, body_html, cta_label, cta_url, variables) VALUES (
  'withdrawal_approved',
  'Retrait — Approuvé',
  'Envoyé au membre quand son retrait est approuvé et envoyé',
  'Votre retrait de {montant} {devise} a été traité',
  '<p>Bonjour <strong>{prenom}</strong>,</p>
<p>Votre retrait a été <strong style="color:#16a34a;">approuvé et envoyé</strong> avec succès.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 12px;background:#f0fdf4;font-weight:600;width:40%;">Montant envoyé</td><td style="padding:8px 12px;background:#f0fdf4;font-weight:700;font-size:18px;">{montant} {devise}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:600;">Adresse wallet</td><td style="padding:8px 12px;font-family:monospace;font-size:13px;">{wallet}</td></tr>
  <tr><td style="padding:8px 12px;background:#f0fdf4;font-weight:600;">Transaction ID</td><td style="padding:8px 12px;background:#f0fdf4;font-family:monospace;font-size:13px;">{txid}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:600;">Traité le</td><td style="padding:8px 12px;">{date_traitement}</td></tr>
</table>
<p style="color:#6b7280;font-size:13px;">Les délais de confirmation dépendent du réseau blockchain.</p>',
  'Voir mon historique', '{dashboard_url}',
  '["prenom", "montant", "devise", "wallet", "txid", "date_traitement", "dashboard_url", "brand_name"]'
);

-- 7. Retrait rejeté
INSERT OR IGNORE INTO email_templates (id, name, description, subject, body_html, cta_label, cta_url, variables) VALUES (
  'withdrawal_rejected',
  'Retrait — Rejeté',
  'Envoyé au membre quand son retrait est rejeté',
  'Votre demande de retrait n''a pas pu être traitée',
  '<p>Bonjour <strong>{prenom}</strong>,</p>
<p>Nous avons le regret de vous informer que votre demande de retrait n''a pas pu être traitée.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 12px;background:#fef2f2;font-weight:600;width:40%;">Montant</td><td style="padding:8px 12px;background:#fef2f2;">{montant} {devise}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:600;">Motif</td><td style="padding:8px 12px;">{raison_rejet}</td></tr>
</table>
<p>Les fonds ont été <strong>recrédités</strong> sur votre wallet interne. Vous pouvez soumettre une nouvelle demande.</p>',
  'Créer une nouvelle demande', '{dashboard_url}',
  '["prenom", "montant", "devise", "raison_rejet", "dashboard_url", "brand_name"]'
);

-- 8. Commission reçue
INSERT OR IGNORE INTO email_templates (id, name, description, subject, body_html, cta_label, cta_url, variables) VALUES (
  'commission_received',
  'Commission — Créditée',
  'Envoyé au membre quand une commission est créditée sur son compte',
  'Vous avez reçu une commission de {montant} {devise}',
  '<p>Bonjour <strong>{prenom}</strong>,</p>
<p>Une nouvelle commission vient d''être créditée sur votre compte !</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 12px;background:#fffbeb;font-weight:600;width:40%;">Montant</td><td style="padding:8px 12px;background:#fffbeb;font-weight:700;font-size:18px;color:#d97706;">{montant} {devise}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:600;">Type</td><td style="padding:8px 12px;">{type_commission}</td></tr>
  <tr><td style="padding:8px 12px;background:#fffbeb;font-weight:600;">Source</td><td style="padding:8px 12px;background:#fffbeb;">{source}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:600;">Date</td><td style="padding:8px 12px;">{date}</td></tr>
</table>',
  'Voir mes commissions', '{dashboard_url}',
  '["prenom", "montant", "devise", "type_commission", "source", "date", "dashboard_url", "brand_name"]'
);

-- 9. Package activé
INSERT OR IGNORE INTO email_templates (id, name, description, subject, body_html, cta_label, cta_url, variables) VALUES (
  'package_activated',
  'Package — Activé',
  'Envoyé au membre quand un package est activé sur son compte',
  'Votre package {package_nom} est actif !',
  '<p>Bonjour <strong>{prenom}</strong>,</p>
<p>Votre package a été <strong style="color:#16a34a;">activé avec succès</strong>. Bienvenue dans cette nouvelle étape de votre parcours !</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 12px;background:#f0fdf4;font-weight:600;width:40%;">Package</td><td style="padding:8px 12px;background:#f0fdf4;font-weight:700;">{package_nom}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:600;">Montant</td><td style="padding:8px 12px;">{montant} {devise}</td></tr>
  <tr><td style="padding:8px 12px;background:#f0fdf4;font-weight:600;">Date d''activation</td><td style="padding:8px 12px;background:#f0fdf4;">{date_activation}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:600;">Expire le</td><td style="padding:8px 12px;">{date_expiration}</td></tr>
</table>',
  'Voir mon package', '{dashboard_url}',
  '["prenom", "package_nom", "montant", "devise", "date_activation", "date_expiration", "dashboard_url", "brand_name"]'
);

-- 10. Package expire bientôt
INSERT OR IGNORE INTO email_templates (id, name, description, subject, body_html, cta_label, cta_url, variables) VALUES (
  'package_expiring',
  'Package — Expire bientôt',
  'Envoyé au membre 7 jours avant l''expiration de son package',
  'Votre package expire dans {jours_restants} jours',
  '<p>Bonjour <strong>{prenom}</strong>,</p>
<p>Votre package <strong>{package_nom}</strong> arrive à expiration dans <strong style="color:#d97706;">{jours_restants} jours</strong>.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 12px;background:#fffbeb;font-weight:600;width:40%;">Package</td><td style="padding:8px 12px;background:#fffbeb;">{package_nom}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:600;">Date d''expiration</td><td style="padding:8px 12px;font-weight:700;color:#d97706;">{date_expiration}</td></tr>
</table>
<p>Pour maintenir l''accès à vos avantages, pensez à renouveler votre package avant cette date.</p>',
  'Renouveler mon package', '{dashboard_url}',
  '["prenom", "package_nom", "jours_restants", "date_expiration", "dashboard_url", "brand_name"]'
);

-- 11. Package expiré
INSERT OR IGNORE INTO email_templates (id, name, description, subject, body_html, cta_label, cta_url, variables) VALUES (
  'package_expired',
  'Package — Expiré',
  'Envoyé au membre quand son package a expiré',
  'Votre package {package_nom} a expiré',
  '<p>Bonjour <strong>{prenom}</strong>,</p>
<p>Votre package <strong>{package_nom}</strong> a expiré le <strong>{date_expiration}</strong>.</p>
<p>Certains de vos avantages ont été suspendus. Pour les réactiver, souscrivez à un nouveau package.</p>',
  'Souscrire un package', '{dashboard_url}',
  '["prenom", "package_nom", "date_expiration", "dashboard_url", "brand_name"]'
);

-- 12. Réinitialisation mot de passe
INSERT OR IGNORE INTO email_templates (id, name, description, subject, body_html, cta_label, cta_url, variables) VALUES (
  'password_reset',
  'Sécurité — Reset mot de passe',
  'Envoyé au membre quand il demande un reset de mot de passe',
  'Réinitialisation de votre mot de passe — {brand_name}',
  '<p>Bonjour <strong>{prenom}</strong>,</p>
<p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en définir un nouveau.</p>
<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:4px;">
  <p style="margin:0;font-size:13px;color:#374151;">Ce lien est valable <strong>{expire_dans}</strong> et ne peut être utilisé qu''une seule fois.</p>
</div>
<p style="color:#6b7280;font-size:13px;">Si vous n''avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe reste inchangé.</p>',
  'Réinitialiser mon mot de passe', '{reset_url}',
  '["prenom", "expire_dans", "reset_url", "brand_name"]'
);

-- 13. Connexion nouveau appareil
INSERT OR IGNORE INTO email_templates (id, name, description, subject, body_html, cta_label, cta_url, variables) VALUES (
  'login_new_device',
  'Sécurité — Nouvelle connexion',
  'Envoyé au membre lors d''une connexion depuis un nouvel appareil',
  'Nouvelle connexion détectée sur votre compte',
  '<p>Bonjour <strong>{prenom}</strong>,</p>
<p>Une connexion à votre compte a été détectée depuis un nouvel appareil.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:600;width:40%;">Date</td><td style="padding:8px 12px;background:#f9f9f9;">{date}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:600;">Adresse IP</td><td style="padding:8px 12px;">{ip}</td></tr>
  <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:600;">Appareil</td><td style="padding:8px 12px;background:#f9f9f9;">{device}</td></tr>
</table>
<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:4px;">
  <p style="margin:0;font-size:13px;color:#374151;">Si ce n''était pas vous, <strong>changez immédiatement votre mot de passe</strong> et contactez le support.</p>
</div>',
  'Sécuriser mon compte', '{dashboard_url}',
  '["prenom", "date", "ip", "device", "dashboard_url", "brand_name"]'
);

-- 14. Changement niveau KYC
INSERT OR IGNORE INTO email_templates (id, name, description, subject, body_html, cta_label, cta_url, variables) VALUES (
  'kyc_level_change',
  'KYC — Changement de niveau',
  'Envoyé au membre quand son niveau KYC change',
  'Votre niveau KYC a été mis à jour — {brand_name}',
  '<p>Bonjour <strong>{prenom}</strong>,</p>
<p>Votre niveau de vérification KYC a été mis à jour.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:600;width:40%;">Ancien niveau</td><td style="padding:8px 12px;background:#f9f9f9;">Niveau {ancien_niveau}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:600;">Nouveau niveau</td><td style="padding:8px 12px;font-weight:700;">Niveau {nouveau_niveau} — {niveau_nom}</td></tr>
  <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:600;">Date</td><td style="padding:8px 12px;background:#f9f9f9;">{date}</td></tr>
</table>',
  'Voir mon profil', '{dashboard_url}',
  '["prenom", "ancien_niveau", "nouveau_niveau", "niveau_nom", "date", "dashboard_url", "brand_name"]'
);
