-- ============================================================
-- Founder License : package + 3 renouvellements par founder
-- ============================================================

INSERT OR IGNORE INTO packages (id, name, slug, price_usd, bv_value, description, is_active, created_at)
VALUES (
  'ec10f04c-1a17-5119-b0c9-bdaad783a4b9',
  'Founder License',
  'founder-license',
  0,
  0,
  'Licence fondateur - activée manuellement depuis août 2023',
  1,
  '2023-08-01 00:00:00'
);

-- ── PACKAGE ORDERS (3 par founder) + ACTIVATION MEMBRES ──
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('df9b6a00-11d3-5483-92ec-f77865774741','d38c6aed-4fd9-5de9-99a2-aebb4e6a2cc7','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('b7abde7a-6205-5d54-af6b-b9fe0cd8d63b','d38c6aed-4fd9-5de9-99a2-aebb4e6a2cc7','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('4f129125-7f75-5345-a8ce-c9074d2ab6d5','d38c6aed-4fd9-5de9-99a2-aebb4e6a2cc7','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='d38c6aed-4fd9-5de9-99a2-aebb4e6a2cc7';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('426a3e7a-6eb2-5579-abdc-f43a5fbbeefc','ec18c3ce-745e-5c8e-8a1d-d1f75c13cc3a','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('41fc3348-1742-5bb6-84a2-20f247d6c6ca','ec18c3ce-745e-5c8e-8a1d-d1f75c13cc3a','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('a6cfee15-cb51-5808-b29c-48678eae8250','ec18c3ce-745e-5c8e-8a1d-d1f75c13cc3a','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='ec18c3ce-745e-5c8e-8a1d-d1f75c13cc3a';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('fd7f6f77-7ec7-5a65-972a-1c0f09007cfe','a15cb84e-9ac4-53c2-9c74-854a386dd8c1','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('3fd46ed5-12f0-5e16-a811-307bfe1362a3','a15cb84e-9ac4-53c2-9c74-854a386dd8c1','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('83542156-4e1e-55ff-9725-6a71a6d1e3a3','a15cb84e-9ac4-53c2-9c74-854a386dd8c1','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='a15cb84e-9ac4-53c2-9c74-854a386dd8c1';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('f2c2c47d-060b-5140-b7a6-79706a21beb9','c8bea72d-780a-53eb-a135-c2b3abbe26a6','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('2adcc027-1219-5826-87aa-da543f9674d2','c8bea72d-780a-53eb-a135-c2b3abbe26a6','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e01c9780-245a-5278-bc3c-069f7b0d9118','c8bea72d-780a-53eb-a135-c2b3abbe26a6','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='c8bea72d-780a-53eb-a135-c2b3abbe26a6';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('8a46bf8f-6bbc-5d56-a992-0b14689fa1ad','637c6626-6582-5e49-a6d9-41519c54ef68','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('71197cdc-1f0b-5896-b3c3-cc6e8893a2ed','637c6626-6582-5e49-a6d9-41519c54ef68','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('d0e280e1-5f78-5f41-9010-d22659847a8c','637c6626-6582-5e49-a6d9-41519c54ef68','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='637c6626-6582-5e49-a6d9-41519c54ef68';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('6278360e-ed9e-563b-82b9-87d67b78e354','8b026876-4086-550b-91e9-ee16f7245965','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('3540407c-421b-5acd-aee4-82be5c7e2a2e','8b026876-4086-550b-91e9-ee16f7245965','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('2cd8037c-b966-5327-95d4-adf0189e3f12','8b026876-4086-550b-91e9-ee16f7245965','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='8b026876-4086-550b-91e9-ee16f7245965';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('bd67084e-d7ac-5fea-acad-db9c95870643','4fede216-07eb-51d8-89c2-a6a43c136e81','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('1a216ace-3b7e-5cf2-91d6-6fac37e40ab5','4fede216-07eb-51d8-89c2-a6a43c136e81','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('18cb0d3c-2362-5c20-b0f7-a484ac09f800','4fede216-07eb-51d8-89c2-a6a43c136e81','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='4fede216-07eb-51d8-89c2-a6a43c136e81';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('4453f380-369e-566b-889b-a406df6bad15','966cf369-42ef-5f57-b11b-67247fa16188','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('3df2f17f-d912-55c8-8f7d-6d2ce07a224d','966cf369-42ef-5f57-b11b-67247fa16188','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('6ed47e44-ac01-5917-9b32-951d7cc4645e','966cf369-42ef-5f57-b11b-67247fa16188','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='966cf369-42ef-5f57-b11b-67247fa16188';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('7a958b95-a7e2-561f-b51d-54a44158e453','6448f26c-4831-5916-bba9-6ab7f0a9f966','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('5713c39b-a3ce-5e14-8e65-26638e16715a','6448f26c-4831-5916-bba9-6ab7f0a9f966','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('865f717b-ca00-53f5-89a4-686d62fbc12c','6448f26c-4831-5916-bba9-6ab7f0a9f966','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='6448f26c-4831-5916-bba9-6ab7f0a9f966';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('323c22fe-504c-54c8-937b-a3aba987ab8d','904ddf79-e346-51db-905a-bd0b2999e047','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('abe41e29-3db2-550e-a54b-b479ad172d1e','904ddf79-e346-51db-905a-bd0b2999e047','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('4edbc15d-6ea0-52eb-a5b4-7ed1e6b58dac','904ddf79-e346-51db-905a-bd0b2999e047','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='904ddf79-e346-51db-905a-bd0b2999e047';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e5d6fc9b-fa45-55e9-97f0-fb95d108b58d','d1b001a5-7338-5919-a3e4-5b69b139e420','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('ecfbd53d-7f8d-59ae-b685-ab80092fdc84','d1b001a5-7338-5919-a3e4-5b69b139e420','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('aec8657b-eecb-5cae-a3b1-44ad67e04b63','d1b001a5-7338-5919-a3e4-5b69b139e420','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='d1b001a5-7338-5919-a3e4-5b69b139e420';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('f5a85628-6ebb-5845-a4af-98f57ff214b3','04bff1c7-fa33-5797-8932-fe2b45df9438','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('0bbf64db-fc45-5d2e-8eca-9d7d28bf8899','04bff1c7-fa33-5797-8932-fe2b45df9438','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('f60191b7-2876-555d-857c-21bb48c727c9','04bff1c7-fa33-5797-8932-fe2b45df9438','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='04bff1c7-fa33-5797-8932-fe2b45df9438';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('5967ec07-b032-52ee-90f6-db9a5f72db06','0b14f8ce-3e41-5061-b10f-4e791bf00e84','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('c2f24680-bd1d-566b-aa85-00e7c387ab62','0b14f8ce-3e41-5061-b10f-4e791bf00e84','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('11e817e0-23f5-50c4-af0f-1c345053abf2','0b14f8ce-3e41-5061-b10f-4e791bf00e84','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='0b14f8ce-3e41-5061-b10f-4e791bf00e84';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('ca3c2d2b-48c9-5124-a2f8-615627ef9ca4','7952343b-bbf6-5008-a264-d542ad348fbd','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('fbd13d2c-2f3b-5172-bc91-5f861d80cfe0','7952343b-bbf6-5008-a264-d542ad348fbd','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('0a668d91-a105-5784-893a-459b364ed995','7952343b-bbf6-5008-a264-d542ad348fbd','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='7952343b-bbf6-5008-a264-d542ad348fbd';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('aa7653b4-c570-5936-927b-f5742f21d58b','c209c338-6486-5f85-936a-4d05e4d57105','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('054fcff9-eb66-5e74-9b7c-64a306378978','c209c338-6486-5f85-936a-4d05e4d57105','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('4ebb0ddd-f130-5c06-b510-085ed4ba70f3','c209c338-6486-5f85-936a-4d05e4d57105','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='c209c338-6486-5f85-936a-4d05e4d57105';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('19ec6205-3839-5ced-be85-780bd7130dcd','b6ba60f6-059d-5e2f-bc56-d16d69f8c15d','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('f89f31e3-1e08-57de-b1f1-8a59cf544e3c','b6ba60f6-059d-5e2f-bc56-d16d69f8c15d','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('074b4169-fa61-56e7-90eb-0922ca652557','b6ba60f6-059d-5e2f-bc56-d16d69f8c15d','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='b6ba60f6-059d-5e2f-bc56-d16d69f8c15d';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('6dbda2af-e2b1-5e67-a16f-ad1487ed3ac7','386c14a9-4d36-506f-9eea-76a660082349','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('26aeca3d-4b9a-52f5-b61f-55c0eb3c84e3','386c14a9-4d36-506f-9eea-76a660082349','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('acbb584d-5ce7-5f8a-b963-2331809c76e8','386c14a9-4d36-506f-9eea-76a660082349','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='386c14a9-4d36-506f-9eea-76a660082349';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('ab099b0a-7e48-53b7-803d-bb0caf85f00a','6d76c93d-7c2a-5568-9bf0-e0e878edd7e6','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('2557401e-8127-5753-96aa-45ba672e3766','6d76c93d-7c2a-5568-9bf0-e0e878edd7e6','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e6645477-0c31-589e-9a90-6068893a4542','6d76c93d-7c2a-5568-9bf0-e0e878edd7e6','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='6d76c93d-7c2a-5568-9bf0-e0e878edd7e6';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('96a64f5b-1d1a-5e3c-a489-92c3cf828041','31f6e7ce-0a67-564d-998d-8e73cbbabacc','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('6ec5b7c1-9788-562e-ae17-178d4f79b754','31f6e7ce-0a67-564d-998d-8e73cbbabacc','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('bddf590c-7c77-5046-93fc-1a7fe82e4454','31f6e7ce-0a67-564d-998d-8e73cbbabacc','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='31f6e7ce-0a67-564d-998d-8e73cbbabacc';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('0301291b-b16d-5bf8-bddc-acfa9ea4ce30','611e0650-6185-5de3-8cf6-eee532decf40','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('ab02da91-cf1b-5a9f-9bd4-589c77666b38','611e0650-6185-5de3-8cf6-eee532decf40','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('575e1523-fcc9-5f83-aee5-c404adb9171f','611e0650-6185-5de3-8cf6-eee532decf40','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='611e0650-6185-5de3-8cf6-eee532decf40';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('ed8a740c-bdd6-5acb-8bdc-dcc08b2ab812','22e60d25-e59c-5e57-bf71-423c0ac5c2be','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e5023bb6-5539-5a8b-af92-ab877c15469b','22e60d25-e59c-5e57-bf71-423c0ac5c2be','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('7665338e-b19b-55f4-b4f4-4852df4f7b6f','22e60d25-e59c-5e57-bf71-423c0ac5c2be','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='22e60d25-e59c-5e57-bf71-423c0ac5c2be';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('42e643bc-d8d2-5150-8030-75aefa61af56','1ef1379d-3cc6-5704-b724-0bb124b6d38c','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('3d1264ad-2030-548f-90a3-337d6345e928','1ef1379d-3cc6-5704-b724-0bb124b6d38c','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('c06db3f2-ad18-523b-8fd7-5f4fc5b96c2a','1ef1379d-3cc6-5704-b724-0bb124b6d38c','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='1ef1379d-3cc6-5704-b724-0bb124b6d38c';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('bbba6e94-9d07-59d4-a44a-460f7fbc481e','d5bb2c0d-9471-5118-861a-dd7bbf752510','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('f8826f3b-ebb0-57c7-a5ba-f82d062b9564','d5bb2c0d-9471-5118-861a-dd7bbf752510','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('15e2dfb6-5601-5ae8-9bf7-d7aa7992e48d','d5bb2c0d-9471-5118-861a-dd7bbf752510','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='d5bb2c0d-9471-5118-861a-dd7bbf752510';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('ff82c5c0-9574-587e-8bf2-e1736fd30751','888192ce-c1f5-5bc4-9793-1510165edba7','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('81689e37-bb12-5f9c-af15-42ea50c44977','888192ce-c1f5-5bc4-9793-1510165edba7','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('c84b581a-829a-536f-85f2-7ec28feafa84','888192ce-c1f5-5bc4-9793-1510165edba7','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='888192ce-c1f5-5bc4-9793-1510165edba7';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('eaa32b6a-5d1c-5636-a94f-c208752b54cd','fd9b2716-e53a-5b0f-86ba-d6d0dedf9a08','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('de6e2020-5b26-573a-abb5-0328f76ae056','fd9b2716-e53a-5b0f-86ba-d6d0dedf9a08','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('9601c676-0877-5718-a66c-baa25f295b92','fd9b2716-e53a-5b0f-86ba-d6d0dedf9a08','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='fd9b2716-e53a-5b0f-86ba-d6d0dedf9a08';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('2b11a42f-4fd7-5188-87a1-b307d198cd90','efe72013-c141-55a9-a783-08cbbe784d91','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('db2fa4fe-e1c7-59ab-8cf5-8f0e7aa2e95f','efe72013-c141-55a9-a783-08cbbe784d91','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('d2bf7659-a925-5f28-b91b-a0fc51009ffd','efe72013-c141-55a9-a783-08cbbe784d91','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='efe72013-c141-55a9-a783-08cbbe784d91';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e66a7285-ab90-5542-812f-4334188598ed','e45d979a-2266-595b-a162-54683b2b253b','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('97ef60fe-a542-5396-8ee0-ffae5c86acce','e45d979a-2266-595b-a162-54683b2b253b','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('05ce4be7-4941-5894-b1b5-6d4129ef236b','e45d979a-2266-595b-a162-54683b2b253b','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='e45d979a-2266-595b-a162-54683b2b253b';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('61380eab-09d4-53f8-b467-51f61eb2a564','9ba4ad1c-ad52-5946-9678-73acace2caf4','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('9008cc1e-b53d-52ad-94e1-35745e45a71a','9ba4ad1c-ad52-5946-9678-73acace2caf4','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('1b44f9b5-1c60-575e-9cc2-2b252af7aa9b','9ba4ad1c-ad52-5946-9678-73acace2caf4','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='9ba4ad1c-ad52-5946-9678-73acace2caf4';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('ef76cf93-f613-592d-9546-7d7c647450ca','68c6b990-1cc9-5f0e-a486-fedf3b1244bb','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('86845390-02d2-5a9c-9358-8f5fd2b86455','68c6b990-1cc9-5f0e-a486-fedf3b1244bb','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('048d215e-e5ea-545c-a1e4-e9f2d1d59eff','68c6b990-1cc9-5f0e-a486-fedf3b1244bb','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='68c6b990-1cc9-5f0e-a486-fedf3b1244bb';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('88de5c4d-8dfa-5c25-b16d-990fa495b9b2','c16fca62-4a31-5010-9501-1df77d0a7938','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('6827e1e5-ea3a-5883-975b-1b2512a2086b','c16fca62-4a31-5010-9501-1df77d0a7938','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('139cd38f-2575-594d-bd2f-4a988e86f78b','c16fca62-4a31-5010-9501-1df77d0a7938','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='c16fca62-4a31-5010-9501-1df77d0a7938';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('4627862d-83f1-5a25-be99-2ad58ef9dd9b','03b21c64-267d-52a3-9dad-9905a83ed7e1','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('7287ccd6-a830-5a11-bad8-8ab1963f846e','03b21c64-267d-52a3-9dad-9905a83ed7e1','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('46f28b26-a9c2-5855-814b-08e57bb46e43','03b21c64-267d-52a3-9dad-9905a83ed7e1','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='03b21c64-267d-52a3-9dad-9905a83ed7e1';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('85a63b32-62af-5d0f-a013-6533b5ff8bca','49d8ec0c-1727-5ce7-9d0d-c0fc947af12d','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('d0c7afe1-b7de-57a6-9291-62d3111c6496','49d8ec0c-1727-5ce7-9d0d-c0fc947af12d','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('8d644423-b905-55ef-8f56-ad145d06e398','49d8ec0c-1727-5ce7-9d0d-c0fc947af12d','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='49d8ec0c-1727-5ce7-9d0d-c0fc947af12d';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('c3591a3b-0d6a-570a-b280-7c67a82e3c2a','66eac996-c277-5564-8e38-e28b083d594a','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('4c1b5d2b-44aa-5bb1-b5d2-5e26cf61e628','66eac996-c277-5564-8e38-e28b083d594a','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('6f133439-d2a0-56e4-a6c8-ad6ca4cdc04b','66eac996-c277-5564-8e38-e28b083d594a','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='66eac996-c277-5564-8e38-e28b083d594a';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('c617046d-414f-514d-a15e-e275c7aef619','43752fc2-e185-5a02-97a5-a86a9aa01774','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('9789f1ff-241a-5a9c-8fca-fb09396b7c93','43752fc2-e185-5a02-97a5-a86a9aa01774','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('bb3ccea1-6cae-5da3-8f6e-e27e3eb632b8','43752fc2-e185-5a02-97a5-a86a9aa01774','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='43752fc2-e185-5a02-97a5-a86a9aa01774';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('b3ff6d19-a19f-5981-bc27-def3c21e0b43','4051dcd8-c491-5bdb-9cae-9c4c886b6a8e','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('df1c0738-02f2-5ffb-be8d-1be9f90be5b7','4051dcd8-c491-5bdb-9cae-9c4c886b6a8e','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('15ea1f03-bbfd-59ec-bb0f-7d5440959df9','4051dcd8-c491-5bdb-9cae-9c4c886b6a8e','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='4051dcd8-c491-5bdb-9cae-9c4c886b6a8e';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('50d52236-4497-58bd-8296-9a3495bccb25','810a8dcb-e747-5410-bd5b-31f99d97aa0c','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('0ab74d10-8858-5030-919c-061474d445c2','810a8dcb-e747-5410-bd5b-31f99d97aa0c','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('b1739307-655d-5741-b117-d96ffbf000db','810a8dcb-e747-5410-bd5b-31f99d97aa0c','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='810a8dcb-e747-5410-bd5b-31f99d97aa0c';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('99925d58-86f6-5a64-a9f1-6013830891ea','603bd9e1-d1d5-50d3-be66-0f6498aec610','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('5249fd5e-95ca-576b-9fa1-1536a53b4484','603bd9e1-d1d5-50d3-be66-0f6498aec610','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('d2e5f1ed-1270-5cc8-877f-a4d9274e6c0a','603bd9e1-d1d5-50d3-be66-0f6498aec610','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='603bd9e1-d1d5-50d3-be66-0f6498aec610';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('7b22118a-9be8-559d-958d-c036ba5c2f99','72346bd6-0f6b-5f85-8412-e6f3169e8365','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('f9e5929d-5800-5d7c-8272-317ba29e2042','72346bd6-0f6b-5f85-8412-e6f3169e8365','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('94c13c0e-1d29-56a5-b76c-e4e90131e883','72346bd6-0f6b-5f85-8412-e6f3169e8365','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='72346bd6-0f6b-5f85-8412-e6f3169e8365';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('5b1a084a-d754-5fdf-a45f-037e8977b9e8','c5587f29-e75d-5c59-a6ea-151e681cb464','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('39460da7-bdfc-5d5a-981a-3cf52bf98e52','c5587f29-e75d-5c59-a6ea-151e681cb464','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('2f930936-148f-51a0-aafc-64416d36b4ab','c5587f29-e75d-5c59-a6ea-151e681cb464','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='c5587f29-e75d-5c59-a6ea-151e681cb464';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('8568a29f-6b9e-5551-b965-89fe2df157e9','d323c890-bee1-5b76-b1a9-f3c226515ecf','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('fde308dc-09b0-51d2-91ba-d3f43b128ed2','d323c890-bee1-5b76-b1a9-f3c226515ecf','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('f85770bb-f806-5d8a-a943-edeabac4b551','d323c890-bee1-5b76-b1a9-f3c226515ecf','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='d323c890-bee1-5b76-b1a9-f3c226515ecf';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('d61e5a72-6373-5fdc-8bd9-4a53b1d5696d','555cccdf-6f7e-55c4-a753-a31a0e4f3e68','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('6962ea4d-8611-5938-b32b-022000c50cb6','555cccdf-6f7e-55c4-a753-a31a0e4f3e68','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e572bbcd-5670-5389-ab67-f4f8a8f98460','555cccdf-6f7e-55c4-a753-a31a0e4f3e68','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='555cccdf-6f7e-55c4-a753-a31a0e4f3e68';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('2d1c011a-ced7-5892-a392-22428baf90f6','f36f04ac-1ab6-5c4b-8d9a-14afe12d31bf','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('801c7c95-fae8-58c8-8e60-8006b10f1705','f36f04ac-1ab6-5c4b-8d9a-14afe12d31bf','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('0c649ee7-132c-5a63-a5e3-0d18e1a1305a','f36f04ac-1ab6-5c4b-8d9a-14afe12d31bf','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='f36f04ac-1ab6-5c4b-8d9a-14afe12d31bf';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('0064f28e-d2ca-51e1-9d49-a20ce8b4a5ae','b31a1866-e90a-5025-a996-801ef80b33ab','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e5407b94-15a5-5e2a-bcb5-d8faeb0c0807','b31a1866-e90a-5025-a996-801ef80b33ab','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('0d063ae9-4bfa-54c3-8191-30833ef15573','b31a1866-e90a-5025-a996-801ef80b33ab','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='b31a1866-e90a-5025-a996-801ef80b33ab';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('00158255-cb8c-5043-b78e-f057aebc4c2a','1fd79f97-6a38-56b7-b581-2ebfefaa4aea','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('65b9dde2-f044-5dce-924b-5f4888a6ba6d','1fd79f97-6a38-56b7-b581-2ebfefaa4aea','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('afb38e3b-f7ad-54c3-b668-7d21ad2f67eb','1fd79f97-6a38-56b7-b581-2ebfefaa4aea','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='1fd79f97-6a38-56b7-b581-2ebfefaa4aea';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('035d1942-8bf2-5b6f-a4c8-50e4882b924d','fa0818c6-df3b-5861-ad86-1885b265f663','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('d64fb830-bce5-5d2e-adf2-e5f90e39ba1d','fa0818c6-df3b-5861-ad86-1885b265f663','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('dd2f45d6-67c9-5009-b69f-7c94a9baadc6','fa0818c6-df3b-5861-ad86-1885b265f663','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='fa0818c6-df3b-5861-ad86-1885b265f663';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('c4466ade-7f3a-5e31-9073-01d16fc68dec','b713da54-1e9b-5a85-b8cc-8a2773c0a0fe','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('dcae7ebb-c016-5df8-80d2-32b3836b6778','b713da54-1e9b-5a85-b8cc-8a2773c0a0fe','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('9fa273fd-0ab5-5b94-aea9-f0e9254fac74','b713da54-1e9b-5a85-b8cc-8a2773c0a0fe','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='b713da54-1e9b-5a85-b8cc-8a2773c0a0fe';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('a7c0e1a9-ea63-5e3c-b06a-f52ec68af9e9','7e736702-7ab0-5463-8e49-d41cdf8c47cf','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('24bf28e2-d4cf-5e3b-b750-f68d2d561ba5','7e736702-7ab0-5463-8e49-d41cdf8c47cf','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('715e9248-d276-5813-9d8e-ed3a5b0478ab','7e736702-7ab0-5463-8e49-d41cdf8c47cf','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='7e736702-7ab0-5463-8e49-d41cdf8c47cf';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('315104e9-2b19-52ae-bd58-fd7a0eeab108','a6e67884-a494-5492-958c-307643fcba6a','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('cbc3e4d9-5993-5fd7-834a-7251b2a4c781','a6e67884-a494-5492-958c-307643fcba6a','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('59a62c69-1d33-5784-8b8c-afef6646f84e','a6e67884-a494-5492-958c-307643fcba6a','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='a6e67884-a494-5492-958c-307643fcba6a';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('01399265-d977-55af-9b98-566ff29e94bf','dde251bf-aa69-5cae-b64c-b657948d30e8','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('ae3eeb8b-81d1-5cfc-b1ec-d68732e8b841','dde251bf-aa69-5cae-b64c-b657948d30e8','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('33e90680-56eb-5a82-954e-0fa4acbb335b','dde251bf-aa69-5cae-b64c-b657948d30e8','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='dde251bf-aa69-5cae-b64c-b657948d30e8';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('83d25e2b-43fe-5eb7-b094-c53ad8033b2c','a1090d8b-10a1-5f22-ac97-94020ec092b1','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('c7d7b777-7eaf-5b01-894e-3678ce4f148d','a1090d8b-10a1-5f22-ac97-94020ec092b1','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('721fa610-cbcd-5b22-b14c-645c1d31009d','a1090d8b-10a1-5f22-ac97-94020ec092b1','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='a1090d8b-10a1-5f22-ac97-94020ec092b1';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('b579f3aa-cc4d-525e-b3f6-46b7348bea4c','523b4873-9fb5-5f3f-bc26-67acc53e3dd1','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('941d4972-1087-5648-be23-e412bb5ab8b0','523b4873-9fb5-5f3f-bc26-67acc53e3dd1','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('5b4fafc7-5f32-50c4-80a1-603724a67236','523b4873-9fb5-5f3f-bc26-67acc53e3dd1','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='523b4873-9fb5-5f3f-bc26-67acc53e3dd1';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('012cab0d-8609-51e3-b8d6-47e055617228','d65839d1-c63e-52cd-a2e5-981e6bc4c702','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('4c414828-0454-5a3b-bdf5-aa2a2c7e11cc','d65839d1-c63e-52cd-a2e5-981e6bc4c702','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('eaf31593-3631-5cfc-a7ef-270dcea94265','d65839d1-c63e-52cd-a2e5-981e6bc4c702','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='d65839d1-c63e-52cd-a2e5-981e6bc4c702';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e9a7c0ec-ced9-5102-8c6c-93cd75d89a0d','dd38a60d-6194-5c77-896e-b1c268ec6fff','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('81b947fe-23ad-5cea-834e-0954529d49ae','dd38a60d-6194-5c77-896e-b1c268ec6fff','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('68cfa575-a558-58be-9075-a38ab3478be6','dd38a60d-6194-5c77-896e-b1c268ec6fff','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='dd38a60d-6194-5c77-896e-b1c268ec6fff';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('b01cae97-154a-5744-9fab-ac356a7743dd','8d90a34d-0b27-5173-b98c-d8d1d944e228','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('f812b520-df8c-5c25-888e-3f2c99777261','8d90a34d-0b27-5173-b98c-d8d1d944e228','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('f57e0048-3603-589e-8df7-a4f54aa51ac6','8d90a34d-0b27-5173-b98c-d8d1d944e228','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='8d90a34d-0b27-5173-b98c-d8d1d944e228';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('f157e101-bfa0-5b2f-9bcd-68ec7de8e4ee','c2c5bcd1-6e13-51c0-aa63-6b3fa503b8d9','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('6052497b-7f66-5b1a-8f15-1c8bc0653c96','c2c5bcd1-6e13-51c0-aa63-6b3fa503b8d9','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('774959bb-a293-5f99-beae-42a00f8e7d6b','c2c5bcd1-6e13-51c0-aa63-6b3fa503b8d9','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='c2c5bcd1-6e13-51c0-aa63-6b3fa503b8d9';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('08f593b8-2dba-51f2-a9b1-0b826eed1b01','7085986f-e97a-5983-8e2b-cab5305e02bd','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('7372a496-c395-5db5-b2fa-e5184f4671fb','7085986f-e97a-5983-8e2b-cab5305e02bd','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('a41e31e9-e2ae-537b-9dd2-54e00a69a45f','7085986f-e97a-5983-8e2b-cab5305e02bd','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='7085986f-e97a-5983-8e2b-cab5305e02bd';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('bf92566d-ea5d-5f0c-bec6-37afa3574c38','22aa0f3c-3cda-5ebf-8a80-0d605fe96a20','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('b2e37f2d-ac6c-52bc-abe7-194eb53476dc','22aa0f3c-3cda-5ebf-8a80-0d605fe96a20','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('9a3fcc8f-af00-5fd1-99b4-4d8c47c968f0','22aa0f3c-3cda-5ebf-8a80-0d605fe96a20','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='22aa0f3c-3cda-5ebf-8a80-0d605fe96a20';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('c370be65-3bb7-505a-b3a4-9fc573da6972','88e77222-2bff-5431-b4f7-a3a7c4aa87a5','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e3adbe99-bbb9-5bd2-9782-0d39d50aa638','88e77222-2bff-5431-b4f7-a3a7c4aa87a5','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('49863ff7-3ee8-521a-b431-39ff569d0b9e','88e77222-2bff-5431-b4f7-a3a7c4aa87a5','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='88e77222-2bff-5431-b4f7-a3a7c4aa87a5';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('9c919099-0e69-5de4-aa5b-5042d0ebe03b','fdb88579-a5bf-5b7d-98db-f53bb5e0305a','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('a126d554-51b0-5e3e-a0f5-4273d3e35d65','fdb88579-a5bf-5b7d-98db-f53bb5e0305a','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('dd5eaad6-5ac2-5c0e-87cb-2600ae5ab56d','fdb88579-a5bf-5b7d-98db-f53bb5e0305a','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='fdb88579-a5bf-5b7d-98db-f53bb5e0305a';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('3f4b8b93-4abf-5328-9ab4-f61d5b8566b0','278b3526-eda1-582c-a93e-8b2bceb3c9f4','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('bdb0068e-3b40-5047-b139-a32d0d5d3c10','278b3526-eda1-582c-a93e-8b2bceb3c9f4','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e33d8ae3-6d41-5548-b4af-558e14656083','278b3526-eda1-582c-a93e-8b2bceb3c9f4','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='278b3526-eda1-582c-a93e-8b2bceb3c9f4';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('f1fa84a2-a658-5fb4-8200-9c434c35769d','9175809e-8330-5a54-b1da-8fde1f5d37d0','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('ab3a367c-3dec-50ea-b378-96fafa780b1f','9175809e-8330-5a54-b1da-8fde1f5d37d0','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('58b3488b-74ea-5724-8165-a48e53ffe51a','9175809e-8330-5a54-b1da-8fde1f5d37d0','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='9175809e-8330-5a54-b1da-8fde1f5d37d0';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('fc6504b6-540c-5df1-a9b7-977a4af2fc74','1f83aea9-1297-5aa1-bd98-abbd6a703a51','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('1c49e58e-876b-5758-a084-18a63987701b','1f83aea9-1297-5aa1-bd98-abbd6a703a51','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('f4368407-5976-5048-ab15-ac60148f2969','1f83aea9-1297-5aa1-bd98-abbd6a703a51','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='1f83aea9-1297-5aa1-bd98-abbd6a703a51';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('963caae7-59ba-5aaa-8656-f11272e7275a','c5e910d8-165c-55b8-af96-de42cdc9d5d2','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('8796b33a-cccf-5aad-ad59-62aa93654422','c5e910d8-165c-55b8-af96-de42cdc9d5d2','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('0ec79301-2669-5d7a-a417-094fc0e694cf','c5e910d8-165c-55b8-af96-de42cdc9d5d2','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='c5e910d8-165c-55b8-af96-de42cdc9d5d2';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('0ef5b9f0-cb1e-5446-8e18-96ad7eb73e9d','db93e23d-46bf-50f4-ac90-15b4f9b03df2','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('fdc9291a-f35c-58e7-91f2-9ee15f01eaf9','db93e23d-46bf-50f4-ac90-15b4f9b03df2','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('83e75326-cddf-5b87-a579-6c8f6805115b','db93e23d-46bf-50f4-ac90-15b4f9b03df2','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='db93e23d-46bf-50f4-ac90-15b4f9b03df2';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('5d2f5922-2a86-5b88-a6e1-fa00d90d153e','95f42891-5a14-530d-8cfb-cf95f005c830','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('bbfdcb89-75cd-59b1-b501-d7057aa8a605','95f42891-5a14-530d-8cfb-cf95f005c830','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('5b31a2b6-70e9-55ef-b73a-16c0ce83a716','95f42891-5a14-530d-8cfb-cf95f005c830','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='95f42891-5a14-530d-8cfb-cf95f005c830';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('397ff0f0-cd6c-543d-a3c4-ca626df01e38','e893fee5-8478-5922-a4d7-7bf5d74c4f24','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('b95b5fe2-f88b-5fb7-973d-5f7801b1cd36','e893fee5-8478-5922-a4d7-7bf5d74c4f24','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('46a2267e-efd7-5aeb-a6fa-d84e98c54206','e893fee5-8478-5922-a4d7-7bf5d74c4f24','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='e893fee5-8478-5922-a4d7-7bf5d74c4f24';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('ea64375d-1148-5062-b25b-3d04f142fec0','39e3930d-7dec-58d3-9bc2-a0b99861a02e','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('ecb2a741-b738-5009-9afe-95767c4616cc','39e3930d-7dec-58d3-9bc2-a0b99861a02e','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('9da5ede0-6123-5b13-b97b-678e7e77d37b','39e3930d-7dec-58d3-9bc2-a0b99861a02e','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='39e3930d-7dec-58d3-9bc2-a0b99861a02e';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('2800dbad-f420-5de2-8a2e-17926467f9a1','103edc3d-87a5-51cb-8650-3dc31257dc3c','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('957ad3ef-1689-55d7-9d65-05e8377f3c8f','103edc3d-87a5-51cb-8650-3dc31257dc3c','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('50b73b12-28ff-5ce6-b9e2-d3e818d24f09','103edc3d-87a5-51cb-8650-3dc31257dc3c','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='103edc3d-87a5-51cb-8650-3dc31257dc3c';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('bc063333-0a90-52e0-9594-06659526e098','687b136a-149f-5318-ade1-ab039b14fe19','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('9a79be8b-fff1-5581-8492-32fd461fa798','687b136a-149f-5318-ade1-ab039b14fe19','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('d7f3d0ec-efb3-5ec0-8487-0d6554f1f1e4','687b136a-149f-5318-ade1-ab039b14fe19','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='687b136a-149f-5318-ade1-ab039b14fe19';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('0fa17d11-ba0c-5945-a11f-be7beab4de4d','7a62ff54-d660-5e5a-a21e-08d240e05617','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('5dcf90bd-72e0-52a4-aec3-a6d4160d29de','7a62ff54-d660-5e5a-a21e-08d240e05617','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('887cda97-1b60-5f48-8c41-147b2a7b5958','7a62ff54-d660-5e5a-a21e-08d240e05617','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='7a62ff54-d660-5e5a-a21e-08d240e05617';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('be0ec0cb-81e1-59d2-b322-531833a9c3af','64374623-38f2-517b-bd43-df02240de15b','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e9d54a40-db45-584f-84ce-7a0b57d2815d','64374623-38f2-517b-bd43-df02240de15b','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('89e8c2d0-dfac-567f-8f52-12bd69d931b3','64374623-38f2-517b-bd43-df02240de15b','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='64374623-38f2-517b-bd43-df02240de15b';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('02069e23-ce6f-5816-8eac-0831c75b12ef','212a006a-407c-55b0-8c71-aa1923fe0658','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('035ff2d2-95d7-5b3a-bf4b-9314e802c83b','212a006a-407c-55b0-8c71-aa1923fe0658','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('4f974c23-24ec-56d1-9011-6189a31f46ea','212a006a-407c-55b0-8c71-aa1923fe0658','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='212a006a-407c-55b0-8c71-aa1923fe0658';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('085912f0-094c-5279-9085-260aac60d224','c550f239-dbbf-55e0-b968-1a99134c3ceb','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('5f631f2a-e418-560e-955c-e252f4875954','c550f239-dbbf-55e0-b968-1a99134c3ceb','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e04c4dd0-44d3-5342-99a0-20584fc7fac6','c550f239-dbbf-55e0-b968-1a99134c3ceb','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='c550f239-dbbf-55e0-b968-1a99134c3ceb';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('c6c44be6-5d06-562c-8e19-544f1d7fa8f6','88aab664-5927-50a8-a4fc-f46c097ff378','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('3aebb43b-5f25-5996-b8a4-f308ec39ebb0','88aab664-5927-50a8-a4fc-f46c097ff378','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('f3a51ddd-56e2-5f67-a0b3-26ee052996fe','88aab664-5927-50a8-a4fc-f46c097ff378','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='88aab664-5927-50a8-a4fc-f46c097ff378';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('f5cbc7ed-f6f3-5f27-8867-14e3cfed9eb3','c73936a0-e9bc-5f42-b7b0-99c6b43de1a5','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('2f01e544-f270-5c2c-8fde-173692bfdbfc','c73936a0-e9bc-5f42-b7b0-99c6b43de1a5','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('961b7b93-fec5-52c4-ba85-24210041da72','c73936a0-e9bc-5f42-b7b0-99c6b43de1a5','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='c73936a0-e9bc-5f42-b7b0-99c6b43de1a5';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('d228926c-759d-5a90-b510-dab70d7bdce2','62cf8f78-c721-5523-bd14-f8d617e48792','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('b3acd7ac-edf7-5a85-b6f4-16c1091a3443','62cf8f78-c721-5523-bd14-f8d617e48792','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('c7b8eec4-9151-553b-b0da-76f67041e6a7','62cf8f78-c721-5523-bd14-f8d617e48792','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='62cf8f78-c721-5523-bd14-f8d617e48792';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('1a3a4ed4-5bb4-5747-9a0b-068fdf2decc9','9a3a69d6-8411-5726-b46b-c31280eb1497','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('bdf2bc16-ec84-537c-9623-9788d1c631e8','9a3a69d6-8411-5726-b46b-c31280eb1497','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('fa471a0e-ebff-565e-87a8-834238a961b7','9a3a69d6-8411-5726-b46b-c31280eb1497','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='9a3a69d6-8411-5726-b46b-c31280eb1497';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('b46bffd6-3664-5523-8bb5-9f72e53926f4','9b6c779e-75ae-553e-9338-019073bcdbd7','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('b23ae3ce-5e6c-5c19-80fd-cc7f3f4c1d00','9b6c779e-75ae-553e-9338-019073bcdbd7','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e76d420a-dcbf-54f6-b974-ce2c0b78b5d7','9b6c779e-75ae-553e-9338-019073bcdbd7','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='9b6c779e-75ae-553e-9338-019073bcdbd7';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('ccf3ffda-6194-58fc-8dfd-21bba459301e','827f2434-0695-5c4b-9186-d02d79659627','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('d11fe883-8799-56fd-b3ff-72de27710d6b','827f2434-0695-5c4b-9186-d02d79659627','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('629d6756-e5d3-544d-bc16-4320ec5f0e66','827f2434-0695-5c4b-9186-d02d79659627','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='827f2434-0695-5c4b-9186-d02d79659627';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('d8863fea-e27e-5795-977a-c7e57605a766','e810471d-0279-5747-8a25-06cdf50516dc','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('28a959a4-6dbe-5fea-ab5a-e93c7520161e','e810471d-0279-5747-8a25-06cdf50516dc','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('8851b3f6-b6eb-55b5-935d-63ec2a78ad57','e810471d-0279-5747-8a25-06cdf50516dc','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='e810471d-0279-5747-8a25-06cdf50516dc';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('66a2c569-b551-539a-8db0-cc87332e65ad','19f924a3-e6c8-5550-8d9d-d74628e26ead','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('17e32a8d-34f1-5a22-8812-f6af8975ed65','19f924a3-e6c8-5550-8d9d-d74628e26ead','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('8d9691ad-f375-599d-a2e5-5657e84664fd','19f924a3-e6c8-5550-8d9d-d74628e26ead','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='19f924a3-e6c8-5550-8d9d-d74628e26ead';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('8f862c54-b4fb-5c66-824e-9e57f9524bfa','f451ef4f-4bb8-5a37-b2b3-96315a987c77','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('77aaeacf-5c3f-5049-ae1e-cc1b8be9211b','f451ef4f-4bb8-5a37-b2b3-96315a987c77','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('53c92cf1-8f85-50ed-a39d-4fc22943dce9','f451ef4f-4bb8-5a37-b2b3-96315a987c77','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='f451ef4f-4bb8-5a37-b2b3-96315a987c77';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e0c4f520-7310-59ef-9fd3-f18d26be9775','67ecadae-b552-51d0-9e50-59d6346c2032','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('60d99c5c-99cb-5992-9203-570e53e9fc7f','67ecadae-b552-51d0-9e50-59d6346c2032','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('88a39c5e-65d2-591e-aefd-69e01580dee9','67ecadae-b552-51d0-9e50-59d6346c2032','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='67ecadae-b552-51d0-9e50-59d6346c2032';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('c3e0bfe8-9035-5a06-9566-196d9c16be97','5435c66a-6cff-5f55-a54c-b88d5ac9289c','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('347f5760-eb3a-5946-8337-6926ad5c5d05','5435c66a-6cff-5f55-a54c-b88d5ac9289c','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('9b37b18b-f73b-5cff-8d13-3262e4a40501','5435c66a-6cff-5f55-a54c-b88d5ac9289c','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='5435c66a-6cff-5f55-a54c-b88d5ac9289c';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('86715624-6963-5dd0-88b2-9e8ac2312dbd','2ce6a814-3d3a-5ca2-a4ec-e17847ae0ac8','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('d840daa5-ea44-5175-a953-5968ce98b493','2ce6a814-3d3a-5ca2-a4ec-e17847ae0ac8','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('2cf42fdf-608c-5b40-9aeb-76ea1c92eace','2ce6a814-3d3a-5ca2-a4ec-e17847ae0ac8','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='2ce6a814-3d3a-5ca2-a4ec-e17847ae0ac8';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('ebe17982-0048-5634-86f9-301755899444','d8575663-05e1-5fa0-baa6-e305cf53dc97','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('4e32e250-a27b-50ed-8fb6-0a9ae1b8540e','d8575663-05e1-5fa0-baa6-e305cf53dc97','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('43ab3ddb-ac98-5194-96cb-0e45bc638c98','d8575663-05e1-5fa0-baa6-e305cf53dc97','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='d8575663-05e1-5fa0-baa6-e305cf53dc97';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('69dbab9f-a8c5-5f53-bbdf-381235f6ea22','b3001dfa-870c-5406-ad60-fae9adfc90a0','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('60f96fbd-4968-52f3-8119-9f853af79074','b3001dfa-870c-5406-ad60-fae9adfc90a0','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('7bc03475-7d47-513b-8229-9505c324e823','b3001dfa-870c-5406-ad60-fae9adfc90a0','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='b3001dfa-870c-5406-ad60-fae9adfc90a0';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('c3e12a95-4e0d-5109-866a-d7c66a4a05c8','7e9ea86f-f61c-571a-82b1-82bd6fdd058c','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e9a462c5-cbfc-58d0-a489-d78e54de061d','7e9ea86f-f61c-571a-82b1-82bd6fdd058c','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('14ed1c2a-37f2-5c95-893e-e96d7003db26','7e9ea86f-f61c-571a-82b1-82bd6fdd058c','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='7e9ea86f-f61c-571a-82b1-82bd6fdd058c';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('4ffa48d9-6b12-5082-aadd-042e0064f471','c6ca9734-b177-5af6-940e-398125f007bf','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('9ee0134b-46bf-543b-aa13-7dda8b0faf66','c6ca9734-b177-5af6-940e-398125f007bf','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('086121d9-0f98-599e-bb89-d20639206b86','c6ca9734-b177-5af6-940e-398125f007bf','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='c6ca9734-b177-5af6-940e-398125f007bf';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('aaba2113-df42-5688-b084-e172b607a9d6','5303a76c-63c0-536a-9c02-fe44ca726973','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('c51a1b3d-8c1a-5d06-8925-f2e38b8f7134','5303a76c-63c0-536a-9c02-fe44ca726973','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('2d4987c9-ed4a-541b-a526-f13384037004','5303a76c-63c0-536a-9c02-fe44ca726973','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='5303a76c-63c0-536a-9c02-fe44ca726973';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('8cd8b17d-8b34-5cc5-858d-a49f6bd3d3ce','d6d0597e-10e3-5270-a8ab-bf4311887273','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('d73ba2df-b2da-5fb1-b6d7-b4e549b0a840','d6d0597e-10e3-5270-a8ab-bf4311887273','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('485e2a8c-9fb2-5a07-8bab-5a2d80b36e13','d6d0597e-10e3-5270-a8ab-bf4311887273','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='d6d0597e-10e3-5270-a8ab-bf4311887273';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('4d9e0ff7-2ed6-548c-8716-f30fd8e083f8','e13441dd-558f-526f-961d-74ddb2cefca1','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('d9173753-2228-5e17-b11f-6e91f1f4292d','e13441dd-558f-526f-961d-74ddb2cefca1','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('fefcb1f1-e155-5e31-8660-4c4555f08955','e13441dd-558f-526f-961d-74ddb2cefca1','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='e13441dd-558f-526f-961d-74ddb2cefca1';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('2096e934-9f14-58b5-b993-88b11728d019','b900d912-acac-5551-9966-626713932875','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('6e2d4bce-da8b-5fe8-8ff6-ce5678f12d06','b900d912-acac-5551-9966-626713932875','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('972b98e2-79b5-5f60-81de-a503ff837faa','b900d912-acac-5551-9966-626713932875','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='b900d912-acac-5551-9966-626713932875';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('47555f22-7f21-5f6f-b978-48302034d400','f8cc57c5-c560-52a1-86fd-e6c7f003e255','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('b9419ab7-8fa2-538e-b4ed-e9d3f1aedcc7','f8cc57c5-c560-52a1-86fd-e6c7f003e255','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('3ce3e5a7-4e0b-5ca0-bd66-62ebbb368769','f8cc57c5-c560-52a1-86fd-e6c7f003e255','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='f8cc57c5-c560-52a1-86fd-e6c7f003e255';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('34dd33b3-1dd5-5999-ab4c-79e665cca09c','06c18ffc-44e6-56d9-bcfb-1757d6fa1700','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('7b011e68-c8af-53fc-ae60-f12fa5daf989','06c18ffc-44e6-56d9-bcfb-1757d6fa1700','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('9c7a20cc-8d58-584b-99ad-899c4e977f8b','06c18ffc-44e6-56d9-bcfb-1757d6fa1700','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='06c18ffc-44e6-56d9-bcfb-1757d6fa1700';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('add5d50d-454a-56e9-83d8-b3e3561ed710','9850913e-3105-5214-8d74-b0825d1e2a7b','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('c5ce5ef4-dc9b-5d62-af30-7651e17924c5','9850913e-3105-5214-8d74-b0825d1e2a7b','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('2754a3b1-870e-599b-8a60-3d051cc80df7','9850913e-3105-5214-8d74-b0825d1e2a7b','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='9850913e-3105-5214-8d74-b0825d1e2a7b';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('dd259083-4b0e-5e0a-a276-20e88f7dfc9a','f2f59bf4-576b-5cc7-8055-75ba90afe7f3','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e022d999-d330-5981-8b4d-c3abc71e2404','f2f59bf4-576b-5cc7-8055-75ba90afe7f3','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e943c768-5fc2-52bf-a9e5-f8311179d51e','f2f59bf4-576b-5cc7-8055-75ba90afe7f3','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='f2f59bf4-576b-5cc7-8055-75ba90afe7f3';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('4256e63c-0b70-5175-a27a-ba8079c6170d','c01e175a-8e7a-5316-8a57-cb51221d0452','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('a4009f8d-d7c6-543f-9b5d-46734dc2b1fb','c01e175a-8e7a-5316-8a57-cb51221d0452','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('5538e1ef-a30e-5194-a79d-85468abd6c56','c01e175a-8e7a-5316-8a57-cb51221d0452','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='c01e175a-8e7a-5316-8a57-cb51221d0452';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('040eb01d-ace1-59f3-8448-8d6340d78997','3947bd98-71b5-5edf-980d-12c786f05767','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('9d454fc7-e9a9-5dd3-8a6f-7cd878870f77','3947bd98-71b5-5edf-980d-12c786f05767','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('14017328-1183-5fea-8c4e-d0ea64b3c435','3947bd98-71b5-5edf-980d-12c786f05767','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='3947bd98-71b5-5edf-980d-12c786f05767';

INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('e334557e-bd4d-5de2-88c3-d43d21100c7d','a0203d9c-1cce-58a5-b60e-db6b28cdfa83','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2023-08-01 00:00:00','2023-08-01 00:00:00','2023-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('0f143947-ef5b-54ab-9348-49ac4c88b76a','a0203d9c-1cce-58a5-b60e-db6b28cdfa83','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2024-08-01 00:00:00','2024-08-01 00:00:00','2024-08-01 00:00:00');
INSERT OR IGNORE INTO package_orders (id,member_id,package_id,amount_usd,bv_value,status,payment_method,activation_done,validated_at,created_at,updated_at)
VALUES ('558bb528-e269-52cb-8fa7-a9c0a91cbc31','a0203d9c-1cce-58a5-b60e-db6b28cdfa83','ec10f04c-1a17-5119-b0c9-bdaad783a4b9',0,0,'validated','manual',1,'2025-08-01 00:00:00','2025-08-01 00:00:00','2025-08-01 00:00:00');
UPDATE members SET
  license_active=1,
  license_expires_at='2026-08-01 00:00:00',
  member_status='Partenaire',
  activation_done=1,
  admin_fee_paid=1,
  admin_fee_paid_at='2023-08-01 00:00:00',
  updated_at=datetime('now')
WHERE id='a0203d9c-1cce-58a5-b60e-db6b28cdfa83';
