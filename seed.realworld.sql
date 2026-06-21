-- ==========================================
-- Real-world demo data for SCMS
-- ==========================================
-- These rows are synthetic, but model realistic clinic workflows in Myanmar:
-- family patient profiles, same-day queue, completed consultations,
-- prescriptions, medicine FIFO batches, inventory alerts, payments, and notifications.
--
-- ID range 10001-10999 is reserved for this demo seed.

BEGIN;

-- Case 1: Clinic staff and patient account owners
INSERT INTO tbl_user (user_id, name, mobile_no, email, password_hash, created_at, updated_at, delete_flag) VALUES
(10001, 'Dr. Thandar Hlaing', '09970001001', 'dr.thandar@scms.demo', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP, false),
(10002, 'Myo Clinic Reception', '09970001002', 'reception@scms.demo', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP, false),
(10003, 'Ko Aung Min', '09970001003', 'aung.min@example.test', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '34 days', CURRENT_TIMESTAMP, false),
(10004, 'Ma Hnin Ei', '09970001004', 'hnin.ei@example.test', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP, false),
(10005, 'U Zaw Lin', '09970001005', 'zaw.lin@example.test', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP, false),
(10006, 'Ko Pyae Sone', '09970001006', 'pyae.sone@example.test', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP, false),
(10007, 'SCMS Pharmacy Desk', '09970001007', 'pharmacy@scms.demo', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO tbl_user_role (id, user_id, role) VALUES
(10001, 10001, 'admin'),
(10002, 10002, 'admin'),
(10003, 10003, 'user'),
(10004, 10004, 'user'),
(10005, 10005, 'user'),
(10006, 10006, 'user'),
(10007, 10007, 'admin')
ON CONFLICT DO NOTHING;

-- Case 2: One user manages multiple family patient profiles
INSERT INTO tbl_patient (patient_id, user_id, name, mobile_no, email, date_of_birth, gender, blood_type, actual_address, allergies, chronic_conditions, past_surgeries, family_history, vaccination_history, created_at, updated_at, delete_flag) VALUES
(10001, 10003, 'Ko Aung Min', '09970001003', 'aung.min@example.test', DATE '1988-06-12', 'male', 'B+', 'No. 42, Baho Road, Sanchaung Township, Yangon', 'No known drug allergies', 'Mild seasonal allergic rhinitis', 'Appendectomy in 2015', 'Father has hypertension', 'COVID-19 primary series and booster; tetanus booster 2024', CURRENT_TIMESTAMP - INTERVAL '34 days', CURRENT_TIMESTAMP, false),
(10002, 10003, 'Daw Mya Mya', '09970001013', 'mya.mya@example.test', DATE '1958-02-03', 'female', 'O+', 'No. 42, Baho Road, Sanchaung Township, Yangon', 'Penicillin rash reported in 1998', 'Type 2 diabetes mellitus; hypertension', 'Cataract surgery, left eye, 2021', 'Mother had stroke at age 70', 'Influenza vaccine 2025; pneumococcal vaccine 2023', CURRENT_TIMESTAMP - INTERVAL '33 days', CURRENT_TIMESTAMP, false),
(10003, 10003, 'Ma Thiri Aung', '09970001023', 'thiri.aung@example.test', DATE '2018-09-21', 'female', 'A+', 'No. 42, Baho Road, Sanchaung Township, Yangon', 'Egg allergy, mild', 'None', 'None', 'Grandmother has diabetes', 'Routine childhood immunizations up to date', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP, false),
(10004, 10004, 'Ma Hnin Ei', '09970001004', 'hnin.ei@example.test', DATE '1995-12-08', 'female', 'AB+', 'Kan Street, Hlaing Township, Yangon', 'Dust mite sensitivity', 'Intermittent asthma', 'None', 'Younger brother has asthma', 'COVID-19 booster 2025', CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP, false),
(10005, 10005, 'U Zaw Lin', '09970001005', 'zaw.lin@example.test', DATE '1972-04-18', 'male', 'O-', 'Pearl Condo, Bahan Township, Yangon', 'No known drug allergies', 'Prediabetes; dyslipidemia', 'None', 'Both parents had type 2 diabetes', 'Hepatitis B completed; influenza vaccine 2025', CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP, false),
(10006, 10006, 'Ko Pyae Sone', '09970001006', 'pyae.sone@example.test', DATE '2001-11-02', 'male', 'B+', 'Student hostel, Kamayut Township, Yangon', 'No known drug allergies', 'None', 'None', 'No significant family history', 'COVID-19 primary series; hepatitis B dose 1', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

-- Case 3: Common diagnoses seen by the clinic
INSERT INTO tbl_disease (id, name, description, created_at, updated_at, delete_flag) VALUES
(10001, 'Acute Upper Respiratory Infection', 'Fever, sore throat, cough, and congestion without danger signs.', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP, false),
(10002, 'Type 2 Diabetes Mellitus', 'Ongoing glucose management and medication adherence review.', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP, false),
(10003, 'Essential Hypertension', 'Blood pressure monitoring and long-term cardiovascular risk control.', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP, false),
(10004, 'Allergic Rhinitis', 'Sneezing, rhinorrhea, and nasal congestion triggered by allergens.', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP, false),
(10005, 'Acute Gastroenteritis', 'Vomiting or diarrhea requiring hydration assessment.', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP, false),
(10006, 'Mild Asthma Exacerbation', 'Wheeze and cough requiring inhaler technique review.', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP, false),
(10007, 'Dengue Fever - Suspected', 'Fever with body ache requiring warning sign monitoring and lab follow-up.', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

-- Case 4: Pharmacy catalog with realistic stock pressure
INSERT INTO tbl_medicine_category (id, name) VALUES
(10001, 'Analgesics and Antipyretics'),
(10002, 'Antibiotics'),
(10003, 'Antihistamines'),
(10004, 'Gastrointestinal'),
(10005, 'Respiratory'),
(10006, 'Chronic Disease'),
(10007, 'Supplements and ORS')
ON CONFLICT DO NOTHING;

INSERT INTO tbl_medicine (medicine_id, category_id, name, description, image_url, image_id, unit_price, created_at, updated_at, delete_flag) VALUES
(10001, 10001, 'Paracetamol 500 mg tablet', 'First-line fever and mild pain relief.', NULL, NULL, 150.00, CURRENT_TIMESTAMP - INTERVAL '39 days', CURRENT_TIMESTAMP, false),
(10002, 10002, 'Amoxicillin 500 mg capsule', 'Beta-lactam antibiotic for selected bacterial infections.', NULL, NULL, 350.00, CURRENT_TIMESTAMP - INTERVAL '39 days', CURRENT_TIMESTAMP, false),
(10003, 10003, 'Cetirizine 10 mg tablet', 'Non-sedating antihistamine for allergic rhinitis and urticaria.', NULL, NULL, 120.00, CURRENT_TIMESTAMP - INTERVAL '39 days', CURRENT_TIMESTAMP, false),
(10004, 10007, 'Oral Rehydration Salts sachet', 'WHO-style oral rehydration support for diarrhea and vomiting.', NULL, NULL, 500.00, CURRENT_TIMESTAMP - INTERVAL '39 days', CURRENT_TIMESTAMP, false),
(10005, 10005, 'Salbutamol 100 mcg inhaler', 'Short-acting bronchodilator for wheeze and asthma rescue use.', NULL, NULL, 6500.00, CURRENT_TIMESTAMP - INTERVAL '39 days', CURRENT_TIMESTAMP, false),
(10006, 10006, 'Metformin 500 mg tablet', 'First-line oral therapy for type 2 diabetes mellitus.', NULL, NULL, 200.00, CURRENT_TIMESTAMP - INTERVAL '39 days', CURRENT_TIMESTAMP, false),
(10007, 10006, 'Amlodipine 5 mg tablet', 'Calcium-channel blocker for hypertension management.', NULL, NULL, 250.00, CURRENT_TIMESTAMP - INTERVAL '39 days', CURRENT_TIMESTAMP, false),
(10008, 10004, 'Omeprazole 20 mg capsule', 'Proton-pump inhibitor for gastritis and reflux symptoms.', NULL, NULL, 300.00, CURRENT_TIMESTAMP - INTERVAL '39 days', CURRENT_TIMESTAMP, false),
(10009, 10007, 'Vitamin B Complex tablet', 'Supplement for nutritional support and neuropathy risk.', NULL, NULL, 180.00, CURRENT_TIMESTAMP - INTERVAL '39 days', CURRENT_TIMESTAMP, false),
(10010, 10002, 'Cefixime 200 mg tablet', 'Cephalosporin antibiotic reserved for selected indications.', NULL, NULL, 750.00, CURRENT_TIMESTAMP - INTERVAL '39 days', CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO tbl_medicine_batch (id, med_id, batch_no, quantity, expiry_date, received_date, supplier_name, status, created_at, updated_at, delete_flag) VALUES
(10001, 10001, 'PCM-YGN-2605-A', 12, CURRENT_DATE + 18, CURRENT_DATE - 42, 'Yangon Pharma Distribution', 'active', CURRENT_TIMESTAMP - INTERVAL '42 days', CURRENT_TIMESTAMP, false),
(10002, 10001, 'PCM-YGN-2608-B', 120, CURRENT_DATE + 180, CURRENT_DATE - 10, 'Yangon Pharma Distribution', 'active', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP, false),
(10003, 10002, 'AMX-MDY-2605-A', 8, CURRENT_DATE + 22, CURRENT_DATE - 36, 'Mandalay Health Supply', 'active', CURRENT_TIMESTAMP - INTERVAL '36 days', CURRENT_TIMESTAMP, false),
(10004, 10002, 'AMX-MDY-2609-B', 30, CURRENT_DATE + 130, CURRENT_DATE - 8, 'Mandalay Health Supply', 'active', CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP, false),
(10005, 10003, 'CTZ-YGN-2605-A', 15, CURRENT_DATE + 15, CURRENT_DATE - 50, 'Shwe Medical Wholesale', 'active', CURRENT_TIMESTAMP - INTERVAL '50 days', CURRENT_TIMESTAMP, false),
(10006, 10004, 'ORS-BGO-2607-A', 150, CURRENT_DATE + 365, CURRENT_DATE - 21, 'Bago Essential Medicines', 'active', CURRENT_TIMESTAMP - INTERVAL '21 days', CURRENT_TIMESTAMP, false),
(10007, 10005, 'SAL-YGN-2607-A', 6, CURRENT_DATE + 45, CURRENT_DATE - 18, 'Yangon Respiratory Care', 'active', CURRENT_TIMESTAMP - INTERVAL '18 days', CURRENT_TIMESTAMP, false),
(10008, 10006, 'MTF-YGN-2609-A', 200, CURRENT_DATE + 400, CURRENT_DATE - 15, 'Myanmar Diabetes Care', 'active', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP, false),
(10009, 10007, 'AML-MDY-2605-A', 18, CURRENT_DATE + 25, CURRENT_DATE - 60, 'Mandalay Health Supply', 'active', CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP, false),
(10010, 10008, 'OMP-YGN-2605-A', 5, CURRENT_DATE + 10, CURRENT_DATE - 55, 'Shwe Medical Wholesale', 'active', CURRENT_TIMESTAMP - INTERVAL '55 days', CURRENT_TIMESTAMP, false),
(10011, 10010, 'CFX-YGN-2603-A', 40, CURRENT_DATE - 7, CURRENT_DATE - 120, 'Yangon Pharma Distribution', 'active', CURRENT_TIMESTAMP - INTERVAL '120 days', CURRENT_TIMESTAMP, false),
(10012, 10003, 'CTZ-OLD-2501-Z', 3, CURRENT_DATE - 45, CURRENT_DATE - 300, 'Legacy Stock Room', 'expired', CURRENT_TIMESTAMP - INTERVAL '300 days', CURRENT_TIMESTAMP - INTERVAL '45 days', false)
ON CONFLICT DO NOTHING;

-- Case 5: Appointment queue across completed, confirmed, pending, cancelled, and follow-up visits
INSERT INTO tbl_appointment (id, appointment_code, patient_id, datetime, status, notes, created_at, updated_at) VALUES
(10001, 'APT-DEMO-URI-001', 10001, CURRENT_DATE - 1 + TIME '10:00', 'completed', 'Fever, sore throat, and dry cough for two days.', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(10002, 'APT-DEMO-HTN-002', 10002, CURRENT_DATE - 14 + TIME '09:30', 'completed', 'Monthly hypertension and diabetes follow-up.', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '14 days'),
(10003, 'APT-DEMO-AST-003', 10004, CURRENT_DATE + TIME '09:00', 'confirmed', 'Wheezing after dust exposure; inhaler almost empty.', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
(10004, 'APT-DEMO-CHD-004', 10003, CURRENT_DATE + TIME '09:20', 'pending', 'Runny nose and mild fever since last night.', CURRENT_TIMESTAMP - INTERVAL '18 hours', CURRENT_TIMESTAMP - INTERVAL '18 hours'),
(10005, 'APT-DEMO-DM-005', 10005, CURRENT_DATE + TIME '09:40', 'pending', 'Blood sugar follow-up and foot numbness discussion.', CURRENT_TIMESTAMP - INTERVAL '10 hours', CURRENT_TIMESTAMP - INTERVAL '10 hours'),
(10006, 'APT-DEMO-CAN-006', 10006, CURRENT_DATE + TIME '11:30', 'cancelled', 'Travel clearance visit cancelled by patient.', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
(10007, 'APT-DEMO-FUP-007', 10002, CURRENT_DATE + 1 + TIME '10:00', 'confirmed', 'Follow-up after medication adjustment.', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(10008, 'APT-DEMO-LAB-008', 10001, CURRENT_DATE + 1 + TIME '11:00', 'pending', 'Review dengue NS1 and CBC lab results.', CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
(10009, 'APT-DEMO-DM-009', 10002, CURRENT_DATE - 45 + TIME '08:45', 'completed', 'Initial diabetes medication review after fasting glucose elevation.', CURRENT_TIMESTAMP - INTERVAL '46 days', CURRENT_TIMESTAMP - INTERVAL '45 days')
ON CONFLICT DO NOTHING;

-- Case 6: Completed consultations with vitals, diagnosis notes, and lab requests
INSERT INTO tbl_prescription (id, appointment_id, patient_id, disease_id, weight_kg, blood_pressure_systolic, blood_pressure_diastolic, actual_notes, temperature_c, pulse_bpm, spo2_percent, height_cm, bmi, lab_test_requests, created_at, updated_at, delete_flag) VALUES
(10001, 10001, 10001, 10001, 68.5, 118, 78, 'Likely viral upper respiratory infection. Advised fluids, rest, and return if fever persists beyond three days.', 38.2, 92, 98, 170.0, 23.7, 'CBC only if fever continues for 48 hours', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day', false),
(10002, 10002, 10002, 10003, 57.0, 148, 92, 'Blood pressure above target. Reviewed salt intake, home BP log, and medication adherence.', 36.7, 78, 99, 154.0, 24.0, 'Fasting blood glucose, HbA1c, urine albumin-crearinine ratio', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days', false),
(10003, 10009, 10002, 10002, 58.0, 142, 88, 'Started structured diabetes follow-up. Discussed diet, walking plan, and warning signs of hypoglycemia.', 36.8, 82, 98, 154.0, 24.5, 'HbA1c in three months; lipid profile', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days', false)
ON CONFLICT DO NOTHING;

INSERT INTO tbl_prescription_item (id, prescription_id, medicine_id, medicine_batch_id, dosage, days, quantity, instruction, created_at, updated_at, delete_flag) VALUES
(10001, 10001, 10001, 10001, '500 mg', 3, 9, 'Take one tablet every 8 hours only while fever or body ache is present.', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day', false),
(10002, 10001, 10003, 10005, '10 mg', 3, 3, 'Take one tablet at night for sneezing and runny nose.', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day', false),
(10003, 10001, 10004, 10006, '1 sachet', 2, 2, 'Dissolve one sachet in clean water if appetite is poor or sweating is heavy.', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day', false),
(10004, 10002, 10007, 10009, '5 mg', 30, 30, 'Take one tablet every morning and keep a home blood pressure log.', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days', false),
(10005, 10002, 10006, 10008, '500 mg', 30, 60, 'Take one tablet twice daily with meals.', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days', false),
(10006, 10003, 10006, 10008, '500 mg', 30, 60, 'Take one tablet twice daily with meals.', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days', false),
(10007, 10003, 10009, NULL, '1 tablet', 30, 30, 'Take one tablet daily after breakfast.', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days', false)
ON CONFLICT DO NOTHING;

INSERT INTO tbl_prescription_item_schedule (id, prescription_item_id, start_date, end_date, dose_time, dose_quantity, dose_unit, meal_timing, route, interval_hours, interval_days, day_of_week, is_as_needed, body_site, note, created_at, updated_at, delete_flag) VALUES
(10001, 10001, CURRENT_DATE - 1, CURRENT_DATE + 1, 'custom', 1.00, 'tablet', 'after_meal', 'oral', 8, NULL, NULL, true, NULL, 'Stop once fever has settled for 24 hours.', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day', false),
(10002, 10002, CURRENT_DATE - 1, CURRENT_DATE + 1, 'night', 1.00, 'tablet', 'after_meal', 'oral', NULL, 1, NULL, false, NULL, 'May cause drowsiness.', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day', false),
(10003, 10003, CURRENT_DATE - 1, CURRENT_DATE + 1, 'custom', 1.00, 'sachet', 'anytime', 'oral', NULL, NULL, NULL, true, NULL, 'Use after loose stool, heavy sweating, or poor fluid intake.', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day', false),
(10004, 10004, CURRENT_DATE - 14, CURRENT_DATE + 15, 'morning', 1.00, 'tablet', 'after_meal', 'oral', NULL, 1, NULL, false, NULL, 'Check blood pressure twice weekly.', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days', false),
(10005, 10005, CURRENT_DATE - 14, CURRENT_DATE + 15, 'morning', 1.00, 'tablet', 'with_meal', 'oral', NULL, 1, NULL, false, NULL, 'First daily dose.', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days', false),
(10006, 10005, CURRENT_DATE - 14, CURRENT_DATE + 15, 'evening', 1.00, 'tablet', 'with_meal', 'oral', NULL, 1, NULL, false, NULL, 'Second daily dose.', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days', false),
(10007, 10006, CURRENT_DATE - 45, CURRENT_DATE - 16, 'morning', 1.00, 'tablet', 'with_meal', 'oral', NULL, 1, NULL, false, NULL, 'First daily dose.', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days', false),
(10008, 10006, CURRENT_DATE - 45, CURRENT_DATE - 16, 'evening', 1.00, 'tablet', 'with_meal', 'oral', NULL, 1, NULL, false, NULL, 'Second daily dose.', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days', false),
(10009, 10007, CURRENT_DATE - 45, CURRENT_DATE - 16, 'morning', 1.00, 'tablet', 'after_meal', 'oral', NULL, 1, NULL, false, NULL, 'Nutritional support during diet adjustment.', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days', false)
ON CONFLICT DO NOTHING;

-- Case 7: Payments covering gateway success, cash collection, and manual proof review
INSERT INTO tbl_payment (id, appointment_id, prescription_id, amount, tax, charges, payment_method, payment_status, payment_screenshot, paid_at, updated_at) VALUES
(10001, 10001, 10001, 17500.00, 875.00, 500.00, 'kbzpay', 'paid', NULL, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(10002, 10002, 10002, 22500.00, 1125.00, 0.00, 'cash', 'paid', NULL, CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days'),
(10003, 10003, NULL, 10000.00, 500.00, 0.00, 'wavepay', 'pending', '/uploads/payment-proofs/apt-demo-ast-003.png', NULL, CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
(10004, 10009, 10003, 18500.00, 925.00, 0.00, 'card', 'paid', NULL, CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days')
ON CONFLICT DO NOTHING;

-- Case 8: Permissions for staff dashboard smoke tests
INSERT INTO tbl_permission (id, menu, action) VALUES
(10001, 'Dashboard', 'ViewDoctorDashboard'),
(10002, 'Appointments', 'ViewQueue'),
(10003, 'Appointments', 'UpdateStatus'),
(10004, 'Patients', 'ViewMedicalSummary'),
(10005, 'Prescriptions', 'Create'),
(10006, 'Medicines', 'ViewInventoryAlerts'),
(10007, 'Payments', 'VerifyManualProof')
ON CONFLICT DO NOTHING;

INSERT INTO tbl_role_permission (id, role_id, permission_id) VALUES
(10001, 10001, 10001),
(10002, 10001, 10002),
(10003, 10001, 10003),
(10004, 10001, 10004),
(10005, 10001, 10005),
(10006, 10001, 10006),
(10007, 10001, 10007),
(10008, 10002, 10001),
(10009, 10002, 10002),
(10010, 10002, 10007),
(10011, 10007, 10006)
ON CONFLICT DO NOTHING;

-- Case 9: Notifications that make patient and staff dashboards feel populated
INSERT INTO tbl_notification (id, user_id, title, description, action_route, created_at, updated_at, delete_flag) VALUES
(10001, 10003, 'Appointment Confirmed', 'Daw Mya Mya has a confirmed follow-up appointment tomorrow at 10:00.', '/appointments/10007', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day', false),
(10002, 10004, 'It''s Your Turn', 'Doctor is ready to see you. Please proceed to the consultation room.', '/appointments/10003', CURRENT_TIMESTAMP - INTERVAL '5 minutes', CURRENT_TIMESTAMP - INTERVAL '5 minutes', false),
(10003, 10005, 'Appointment Pending Approval', 'Your blood sugar follow-up appointment is pending clinic confirmation.', '/appointments/10005', CURRENT_TIMESTAMP - INTERVAL '10 hours', CURRENT_TIMESTAMP - INTERVAL '10 hours', false),
(10004, 10001, 'Low Stock Alert', 'Salbutamol 100 mcg inhaler has 6 units remaining. Please reorder before today''s asthma appointments.', '/medicines/alerts', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours', false),
(10005, 10007, 'Batch Nearing Expiry', 'Omeprazole 20 mg capsule batch OMP-YGN-2605-A expires in 10 days.', '/medicines/alerts', CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours', false),
(10006, 10002, 'Manual Payment Proof Uploaded', 'WavePay proof for appointment APT-DEMO-AST-003 is waiting for verification.', '/payments/10003', CURRENT_TIMESTAMP - INTERVAL '30 minutes', CURRENT_TIMESTAMP - INTERVAL '30 minutes', false)
ON CONFLICT DO NOTHING;

-- Keep SERIAL sequences above explicit demo IDs.
SELECT setval(pg_get_serial_sequence('tbl_user', 'user_id'), GREATEST((SELECT COALESCE(MAX(user_id), 1) FROM tbl_user), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_user_token', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_user_token), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_user_role', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_user_role), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_patient', 'patient_id'), GREATEST((SELECT COALESCE(MAX(patient_id), 1) FROM tbl_patient), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_appointment', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_appointment), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_disease', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_disease), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_prescription', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_prescription), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_medicine_category', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_medicine_category), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_medicine', 'medicine_id'), GREATEST((SELECT COALESCE(MAX(medicine_id), 1) FROM tbl_medicine), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_medicine_batch', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_medicine_batch), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_prescription_item', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_prescription_item), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_prescription_item_schedule', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_prescription_item_schedule), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_payment', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_payment), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_permission', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_permission), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_role_permission', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_role_permission), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_notification', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_notification), 1), true);

COMMIT;
