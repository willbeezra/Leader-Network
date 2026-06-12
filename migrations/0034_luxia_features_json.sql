-- Migration 0034 — Conversion features LUXIA en JSON array (compatible renderPkgCard)
-- Les features étaient en format "item1|item2|..." (string pipe-séparée)
-- renderPkgCard attend un JSON array de strings
-- Contenu extrait de l'image officielle de la charte LUXIA

UPDATE packages SET features = '["Accès plateforme complète","Wallet Luxia inclus","Points x1 par euro dépensé","Marketplace LEADX","Dream Experience basique","STARS Investissement"]'
WHERE id = 'pkg-luxia-pass-acces';

UPDATE packages SET features = '["Tout du Pass Accès","Points x3 par euro dépensé","Conciergerie dédiée 24/7","DreamPass complet – jusqu''à 100%","DreamTour & DreamWelcome","Invitations événements exclusifs","Support prioritaire immédiat"]'
WHERE id = 'pkg-luxia-signature';
