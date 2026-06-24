-- Migration 0084 — campus_course_orders : ajout colonnes payment_ref et validated_at
-- payment_ref : référence de paiement automatique (stripe:pi_xxx, wallet_auto, etc.)
-- validated_at : horodatage de validation automatique

ALTER TABLE campus_course_orders ADD COLUMN payment_ref TEXT;
ALTER TABLE campus_course_orders ADD COLUMN validated_at DATETIME;
