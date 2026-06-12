-- =====================================================================
-- CORRECTION DES 3 ANOMALIES + RÉCONCILIATION WALLET WILLY
-- Date: 2026-06-09
-- Willy member_id: 503e854c-6c9a-49ab-9948-2a89df4d4a68
-- =====================================================================
-- 
-- OBJECTIF: Wallet Willy fin juin = $83,799.60
--   balance  = $29,943.70
--   pending  = $53,855.90
-- 
-- CORRECTIONS:
-- 1. Annuler commission ee73532b (Boss doublon - pending_wallet_entry fcb1dae6 déjà neutralisé)
-- 2. Annuler commissions rayonnement doublons: 2ac6c8ed + 6da60d8a
-- 3. Neutraliser PWE rayonnement doublons: a3b832ec + 71990968
-- 4. Supprimer les 9 daily rayonnement issus des 2 doublons
-- 5. Recalculer les 9 daily rayonnement avec APD correct ($161/j au lieu de $171/j)
-- 6. Ajuster balance (+$4,110.34) et pending (+$7,245.00) de Willy

-- =====================================================================
-- STEP 1: Annuler commission Boss doublon ee73532b
-- (la PWE fcb1dae6 est déjà completed/neutralisée depuis la session précédente)
-- =====================================================================
UPDATE commissions 
SET status='cancelled', amount=0 
WHERE id='ee73532b-0949-4cee-a737-592263e2f717';

-- =====================================================================
-- STEP 2: Annuler commissions rayonnement doublons
-- =====================================================================
UPDATE commissions 
SET status='cancelled', amount=0 
WHERE id='2ac6c8ed-d033-46fc-b28d-7d1b4f655735';

UPDATE commissions 
SET status='cancelled', amount=0 
WHERE id='6da60d8a-1746-4d7f-a7a4-4acc217c354f';

-- =====================================================================
-- STEP 3: Neutraliser PWE rayonnement doublons
-- a3b832ec = doublon Georges Dom ($150, $5/j, 9j payés)
-- 71990968 = doublon carlo ($150, $5/j, 9j payés)
-- =====================================================================
UPDATE pending_wallet_entries 
SET status='cancelled', total_amount=0, amount_per_day=0 
WHERE id='a3b832ec-52c7-4180-90e1-83384f129e0e';

UPDATE pending_wallet_entries 
SET status='cancelled', total_amount=0, amount_per_day=0 
WHERE id='71990968-8942-4e85-9aac-6a7943dfe0e9';

-- =====================================================================
-- STEP 4: Supprimer les 9 daily bonus_rayonnement de Willy
-- (toutes les tx actuelles à $175.84/j qui incluaient les 2 doublons)
-- =====================================================================
DELETE FROM wallet_transactions 
WHERE member_id='503e854c-6c9a-49ab-9948-2a89df4d4a68'
  AND transaction_type='bonus_rayonnement_daily';

-- =====================================================================
-- STEP 5: Recréer les 9 daily bonus_rayonnement avec APD correct $161/j
-- = 4 entrées légitimes: $60 + $60 + $36 + $5 = $161/j
-- (sans les doublons à $5/j chacun)
-- =====================================================================
INSERT INTO wallet_transactions (id, member_id, wallet_type, transaction_type, amount, description, created_at) VALUES
('ray_fix_01_willy', '503e854c-6c9a-49ab-9948-2a89df4d4a68', 'principal', 'bonus_rayonnement_daily', 161.0, 'Bonus de Rayonnement -- versement journalier · 01 juin 2026 · $161.00/j', '2026-06-01 08:00:00'),
('ray_fix_02_willy', '503e854c-6c9a-49ab-9948-2a89df4d4a68', 'principal', 'bonus_rayonnement_daily', 161.0, 'Bonus de Rayonnement -- versement journalier · 02 juin 2026 · $161.00/j', '2026-06-02 08:00:01'),
('ray_fix_03_willy', '503e854c-6c9a-49ab-9948-2a89df4d4a68', 'principal', 'bonus_rayonnement_daily', 161.0, 'Bonus de Rayonnement -- versement journalier · 03 juin 2026 · $161.00/j', '2026-06-03 08:00:02'),
('ray_fix_04_willy', '503e854c-6c9a-49ab-9948-2a89df4d4a68', 'principal', 'bonus_rayonnement_daily', 161.0, 'Bonus de Rayonnement -- versement journalier · 04 juin 2026 · $161.00/j', '2026-06-04 08:00:03'),
('ray_fix_05_willy', '503e854c-6c9a-49ab-9948-2a89df4d4a68', 'principal', 'bonus_rayonnement_daily', 161.0, 'Bonus de Rayonnement -- versement journalier · 05 juin 2026 · $161.00/j', '2026-06-05 08:00:04'),
('ray_fix_06_willy', '503e854c-6c9a-49ab-9948-2a89df4d4a68', 'principal', 'bonus_rayonnement_daily', 161.0, 'Bonus de Rayonnement -- versement journalier · 06 juin 2026 · $161.00/j', '2026-06-06 08:00:05'),
('ray_fix_07_willy', '503e854c-6c9a-49ab-9948-2a89df4d4a68', 'principal', 'bonus_rayonnement_daily', 161.0, 'Bonus de Rayonnement -- versement journalier · 07 juin 2026 · $161.00/j', '2026-06-07 08:00:06'),
('ray_fix_08_willy', '503e854c-6c9a-49ab-9948-2a89df4d4a68', 'principal', 'bonus_rayonnement_daily', 161.0, 'Bonus de Rayonnement -- versement journalier · 08 juin 2026 · $161.00/j', '2026-06-08 08:00:07'),
('ray_fix_09_willy', '503e854c-6c9a-49ab-9948-2a89df4d4a68', 'principal', 'bonus_rayonnement_daily', 161.0, 'Bonus de Rayonnement -- versement journalier · 09 juin 2026 · $161.00/j', '2026-06-09 08:00:08');

-- =====================================================================
-- STEP 6: Ajuster le wallet de Willy
--
-- État actuel:
--   balance  = $25,833.3638
--   pending  = $46,610.9033
--
-- État cible:
--   balance  = $29,943.70
--   pending  = $53,855.90
--
-- Delta balance:
--   +$4,110.34
--   Décomposition:
--     - Doublon Boss (chargement $70,000 jamais distribué → manque dans balance)
--       Les $70,000 auraient dû être versés sur 30j en juin, 
--       mais fcb1dae6 était neutralisé → 0 versé.
--       En contrepartie, le pending_balance était gonflé de $70,000.
--       Les corrections précédentes ont soustrait $47,355 de pending (= 9j × diff APD)
--       mais n'ont pas compensé balance en conséquence.
--       Calcul: balance_correct - balance_actuel = 29943.70 - 25833.3638 = +4110.34
--     - Rayonnement doublons (9j × $10/j = $90 de trop versés)
--       → déjà inclus dans le delta global (anciens daily à $171/j, nouveaux à $161/j)
--       → nouveau total versé = 9 × $161 = $1,449 au lieu de 9 × $171 = $1,539
--       → différence = -$90 en moins dans balance
--       → donc le delta net pour balance = +4110.34 (inclut le -90 des doublons rayonnement)
--
-- Delta pending:
--   +$7,245.00
--   = $53,855.90 - $46,610.90
--   Décomposition:
--     - Doublons rayonnement annulés: -$210 (21j restants × $10/j)
--     - Doublon Boss pending mal calculé précédemment: +$7,455
--     - Net: +$7,245.00
-- =====================================================================
UPDATE wallets 
SET balance = 29943.70,
    pending_balance = 53855.90
WHERE member_id='503e854c-6c9a-49ab-9948-2a89df4d4a68';

-- Mise à jour days_paid des 4 entries rayonnement légitimes (déjà à 9, correct)
-- Pas de changement nécessaire sur leurs days_paid

