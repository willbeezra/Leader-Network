-- ============================================================
-- Migration 0037 : Templates de support complets (30 templates)
-- Couvre toutes les situations réelles d'un réseau MLM
-- ============================================================

-- ── WALLET & RETRAITS ────────────────────────────────────────

INSERT OR IGNORE INTO support_templates (id, title, content, category, sort_order) VALUES
('tpl-w01', 'Retrait rejeté – informations manquantes',
'Bonjour {{first_name}},

Votre demande de retrait a été mise en attente car certaines informations sont incomplètes ou incorrectes dans votre profil :

- Vérifiez que vos coordonnées bancaires / wallet crypto sont correctement renseignées
- Assurez-vous que votre pièce d''identité est validée
- Confirmez que le PIN de retrait est bien configuré

Une fois ces points corrigés dans votre espace membre, votre retrait sera traité en priorité.

Cordialement,
L''équipe LEADER Network', 'wallet', 10),

('tpl-w02', 'Retrait annulé – solde insuffisant',
'Bonjour {{first_name}},

Votre demande de retrait (ticket #{{ticket_number}}) n''a pas pu être traitée car le montant demandé dépasse votre solde disponible au moment du traitement.

Rappel : seul le solde "disponible" peut être retiré. Le solde "en attente" est en cours de validation et sera disponible sous 24 à 48h.

Vous pouvez soumettre une nouvelle demande dès que votre solde sera suffisant.

Cordialement,
L''équipe LEADER Network', 'wallet', 11),

('tpl-w03', 'Solde en attente – explication',
'Bonjour {{first_name}},

Votre solde "en attente" correspond aux commissions validées qui sont en cours de transfert vers votre solde disponible. Ce processus est automatique et s''effectue quotidiennement.

Le délai habituel est de 24 à 72 heures selon le volume de traitement.

Si votre solde en attente n''a pas évolué après 72h, contactez-nous avec la période concernée et nous investiguerons.

Cordialement,
L''équipe LEADER Network', 'wallet', 12),

('tpl-w04', 'Virement reçu – confirmation',
'Bonjour {{first_name}},

Nous confirmons que votre virement a bien été émis depuis nos systèmes. Les délais de réception varient selon le moyen de paiement :

- Virement bancaire : 2 à 5 jours ouvrés
- Crypto (USDT/BTC) : 30 min à 2h selon la blockchain
- PayPal : 24 à 48h

Si vous ne recevez rien passé ce délai, revenez vers nous avec votre numéro de ticket et nous ferons une investigation auprès de notre prestataire.

Cordialement,
L''équipe LEADER Network', 'wallet', 13),

('tpl-w05', 'PIN de retrait oublié',
'Bonjour {{first_name}},

Pour réinitialiser votre PIN de retrait :

1. Rendez-vous dans votre espace membre → Profil → Sécurité
2. Cliquez sur "Réinitialiser le PIN"
3. Un code de vérification vous sera envoyé par email
4. Suivez les instructions pour définir un nouveau PIN

Si vous ne recevez pas l''email, vérifiez vos spams ou contactez-nous à nouveau.

Cordialement,
L''équipe LEADER Network', 'wallet', 14),

-- ── COMMISSIONS ──────────────────────────────────────────────

('tpl-c01', 'Commission non reçue – en cours d''investigation',
'Bonjour {{first_name}},

Nous avons bien pris note de votre signalement concernant une commission manquante pour la période indiquée.

Notre équipe technique procède à une vérification de vos transactions. Cette investigation peut prendre 24 à 72 heures ouvrées.

Vous serez notifié(e) directement sur ce ticket dès que nous aurons des résultats.

Cordialement,
L''équipe LEADER Network', 'commission', 20),

('tpl-c02', 'Prime Leadership – calcul expliqué',
'Bonjour {{first_name}},

La Prime Leadership est calculée sur la base du Volume BV global de votre réseau actif, selon votre rang au moment du calcul.

Points importants :
- Elle est recalculée mensuellement
- Seuls les membres actifs (avec package valide) génèrent du BV
- Le rang pris en compte est celui au dernier jour du mois

Si vous constatez un écart, merci de nous préciser la période exacte et le montant attendu pour que nous puissions vérifier.

Cordialement,
L''équipe LEADER Network', 'commission', 21),

('tpl-c03', 'Bonus d''Influence – explication des niveaux',
'Bonjour {{first_name}},

Le Bonus d''Influence est calculé sur les primes de vos filleuls selon les niveaux suivants :

- Niveau 1 (filleuls directs) : 5%
- Niveau 2 : 4%
- Niveau 3 : 3%
- Niveau 4 : 2%
- Niveau 5 : 2%

Ce bonus n''est actif que si vous êtes qualifié(e) selon votre rang et que vos filleuls génèrent eux-mêmes une prime.

Si vous avez des filleuls actifs mais ne voyez pas de bonus, vérifiez votre statut de qualification dans votre dashboard.

Cordialement,
L''équipe LEADER Network', 'commission', 22),

('tpl-c04', 'Correction de commission appliquée',
'Bonjour {{first_name}},

Suite à votre signalement, nous avons identifié une anomalie dans le calcul de vos commissions pour la période concernée.

La correction a été appliquée et votre solde a été mis à jour. Vous pouvez vérifier le détail dans la section "Historique des transactions" de votre espace membre.

Nous vous présentons nos excuses pour ce désagrément.

Cordialement,
L''équipe LEADER Network', 'commission', 23),

('tpl-c05', 'Fast Start Bonus – conditions',
'Bonjour {{first_name}},

Le Fast Start Bonus est déclenché lors du recrutement d''un nouveau membre qui réalise son premier achat de package.

Conditions pour en bénéficier :
- Vous devez être le parrain/marraine direct(e)
- Le recrutement doit intervenir dans les 30 premiers jours suivant votre propre adhésion (selon les règles en vigueur)
- Votre compte doit être en règle (package actif)

Pour toute question spécifique sur un bonus manquant, précisez l''identifiant du filleul concerné.

Cordialement,
L''équipe LEADER Network', 'commission', 24),

-- ── PACKAGES & UPGRADES ──────────────────────────────────────

('tpl-p01', 'Paiement reçu – activation en cours',
'Bonjour {{first_name}},

Nous avons bien reçu votre paiement. L''activation de votre package est en cours de traitement par notre équipe administrative.

Délai habituel : 24 à 48h ouvrées après réception des fonds.

Vous recevrez une confirmation par email et votre espace membre sera mis à jour automatiquement.

Cordialement,
L''équipe LEADER Network', 'package', 30),

('tpl-p02', 'Paiement non confirmé – justificatif requis',
'Bonjour {{first_name}},

Nous n''avons pas encore reçu la confirmation de votre paiement pour le ticket #{{ticket_number}}.

Merci de nous transmettre :
- Une capture d''écran ou un reçu de votre virement/paiement
- La date et le montant exact de la transaction
- La référence de transaction si disponible

Dès réception, nous traiterons votre demande en priorité.

Cordialement,
L''équipe LEADER Network', 'package', 31),

('tpl-p03', 'Upgrade de package – procédure',
'Bonjour {{first_name}},

Pour upgrader votre package, vous ne payez que la différence entre votre niveau actuel et le nouveau.

Procédure :
1. Allez dans "Packages" depuis votre tableau de bord
2. Sélectionnez le package souhaité
3. Choisissez votre méthode de paiement
4. Soumettez votre demande

Un membre de notre équipe validera l''upgrade sous 24 à 48h ouvrées.

Si vous rencontrez un problème technique, précisez-le sur ce ticket.

Cordialement,
L''équipe LEADER Network', 'package', 32),

('tpl-p04', 'Package expiré – renouvellement',
'Bonjour {{first_name}},

Votre package actuel est arrivé à expiration, ce qui a temporairement suspendu la génération de commissions et votre statut dans le réseau.

Pour renouveler ou upgrader :
1. Connectez-vous à votre espace membre
2. Accédez à la section "Packages"
3. Choisissez votre formule et procédez au paiement

Votre accès et vos commissions seront rétablis dès validation.

Cordialement,
L''équipe LEADER Network', 'package', 33),

-- ── COMPTE & ACCÈS ───────────────────────────────────────────

('tpl-a01', 'Compte bloqué – procédure de déblocage',
'Bonjour {{first_name}},

Votre compte a été temporairement suspendu suite à une détection d''activité inhabituelle ou à une non-conformité avec nos conditions générales.

Pour débloquer votre compte, merci de nous fournir :
- Une copie de votre pièce d''identité (recto/verso)
- Une confirmation de votre email d''inscription
- Une brève explication si vous avez une question sur la raison du blocage

Notre équipe de conformité traitera votre demande sous 48 à 72h ouvrées.

Cordialement,
L''équipe LEADER Network', 'account', 40),

('tpl-a02', 'Mot de passe oublié',
'Bonjour {{first_name}},

Pour réinitialiser votre mot de passe :

1. Rendez-vous sur la page de connexion
2. Cliquez sur "Mot de passe oublié"
3. Entrez l''adresse email associée à votre compte ({{email}})
4. Suivez le lien reçu par email (valable 1h)

Si vous ne recevez pas l''email, vérifiez vos dossiers spam. Si le problème persiste, répondez à ce ticket et nous procéderons à une réinitialisation manuelle.

Cordialement,
L''équipe LEADER Network', 'account', 41),

('tpl-a03', 'Changement d''email – procédure',
'Bonjour {{first_name}},

Pour des raisons de sécurité, le changement d''adresse email nécessite une validation manuelle.

Merci de nous fournir sur ce ticket :
- Votre ancienne adresse email
- Votre nouvelle adresse email souhaitée
- Une pièce d''identité en cours de validité

Le changement sera effectué sous 24h ouvrées après vérification.

Cordialement,
L''équipe LEADER Network', 'account', 42),

('tpl-a04', 'Profil incomplet – vérification KYC',
'Bonjour {{first_name}},

Votre profil nécessite une vérification d''identité (KYC) pour débloquer toutes les fonctionnalités, notamment les retraits.

Documents requis :
- Pièce d''identité valide (passeport, CNI ou permis de conduire)
- Justificatif de domicile de moins de 3 mois (optionnel selon votre pays)

Envoyez-les en réponse à ce ticket ou via la section "Vérification" de votre profil.

Cordialement,
L''équipe LEADER Network', 'account', 43),

('tpl-a05', 'Double compte détecté',
'Bonjour {{first_name}},

Notre système a détecté plusieurs comptes associés à la même identité ou adresse email. Conformément à nos conditions générales, un seul compte est autorisé par membre.

Merci de nous indiquer quel compte vous souhaitez conserver. L''autre sera clôturé et son historique archivé.

Sans réponse de votre part sous 7 jours, le compte le plus récent sera automatiquement désactivé.

Cordialement,
L''équipe LEADER Network', 'account', 44),

-- ── ARBRE & PARRAINAGE ───────────────────────────────────────

('tpl-t01', 'Filleul non visible dans l''arbre',
'Bonjour {{first_name}},

Si un filleul que vous avez parrainé n''apparaît pas encore dans votre arbre, voici les raisons possibles :

1. L''inscription n''est pas encore finalisée (email non confirmé)
2. Le package n''a pas encore été activé (paiement en attente)
3. Un délai de synchronisation de 2 à 4h est possible

Si le problème persiste au-delà de 24h, communiquez-nous l''identifiant ou l''email de votre filleul et nous vérifierons manuellement.

Cordialement,
L''équipe LEADER Network', 'tree', 50),

('tpl-t02', 'Erreur de placement dans l''arbre',
'Bonjour {{first_name}},

Le placement dans l''arbre binaire est effectué automatiquement selon la règle du côté le plus faible. Une fois validé, il ne peut pas être modifié unilatéralement.

Si vous pensez qu''il y a eu une erreur technique (et non un simple placement automatique), merci de nous préciser :
- L''identifiant du membre mal placé
- Le côté où il aurait dû être placé
- La date approximative de l''inscription

Notre équipe technique examinera la situation.

Cordialement,
L''équipe LEADER Network', 'tree', 51),

('tpl-t03', 'Lien de parrainage ne fonctionne pas',
'Bonjour {{first_name}},

Si votre lien de parrainage ne fonctionne pas, voici quelques solutions :

1. Vérifiez que votre compte est bien actif et que votre package est en cours de validité
2. Essayez de copier le lien directement depuis votre tableau de bord
3. Testez avec un navigateur en mode incognito
4. Désactivez temporairement votre bloqueur de publicités

Si le problème persiste, précisez votre navigateur et système d''exploitation, nous investiguerons côté technique.

Cordialement,
L''équipe LEADER Network', 'tree', 52),

-- ── LICENCE FINSTRATEGIA ─────────────────────────────────────

('tpl-l01', 'Activation licence – délai',
'Bonjour {{first_name}},

L''activation de votre licence Finstrategia est en cours. Ce processus prend généralement 24 à 72h ouvrées après confirmation du paiement.

Vous recevrez vos identifiants d''accès directement par email à l''adresse {{email}}.

Si vous n''avez rien reçu après 72h, revenez sur ce ticket et nous relancerons l''activation manuellement.

Cordialement,
L''équipe LEADER Network', 'license', 60),

('tpl-l02', 'Accès licence perdu – réinitialisation',
'Bonjour {{first_name}},

Pour récupérer l''accès à votre licence Finstrategia :

1. Essayez la procédure "Mot de passe oublié" sur la plateforme Finstrategia
2. Vérifiez l''email utilisé lors de l''activation (peut-être différent de votre email LEADER Network)

Si vous ne retrouvez pas l''accès, nous pouvons contacter Finstrategia en votre nom. Merci de confirmer sur ce ticket que vous souhaitez que nous intervenions.

Cordialement,
L''équipe LEADER Network', 'license', 61),

-- ── TECHNIQUE & BUG ──────────────────────────────────────────

('tpl-g01', 'Bug signalé – en cours d''investigation',
'Bonjour {{first_name}},

Merci pour votre signalement. Nous avons transmis le problème technique à notre équipe de développement.

Pour accélérer la résolution, pourriez-vous nous préciser :
- Le navigateur et la version utilisés (Chrome, Safari, Firefox…)
- Le système d''exploitation (Windows, Mac, iOS, Android)
- Les étapes exactes pour reproduire le problème
- Une capture d''écran si possible

Nous vous tiendrons informé(e) de l''avancement sur ce ticket.

Cordialement,
L''équipe LEADER Network', 'other', 70),

('tpl-g02', 'Problème résolu – mise à jour disponible',
'Bonjour {{first_name}},

Le problème technique que vous avez signalé a été corrigé dans notre dernière mise à jour.

Pour en bénéficier :
1. Videz le cache de votre navigateur (Ctrl+Shift+Del)
2. Rechargez la page (F5 ou Ctrl+R)
3. Si vous utilisez l''application mobile, mettez-la à jour depuis votre store

Si le problème persiste après ces étapes, répondez à ce ticket.

Cordialement,
L''équipe LEADER Network', 'other', 71),

('tpl-g03', 'Dashboard ne se charge pas',
'Bonjour {{first_name}},

Si votre tableau de bord ne se charge pas correctement, voici les solutions à essayer dans l''ordre :

1. Videz le cache et les cookies de votre navigateur
2. Essayez en mode navigation privée/incognito
3. Testez avec un autre navigateur (Chrome recommandé)
4. Désactivez les extensions de navigateur temporairement
5. Vérifiez votre connexion internet

Si aucune de ces solutions ne fonctionne, précisez le message d''erreur exact affiché et nous investiguerons.

Cordialement,
L''équipe LEADER Network', 'other', 72),

-- ── GÉNÉRAL ──────────────────────────────────────────────────

('tpl-g04', 'Délai de réponse prolongé – excuse',
'Bonjour {{first_name}},

Nous nous excusons pour le délai de traitement de votre demande (ticket #{{ticket_number}}). Nous traversons actuellement une période de forte activité.

Votre demande est bien en file de priorité et sera traitée dans les plus brefs délais.

Merci de votre patience et compréhension.

Cordialement,
L''équipe LEADER Network', 'general', 80),

('tpl-g05', 'Escalade vers équipe spécialisée',
'Bonjour {{first_name}},

Votre demande nécessite l''intervention d''un spécialiste de notre équipe. Nous avons transmis votre ticket #{{ticket_number}} au département concerné.

Vous pouvez vous attendre à une réponse détaillée sous 48 à 72h ouvrées. Ce ticket reste ouvert et vous serez notifié(e) dès qu''une réponse est disponible.

Cordialement,
L''équipe LEADER Network', 'general', 81),

('tpl-g06', 'Demande hors périmètre – redirection',
'Bonjour {{first_name}},

Votre demande sort du périmètre de notre support technique. Voici comment nous pouvons vous orienter :

- Pour les questions fiscales : consultez un comptable ou expert-comptable local
- Pour les litiges légaux : référez-vous à nos CGU disponibles sur notre site
- Pour le coaching réseau : contactez votre sponsor ou le leader de votre ligne

N''hésitez pas à revenir vers nous pour toute question relevant de notre périmètre.

Cordialement,
L''équipe LEADER Network', 'general', 82);
