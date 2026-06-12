-- Migration 0019 : Mise à jour badge_url vers les vrais PNG pour chaque rang
UPDATE rank_config SET badge_url='/static/badges/administrator.png' WHERE rank_name='Administrator';
UPDATE rank_config SET badge_url='/static/badges/manager.png'       WHERE rank_name='Manager';
UPDATE rank_config SET badge_url='/static/badges/captain.png'       WHERE rank_name='Captain';
UPDATE rank_config SET badge_url='/static/badges/leader.png'        WHERE rank_name='Leader';
UPDATE rank_config SET badge_url='/static/badges/mentor.png'        WHERE rank_name='Mentor';
UPDATE rank_config SET badge_url='/static/badges/superviseur.png'   WHERE rank_name='Superviseur';
UPDATE rank_config SET badge_url='/static/badges/executive.png'     WHERE rank_name='Executive';
UPDATE rank_config SET badge_url='/static/badges/president.png'     WHERE rank_name='President';
UPDATE rank_config SET badge_url='/static/badges/director.png'      WHERE rank_name='Director';
UPDATE rank_config SET badge_url='/static/badges/boss.png'          WHERE rank_name='Boss';
UPDATE rank_config SET badge_url='/static/badges/visionary.png'     WHERE rank_name='Visionary';
