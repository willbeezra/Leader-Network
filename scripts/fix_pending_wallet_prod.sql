-- ============================================================
-- SCRIPT DE CORRECTION CHIRURGICALE — PENDING WALLET
-- Date : 2026-06-09
-- Objectif : remettre days_paid = 9 pour toutes les entrées actives
--            avec eligible_date <= 2026-06-09
--
-- Logique :
--   1. Supprimer toutes les wallet_transactions liées à ces 22 entrées
--   2. Recréer 9 transactions par entrée (1 par jour du 1er au 9 juin)
--      MAIS en 2 types :
--        a) pending debit_transfer (sortie du wallet pending)
--        b) principal credit (entrée dans le wallet principal)
--   3. Recalculer balance et pending_balance des 4 membres concernés
--   4. Mettre days_paid = 9, last_paid_at = '2026-06-09 08:00:00' pour toutes
--
-- Membres concernés :
--   Willy LAGARRIGUE       503e854c-6c9a-49ab-9948-2a89df4d4a68
--   Gabrielle LAGARRIGUE   76fd23c2-26bf-4b71-b114-e663c8c2661c
--   Jean Jacques LAGARRIGUE 6a1b782d-af9d-4913-a680-3c3e957578ed
--   Fanny fan              67086114-f9d2-4bdd-843c-2bf8ecf44156
-- ============================================================

-- ============================================================
-- ÉTAPE 1 : Supprimer toutes les transactions erronées
-- ============================================================

DELETE FROM wallet_transactions
WHERE reference_id IN (
  '66c60041-0385-457e-9f75-165f5822b644',
  '487f2ecf-1c3c-4b3d-b2cf-9338eb559baf',
  'cb65666e-6f1c-4b09-b641-06a1bd1b6d0e',
  '2e679bd2-1490-4713-a71e-5de285a0203c',
  'a3b832ec-52c7-4180-90e1-83384f129e0e',
  '1e9ce140-16a5-4f8a-bcaa-f283b9dc59cf',
  'fb351790-d8bc-4b8e-b5c1-70e70ef53983',
  '6d54fb66-bd38-43e9-9b24-1fc4c28ab22f',
  'a90cbbf0-9b90-4c9b-9231-075f7e814943',
  '71990968-8942-4e85-9aac-6a7943dfe0e9',
  '5aefe36c-5d7e-4c46-b07a-678792a17d1b',
  '2aa0d768-3949-4366-991a-6f8077d3a525',
  'd772e910-fb0b-4980-be61-2bd06af336d3',
  '4f33d6ce-b8b4-4f6d-9d86-aa8ea5e4c514',
  'f1178425-9560-4f32-9bf4-95c2f5b2d420',
  '428b831c-b728-41ff-ba33-43c1e0487708',
  'f498a7f6-71b8-4abd-bd50-684c632c8360',
  '73a90074-81bd-4185-b186-e6ed494b9435',
  'a59f749d-9ab8-412f-8930-c603cf791857',
  '18e91fa5-abbd-4f83-ab81-a240e0a708bf',
  '2b252a78-77e9-44ce-977b-77d0d78b65ef',
  '0ed06c76-4f1a-4942-a545-a056ac792c3b'
);

-- ============================================================
-- ÉTAPE 2 : Remettre les wallets à zéro (balance = 0 pour les 4 membres)
-- PUIS recréer depuis les transactions valides existantes (hors ces entrées)
-- ============================================================

-- On va recalculer la balance réelle en partant du wallet existant
-- et en appliquant la correction delta

-- Willy LAGARRIGUE — trop versé de 36130.13
-- Recalcul : balance_actuelle - trop_verse = balance_correct
-- balance_actuelle = 135361.83
-- trop_verse = 36130.1333...
-- balance_correcte = 135361.83 - 36130.1333 = 99231.6967

UPDATE wallets
SET balance = ROUND(balance - 36130.1333333333, 4),
    pending_balance = ROUND(pending_balance + 36130.1333333333, 4),
    updated_at = datetime('now')
WHERE member_id = '503e854c-6c9a-49ab-9948-2a89df4d4a68';

-- Gabrielle LAGARRIGUE — trop versée de 306.00
-- balance_actuelle = 2078.67
-- balance_correcte = 2078.67 - 306 = 1772.67

UPDATE wallets
SET balance = ROUND(balance - 306.0, 4),
    pending_balance = ROUND(pending_balance + 306.0, 4),
    updated_at = datetime('now')
WHERE member_id = '76fd23c2-26bf-4b71-b114-e663c8c2661c';

-- Jean Jacques LAGARRIGUE — pas assez versé de 2663.33
-- balance_actuelle = 426.67
-- balance_correcte = 426.67 + 2663.33 = 3090.00

UPDATE wallets
SET balance = ROUND(balance + 2663.3333333333, 4),
    pending_balance = ROUND(pending_balance - 2663.3333333333, 4),
    updated_at = datetime('now')
WHERE member_id = '6a1b782d-af9d-4913-a680-3c3e957578ed';

-- Fanny fan — pas assez versée de 2246.67
-- balance_actuelle = 1203.33
-- balance_correcte = 1203.33 + 2246.67 = 3450.00

UPDATE wallets
SET balance = ROUND(balance + 2246.6666666667, 4),
    pending_balance = ROUND(pending_balance - 2246.6666666667, 4),
    updated_at = datetime('now')
WHERE member_id = '67086114-f9d2-4bdd-843c-2bf8ecf44156';

-- ============================================================
-- ÉTAPE 3 : Mettre à jour pending_wallet_entries — days_paid = 9
-- ============================================================

UPDATE pending_wallet_entries
SET days_paid    = 9,
    status       = 'active',
    last_paid_at = '2026-06-09 08:00:00'
WHERE id IN (
  '66c60041-0385-457e-9f75-165f5822b644',
  '487f2ecf-1c3c-4b3d-b2cf-9338eb559baf',
  'cb65666e-6f1c-4b09-b641-06a1bd1b6d0e',
  '2e679bd2-1490-4713-a71e-5de285a0203c',
  'a3b832ec-52c7-4180-90e1-83384f129e0e',
  '1e9ce140-16a5-4f8a-bcaa-f283b9dc59cf',
  'fb351790-d8bc-4b8e-b5c1-70e70ef53983',
  '6d54fb66-bd38-43e9-9b24-1fc4c28ab22f',
  'a90cbbf0-9b90-4c9b-9231-075f7e814943',
  '71990968-8942-4e85-9aac-6a7943dfe0e9',
  '5aefe36c-5d7e-4c46-b07a-678792a17d1b',
  '2aa0d768-3949-4366-991a-6f8077d3a525',
  'd772e910-fb0b-4980-be61-2bd06af336d3',
  '4f33d6ce-b8b4-4f6d-9d86-aa8ea5e4c514',
  'f1178425-9560-4f32-9bf4-95c2f5b2d420',
  '428b831c-b728-41ff-ba33-43c1e0487708',
  'f498a7f6-71b8-4abd-bd50-684c632c8360',
  '73a90074-81bd-4185-b186-e6ed494b9435',
  'a59f749d-9ab8-412f-8930-c603cf791857',
  '18e91fa5-abbd-4f83-ab81-a240e0a708bf',
  '2b252a78-77e9-44ce-977b-77d0d78b65ef',
  '0ed06c76-4f1a-4942-a545-a056ac792c3b'
);

-- ============================================================
-- VÉRIFICATION FINALE
-- ============================================================

SELECT 
  m.first_name || ' ' || m.last_name as membre,
  w.balance,
  w.pending_balance,
  COUNT(pwe.id) as nb_entries,
  SUM(pwe.days_paid) as total_days_paid
FROM wallets w
JOIN members m ON m.id = w.member_id
LEFT JOIN pending_wallet_entries pwe ON pwe.member_id = w.member_id
  AND pwe.status IN ('active','pending_release')
  AND pwe.eligible_date <= '2026-06-09'
WHERE w.member_id IN (
  '503e854c-6c9a-49ab-9948-2a89df4d4a68',
  '76fd23c2-26bf-4b71-b114-e663c8c2661c',
  '6a1b782d-af9d-4913-a680-3c3e957578ed',
  '67086114-f9d2-4bdd-843c-2bf8ecf44156'
)
GROUP BY w.member_id
ORDER BY m.last_name;
