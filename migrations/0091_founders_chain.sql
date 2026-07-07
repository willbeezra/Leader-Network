PRAGMA foreign_keys = OFF;

-- ── INSERT 100 FOUNDERS ─────────────────────────────────
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'd38c6aed-4fd9-5de9-99a2-aebb4e6a2cc7', 'FOUNDER001', 'founder001@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '001',
  'Membre', 'none',
  0, 'pending', 0,
  'root-system-000000000000000000000000', 'root-system-000000000000000000000000', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'ec18c3ce-745e-5c8e-8a1d-d1f75c13cc3a', 'FOUNDER002', 'founder002@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '002',
  'Membre', 'none',
  0, 'pending', 0,
  'd38c6aed-4fd9-5de9-99a2-aebb4e6a2cc7', 'd38c6aed-4fd9-5de9-99a2-aebb4e6a2cc7', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'a15cb84e-9ac4-53c2-9c74-854a386dd8c1', 'FOUNDER003', 'founder003@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '003',
  'Membre', 'none',
  0, 'pending', 0,
  'ec18c3ce-745e-5c8e-8a1d-d1f75c13cc3a', 'ec18c3ce-745e-5c8e-8a1d-d1f75c13cc3a', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'c8bea72d-780a-53eb-a135-c2b3abbe26a6', 'FOUNDER004', 'founder004@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '004',
  'Membre', 'none',
  0, 'pending', 0,
  'a15cb84e-9ac4-53c2-9c74-854a386dd8c1', 'a15cb84e-9ac4-53c2-9c74-854a386dd8c1', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '637c6626-6582-5e49-a6d9-41519c54ef68', 'FOUNDER005', 'founder005@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '005',
  'Membre', 'none',
  0, 'pending', 0,
  'c8bea72d-780a-53eb-a135-c2b3abbe26a6', 'c8bea72d-780a-53eb-a135-c2b3abbe26a6', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '8b026876-4086-550b-91e9-ee16f7245965', 'FOUNDER006', 'founder006@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '006',
  'Membre', 'none',
  0, 'pending', 0,
  '637c6626-6582-5e49-a6d9-41519c54ef68', '637c6626-6582-5e49-a6d9-41519c54ef68', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '4fede216-07eb-51d8-89c2-a6a43c136e81', 'FOUNDER007', 'founder007@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '007',
  'Membre', 'none',
  0, 'pending', 0,
  '8b026876-4086-550b-91e9-ee16f7245965', '8b026876-4086-550b-91e9-ee16f7245965', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '966cf369-42ef-5f57-b11b-67247fa16188', 'FOUNDER008', 'founder008@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '008',
  'Membre', 'none',
  0, 'pending', 0,
  '4fede216-07eb-51d8-89c2-a6a43c136e81', '4fede216-07eb-51d8-89c2-a6a43c136e81', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '6448f26c-4831-5916-bba9-6ab7f0a9f966', 'FOUNDER009', 'founder009@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '009',
  'Membre', 'none',
  0, 'pending', 0,
  '966cf369-42ef-5f57-b11b-67247fa16188', '966cf369-42ef-5f57-b11b-67247fa16188', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '904ddf79-e346-51db-905a-bd0b2999e047', 'FOUNDER010', 'founder010@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '010',
  'Membre', 'none',
  0, 'pending', 0,
  '6448f26c-4831-5916-bba9-6ab7f0a9f966', '6448f26c-4831-5916-bba9-6ab7f0a9f966', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'd1b001a5-7338-5919-a3e4-5b69b139e420', 'FOUNDER011', 'founder011@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '011',
  'Membre', 'none',
  0, 'pending', 0,
  '904ddf79-e346-51db-905a-bd0b2999e047', '904ddf79-e346-51db-905a-bd0b2999e047', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '04bff1c7-fa33-5797-8932-fe2b45df9438', 'FOUNDER012', 'founder012@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '012',
  'Membre', 'none',
  0, 'pending', 0,
  'd1b001a5-7338-5919-a3e4-5b69b139e420', 'd1b001a5-7338-5919-a3e4-5b69b139e420', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '0b14f8ce-3e41-5061-b10f-4e791bf00e84', 'FOUNDER013', 'founder013@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '013',
  'Membre', 'none',
  0, 'pending', 0,
  '04bff1c7-fa33-5797-8932-fe2b45df9438', '04bff1c7-fa33-5797-8932-fe2b45df9438', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '7952343b-bbf6-5008-a264-d542ad348fbd', 'FOUNDER014', 'founder014@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '014',
  'Membre', 'none',
  0, 'pending', 0,
  '0b14f8ce-3e41-5061-b10f-4e791bf00e84', '0b14f8ce-3e41-5061-b10f-4e791bf00e84', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'c209c338-6486-5f85-936a-4d05e4d57105', 'FOUNDER015', 'founder015@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '015',
  'Membre', 'none',
  0, 'pending', 0,
  '7952343b-bbf6-5008-a264-d542ad348fbd', '7952343b-bbf6-5008-a264-d542ad348fbd', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'b6ba60f6-059d-5e2f-bc56-d16d69f8c15d', 'FOUNDER016', 'founder016@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '016',
  'Membre', 'none',
  0, 'pending', 0,
  'c209c338-6486-5f85-936a-4d05e4d57105', 'c209c338-6486-5f85-936a-4d05e4d57105', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '386c14a9-4d36-506f-9eea-76a660082349', 'FOUNDER017', 'founder017@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '017',
  'Membre', 'none',
  0, 'pending', 0,
  'b6ba60f6-059d-5e2f-bc56-d16d69f8c15d', 'b6ba60f6-059d-5e2f-bc56-d16d69f8c15d', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '6d76c93d-7c2a-5568-9bf0-e0e878edd7e6', 'FOUNDER018', 'founder018@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '018',
  'Membre', 'none',
  0, 'pending', 0,
  '386c14a9-4d36-506f-9eea-76a660082349', '386c14a9-4d36-506f-9eea-76a660082349', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '31f6e7ce-0a67-564d-998d-8e73cbbabacc', 'FOUNDER019', 'founder019@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '019',
  'Membre', 'none',
  0, 'pending', 0,
  '6d76c93d-7c2a-5568-9bf0-e0e878edd7e6', '6d76c93d-7c2a-5568-9bf0-e0e878edd7e6', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '611e0650-6185-5de3-8cf6-eee532decf40', 'FOUNDER020', 'founder020@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '020',
  'Membre', 'none',
  0, 'pending', 0,
  '31f6e7ce-0a67-564d-998d-8e73cbbabacc', '31f6e7ce-0a67-564d-998d-8e73cbbabacc', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '22e60d25-e59c-5e57-bf71-423c0ac5c2be', 'FOUNDER021', 'founder021@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '021',
  'Membre', 'none',
  0, 'pending', 0,
  '611e0650-6185-5de3-8cf6-eee532decf40', '611e0650-6185-5de3-8cf6-eee532decf40', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '1ef1379d-3cc6-5704-b724-0bb124b6d38c', 'FOUNDER022', 'founder022@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '022',
  'Membre', 'none',
  0, 'pending', 0,
  '22e60d25-e59c-5e57-bf71-423c0ac5c2be', '22e60d25-e59c-5e57-bf71-423c0ac5c2be', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'd5bb2c0d-9471-5118-861a-dd7bbf752510', 'FOUNDER023', 'founder023@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '023',
  'Membre', 'none',
  0, 'pending', 0,
  '1ef1379d-3cc6-5704-b724-0bb124b6d38c', '1ef1379d-3cc6-5704-b724-0bb124b6d38c', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '888192ce-c1f5-5bc4-9793-1510165edba7', 'FOUNDER024', 'founder024@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '024',
  'Membre', 'none',
  0, 'pending', 0,
  'd5bb2c0d-9471-5118-861a-dd7bbf752510', 'd5bb2c0d-9471-5118-861a-dd7bbf752510', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'fd9b2716-e53a-5b0f-86ba-d6d0dedf9a08', 'FOUNDER025', 'founder025@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '025',
  'Membre', 'none',
  0, 'pending', 0,
  '888192ce-c1f5-5bc4-9793-1510165edba7', '888192ce-c1f5-5bc4-9793-1510165edba7', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'efe72013-c141-55a9-a783-08cbbe784d91', 'FOUNDER026', 'founder026@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '026',
  'Membre', 'none',
  0, 'pending', 0,
  'fd9b2716-e53a-5b0f-86ba-d6d0dedf9a08', 'fd9b2716-e53a-5b0f-86ba-d6d0dedf9a08', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'e45d979a-2266-595b-a162-54683b2b253b', 'FOUNDER027', 'founder027@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '027',
  'Membre', 'none',
  0, 'pending', 0,
  'efe72013-c141-55a9-a783-08cbbe784d91', 'efe72013-c141-55a9-a783-08cbbe784d91', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '9ba4ad1c-ad52-5946-9678-73acace2caf4', 'FOUNDER028', 'founder028@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '028',
  'Membre', 'none',
  0, 'pending', 0,
  'e45d979a-2266-595b-a162-54683b2b253b', 'e45d979a-2266-595b-a162-54683b2b253b', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '68c6b990-1cc9-5f0e-a486-fedf3b1244bb', 'FOUNDER029', 'founder029@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '029',
  'Membre', 'none',
  0, 'pending', 0,
  '9ba4ad1c-ad52-5946-9678-73acace2caf4', '9ba4ad1c-ad52-5946-9678-73acace2caf4', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'c16fca62-4a31-5010-9501-1df77d0a7938', 'FOUNDER030', 'founder030@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '030',
  'Membre', 'none',
  0, 'pending', 0,
  '68c6b990-1cc9-5f0e-a486-fedf3b1244bb', '68c6b990-1cc9-5f0e-a486-fedf3b1244bb', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '03b21c64-267d-52a3-9dad-9905a83ed7e1', 'FOUNDER031', 'founder031@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '031',
  'Membre', 'none',
  0, 'pending', 0,
  'c16fca62-4a31-5010-9501-1df77d0a7938', 'c16fca62-4a31-5010-9501-1df77d0a7938', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '49d8ec0c-1727-5ce7-9d0d-c0fc947af12d', 'FOUNDER032', 'founder032@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '032',
  'Membre', 'none',
  0, 'pending', 0,
  '03b21c64-267d-52a3-9dad-9905a83ed7e1', '03b21c64-267d-52a3-9dad-9905a83ed7e1', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '66eac996-c277-5564-8e38-e28b083d594a', 'FOUNDER033', 'founder033@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '033',
  'Membre', 'none',
  0, 'pending', 0,
  '49d8ec0c-1727-5ce7-9d0d-c0fc947af12d', '49d8ec0c-1727-5ce7-9d0d-c0fc947af12d', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '43752fc2-e185-5a02-97a5-a86a9aa01774', 'FOUNDER034', 'founder034@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '034',
  'Membre', 'none',
  0, 'pending', 0,
  '66eac996-c277-5564-8e38-e28b083d594a', '66eac996-c277-5564-8e38-e28b083d594a', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '4051dcd8-c491-5bdb-9cae-9c4c886b6a8e', 'FOUNDER035', 'founder035@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '035',
  'Membre', 'none',
  0, 'pending', 0,
  '43752fc2-e185-5a02-97a5-a86a9aa01774', '43752fc2-e185-5a02-97a5-a86a9aa01774', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '810a8dcb-e747-5410-bd5b-31f99d97aa0c', 'FOUNDER036', 'founder036@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '036',
  'Membre', 'none',
  0, 'pending', 0,
  '4051dcd8-c491-5bdb-9cae-9c4c886b6a8e', '4051dcd8-c491-5bdb-9cae-9c4c886b6a8e', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '603bd9e1-d1d5-50d3-be66-0f6498aec610', 'FOUNDER037', 'founder037@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '037',
  'Membre', 'none',
  0, 'pending', 0,
  '810a8dcb-e747-5410-bd5b-31f99d97aa0c', '810a8dcb-e747-5410-bd5b-31f99d97aa0c', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '72346bd6-0f6b-5f85-8412-e6f3169e8365', 'FOUNDER038', 'founder038@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '038',
  'Membre', 'none',
  0, 'pending', 0,
  '603bd9e1-d1d5-50d3-be66-0f6498aec610', '603bd9e1-d1d5-50d3-be66-0f6498aec610', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'c5587f29-e75d-5c59-a6ea-151e681cb464', 'FOUNDER039', 'founder039@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '039',
  'Membre', 'none',
  0, 'pending', 0,
  '72346bd6-0f6b-5f85-8412-e6f3169e8365', '72346bd6-0f6b-5f85-8412-e6f3169e8365', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'd323c890-bee1-5b76-b1a9-f3c226515ecf', 'FOUNDER040', 'founder040@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '040',
  'Membre', 'none',
  0, 'pending', 0,
  'c5587f29-e75d-5c59-a6ea-151e681cb464', 'c5587f29-e75d-5c59-a6ea-151e681cb464', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '555cccdf-6f7e-55c4-a753-a31a0e4f3e68', 'FOUNDER041', 'founder041@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '041',
  'Membre', 'none',
  0, 'pending', 0,
  'd323c890-bee1-5b76-b1a9-f3c226515ecf', 'd323c890-bee1-5b76-b1a9-f3c226515ecf', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'f36f04ac-1ab6-5c4b-8d9a-14afe12d31bf', 'FOUNDER042', 'founder042@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '042',
  'Membre', 'none',
  0, 'pending', 0,
  '555cccdf-6f7e-55c4-a753-a31a0e4f3e68', '555cccdf-6f7e-55c4-a753-a31a0e4f3e68', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'b31a1866-e90a-5025-a996-801ef80b33ab', 'FOUNDER043', 'founder043@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '043',
  'Membre', 'none',
  0, 'pending', 0,
  'f36f04ac-1ab6-5c4b-8d9a-14afe12d31bf', 'f36f04ac-1ab6-5c4b-8d9a-14afe12d31bf', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '1fd79f97-6a38-56b7-b581-2ebfefaa4aea', 'FOUNDER044', 'founder044@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '044',
  'Membre', 'none',
  0, 'pending', 0,
  'b31a1866-e90a-5025-a996-801ef80b33ab', 'b31a1866-e90a-5025-a996-801ef80b33ab', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'fa0818c6-df3b-5861-ad86-1885b265f663', 'FOUNDER045', 'founder045@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '045',
  'Membre', 'none',
  0, 'pending', 0,
  '1fd79f97-6a38-56b7-b581-2ebfefaa4aea', '1fd79f97-6a38-56b7-b581-2ebfefaa4aea', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'b713da54-1e9b-5a85-b8cc-8a2773c0a0fe', 'FOUNDER046', 'founder046@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '046',
  'Membre', 'none',
  0, 'pending', 0,
  'fa0818c6-df3b-5861-ad86-1885b265f663', 'fa0818c6-df3b-5861-ad86-1885b265f663', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '7e736702-7ab0-5463-8e49-d41cdf8c47cf', 'FOUNDER047', 'founder047@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '047',
  'Membre', 'none',
  0, 'pending', 0,
  'b713da54-1e9b-5a85-b8cc-8a2773c0a0fe', 'b713da54-1e9b-5a85-b8cc-8a2773c0a0fe', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'a6e67884-a494-5492-958c-307643fcba6a', 'FOUNDER048', 'founder048@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '048',
  'Membre', 'none',
  0, 'pending', 0,
  '7e736702-7ab0-5463-8e49-d41cdf8c47cf', '7e736702-7ab0-5463-8e49-d41cdf8c47cf', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'dde251bf-aa69-5cae-b64c-b657948d30e8', 'FOUNDER049', 'founder049@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '049',
  'Membre', 'none',
  0, 'pending', 0,
  'a6e67884-a494-5492-958c-307643fcba6a', 'a6e67884-a494-5492-958c-307643fcba6a', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'a1090d8b-10a1-5f22-ac97-94020ec092b1', 'FOUNDER050', 'founder050@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '050',
  'Membre', 'none',
  0, 'pending', 0,
  'dde251bf-aa69-5cae-b64c-b657948d30e8', 'dde251bf-aa69-5cae-b64c-b657948d30e8', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '523b4873-9fb5-5f3f-bc26-67acc53e3dd1', 'FOUNDER051', 'founder051@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '051',
  'Membre', 'none',
  0, 'pending', 0,
  'a1090d8b-10a1-5f22-ac97-94020ec092b1', 'a1090d8b-10a1-5f22-ac97-94020ec092b1', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'd65839d1-c63e-52cd-a2e5-981e6bc4c702', 'FOUNDER052', 'founder052@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '052',
  'Membre', 'none',
  0, 'pending', 0,
  '523b4873-9fb5-5f3f-bc26-67acc53e3dd1', '523b4873-9fb5-5f3f-bc26-67acc53e3dd1', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'dd38a60d-6194-5c77-896e-b1c268ec6fff', 'FOUNDER053', 'founder053@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '053',
  'Membre', 'none',
  0, 'pending', 0,
  'd65839d1-c63e-52cd-a2e5-981e6bc4c702', 'd65839d1-c63e-52cd-a2e5-981e6bc4c702', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '8d90a34d-0b27-5173-b98c-d8d1d944e228', 'FOUNDER054', 'founder054@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '054',
  'Membre', 'none',
  0, 'pending', 0,
  'dd38a60d-6194-5c77-896e-b1c268ec6fff', 'dd38a60d-6194-5c77-896e-b1c268ec6fff', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'c2c5bcd1-6e13-51c0-aa63-6b3fa503b8d9', 'FOUNDER055', 'founder055@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '055',
  'Membre', 'none',
  0, 'pending', 0,
  '8d90a34d-0b27-5173-b98c-d8d1d944e228', '8d90a34d-0b27-5173-b98c-d8d1d944e228', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '7085986f-e97a-5983-8e2b-cab5305e02bd', 'FOUNDER056', 'founder056@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '056',
  'Membre', 'none',
  0, 'pending', 0,
  'c2c5bcd1-6e13-51c0-aa63-6b3fa503b8d9', 'c2c5bcd1-6e13-51c0-aa63-6b3fa503b8d9', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '22aa0f3c-3cda-5ebf-8a80-0d605fe96a20', 'FOUNDER057', 'founder057@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '057',
  'Membre', 'none',
  0, 'pending', 0,
  '7085986f-e97a-5983-8e2b-cab5305e02bd', '7085986f-e97a-5983-8e2b-cab5305e02bd', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '88e77222-2bff-5431-b4f7-a3a7c4aa87a5', 'FOUNDER058', 'founder058@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '058',
  'Membre', 'none',
  0, 'pending', 0,
  '22aa0f3c-3cda-5ebf-8a80-0d605fe96a20', '22aa0f3c-3cda-5ebf-8a80-0d605fe96a20', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'fdb88579-a5bf-5b7d-98db-f53bb5e0305a', 'FOUNDER059', 'founder059@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '059',
  'Membre', 'none',
  0, 'pending', 0,
  '88e77222-2bff-5431-b4f7-a3a7c4aa87a5', '88e77222-2bff-5431-b4f7-a3a7c4aa87a5', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '278b3526-eda1-582c-a93e-8b2bceb3c9f4', 'FOUNDER060', 'founder060@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '060',
  'Membre', 'none',
  0, 'pending', 0,
  'fdb88579-a5bf-5b7d-98db-f53bb5e0305a', 'fdb88579-a5bf-5b7d-98db-f53bb5e0305a', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '9175809e-8330-5a54-b1da-8fde1f5d37d0', 'FOUNDER061', 'founder061@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '061',
  'Membre', 'none',
  0, 'pending', 0,
  '278b3526-eda1-582c-a93e-8b2bceb3c9f4', '278b3526-eda1-582c-a93e-8b2bceb3c9f4', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '1f83aea9-1297-5aa1-bd98-abbd6a703a51', 'FOUNDER062', 'founder062@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '062',
  'Membre', 'none',
  0, 'pending', 0,
  '9175809e-8330-5a54-b1da-8fde1f5d37d0', '9175809e-8330-5a54-b1da-8fde1f5d37d0', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'c5e910d8-165c-55b8-af96-de42cdc9d5d2', 'FOUNDER063', 'founder063@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '063',
  'Membre', 'none',
  0, 'pending', 0,
  '1f83aea9-1297-5aa1-bd98-abbd6a703a51', '1f83aea9-1297-5aa1-bd98-abbd6a703a51', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'db93e23d-46bf-50f4-ac90-15b4f9b03df2', 'FOUNDER064', 'founder064@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '064',
  'Membre', 'none',
  0, 'pending', 0,
  'c5e910d8-165c-55b8-af96-de42cdc9d5d2', 'c5e910d8-165c-55b8-af96-de42cdc9d5d2', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '95f42891-5a14-530d-8cfb-cf95f005c830', 'FOUNDER065', 'founder065@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '065',
  'Membre', 'none',
  0, 'pending', 0,
  'db93e23d-46bf-50f4-ac90-15b4f9b03df2', 'db93e23d-46bf-50f4-ac90-15b4f9b03df2', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'e893fee5-8478-5922-a4d7-7bf5d74c4f24', 'FOUNDER066', 'founder066@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '066',
  'Membre', 'none',
  0, 'pending', 0,
  '95f42891-5a14-530d-8cfb-cf95f005c830', '95f42891-5a14-530d-8cfb-cf95f005c830', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '39e3930d-7dec-58d3-9bc2-a0b99861a02e', 'FOUNDER067', 'founder067@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '067',
  'Membre', 'none',
  0, 'pending', 0,
  'e893fee5-8478-5922-a4d7-7bf5d74c4f24', 'e893fee5-8478-5922-a4d7-7bf5d74c4f24', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '103edc3d-87a5-51cb-8650-3dc31257dc3c', 'FOUNDER068', 'founder068@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '068',
  'Membre', 'none',
  0, 'pending', 0,
  '39e3930d-7dec-58d3-9bc2-a0b99861a02e', '39e3930d-7dec-58d3-9bc2-a0b99861a02e', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '687b136a-149f-5318-ade1-ab039b14fe19', 'FOUNDER069', 'founder069@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '069',
  'Membre', 'none',
  0, 'pending', 0,
  '103edc3d-87a5-51cb-8650-3dc31257dc3c', '103edc3d-87a5-51cb-8650-3dc31257dc3c', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '7a62ff54-d660-5e5a-a21e-08d240e05617', 'FOUNDER070', 'founder070@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '070',
  'Membre', 'none',
  0, 'pending', 0,
  '687b136a-149f-5318-ade1-ab039b14fe19', '687b136a-149f-5318-ade1-ab039b14fe19', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '64374623-38f2-517b-bd43-df02240de15b', 'FOUNDER071', 'founder071@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '071',
  'Membre', 'none',
  0, 'pending', 0,
  '7a62ff54-d660-5e5a-a21e-08d240e05617', '7a62ff54-d660-5e5a-a21e-08d240e05617', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '212a006a-407c-55b0-8c71-aa1923fe0658', 'FOUNDER072', 'founder072@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '072',
  'Membre', 'none',
  0, 'pending', 0,
  '64374623-38f2-517b-bd43-df02240de15b', '64374623-38f2-517b-bd43-df02240de15b', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'c550f239-dbbf-55e0-b968-1a99134c3ceb', 'FOUNDER073', 'founder073@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '073',
  'Membre', 'none',
  0, 'pending', 0,
  '212a006a-407c-55b0-8c71-aa1923fe0658', '212a006a-407c-55b0-8c71-aa1923fe0658', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '88aab664-5927-50a8-a4fc-f46c097ff378', 'FOUNDER074', 'founder074@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '074',
  'Membre', 'none',
  0, 'pending', 0,
  'c550f239-dbbf-55e0-b968-1a99134c3ceb', 'c550f239-dbbf-55e0-b968-1a99134c3ceb', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'c73936a0-e9bc-5f42-b7b0-99c6b43de1a5', 'FOUNDER075', 'founder075@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '075',
  'Membre', 'none',
  0, 'pending', 0,
  '88aab664-5927-50a8-a4fc-f46c097ff378', '88aab664-5927-50a8-a4fc-f46c097ff378', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '62cf8f78-c721-5523-bd14-f8d617e48792', 'FOUNDER076', 'founder076@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '076',
  'Membre', 'none',
  0, 'pending', 0,
  'c73936a0-e9bc-5f42-b7b0-99c6b43de1a5', 'c73936a0-e9bc-5f42-b7b0-99c6b43de1a5', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '9a3a69d6-8411-5726-b46b-c31280eb1497', 'FOUNDER077', 'founder077@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '077',
  'Membre', 'none',
  0, 'pending', 0,
  '62cf8f78-c721-5523-bd14-f8d617e48792', '62cf8f78-c721-5523-bd14-f8d617e48792', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '9b6c779e-75ae-553e-9338-019073bcdbd7', 'FOUNDER078', 'founder078@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '078',
  'Membre', 'none',
  0, 'pending', 0,
  '9a3a69d6-8411-5726-b46b-c31280eb1497', '9a3a69d6-8411-5726-b46b-c31280eb1497', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '827f2434-0695-5c4b-9186-d02d79659627', 'FOUNDER079', 'founder079@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '079',
  'Membre', 'none',
  0, 'pending', 0,
  '9b6c779e-75ae-553e-9338-019073bcdbd7', '9b6c779e-75ae-553e-9338-019073bcdbd7', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'e810471d-0279-5747-8a25-06cdf50516dc', 'FOUNDER080', 'founder080@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '080',
  'Membre', 'none',
  0, 'pending', 0,
  '827f2434-0695-5c4b-9186-d02d79659627', '827f2434-0695-5c4b-9186-d02d79659627', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '19f924a3-e6c8-5550-8d9d-d74628e26ead', 'FOUNDER081', 'founder081@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '081',
  'Membre', 'none',
  0, 'pending', 0,
  'e810471d-0279-5747-8a25-06cdf50516dc', 'e810471d-0279-5747-8a25-06cdf50516dc', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'f451ef4f-4bb8-5a37-b2b3-96315a987c77', 'FOUNDER082', 'founder082@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '082',
  'Membre', 'none',
  0, 'pending', 0,
  '19f924a3-e6c8-5550-8d9d-d74628e26ead', '19f924a3-e6c8-5550-8d9d-d74628e26ead', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '67ecadae-b552-51d0-9e50-59d6346c2032', 'FOUNDER083', 'founder083@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '083',
  'Membre', 'none',
  0, 'pending', 0,
  'f451ef4f-4bb8-5a37-b2b3-96315a987c77', 'f451ef4f-4bb8-5a37-b2b3-96315a987c77', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '5435c66a-6cff-5f55-a54c-b88d5ac9289c', 'FOUNDER084', 'founder084@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '084',
  'Membre', 'none',
  0, 'pending', 0,
  '67ecadae-b552-51d0-9e50-59d6346c2032', '67ecadae-b552-51d0-9e50-59d6346c2032', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '2ce6a814-3d3a-5ca2-a4ec-e17847ae0ac8', 'FOUNDER085', 'founder085@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '085',
  'Membre', 'none',
  0, 'pending', 0,
  '5435c66a-6cff-5f55-a54c-b88d5ac9289c', '5435c66a-6cff-5f55-a54c-b88d5ac9289c', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'd8575663-05e1-5fa0-baa6-e305cf53dc97', 'FOUNDER086', 'founder086@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '086',
  'Membre', 'none',
  0, 'pending', 0,
  '2ce6a814-3d3a-5ca2-a4ec-e17847ae0ac8', '2ce6a814-3d3a-5ca2-a4ec-e17847ae0ac8', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'b3001dfa-870c-5406-ad60-fae9adfc90a0', 'FOUNDER087', 'founder087@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '087',
  'Membre', 'none',
  0, 'pending', 0,
  'd8575663-05e1-5fa0-baa6-e305cf53dc97', 'd8575663-05e1-5fa0-baa6-e305cf53dc97', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '7e9ea86f-f61c-571a-82b1-82bd6fdd058c', 'FOUNDER088', 'founder088@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '088',
  'Membre', 'none',
  0, 'pending', 0,
  'b3001dfa-870c-5406-ad60-fae9adfc90a0', 'b3001dfa-870c-5406-ad60-fae9adfc90a0', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'c6ca9734-b177-5af6-940e-398125f007bf', 'FOUNDER089', 'founder089@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '089',
  'Membre', 'none',
  0, 'pending', 0,
  '7e9ea86f-f61c-571a-82b1-82bd6fdd058c', '7e9ea86f-f61c-571a-82b1-82bd6fdd058c', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '5303a76c-63c0-536a-9c02-fe44ca726973', 'FOUNDER090', 'founder090@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '090',
  'Membre', 'none',
  0, 'pending', 0,
  'c6ca9734-b177-5af6-940e-398125f007bf', 'c6ca9734-b177-5af6-940e-398125f007bf', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'd6d0597e-10e3-5270-a8ab-bf4311887273', 'FOUNDER091', 'founder091@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '091',
  'Membre', 'none',
  0, 'pending', 0,
  '5303a76c-63c0-536a-9c02-fe44ca726973', '5303a76c-63c0-536a-9c02-fe44ca726973', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'e13441dd-558f-526f-961d-74ddb2cefca1', 'FOUNDER092', 'founder092@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '092',
  'Membre', 'none',
  0, 'pending', 0,
  'd6d0597e-10e3-5270-a8ab-bf4311887273', 'd6d0597e-10e3-5270-a8ab-bf4311887273', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'b900d912-acac-5551-9966-626713932875', 'FOUNDER093', 'founder093@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '093',
  'Membre', 'none',
  0, 'pending', 0,
  'e13441dd-558f-526f-961d-74ddb2cefca1', 'e13441dd-558f-526f-961d-74ddb2cefca1', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'f8cc57c5-c560-52a1-86fd-e6c7f003e255', 'FOUNDER094', 'founder094@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '094',
  'Membre', 'none',
  0, 'pending', 0,
  'b900d912-acac-5551-9966-626713932875', 'b900d912-acac-5551-9966-626713932875', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '06c18ffc-44e6-56d9-bcfb-1757d6fa1700', 'FOUNDER095', 'founder095@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '095',
  'Membre', 'none',
  0, 'pending', 0,
  'f8cc57c5-c560-52a1-86fd-e6c7f003e255', 'f8cc57c5-c560-52a1-86fd-e6c7f003e255', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '9850913e-3105-5214-8d74-b0825d1e2a7b', 'FOUNDER096', 'founder096@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '096',
  'Membre', 'none',
  0, 'pending', 0,
  '06c18ffc-44e6-56d9-bcfb-1757d6fa1700', '06c18ffc-44e6-56d9-bcfb-1757d6fa1700', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'f2f59bf4-576b-5cc7-8055-75ba90afe7f3', 'FOUNDER097', 'founder097@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '097',
  'Membre', 'none',
  0, 'pending', 0,
  '9850913e-3105-5214-8d74-b0825d1e2a7b', '9850913e-3105-5214-8d74-b0825d1e2a7b', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'c01e175a-8e7a-5316-8a57-cb51221d0452', 'FOUNDER098', 'founder098@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '098',
  'Membre', 'none',
  0, 'pending', 0,
  'f2f59bf4-576b-5cc7-8055-75ba90afe7f3', 'f2f59bf4-576b-5cc7-8055-75ba90afe7f3', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  '3947bd98-71b5-5edf-980d-12c786f05767', 'FOUNDER099', 'founder099@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '099',
  'Membre', 'none',
  0, 'pending', 0,
  'c01e175a-8e7a-5316-8a57-cb51221d0452', 'c01e175a-8e7a-5316-8a57-cb51221d0452', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method, created_at, updated_at
) VALUES (
  'a0203d9c-1cce-58a5-b60e-db6b28cdfa83', 'FOUNDER100', 'founder100@willbeleader.com',
  '9dc7269e-52ed-4f37-832f-5f804975fcce:da6fe497e39aa4b01e60efe85872d49596bb0f3fecd8f3409f00d75189119582', NULL,
  'Founder', '100',
  'Membre', 'none',
  0, 'pending', 0,
  '3947bd98-71b5-5edf-980d-12c786f05767', '3947bd98-71b5-5edf-980d-12c786f05767', 'R',
  0, 0, 0,
  'M1', datetime('now'), datetime('now')
);

-- ── INSERT 100 WALLETS ──────────────────────────────────
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('1665e24b-4e42-578f-ad7f-e73c3301f889', 'd38c6aed-4fd9-5de9-99a2-aebb4e6a2cc7', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('0740c372-4d92-5891-a33b-d44bb599cecd', 'ec18c3ce-745e-5c8e-8a1d-d1f75c13cc3a', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('2d115f32-db4e-58fd-bc96-299b71874feb', 'a15cb84e-9ac4-53c2-9c74-854a386dd8c1', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('2d7389f1-c238-51ff-a88c-8eea6f574f36', 'c8bea72d-780a-53eb-a135-c2b3abbe26a6', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('dffbc1af-b28b-58f8-b02a-a32f1dfaf594', '637c6626-6582-5e49-a6d9-41519c54ef68', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('d4844500-fbea-5cf7-87ba-411c205f9518', '8b026876-4086-550b-91e9-ee16f7245965', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('d029b133-91b1-587a-a891-06f094884073', '4fede216-07eb-51d8-89c2-a6a43c136e81', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('e114c72d-a340-5988-805b-87e2de753691', '966cf369-42ef-5f57-b11b-67247fa16188', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('46b75cdc-6ef8-5a83-ae8f-ba4adb264e13', '6448f26c-4831-5916-bba9-6ab7f0a9f966', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('d871f8fa-aeb4-5727-94bc-8db982801dd1', '904ddf79-e346-51db-905a-bd0b2999e047', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('0a9ade88-40d8-5ffe-a7f9-a473c82d010a', 'd1b001a5-7338-5919-a3e4-5b69b139e420', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('ae2ff1e7-2ca6-5ddd-b844-8b0a3a7dcaeb', '04bff1c7-fa33-5797-8932-fe2b45df9438', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('19820ce9-90cf-5771-b596-095a8689b94b', '0b14f8ce-3e41-5061-b10f-4e791bf00e84', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('d69396a7-430b-5a0b-b77c-751e904e3caf', '7952343b-bbf6-5008-a264-d542ad348fbd', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('7f7bb536-55d4-5368-b17a-14a393618ead', 'c209c338-6486-5f85-936a-4d05e4d57105', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('335eb378-f670-57c2-a113-94248f348b48', 'b6ba60f6-059d-5e2f-bc56-d16d69f8c15d', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('0ac7bff5-dfdb-5395-af27-6abd9e2c8bdd', '386c14a9-4d36-506f-9eea-76a660082349', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('377610dd-c61c-501e-846b-d705069eb4fb', '6d76c93d-7c2a-5568-9bf0-e0e878edd7e6', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('ef0c2b36-8432-5ac9-9501-01cc139bfa61', '31f6e7ce-0a67-564d-998d-8e73cbbabacc', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('bec1e519-09dc-5b29-9249-b19f86466039', '611e0650-6185-5de3-8cf6-eee532decf40', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('6f9219f8-d937-5e52-91bf-302ec0be50d2', '22e60d25-e59c-5e57-bf71-423c0ac5c2be', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('cc68a9fc-51d9-55fe-bdb3-69c2e7c57d99', '1ef1379d-3cc6-5704-b724-0bb124b6d38c', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('d6676465-7d73-584f-a699-8392428fd9a0', 'd5bb2c0d-9471-5118-861a-dd7bbf752510', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('f9b321f3-9c5d-5c82-a145-ec36a4f566c1', '888192ce-c1f5-5bc4-9793-1510165edba7', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('6eabf7b5-dd2b-5203-82b1-7f3128ca16da', 'fd9b2716-e53a-5b0f-86ba-d6d0dedf9a08', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('52d8652a-d9c3-515e-8d0b-fe8e73e95878', 'efe72013-c141-55a9-a783-08cbbe784d91', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('ccea1523-72dd-59c6-9a37-0fdecd4807e1', 'e45d979a-2266-595b-a162-54683b2b253b', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('bc3fd0f8-374e-5987-a30c-7a4a6acee217', '9ba4ad1c-ad52-5946-9678-73acace2caf4', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('135af5e8-1023-5bcc-9e6b-1f0159c9db43', '68c6b990-1cc9-5f0e-a486-fedf3b1244bb', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('c44ca5f0-b389-56c3-ba57-7ef6b6b9067a', 'c16fca62-4a31-5010-9501-1df77d0a7938', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('d491a389-b203-5e2e-97b7-49c746312839', '03b21c64-267d-52a3-9dad-9905a83ed7e1', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('2b1d9db5-5d9b-59f3-951f-d516e1ac54a6', '49d8ec0c-1727-5ce7-9d0d-c0fc947af12d', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('cb5f7a2e-da29-521c-9940-f84abe484310', '66eac996-c277-5564-8e38-e28b083d594a', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('76975365-e4a1-5e13-bdfe-01ddb7e5007c', '43752fc2-e185-5a02-97a5-a86a9aa01774', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('7e190e28-f55f-58c8-a895-29c3bd6b0f87', '4051dcd8-c491-5bdb-9cae-9c4c886b6a8e', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('413d6d89-c863-5bb2-9a5f-c69cc6e28318', '810a8dcb-e747-5410-bd5b-31f99d97aa0c', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('7f4af968-b1a2-57b8-a3ba-4be0f875c0ed', '603bd9e1-d1d5-50d3-be66-0f6498aec610', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('52483784-a733-5473-9185-b19d5425c1e2', '72346bd6-0f6b-5f85-8412-e6f3169e8365', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('8455e850-6fb8-543c-ab15-96be7c469530', 'c5587f29-e75d-5c59-a6ea-151e681cb464', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('5dc03ac5-404e-5289-b595-48e04f24e04e', 'd323c890-bee1-5b76-b1a9-f3c226515ecf', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('8ee443a1-cb30-53a8-ac41-8453da9b0ec8', '555cccdf-6f7e-55c4-a753-a31a0e4f3e68', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('18618a43-529e-59af-a6e2-eeed06aaa11c', 'f36f04ac-1ab6-5c4b-8d9a-14afe12d31bf', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('60893cb4-db97-52f6-85fb-d3d9af4f0b72', 'b31a1866-e90a-5025-a996-801ef80b33ab', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('873f22ff-9311-5f45-9834-2ae962e7e1cc', '1fd79f97-6a38-56b7-b581-2ebfefaa4aea', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('ee0dfc78-3ed3-514c-b311-d7fc58779c65', 'fa0818c6-df3b-5861-ad86-1885b265f663', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('de726e1e-aa50-5479-a6ee-92647646aa23', 'b713da54-1e9b-5a85-b8cc-8a2773c0a0fe', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('692f70cb-8468-57b7-841a-efa0058ebf03', '7e736702-7ab0-5463-8e49-d41cdf8c47cf', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('b6a267b9-e5dc-5473-9203-91c159adb444', 'a6e67884-a494-5492-958c-307643fcba6a', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('c0bd5a93-5dc1-5c1d-b64c-88b3d5681963', 'dde251bf-aa69-5cae-b64c-b657948d30e8', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('2eeca0d8-d0f8-55e2-8236-6d2d87197912', 'a1090d8b-10a1-5f22-ac97-94020ec092b1', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('fce11822-c856-5c98-ad47-b72481d9d6d8', '523b4873-9fb5-5f3f-bc26-67acc53e3dd1', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('9f05d333-7436-5e5f-9b73-b08a465d3a1b', 'd65839d1-c63e-52cd-a2e5-981e6bc4c702', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('610c288c-73f0-52d8-8e59-2fd786ad9682', 'dd38a60d-6194-5c77-896e-b1c268ec6fff', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('15854cc9-240b-557b-966f-b32eb9189f16', '8d90a34d-0b27-5173-b98c-d8d1d944e228', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('6a1d9be4-09ca-595b-a8e1-49ccbf38269f', 'c2c5bcd1-6e13-51c0-aa63-6b3fa503b8d9', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('5b8c90a3-a730-5062-a3b5-37a32362d6c8', '7085986f-e97a-5983-8e2b-cab5305e02bd', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('730596df-b3db-56fc-84aa-465a26a3e899', '22aa0f3c-3cda-5ebf-8a80-0d605fe96a20', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('456324ad-06f5-5c83-8c4c-c07b9e7d1fd8', '88e77222-2bff-5431-b4f7-a3a7c4aa87a5', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('1e3759a5-0255-56e4-9217-ce3ce4e4f578', 'fdb88579-a5bf-5b7d-98db-f53bb5e0305a', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('88723ffa-6d04-56d1-9eab-7c2615edbee8', '278b3526-eda1-582c-a93e-8b2bceb3c9f4', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('a48243c6-3aaa-5832-93c0-dcfd08cd782d', '9175809e-8330-5a54-b1da-8fde1f5d37d0', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('ed7ffa8d-3a54-50d0-aefc-47486d93c960', '1f83aea9-1297-5aa1-bd98-abbd6a703a51', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('7c8d2b8c-9fda-5cae-b20c-bd6772a334bb', 'c5e910d8-165c-55b8-af96-de42cdc9d5d2', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('dbefaa0f-c695-57b9-8f04-3a7011aed610', 'db93e23d-46bf-50f4-ac90-15b4f9b03df2', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('464e530a-1c84-52b3-9148-bf172aa992a9', '95f42891-5a14-530d-8cfb-cf95f005c830', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('4f525b16-b4bc-5f72-940c-b09b7b2d3a98', 'e893fee5-8478-5922-a4d7-7bf5d74c4f24', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('a1f696cb-fa9b-5237-bc9d-e26ae11c5618', '39e3930d-7dec-58d3-9bc2-a0b99861a02e', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('1a782f5d-c653-5bf8-b481-3859f6c3770e', '103edc3d-87a5-51cb-8650-3dc31257dc3c', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('64c231aa-a3eb-576c-88b9-5d6267a5c74e', '687b136a-149f-5318-ade1-ab039b14fe19', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('b8ce59ae-83ed-5389-8905-8ee1a7d563bf', '7a62ff54-d660-5e5a-a21e-08d240e05617', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('7b1d82dc-d3c1-5747-a82f-894f229f49fc', '64374623-38f2-517b-bd43-df02240de15b', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('3d35229f-4cff-55c6-ac68-e0268566127c', '212a006a-407c-55b0-8c71-aa1923fe0658', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('fb469786-f80d-59af-9732-a8d4947010bc', 'c550f239-dbbf-55e0-b968-1a99134c3ceb', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('0eb9025a-e7bc-54b9-8d66-a61b07277125', '88aab664-5927-50a8-a4fc-f46c097ff378', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('59fabd6a-d704-554a-97ba-a9cadff854d6', 'c73936a0-e9bc-5f42-b7b0-99c6b43de1a5', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('f9d286fd-5154-5356-84f8-cbaff481e9a3', '62cf8f78-c721-5523-bd14-f8d617e48792', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('bfd0eef4-29be-5f78-a0c8-b87144954bac', '9a3a69d6-8411-5726-b46b-c31280eb1497', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('53ac1c0b-d6e9-53f0-ac7a-fe9e9bfb8186', '9b6c779e-75ae-553e-9338-019073bcdbd7', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('e6560496-1ac5-577b-896e-f614d8a9478e', '827f2434-0695-5c4b-9186-d02d79659627', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('07b6b324-504c-5436-8016-8d4c407d9d8b', 'e810471d-0279-5747-8a25-06cdf50516dc', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('6a2019de-6049-51c7-99a9-d43c22c856ff', '19f924a3-e6c8-5550-8d9d-d74628e26ead', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('f3acfe1d-2c3b-508e-a5f3-0b5e152a8116', 'f451ef4f-4bb8-5a37-b2b3-96315a987c77', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('48b3e376-0753-5757-89f2-4c1b63a48181', '67ecadae-b552-51d0-9e50-59d6346c2032', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('49c74257-a18a-5887-adb4-2df2c7405b27', '5435c66a-6cff-5f55-a54c-b88d5ac9289c', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('c32034a0-242e-53f0-8b51-f8df3bd0596a', '2ce6a814-3d3a-5ca2-a4ec-e17847ae0ac8', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('e8dcccc2-147e-59fe-9491-af557fcc52d0', 'd8575663-05e1-5fa0-baa6-e305cf53dc97', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('46168ae6-60d5-5dd6-b319-83c9ced09022', 'b3001dfa-870c-5406-ad60-fae9adfc90a0', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('62680afe-1bab-592f-bec1-5dab928b9293', '7e9ea86f-f61c-571a-82b1-82bd6fdd058c', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('b5173669-af88-5756-84a7-63437b240b55', 'c6ca9734-b177-5af6-940e-398125f007bf', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('d05a3a19-30e6-5517-89f9-246fcdccca59', '5303a76c-63c0-536a-9c02-fe44ca726973', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('97cfac7c-e4bb-55e1-8713-90e9ace78df0', 'd6d0597e-10e3-5270-a8ab-bf4311887273', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('02f52e28-237b-5cfd-92bd-8021a0c0cb9a', 'e13441dd-558f-526f-961d-74ddb2cefca1', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('b8d22fed-14c9-51d4-8f41-0f4ea3c1ec00', 'b900d912-acac-5551-9966-626713932875', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('b5f55b1b-a934-5661-94e0-150738be7d8d', 'f8cc57c5-c560-52a1-86fd-e6c7f003e255', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('63a4bb7f-b646-5917-b6ac-ce321a6e165b', '06c18ffc-44e6-56d9-bcfb-1757d6fa1700', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('be800a8d-c785-54c3-98e3-20d7a18bb279', '9850913e-3105-5214-8d74-b0825d1e2a7b', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('4b039d5e-f501-5cf3-9eb1-d2d02192d57d', 'f2f59bf4-576b-5cc7-8055-75ba90afe7f3', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('f4fc8733-117d-5062-8d7d-8d80c8dddcbc', 'c01e175a-8e7a-5316-8a57-cb51221d0452', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('836b89c3-dfdf-52c0-af28-df2169f30b96', '3947bd98-71b5-5edf-980d-12c786f05767', 0, 0, 0);
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('b3e8b510-4b72-52e2-8ea7-d6b8fbcb30a6', 'a0203d9c-1cce-58a5-b60e-db6b28cdfa83', 0, 0, 0);

-- ── UPDATE binary_right_id (chaîne droite) ─────────────
UPDATE members SET binary_right_id = 'd38c6aed-4fd9-5de9-99a2-aebb4e6a2cc7' WHERE id = 'root-system-000000000000000000000000';
UPDATE members SET binary_right_id = 'ec18c3ce-745e-5c8e-8a1d-d1f75c13cc3a' WHERE id = 'd38c6aed-4fd9-5de9-99a2-aebb4e6a2cc7';
UPDATE members SET binary_right_id = 'a15cb84e-9ac4-53c2-9c74-854a386dd8c1' WHERE id = 'ec18c3ce-745e-5c8e-8a1d-d1f75c13cc3a';
UPDATE members SET binary_right_id = 'c8bea72d-780a-53eb-a135-c2b3abbe26a6' WHERE id = 'a15cb84e-9ac4-53c2-9c74-854a386dd8c1';
UPDATE members SET binary_right_id = '637c6626-6582-5e49-a6d9-41519c54ef68' WHERE id = 'c8bea72d-780a-53eb-a135-c2b3abbe26a6';
UPDATE members SET binary_right_id = '8b026876-4086-550b-91e9-ee16f7245965' WHERE id = '637c6626-6582-5e49-a6d9-41519c54ef68';
UPDATE members SET binary_right_id = '4fede216-07eb-51d8-89c2-a6a43c136e81' WHERE id = '8b026876-4086-550b-91e9-ee16f7245965';
UPDATE members SET binary_right_id = '966cf369-42ef-5f57-b11b-67247fa16188' WHERE id = '4fede216-07eb-51d8-89c2-a6a43c136e81';
UPDATE members SET binary_right_id = '6448f26c-4831-5916-bba9-6ab7f0a9f966' WHERE id = '966cf369-42ef-5f57-b11b-67247fa16188';
UPDATE members SET binary_right_id = '904ddf79-e346-51db-905a-bd0b2999e047' WHERE id = '6448f26c-4831-5916-bba9-6ab7f0a9f966';
UPDATE members SET binary_right_id = 'd1b001a5-7338-5919-a3e4-5b69b139e420' WHERE id = '904ddf79-e346-51db-905a-bd0b2999e047';
UPDATE members SET binary_right_id = '04bff1c7-fa33-5797-8932-fe2b45df9438' WHERE id = 'd1b001a5-7338-5919-a3e4-5b69b139e420';
UPDATE members SET binary_right_id = '0b14f8ce-3e41-5061-b10f-4e791bf00e84' WHERE id = '04bff1c7-fa33-5797-8932-fe2b45df9438';
UPDATE members SET binary_right_id = '7952343b-bbf6-5008-a264-d542ad348fbd' WHERE id = '0b14f8ce-3e41-5061-b10f-4e791bf00e84';
UPDATE members SET binary_right_id = 'c209c338-6486-5f85-936a-4d05e4d57105' WHERE id = '7952343b-bbf6-5008-a264-d542ad348fbd';
UPDATE members SET binary_right_id = 'b6ba60f6-059d-5e2f-bc56-d16d69f8c15d' WHERE id = 'c209c338-6486-5f85-936a-4d05e4d57105';
UPDATE members SET binary_right_id = '386c14a9-4d36-506f-9eea-76a660082349' WHERE id = 'b6ba60f6-059d-5e2f-bc56-d16d69f8c15d';
UPDATE members SET binary_right_id = '6d76c93d-7c2a-5568-9bf0-e0e878edd7e6' WHERE id = '386c14a9-4d36-506f-9eea-76a660082349';
UPDATE members SET binary_right_id = '31f6e7ce-0a67-564d-998d-8e73cbbabacc' WHERE id = '6d76c93d-7c2a-5568-9bf0-e0e878edd7e6';
UPDATE members SET binary_right_id = '611e0650-6185-5de3-8cf6-eee532decf40' WHERE id = '31f6e7ce-0a67-564d-998d-8e73cbbabacc';
UPDATE members SET binary_right_id = '22e60d25-e59c-5e57-bf71-423c0ac5c2be' WHERE id = '611e0650-6185-5de3-8cf6-eee532decf40';
UPDATE members SET binary_right_id = '1ef1379d-3cc6-5704-b724-0bb124b6d38c' WHERE id = '22e60d25-e59c-5e57-bf71-423c0ac5c2be';
UPDATE members SET binary_right_id = 'd5bb2c0d-9471-5118-861a-dd7bbf752510' WHERE id = '1ef1379d-3cc6-5704-b724-0bb124b6d38c';
UPDATE members SET binary_right_id = '888192ce-c1f5-5bc4-9793-1510165edba7' WHERE id = 'd5bb2c0d-9471-5118-861a-dd7bbf752510';
UPDATE members SET binary_right_id = 'fd9b2716-e53a-5b0f-86ba-d6d0dedf9a08' WHERE id = '888192ce-c1f5-5bc4-9793-1510165edba7';
UPDATE members SET binary_right_id = 'efe72013-c141-55a9-a783-08cbbe784d91' WHERE id = 'fd9b2716-e53a-5b0f-86ba-d6d0dedf9a08';
UPDATE members SET binary_right_id = 'e45d979a-2266-595b-a162-54683b2b253b' WHERE id = 'efe72013-c141-55a9-a783-08cbbe784d91';
UPDATE members SET binary_right_id = '9ba4ad1c-ad52-5946-9678-73acace2caf4' WHERE id = 'e45d979a-2266-595b-a162-54683b2b253b';
UPDATE members SET binary_right_id = '68c6b990-1cc9-5f0e-a486-fedf3b1244bb' WHERE id = '9ba4ad1c-ad52-5946-9678-73acace2caf4';
UPDATE members SET binary_right_id = 'c16fca62-4a31-5010-9501-1df77d0a7938' WHERE id = '68c6b990-1cc9-5f0e-a486-fedf3b1244bb';
UPDATE members SET binary_right_id = '03b21c64-267d-52a3-9dad-9905a83ed7e1' WHERE id = 'c16fca62-4a31-5010-9501-1df77d0a7938';
UPDATE members SET binary_right_id = '49d8ec0c-1727-5ce7-9d0d-c0fc947af12d' WHERE id = '03b21c64-267d-52a3-9dad-9905a83ed7e1';
UPDATE members SET binary_right_id = '66eac996-c277-5564-8e38-e28b083d594a' WHERE id = '49d8ec0c-1727-5ce7-9d0d-c0fc947af12d';
UPDATE members SET binary_right_id = '43752fc2-e185-5a02-97a5-a86a9aa01774' WHERE id = '66eac996-c277-5564-8e38-e28b083d594a';
UPDATE members SET binary_right_id = '4051dcd8-c491-5bdb-9cae-9c4c886b6a8e' WHERE id = '43752fc2-e185-5a02-97a5-a86a9aa01774';
UPDATE members SET binary_right_id = '810a8dcb-e747-5410-bd5b-31f99d97aa0c' WHERE id = '4051dcd8-c491-5bdb-9cae-9c4c886b6a8e';
UPDATE members SET binary_right_id = '603bd9e1-d1d5-50d3-be66-0f6498aec610' WHERE id = '810a8dcb-e747-5410-bd5b-31f99d97aa0c';
UPDATE members SET binary_right_id = '72346bd6-0f6b-5f85-8412-e6f3169e8365' WHERE id = '603bd9e1-d1d5-50d3-be66-0f6498aec610';
UPDATE members SET binary_right_id = 'c5587f29-e75d-5c59-a6ea-151e681cb464' WHERE id = '72346bd6-0f6b-5f85-8412-e6f3169e8365';
UPDATE members SET binary_right_id = 'd323c890-bee1-5b76-b1a9-f3c226515ecf' WHERE id = 'c5587f29-e75d-5c59-a6ea-151e681cb464';
UPDATE members SET binary_right_id = '555cccdf-6f7e-55c4-a753-a31a0e4f3e68' WHERE id = 'd323c890-bee1-5b76-b1a9-f3c226515ecf';
UPDATE members SET binary_right_id = 'f36f04ac-1ab6-5c4b-8d9a-14afe12d31bf' WHERE id = '555cccdf-6f7e-55c4-a753-a31a0e4f3e68';
UPDATE members SET binary_right_id = 'b31a1866-e90a-5025-a996-801ef80b33ab' WHERE id = 'f36f04ac-1ab6-5c4b-8d9a-14afe12d31bf';
UPDATE members SET binary_right_id = '1fd79f97-6a38-56b7-b581-2ebfefaa4aea' WHERE id = 'b31a1866-e90a-5025-a996-801ef80b33ab';
UPDATE members SET binary_right_id = 'fa0818c6-df3b-5861-ad86-1885b265f663' WHERE id = '1fd79f97-6a38-56b7-b581-2ebfefaa4aea';
UPDATE members SET binary_right_id = 'b713da54-1e9b-5a85-b8cc-8a2773c0a0fe' WHERE id = 'fa0818c6-df3b-5861-ad86-1885b265f663';
UPDATE members SET binary_right_id = '7e736702-7ab0-5463-8e49-d41cdf8c47cf' WHERE id = 'b713da54-1e9b-5a85-b8cc-8a2773c0a0fe';
UPDATE members SET binary_right_id = 'a6e67884-a494-5492-958c-307643fcba6a' WHERE id = '7e736702-7ab0-5463-8e49-d41cdf8c47cf';
UPDATE members SET binary_right_id = 'dde251bf-aa69-5cae-b64c-b657948d30e8' WHERE id = 'a6e67884-a494-5492-958c-307643fcba6a';
UPDATE members SET binary_right_id = 'a1090d8b-10a1-5f22-ac97-94020ec092b1' WHERE id = 'dde251bf-aa69-5cae-b64c-b657948d30e8';
UPDATE members SET binary_right_id = '523b4873-9fb5-5f3f-bc26-67acc53e3dd1' WHERE id = 'a1090d8b-10a1-5f22-ac97-94020ec092b1';
UPDATE members SET binary_right_id = 'd65839d1-c63e-52cd-a2e5-981e6bc4c702' WHERE id = '523b4873-9fb5-5f3f-bc26-67acc53e3dd1';
UPDATE members SET binary_right_id = 'dd38a60d-6194-5c77-896e-b1c268ec6fff' WHERE id = 'd65839d1-c63e-52cd-a2e5-981e6bc4c702';
UPDATE members SET binary_right_id = '8d90a34d-0b27-5173-b98c-d8d1d944e228' WHERE id = 'dd38a60d-6194-5c77-896e-b1c268ec6fff';
UPDATE members SET binary_right_id = 'c2c5bcd1-6e13-51c0-aa63-6b3fa503b8d9' WHERE id = '8d90a34d-0b27-5173-b98c-d8d1d944e228';
UPDATE members SET binary_right_id = '7085986f-e97a-5983-8e2b-cab5305e02bd' WHERE id = 'c2c5bcd1-6e13-51c0-aa63-6b3fa503b8d9';
UPDATE members SET binary_right_id = '22aa0f3c-3cda-5ebf-8a80-0d605fe96a20' WHERE id = '7085986f-e97a-5983-8e2b-cab5305e02bd';
UPDATE members SET binary_right_id = '88e77222-2bff-5431-b4f7-a3a7c4aa87a5' WHERE id = '22aa0f3c-3cda-5ebf-8a80-0d605fe96a20';
UPDATE members SET binary_right_id = 'fdb88579-a5bf-5b7d-98db-f53bb5e0305a' WHERE id = '88e77222-2bff-5431-b4f7-a3a7c4aa87a5';
UPDATE members SET binary_right_id = '278b3526-eda1-582c-a93e-8b2bceb3c9f4' WHERE id = 'fdb88579-a5bf-5b7d-98db-f53bb5e0305a';
UPDATE members SET binary_right_id = '9175809e-8330-5a54-b1da-8fde1f5d37d0' WHERE id = '278b3526-eda1-582c-a93e-8b2bceb3c9f4';
UPDATE members SET binary_right_id = '1f83aea9-1297-5aa1-bd98-abbd6a703a51' WHERE id = '9175809e-8330-5a54-b1da-8fde1f5d37d0';
UPDATE members SET binary_right_id = 'c5e910d8-165c-55b8-af96-de42cdc9d5d2' WHERE id = '1f83aea9-1297-5aa1-bd98-abbd6a703a51';
UPDATE members SET binary_right_id = 'db93e23d-46bf-50f4-ac90-15b4f9b03df2' WHERE id = 'c5e910d8-165c-55b8-af96-de42cdc9d5d2';
UPDATE members SET binary_right_id = '95f42891-5a14-530d-8cfb-cf95f005c830' WHERE id = 'db93e23d-46bf-50f4-ac90-15b4f9b03df2';
UPDATE members SET binary_right_id = 'e893fee5-8478-5922-a4d7-7bf5d74c4f24' WHERE id = '95f42891-5a14-530d-8cfb-cf95f005c830';
UPDATE members SET binary_right_id = '39e3930d-7dec-58d3-9bc2-a0b99861a02e' WHERE id = 'e893fee5-8478-5922-a4d7-7bf5d74c4f24';
UPDATE members SET binary_right_id = '103edc3d-87a5-51cb-8650-3dc31257dc3c' WHERE id = '39e3930d-7dec-58d3-9bc2-a0b99861a02e';
UPDATE members SET binary_right_id = '687b136a-149f-5318-ade1-ab039b14fe19' WHERE id = '103edc3d-87a5-51cb-8650-3dc31257dc3c';
UPDATE members SET binary_right_id = '7a62ff54-d660-5e5a-a21e-08d240e05617' WHERE id = '687b136a-149f-5318-ade1-ab039b14fe19';
UPDATE members SET binary_right_id = '64374623-38f2-517b-bd43-df02240de15b' WHERE id = '7a62ff54-d660-5e5a-a21e-08d240e05617';
UPDATE members SET binary_right_id = '212a006a-407c-55b0-8c71-aa1923fe0658' WHERE id = '64374623-38f2-517b-bd43-df02240de15b';
UPDATE members SET binary_right_id = 'c550f239-dbbf-55e0-b968-1a99134c3ceb' WHERE id = '212a006a-407c-55b0-8c71-aa1923fe0658';
UPDATE members SET binary_right_id = '88aab664-5927-50a8-a4fc-f46c097ff378' WHERE id = 'c550f239-dbbf-55e0-b968-1a99134c3ceb';
UPDATE members SET binary_right_id = 'c73936a0-e9bc-5f42-b7b0-99c6b43de1a5' WHERE id = '88aab664-5927-50a8-a4fc-f46c097ff378';
UPDATE members SET binary_right_id = '62cf8f78-c721-5523-bd14-f8d617e48792' WHERE id = 'c73936a0-e9bc-5f42-b7b0-99c6b43de1a5';
UPDATE members SET binary_right_id = '9a3a69d6-8411-5726-b46b-c31280eb1497' WHERE id = '62cf8f78-c721-5523-bd14-f8d617e48792';
UPDATE members SET binary_right_id = '9b6c779e-75ae-553e-9338-019073bcdbd7' WHERE id = '9a3a69d6-8411-5726-b46b-c31280eb1497';
UPDATE members SET binary_right_id = '827f2434-0695-5c4b-9186-d02d79659627' WHERE id = '9b6c779e-75ae-553e-9338-019073bcdbd7';
UPDATE members SET binary_right_id = 'e810471d-0279-5747-8a25-06cdf50516dc' WHERE id = '827f2434-0695-5c4b-9186-d02d79659627';
UPDATE members SET binary_right_id = '19f924a3-e6c8-5550-8d9d-d74628e26ead' WHERE id = 'e810471d-0279-5747-8a25-06cdf50516dc';
UPDATE members SET binary_right_id = 'f451ef4f-4bb8-5a37-b2b3-96315a987c77' WHERE id = '19f924a3-e6c8-5550-8d9d-d74628e26ead';
UPDATE members SET binary_right_id = '67ecadae-b552-51d0-9e50-59d6346c2032' WHERE id = 'f451ef4f-4bb8-5a37-b2b3-96315a987c77';
UPDATE members SET binary_right_id = '5435c66a-6cff-5f55-a54c-b88d5ac9289c' WHERE id = '67ecadae-b552-51d0-9e50-59d6346c2032';
UPDATE members SET binary_right_id = '2ce6a814-3d3a-5ca2-a4ec-e17847ae0ac8' WHERE id = '5435c66a-6cff-5f55-a54c-b88d5ac9289c';
UPDATE members SET binary_right_id = 'd8575663-05e1-5fa0-baa6-e305cf53dc97' WHERE id = '2ce6a814-3d3a-5ca2-a4ec-e17847ae0ac8';
UPDATE members SET binary_right_id = 'b3001dfa-870c-5406-ad60-fae9adfc90a0' WHERE id = 'd8575663-05e1-5fa0-baa6-e305cf53dc97';
UPDATE members SET binary_right_id = '7e9ea86f-f61c-571a-82b1-82bd6fdd058c' WHERE id = 'b3001dfa-870c-5406-ad60-fae9adfc90a0';
UPDATE members SET binary_right_id = 'c6ca9734-b177-5af6-940e-398125f007bf' WHERE id = '7e9ea86f-f61c-571a-82b1-82bd6fdd058c';
UPDATE members SET binary_right_id = '5303a76c-63c0-536a-9c02-fe44ca726973' WHERE id = 'c6ca9734-b177-5af6-940e-398125f007bf';
UPDATE members SET binary_right_id = 'd6d0597e-10e3-5270-a8ab-bf4311887273' WHERE id = '5303a76c-63c0-536a-9c02-fe44ca726973';
UPDATE members SET binary_right_id = 'e13441dd-558f-526f-961d-74ddb2cefca1' WHERE id = 'd6d0597e-10e3-5270-a8ab-bf4311887273';
UPDATE members SET binary_right_id = 'b900d912-acac-5551-9966-626713932875' WHERE id = 'e13441dd-558f-526f-961d-74ddb2cefca1';
UPDATE members SET binary_right_id = 'f8cc57c5-c560-52a1-86fd-e6c7f003e255' WHERE id = 'b900d912-acac-5551-9966-626713932875';
UPDATE members SET binary_right_id = '06c18ffc-44e6-56d9-bcfb-1757d6fa1700' WHERE id = 'f8cc57c5-c560-52a1-86fd-e6c7f003e255';
UPDATE members SET binary_right_id = '9850913e-3105-5214-8d74-b0825d1e2a7b' WHERE id = '06c18ffc-44e6-56d9-bcfb-1757d6fa1700';
UPDATE members SET binary_right_id = 'f2f59bf4-576b-5cc7-8055-75ba90afe7f3' WHERE id = '9850913e-3105-5214-8d74-b0825d1e2a7b';
UPDATE members SET binary_right_id = 'c01e175a-8e7a-5316-8a57-cb51221d0452' WHERE id = 'f2f59bf4-576b-5cc7-8055-75ba90afe7f3';
UPDATE members SET binary_right_id = '3947bd98-71b5-5edf-980d-12c786f05767' WHERE id = 'c01e175a-8e7a-5316-8a57-cb51221d0452';
UPDATE members SET binary_right_id = 'a0203d9c-1cce-58a5-b60e-db6b28cdfa83' WHERE id = '3947bd98-71b5-5edf-980d-12c786f05767';

PRAGMA foreign_keys = ON;