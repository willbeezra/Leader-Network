-- ══════════════════════════════════════════════════════════════════════════
-- Migration 0070 : Correction du système de versement journalier
-- ══════════════════════════════════════════════════════════════════════════
--
-- CONTEXTE :
-- L'ancien système versait N jours d'un coup en une seule transaction,
-- ce qui causait des compteurs erronés (ex: 22/30 jours le 9 juin alors
-- qu'on était au 9ème jour).
--
-- Le nouveau système verse UNE transaction par jour calendaire, avec un
-- libellé explicite indiquant la date du jour concerné.
--
-- CORRECTION DES ENTRÉES EXISTANTES :
-- Pour les entrées en cours (status IN 'pending_release','active'),
-- on remet days_paid à la valeur correcte basée sur l'argent réellement
-- déjà sorti du pending_balance (via les wallet_transactions existantes).
--
-- IMPORTANT : On ne touche PAS aux wallets (balance, pending_balance)
-- car l'argent a déjà été transféré. On corrige uniquement le compteur
-- days_paid pour que l'affichage soit cohérent avec la réalité.
-- ══════════════════════════════════════════════════════════════════════════

-- Étape 1 : Pour chaque entrée active, recalculer days_paid
-- en comptant le montant total déjà libéré divisé par amount_per_day
UPDATE pending_wallet_entries
SET days_paid = CAST(
  MIN(
    days_in_month,
    ROUND(
      (
        SELECT COALESCE(SUM(-amount), 0)
        FROM wallet_transactions
        WHERE reference_id = pending_wallet_entries.id
          AND wallet_type = 'pending'
          AND transaction_type = 'debit_transfer'
      ) / NULLIF(amount_per_day, 0)
    )
  ) AS INTEGER
)
WHERE status IN ('pending_release', 'active')
  AND amount_per_day > 0;

-- Étape 2 : Marquer comme 'completed' les entrées dont days_paid = days_in_month
UPDATE pending_wallet_entries
SET status = 'completed'
WHERE status IN ('pending_release', 'active')
  AND days_paid >= days_in_month;

-- Étape 3 : Passer de 'pending_release' à 'active' les entrées qui ont
-- déjà eu au moins 1 versement mais ne sont pas encore terminées
UPDATE pending_wallet_entries
SET status = 'active'
WHERE status = 'pending_release'
  AND days_paid > 0
  AND days_paid < days_in_month;

-- Étape 4 : Mettre à jour last_paid_at pour les entrées actives qui
-- n'ont pas de last_paid_at (elles en auront un après le prochain run)
-- Rien à faire — last_paid_at sera mis à jour au prochain processDailyPayments
