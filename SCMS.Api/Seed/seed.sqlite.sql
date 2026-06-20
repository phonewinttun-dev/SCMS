-- SQLite demo seed for local SCMS patient-flow smoke tests.
-- ID range 10001-10999 is reserved for this demo seed.

BEGIN TRANSACTION;

INSERT OR IGNORE INTO tbl_user (user_id, name, mobile_no, email, password_hash, created_at, updated_at, delete_flag) VALUES
(10001, 'Dr. Thandar Hlaing', '09970001001', 'dr.thandar@scms.demo', 'demo-password-hash', datetime('now', '-45 days'), datetime('now'), 0),
(10002, 'Myo Clinic Reception', '09970001002', 'reception@scms.demo', 'demo-password-hash', datetime('now', '-45 days'), datetime('now'), 0),
(10003, 'Ko Aung Min', '09970001003', 'aung.min@example.test', 'demo-password-hash', datetime('now', '-34 days'), datetime('now'), 0),
(10004, 'Ma Hnin Ei', '09970001004', 'hnin.ei@example.test', 'demo-password-hash', datetime('now', '-25 days'), datetime('now'), 0),
(10005, 'U Zaw Lin', '09970001005', 'zaw.lin@example.test', 'demo-password-hash', datetime('now', '-20 days'), datetime('now'), 0),
(10006, 'Ko Pyae Sone', '09970001006', 'pyae.sone@example.test', 'demo-password-hash', datetime('now', '-12 days'), datetime('now'), 0),
(10007, 'SCMS Pharmacy Desk', '09970001007', 'pharmacy@scms.demo', 'demo-password-hash', datetime('now', '-40 days'), datetime('now'), 0);

INSERT OR IGNORE INTO tbl_user_role (id, user_id, role) VALUES
(10001, 10001, 'admin'),
(10002, 10002, 'admin'),
(10003, 10003, 'user'),
(10004, 10004, 'user'),
(10005, 10005, 'user'),
(10006, 10006, 'user'),
(10007, 10007, 'admin');

INSERT OR IGNORE INTO tbl_patient (patient_id, user_id, name, mobile_no, email, date_of_birth, gender, blood_type, actual_address, allergies, chronic_conditions, past_surgeries, family_history, vaccination_history, created_at, updated_at, delete_flag) VALUES
(10001, 10003, 'Ko Aung Min', '09970001003', 'aung.min@example.test', '1988-06-12', 'male', 'B+', 'No. 42, Baho Road, Sanchaung Township, Yangon', 'No known drug allergies', 'Mild seasonal allergic rhinitis', 'Appendectomy in 2015', 'Father has hypertension', 'COVID-19 primary series and booster; tetanus booster 2024', datetime('now', '-34 days'), datetime('now'), 0),
(10002, 10003, 'Daw Mya Mya', '09970001013', 'mya.mya@example.test', '1958-02-03', 'female', 'O+', 'No. 42, Baho Road, Sanchaung Township, Yangon', 'Penicillin rash reported in 1998', 'Type 2 diabetes mellitus; hypertension', 'Cataract surgery, left eye, 2021', 'Mother had stroke at age 70', 'Influenza vaccine 2025; pneumococcal vaccine 2023', datetime('now', '-33 days'), datetime('now'), 0),
(10003, 10003, 'Ma Thiri Aung', '09970001023', 'thiri.aung@example.test', '2018-09-21', 'female', 'A+', 'No. 42, Baho Road, Sanchaung Township, Yangon', 'Egg allergy, mild', 'None', 'None', 'Grandmother has diabetes', 'Routine childhood immunizations up to date', datetime('now', '-30 days'), datetime('now'), 0),
(10004, 10004, 'Ma Hnin Ei', '09970001004', 'hnin.ei@example.test', '1995-12-08', 'female', 'AB+', 'Kan Street, Hlaing Township, Yangon', 'Dust mite sensitivity', 'Intermittent asthma', 'None', 'Younger brother has asthma', 'COVID-19 booster 2025', datetime('now', '-25 days'), datetime('now'), 0),
(10005, 10005, 'U Zaw Lin', '09970001005', 'zaw.lin@example.test', '1972-04-18', 'male', 'O-', 'Pearl Condo, Bahan Township, Yangon', 'No known drug allergies', 'Prediabetes; dyslipidemia', 'None', 'Both parents had type 2 diabetes', 'Hepatitis B completed; influenza vaccine 2025', datetime('now', '-20 days'), datetime('now'), 0),
(10006, 10006, 'Ko Pyae Sone', '09970001006', 'pyae.sone@example.test', '2001-11-02', 'male', 'B+', 'Student hostel, Kamayut Township, Yangon', 'No known drug allergies', 'None', 'None', 'No significant family history', 'COVID-19 primary series; hepatitis B dose 1', datetime('now', '-12 days'), datetime('now'), 0);

INSERT OR IGNORE INTO tbl_disease (id, name, description, created_at, updated_at, delete_flag) VALUES
(10001, 'Acute Upper Respiratory Infection', 'Fever, sore throat, cough, and congestion without danger signs.', datetime('now', '-40 days'), datetime('now'), 0),
(10002, 'Type 2 Diabetes Mellitus', 'Ongoing glucose management and medication adherence review.', datetime('now', '-40 days'), datetime('now'), 0),
(10003, 'Essential Hypertension', 'Blood pressure monitoring and long-term cardiovascular risk control.', datetime('now', '-40 days'), datetime('now'), 0),
(10004, 'Allergic Rhinitis', 'Sneezing, rhinorrhea, and nasal congestion triggered by allergens.', datetime('now', '-40 days'), datetime('now'), 0),
(10005, 'Acute Gastroenteritis', 'Vomiting or diarrhea requiring hydration assessment.', datetime('now', '-40 days'), datetime('now'), 0),
(10006, 'Mild Asthma Exacerbation', 'Wheeze and cough requiring inhaler technique review.', datetime('now', '-40 days'), datetime('now'), 0);

INSERT OR IGNORE INTO tbl_medicine_category (id, name) VALUES
(10001, 'Analgesics and Antipyretics'),
(10002, 'Antibiotics'),
(10003, 'Antihistamines'),
(10004, 'Gastrointestinal'),
(10005, 'Respiratory'),
(10006, 'Chronic Disease'),
(10007, 'Supplements and ORS');

INSERT OR IGNORE INTO tbl_medicine (medicine_id, category_id, name, description, image_url, image_id, unit_price, created_at, updated_at, delete_flag) VALUES
(10001, 10001, 'Paracetamol 500 mg tablet', 'First-line fever and mild pain relief.', NULL, NULL, 150.00, datetime('now', '-39 days'), datetime('now'), 0),
(10003, 10003, 'Cetirizine 10 mg tablet', 'Non-sedating antihistamine for allergic rhinitis and urticaria.', NULL, NULL, 120.00, datetime('now', '-39 days'), datetime('now'), 0),
(10004, 10007, 'Oral Rehydration Salts sachet', 'Oral rehydration support for diarrhea and vomiting.', NULL, NULL, 500.00, datetime('now', '-39 days'), datetime('now'), 0),
(10005, 10005, 'Salbutamol 100 mcg inhaler', 'Short-acting bronchodilator for asthma rescue use.', NULL, NULL, 6500.00, datetime('now', '-39 days'), datetime('now'), 0),
(10006, 10006, 'Metformin 500 mg tablet', 'First-line oral therapy for type 2 diabetes mellitus.', NULL, NULL, 200.00, datetime('now', '-39 days'), datetime('now'), 0),
(10007, 10006, 'Amlodipine 5 mg tablet', 'Calcium-channel blocker for hypertension management.', NULL, NULL, 250.00, datetime('now', '-39 days'), datetime('now'), 0);

INSERT OR IGNORE INTO tbl_medicine_batch (id, med_id, batch_no, quantity, expiry_date, received_date, supplier_name, status, created_at, updated_at, delete_flag) VALUES
(10001, 10001, 'PCM-YGN-2601-A', 120, date('now', '+90 days'), date('now', '-60 days'), 'Yangon Pharma Distribution', 'active', datetime('now', '-60 days'), datetime('now'), 0),
(10002, 10003, 'CTZ-YGN-2602-A', 80, date('now', '+75 days'), date('now', '-58 days'), 'Yangon Pharma Distribution', 'active', datetime('now', '-58 days'), datetime('now'), 0),
(10003, 10004, 'ORS-YGN-2602-A', 50, date('now', '+180 days'), date('now', '-58 days'), 'Mandalay Medical Supply', 'active', datetime('now', '-58 days'), datetime('now'), 0),
(10004, 10005, 'SLB-YGN-2603-A', 6, date('now', '+25 days'), date('now', '-57 days'), 'Shwe Medical Wholesale', 'active', datetime('now', '-57 days'), datetime('now'), 0),
(10005, 10006, 'MTF-YGN-2604-A', 140, date('now', '+365 days'), date('now', '-56 days'), 'CarePlus Distribution', 'active', datetime('now', '-56 days'), datetime('now'), 0),
(10006, 10007, 'AML-YGN-2604-A', 100, date('now', '+365 days'), date('now', '-56 days'), 'CarePlus Distribution', 'active', datetime('now', '-56 days'), datetime('now'), 0);

INSERT OR IGNORE INTO tbl_appointment (id, appointment_code, patient_id, datetime, status, notes, created_at, updated_at) VALUES
(10001, 'APT-DEMO-URI-001', 10001, datetime('now', '-1 day'), 'completed', 'Fever, sore throat, and dry cough for two days.', datetime('now', '-2 days'), datetime('now', '-1 day')),
(10002, 'APT-DEMO-HTN-002', 10002, datetime('now', '-14 days'), 'completed', 'Monthly hypertension and diabetes follow-up.', datetime('now', '-15 days'), datetime('now', '-14 days')),
(10003, 'APT-DEMO-AST-003', 10004, datetime('now', '+10 minutes'), 'confirmed', 'Wheezing after dust exposure; inhaler almost empty.', datetime('now', '-2 days'), datetime('now', '-1 hour')),
(10004, 'APT-DEMO-CHD-004', 10003, datetime('now', '+25 minutes'), 'pending', 'Runny nose and mild fever since last night.', datetime('now', '-18 hours'), datetime('now', '-18 hours')),
(10005, 'APT-DEMO-DM-005', 10005, datetime('now', '+40 minutes'), 'pending', 'Blood sugar follow-up and foot numbness discussion.', datetime('now', '-10 hours'), datetime('now', '-10 hours')),
(10007, 'APT-DEMO-FUP-007', 10002, datetime('now', '+1 day', '+10 hours'), 'confirmed', 'Follow-up after medication adjustment.', datetime('now', '-5 days'), datetime('now', '-1 day')),
(10008, 'APT-DEMO-LAB-008', 10001, datetime('now', '+1 day', '+11 hours'), 'pending', 'Review dengue NS1 and CBC lab results.', datetime('now', '-3 hours'), datetime('now', '-3 hours'));

INSERT OR IGNORE INTO tbl_prescription (id, appointment_id, patient_id, disease_id, weight_kg, blood_pressure_systolic, blood_pressure_diastolic, actual_notes, temperature_c, pulse_bpm, spo2_percent, height_cm, bmi, lab_test_requests, created_at, updated_at, delete_flag) VALUES
(10001, 10001, 10001, 10001, 68.5, 118, 78, 'Likely viral upper respiratory infection. Advised fluids, rest, and return if fever persists beyond three days.', 38.2, 92, 98, 170.0, 23.7, 'CBC only if fever continues for 48 hours', datetime('now', '-1 day'), datetime('now', '-1 day'), 0),
(10002, 10002, 10002, 10003, 57.0, 148, 92, 'Blood pressure above target. Reviewed salt intake, home BP log, and medication adherence.', 36.7, 78, 99, 154.0, 24.0, 'Fasting blood glucose, HbA1c, urine albumin-creatinine ratio', datetime('now', '-14 days'), datetime('now', '-14 days'), 0);

INSERT OR IGNORE INTO tbl_prescription_item (id, prescription_id, medicine_id, medicine_batch_id, dosage, days, quantity, instruction, created_at, updated_at, delete_flag) VALUES
(10001, 10001, 10001, 10001, '500 mg', 3, 9, 'Take one tablet every 8 hours only while fever or body ache is present.', datetime('now', '-1 day'), datetime('now', '-1 day'), 0),
(10002, 10001, 10003, 10002, '10 mg', 3, 3, 'Take one tablet at night for sneezing and runny nose.', datetime('now', '-1 day'), datetime('now', '-1 day'), 0),
(10003, 10001, 10004, 10003, '1 sachet', 2, 2, 'Dissolve one sachet in clean water if appetite is poor.', datetime('now', '-1 day'), datetime('now', '-1 day'), 0),
(10004, 10002, 10007, 10006, '5 mg', 30, 30, 'Take one tablet every morning and keep a home blood pressure log.', datetime('now', '-14 days'), datetime('now', '-14 days'), 0),
(10005, 10002, 10006, 10005, '500 mg', 30, 60, 'Take one tablet twice daily with meals.', datetime('now', '-14 days'), datetime('now', '-14 days'), 0);

INSERT OR IGNORE INTO tbl_prescription_item_schedule (id, prescription_item_id, start_date, end_date, dose_time, dose_quantity, dose_unit, meal_timing, route, interval_hours, interval_days, day_of_week, is_as_needed, body_site, note, created_at, updated_at, delete_flag) VALUES
(10001, 10001, date('now', '-1 day'), date('now', '+1 day'), 'custom', 1.00, 'tablet', 'after_meal', 'oral', 8, NULL, NULL, 1, NULL, 'Stop once fever has settled for 24 hours.', datetime('now', '-1 day'), datetime('now', '-1 day'), 0),
(10002, 10002, date('now', '-1 day'), date('now', '+1 day'), 'night', 1.00, 'tablet', 'after_meal', 'oral', NULL, 1, NULL, 0, NULL, 'May cause drowsiness.', datetime('now', '-1 day'), datetime('now', '-1 day'), 0),
(10003, 10003, date('now', '-1 day'), date('now', '+1 day'), 'custom', 1.00, 'sachet', 'anytime', 'oral', NULL, NULL, NULL, 1, NULL, 'Use after loose stool, heavy sweating, or poor fluid intake.', datetime('now', '-1 day'), datetime('now', '-1 day'), 0),
(10004, 10004, date('now', '-14 days'), date('now', '+15 days'), 'morning', 1.00, 'tablet', 'after_meal', 'oral', NULL, 1, NULL, 0, NULL, 'Check blood pressure twice weekly.', datetime('now', '-14 days'), datetime('now', '-14 days'), 0),
(10005, 10005, date('now', '-14 days'), date('now', '+15 days'), 'morning', 1.00, 'tablet', 'with_meal', 'oral', NULL, 1, NULL, 0, NULL, 'First daily dose.', datetime('now', '-14 days'), datetime('now', '-14 days'), 0),
(10006, 10005, date('now', '-14 days'), date('now', '+15 days'), 'evening', 1.00, 'tablet', 'with_meal', 'oral', NULL, 1, NULL, 0, NULL, 'Second daily dose.', datetime('now', '-14 days'), datetime('now', '-14 days'), 0);

INSERT OR IGNORE INTO tbl_payment (id, appointment_id, prescription_id, amount, tax, charges, payment_method, payment_status, payment_screenshot, paid_at, updated_at) VALUES
(10001, 10001, 10001, 17500.00, 875.00, 500.00, 'kbzpay', 'paid', NULL, datetime('now', '-1 day'), datetime('now', '-1 day')),
(10002, 10002, 10002, 22500.00, 1125.00, 0.00, 'cash', 'paid', NULL, datetime('now', '-14 days'), datetime('now', '-14 days')),
(10003, 10003, NULL, 10000.00, 500.00, 0.00, 'wavepay', 'pending', 'https://example.test/payment-proofs/apt-demo-ast-003.png', NULL, datetime('now', '-30 minutes')),
(10004, 10008, NULL, 12500.00, 625.00, 0.00, 'kbzpay', 'pending', NULL, NULL, datetime('now', '-3 hours'));

INSERT OR IGNORE INTO tbl_follow_up (id, patient_id, appointment_id, prescription_id, due_at, recommendation, status, completed_at, created_at, updated_at, delete_flag) VALUES
(10001, 10002, 10002, 10002, datetime('now', '+7 days'), 'Review home blood pressure and fasting glucose results.', 'pending', NULL, datetime('now', '-14 days'), datetime('now'), 0);

INSERT OR IGNORE INTO tbl_permission (id, menu, action) VALUES
(10001, 'Dashboard', 'ViewDoctorDashboard'),
(10002, 'Appointments', 'ViewQueue'),
(10003, 'Appointments', 'UpdateStatus'),
(10004, 'Patients', 'ViewMedicalSummary'),
(10005, 'Prescriptions', 'Create'),
(10006, 'Medicines', 'ViewInventoryAlerts'),
(10007, 'Payments', 'VerifyManualProof');

INSERT OR IGNORE INTO tbl_role_permission (id, role_id, permission_id) VALUES
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
(10011, 10007, 10006);

INSERT OR IGNORE INTO tbl_notification (id, user_id, title, description, action_route, created_at, updated_at, delete_flag) VALUES
(10001, 10003, 'Appointment Confirmed', 'Daw Mya Mya has a confirmed follow-up appointment tomorrow at 10:00.', '/appointments/10007', datetime('now', '-1 day'), datetime('now', '-1 day'), 0),
(10002, 10004, 'It is Your Turn', 'Doctor is ready to see you. Please proceed to the consultation room.', '/appointments/10003', datetime('now', '-5 minutes'), datetime('now', '-5 minutes'), 0),
(10003, 10005, 'Appointment Pending Approval', 'Your blood sugar follow-up appointment is pending clinic confirmation.', '/appointments/10005', datetime('now', '-10 hours'), datetime('now', '-10 hours'), 0),
(10004, 10001, 'Low Stock Alert', 'Salbutamol 100 mcg inhaler has 6 units remaining. Please reorder before today appointments.', '/medicines/alerts', datetime('now', '-2 hours'), datetime('now', '-2 hours'), 0),
(10005, 10003, 'Invoice Pending', 'A pending invoice is available for your upcoming appointment.', '/billing/10004', datetime('now', '-2 hours'), datetime('now', '-2 hours'), 0);

COMMIT;
