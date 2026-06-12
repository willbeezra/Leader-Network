-- Pré-remplissage des valeurs Prime de Leadership selon le programme officiel
-- Volume mensuel par jambe (petite jambe), directs mensuels requis, pkg min 1499$, plancher 2 rangs

UPDATE rank_config SET
  min_monthly_bv_leg        = 400,
  min_monthly_directs       = 1,
  min_monthly_package_value = 1499,
  monthly_floor_ranks       = 2
WHERE rank_name = 'Administrator';

UPDATE rank_config SET
  min_monthly_bv_leg        = 2000,
  min_monthly_directs       = 1,
  min_monthly_package_value = 1499,
  monthly_floor_ranks       = 2
WHERE rank_name = 'Manager';

UPDATE rank_config SET
  min_monthly_bv_leg        = 6000,
  min_monthly_directs       = 2,
  min_monthly_package_value = 1499,
  monthly_floor_ranks       = 2
WHERE rank_name = 'Captain';

UPDATE rank_config SET
  min_monthly_bv_leg        = 12500,
  min_monthly_directs       = 2,
  min_monthly_package_value = 1499,
  monthly_floor_ranks       = 2
WHERE rank_name = 'Leader';

UPDATE rank_config SET
  min_monthly_bv_leg        = 35000,
  min_monthly_directs       = 3,
  min_monthly_package_value = 1499,
  monthly_floor_ranks       = 2
WHERE rank_name = 'Mentor';

UPDATE rank_config SET
  min_monthly_bv_leg        = 80000,
  min_monthly_directs       = 4,
  min_monthly_package_value = 1499,
  monthly_floor_ranks       = 2
WHERE rank_name = 'Superviseur';

UPDATE rank_config SET
  min_monthly_bv_leg        = 170000,
  min_monthly_directs       = 5,
  min_monthly_package_value = 1499,
  monthly_floor_ranks       = 2
WHERE rank_name = 'Executive';

UPDATE rank_config SET
  min_monthly_bv_leg        = 350000,
  min_monthly_directs       = 6,
  min_monthly_package_value = 1499,
  monthly_floor_ranks       = 2
WHERE rank_name = 'President';

UPDATE rank_config SET
  min_monthly_bv_leg        = 700000,
  min_monthly_directs       = 8,
  min_monthly_package_value = 1499,
  monthly_floor_ranks       = 2
WHERE rank_name = 'Director';

UPDATE rank_config SET
  min_monthly_bv_leg        = 1400000,
  min_monthly_directs       = 10,
  min_monthly_package_value = 1499,
  monthly_floor_ranks       = 2
WHERE rank_name = 'Boss';

UPDATE rank_config SET
  min_monthly_bv_leg        = 2800000,
  min_monthly_directs       = 12,
  min_monthly_package_value = 1499,
  monthly_floor_ranks       = 2
WHERE rank_name = 'Visionary';
