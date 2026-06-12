-- Migration 0018 : Prévention des doublons de commandes packages
-- Problème : un membre pouvait soumettre plusieurs commandes simultanées
-- Solution : index partiel UNIQUE qui garantit qu'un membre ne peut avoir
--            qu'une seule commande active (pending ou proof_submitted) à la fois.

-- Index partiel : UNIQUE sur member_id pour les commandes non terminées
-- (pending ou proof_submitted, non activées)
-- SQLite supporte les index partiels via WHERE depuis la version 3.8.0
CREATE UNIQUE INDEX IF NOT EXISTS uq_package_orders_member_active
  ON package_orders (member_id)
  WHERE status IN ('pending', 'proof_submitted') AND activation_done = 0;

-- Correction des données existantes : s'assurer qu'il n'y a plus de doublons
-- (la commande wilou wilou INFLUENCE a déjà été annulée manuellement)
-- Cette requête est en lecture seule — elle ne modifie rien, elle valide.
-- Si l'index ci-dessus échoue à cause d'un doublon restant, corriger d'abord
-- avec : UPDATE package_orders SET status='cancelled' WHERE ... (doublon)
