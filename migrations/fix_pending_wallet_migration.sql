-- Migration fix_pending_wallet : patch données locales uniquement
-- Cette migration corrigeait des données de test en environnement local.
-- En production (base vide), aucune action nécessaire.
SELECT 1;
