-- ==========================================
-- Real-world demo data for SCMS
-- ==========================================
-- These rows are synthetic, but model realistic clinic workflows in Myanmar:
-- family patient profiles, same-day queue, completed consultations,
-- prescriptions, medicine FIFO batches, inventory alerts, payments, and notifications.
--
-- ID range 10001-10999 is reserved for this demo seed.

BEGIN;

-- Case 1: Clinic staff, standard demo users, and patient account owners
INSERT INTO tbl_user (user_id, name, mobile_no, email, password_hash, created_at, updated_at, delete_flag) VALUES
(10001, 'Dr. Thandar Hlaing', '09970001001', 'dr.thandar@scms.demo', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP, false),
(10002, 'Myo Clinic Reception', '09970001002', 'reception@scms.demo', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP, false),
(10003, 'Ko Aung Min', '09970001003', 'aung.min@example.test', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '34 days', CURRENT_TIMESTAMP, false),
(10004, 'Ma Hnin Ei', '09970001004', 'hnin.ei@example.test', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP, false),
(10005, 'U Zaw Lin', '09970001005', 'zaw.lin@example.test', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP, false),
(10006, 'Ko Pyae Sone', '09970001006', 'pyae.sone@example.test', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP, false),
(10007, 'SCMS Pharmacy Desk', '09970001007', 'pharmacy@scms.demo', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP, false),
(10008, 'SCMS Admin', '09979990001', 'admin@scms.demo', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP, false),
(10009, 'Dr. Kyaw Zin', '09770000002', 'doctor@scms.demo', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP, false),
(10010, 'SCMS Patient', '09979990003', 'user@scms.demo', 'demo-password-hash', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO tbl_user_role (id, user_id, role) VALUES
(10001, 10001, 'admin'),
(10002, 10002, 'admin'),
(10003, 10003, 'user'),
(10004, 10004, 'user'),
(10005, 10005, 'user'),
(10006, 10006, 'user'),
(10007, 10007, 'admin'),
(10008, 10008, 'owner'),
(10009, 10009, 'doctor'),
(10010, 10010, 'user'),
(10011, 10001, 'doctor'),
(10012, 10008, 'admin')
ON CONFLICT DO NOTHING;

-- Case 2: One user manages multiple family patient profiles
INSERT INTO tbl_patient (patient_id, user_id, name, mobile_no, email, date_of_birth, gender, blood_type, address, created_at, updated_at, delete_flag) VALUES
(10001, 10003, 'Ko Aung Min', '09970001003', 'aung.min@example.test', DATE '1988-06-12', 'male', 'B+', $${
  "ActualAddress": "No. 42, Baho Road, Sanchaung Township, Yangon",
  "Allergies": "No known drug allergies",
  "ChronicConditions": "Mild seasonal allergic rhinitis",
  "PastSurgeries": "Appendectomy in 2015",
  "FamilyHistory": "Father has hypertension",
  "VaccinationHistory": "COVID-19 primary series and booster; tetanus booster 2024"
}$$, CURRENT_TIMESTAMP - INTERVAL '34 days', CURRENT_TIMESTAMP, false),
(10002, 10003, 'Daw Mya Mya', '09970001013', 'mya.mya@example.test', DATE '1958-02-03', 'female', 'O+', $${
  "ActualAddress": "No. 42, Baho Road, Sanchaung Township, Yangon",
  "Allergies": "Penicillin rash reported in 1998",
  "ChronicConditions": "Type 2 diabetes mellitus; hypertension",
  "PastSurgeries": "Cataract surgery, left eye, 2021",
  "FamilyHistory": "Mother had stroke at age 70",
  "VaccinationHistory": "Influenza vaccine 2025; pneumococcal vaccine 2023"
}$$, CURRENT_TIMESTAMP - INTERVAL '33 days', CURRENT_TIMESTAMP, false),
(10003, 10003, 'Ma Thiri Aung', '09970001023', 'thiri.aung@example.test', DATE '2018-09-21', 'female', 'A+', $${
  "ActualAddress": "No. 42, Baho Road, Sanchaung Township, Yangon",
  "Allergies": "Egg allergy, mild",
  "ChronicConditions": "None",
  "PastSurgeries": "None",
  "FamilyHistory": "Grandmother has diabetes",
  "VaccinationHistory": "Routine childhood immunizations up to date"
}$$, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP, false),
(10004, 10004, 'Ma Hnin Ei', '09970001004', 'hnin.ei@example.test', DATE '1995-12-08', 'female', 'AB+', $${
  "ActualAddress": "Kan Street, Hlaing Township, Yangon",
  "Allergies": "Dust mite sensitivity",
  "ChronicConditions": "Intermittent asthma",
  "PastSurgeries": "None",
  "FamilyHistory": "Younger brother has asthma",
  "VaccinationHistory": "COVID-19 booster 2025"
}$$, CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP, false),
(10005, 10005, 'U Zaw Lin', '09970001005', 'zaw.lin@example.test', DATE '1972-04-18', 'male', 'O-', $${
  "ActualAddress": "Pearl Condo, Bahan Township, Yangon",
  "Allergies": "No known drug allergies",
  "ChronicConditions": "Prediabetes; dyslipidemia",
  "PastSurgeries": "None",
  "FamilyHistory": "Both parents had type 2 diabetes",
  "VaccinationHistory": "Hepatitis B completed; influenza vaccine 2025"
}$$, CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP, false),
(10006, 10006, 'Ko Pyae Sone', '09970001006', 'pyae.sone@example.test', DATE '2001-11-02', 'male', 'B+', $${
  "ActualAddress": "Student hostel, Kamayut Township, Yangon",
  "Allergies": "No known drug allergies",
  "ChronicConditions": "None",
  "PastSurgeries": "None",
  "FamilyHistory": "No significant family history",
  "VaccinationHistory": "COVID-19 primary series; hepatitis B dose 1"
}$$, CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP, false),
(10007, 10010, 'SCMS Patient', '09979990003', 'user@scms.demo', DATE '1990-05-14', 'male', 'O+', $${
  "ActualAddress": "No. 45, Bogyoke Road, Bahan, Yangon",
  "Allergies": "Penicillin",
  "ChronicConditions": "Mild Asthma",
  "PastSurgeries": "None",
  "FamilyHistory": "None",
  "VaccinationHistory": "COVID-19 completed"
}$$, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP, false),
(10008, 10010, 'Daw Khin Myo', '09979990012', 'khinmyo@family.demo', DATE '1965-08-20', 'female', 'B+', $${
  "ActualAddress": "No. 45, Bogyoke Road, Bahan, Yangon",
  "Allergies": "Sulfa drugs",
  "ChronicConditions": "Hypertension",
  "PastSurgeries": "None",
  "FamilyHistory": "Cardiovascular history",
  "VaccinationHistory": "COVID-19 booster; Influenza vaccine"
}$$, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP, false),
(10009, 10010, 'Ma Hnin Thandar', '09979990013', 'hninthandar@family.demo', DATE '1998-11-12', 'female', 'A+', $${
  "ActualAddress": "No. 45, Bogyoke Road, Bahan, Yangon",
  "Allergies": "None",
  "ChronicConditions": "None",
  "PastSurgeries": "None",
  "FamilyHistory": "None",
  "VaccinationHistory": "COVID-19 completed; Hepatitis B series"
}$$, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP, false),
(10010, 10010, 'U Kyaw Swar', '09979990014', 'kyawswar@family.demo', DATE '1978-04-18', 'male', 'O+', $${
  "ActualAddress": "No. 45, Bogyoke Road, Bahan, Yangon",
  "Allergies": "Aspirin",
  "ChronicConditions": "Type 2 Diabetes",
  "PastSurgeries": "None",
  "FamilyHistory": "None",
  "VaccinationHistory": "COVID-19 completed"
}$$, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP, false),
(10011, 10010, 'Daw Aye Aye Thin', '09979990015', 'ayeayethin@family.demo', DATE '1974-09-25', 'female', 'B+', $${
  "ActualAddress": "No. 45, Bogyoke Road, Bahan, Yangon",
  "Allergies": "None",
  "ChronicConditions": "Hyperlipidemia",
  "PastSurgeries": "None",
  "FamilyHistory": "None",
  "VaccinationHistory": "COVID-19 completed"
}$$, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP, false),
(10012, 10010, 'Mg Min Khant', '09979990016', 'minkhant@family.demo', DATE '2014-06-10', 'male', 'A+', $${
  "ActualAddress": "No. 45, Bogyoke Road, Bahan, Yangon",
  "Allergies": "Peanuts",
  "ChronicConditions": "Mild Asthma",
  "PastSurgeries": "None",
  "FamilyHistory": "None",
  "VaccinationHistory": "Childhood immunizations up to date"
}$$, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP, false)
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
(10009, 'APT-DEMO-DM-009', 10002, CURRENT_DATE - 45 + TIME '08:45', 'completed', 'Initial diabetes medication review after fasting glucose elevation.', CURRENT_TIMESTAMP - INTERVAL '46 days', CURRENT_TIMESTAMP - INTERVAL '45 days'),
(10010, 'APT-20260802-001', 10008, TIMESTAMP '2026-08-02 09:00:00', 'completed', 'Routine Health Checkup & Blood Pressure Monitoring', TIMESTAMP '2026-07-31 09:00:00', TIMESTAMP '2026-08-02 09:00:00'),
(10011, 'APT-20260805-002', 10007, TIMESTAMP '2026-08-05 10:30:00', 'completed', 'General Medical Consultation & Seasonal Allergy', TIMESTAMP '2026-08-03 10:30:00', TIMESTAMP '2026-08-05 10:30:00'),
(10012, 'APT-20260808-003', 10008, TIMESTAMP '2026-08-08 14:00:00', 'completed', 'Hypertension Medication Adjustment', TIMESTAMP '2026-08-06 14:00:00', TIMESTAMP '2026-08-08 14:00:00'),
(10013, 'APT-20260812-004', 10009, TIMESTAMP '2026-08-12 11:00:00', 'completed', 'Annual Health Screening & Blood Panel', TIMESTAMP '2026-08-10 11:00:00', TIMESTAMP '2026-08-12 11:00:00'),
(10014, 'APT-20260815-005', 10007, TIMESTAMP '2026-08-15 09:30:00', 'completed', 'Asthma Inhaler Refill & Spirometry Review', TIMESTAMP '2026-08-13 09:30:00', TIMESTAMP '2026-08-15 09:30:00'),
(10015, 'APT-20260819-006', 10009, TIMESTAMP '2026-08-19 15:30:00', 'completed', 'Seasonal Flu, Sore Throat & Viral Fever', TIMESTAMP '2026-08-17 15:30:00', TIMESTAMP '2026-08-19 15:30:00'),
(10016, 'APT-20260824-001', 10008, TIMESTAMP '2026-08-24 08:30:00', 'completed', 'Hypertension Routine Follow-up & BP Monitoring', TIMESTAMP '2026-08-22 08:30:00', TIMESTAMP '2026-08-24 08:30:00'),
(10017, 'APT-20260824-002', 10007, TIMESTAMP '2026-08-24 09:15:00', 'completed', 'General Medical Consultation & Seasonal Fever', TIMESTAMP '2026-08-22 09:15:00', TIMESTAMP '2026-08-24 09:15:00'),
(10018, 'APT-20260824-003', 10010, TIMESTAMP '2026-08-24 10:00:00', 'completed', 'Type 2 Diabetes Review & Fasting Blood Glucose', TIMESTAMP '2026-08-22 10:00:00', TIMESTAMP '2026-08-24 10:00:00'),
(10019, 'APT-20260824-004', 10009, TIMESTAMP '2026-08-24 11:00:00', 'completed', 'Dermatology & Allergic Rhinitis Consultation', TIMESTAMP '2026-08-22 11:00:00', TIMESTAMP '2026-08-24 11:00:00'),
(10020, 'APT-20260824-005', 10011, TIMESTAMP '2026-08-24 11:45:00', 'completed', 'Hyperlipidemia & Cardiovascular Screening', TIMESTAMP '2026-08-22 11:45:00', TIMESTAMP '2026-08-24 11:45:00'),
(10021, 'APT-20260824-006', 10012, TIMESTAMP '2026-08-24 13:30:00', 'completed', 'Pediatric Asthma Review & Inhaler Assessment', TIMESTAMP '2026-08-22 13:30:00', TIMESTAMP '2026-08-24 13:30:00'),
(10022, 'APT-20260824-007', 10008, TIMESTAMP '2026-08-24 14:30:00', 'confirmed', 'Routine Blood Pressure Follow-up & ECG Review', TIMESTAMP '2026-08-22 14:30:00', TIMESTAMP '2026-08-23 14:30:00'),
(10023, 'APT-20260824-008', 10007, TIMESTAMP '2026-08-24 15:15:00', 'confirmed', 'General Consultation & Prescription Renewal', TIMESTAMP '2026-08-23 15:15:00', TIMESTAMP '2026-08-23 15:15:00'),
(10024, 'APT-20260824-009', 10010, TIMESTAMP '2026-08-24 16:00:00', 'pending', 'Dietary Advice & Laboratory Panel Review', TIMESTAMP '2026-08-23 16:00:00', TIMESTAMP '2026-08-23 16:00:00'),
(10025, 'APT-20260824-010', 10009, TIMESTAMP '2026-08-24 16:45:00', 'cancelled', 'Patient requested cancellation due to work schedule', TIMESTAMP '2026-08-23 16:45:00', TIMESTAMP '2026-08-24 08:00:00'),
(10026, 'APT-20260825-008', 10007, TIMESTAMP '2026-08-25 10:30:00', 'confirmed', 'General Consultation & Prescription Renewal', TIMESTAMP '2026-08-23 10:30:00', TIMESTAMP '2026-08-23 10:30:00'),
(10027, 'APT-20260827-009', 10009, TIMESTAMP '2026-08-27 14:00:00', 'pending', 'Dermatology & Skin Rash Review', TIMESTAMP '2026-08-23 14:00:00', TIMESTAMP '2026-08-23 14:00:00'),
(10028, 'APT-20260829-010', 10007, TIMESTAMP '2026-08-29 11:00:00', 'pending', 'General Wellness & Diagnostic Lab Review', TIMESTAMP '2026-08-23 11:00:00', TIMESTAMP '2026-08-23 11:00:00')
ON CONFLICT DO NOTHING;

-- Case 6: Completed consultations with vitals, diagnosis notes, and lab requests
INSERT INTO tbl_prescription (id, appointment_id, patient_id, disease_id, weight_kg, blood_pressure_systolic, blood_pressure_diastolic, notes, created_at, updated_at, delete_flag) VALUES
(10001, 10001, 10001, 10001, 68.5, 118, 78, $${
  "ActualNotes": "Likely viral upper respiratory infection. Advised fluids, rest, and return if fever persists beyond three days.",
  "TemperatureC": 38.2,
  "PulseBpm": 92,
  "Spo2Percent": 98,
  "HeightCm": 170.0,
  "Bmi": 23.7,
  "LabTestRequests": "CBC only if fever continues for 48 hours"
}$$, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day', false),
(10002, 10002, 10002, 10003, 57.0, 148, 92, $${
  "ActualNotes": "Blood pressure above target. Reviewed salt intake, home BP log, and medication adherence.",
  "TemperatureC": 36.7,
  "PulseBpm": 78,
  "Spo2Percent": 99,
  "HeightCm": 154.0,
  "Bmi": 24.0,
  "LabTestRequests": "Fasting blood glucose, HbA1c, urine albumin-creatinine ratio"
}$$, CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days', false),
(10003, 10009, 10002, 10002, 58.0, 142, 88, $${
  "ActualNotes": "Started structured diabetes follow-up. Discussed diet, walking plan, and warning signs of hypoglycemia.",
  "TemperatureC": 36.8,
  "PulseBpm": 82,
  "Spo2Percent": 98,
  "HeightCm": 154.0,
  "Bmi": 24.5,
  "LabTestRequests": "HbA1c in three months; lipid profile"
}$$, CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days', false)
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
(10004, 10009, 10003, 18500.00, 925.00, 0.00, 'card', 'paid', NULL, CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days'),
(10010, 10010, NULL, 25000.00, 1250.00, 0.00, 'kpay', 'paid', NULL, TIMESTAMP '2026-08-02 09:45:00', TIMESTAMP '2026-08-02 09:45:00'),
(10011, 10011, NULL, 30000.00, 1500.00, 0.00, 'wavepay', 'paid', NULL, TIMESTAMP '2026-08-05 11:15:00', TIMESTAMP '2026-08-05 11:15:00'),
(10012, 10013, NULL, 18000.00, 900.00, 0.00, 'cash', 'paid', NULL, TIMESTAMP '2026-08-12 11:45:00', TIMESTAMP '2026-08-12 11:45:00'),
(10013, 10016, NULL, 35000.00, 1750.00, 0.00, 'kpay', 'paid', NULL, TIMESTAMP '2026-08-24 09:00:00', TIMESTAMP '2026-08-24 09:00:00'),
(10014, 10017, NULL, 25000.00, 1250.00, 0.00, 'wavepay', 'paid', NULL, TIMESTAMP '2026-08-24 09:45:00', TIMESTAMP '2026-08-24 09:45:00'),
(10015, 10018, NULL, 45000.00, 2250.00, 0.00, 'cash', 'paid', NULL, TIMESTAMP '2026-08-24 10:30:00', TIMESTAMP '2026-08-24 10:30:00'),
(10016, 10019, NULL, 20000.00, 1000.00, 0.00, 'cbpay', 'paid', NULL, TIMESTAMP '2026-08-24 11:30:00', TIMESTAMP '2026-08-24 11:30:00'),
(10017, 10020, NULL, 55000.00, 2750.00, 0.00, 'kpay', 'paid', NULL, TIMESTAMP '2026-08-24 12:15:00', TIMESTAMP '2026-08-24 12:15:00'),
(10018, 10021, NULL, 30000.00, 1500.00, 0.00, 'cash', 'paid', NULL, TIMESTAMP '2026-08-24 14:00:00', TIMESTAMP '2026-08-24 14:00:00'),
(10019, 10022, NULL, 22000.00, 1100.00, 0.00, 'kpay', 'pending', NULL, NULL, TIMESTAMP '2026-08-24 14:30:00'),
(10020, 10023, NULL, 28000.00, 1400.00, 0.00, 'wavepay', 'pending', NULL, NULL, TIMESTAMP '2026-08-24 15:15:00'),
(10021, 10024, NULL, 32000.00, 1600.00, 0.00, 'cbpay', 'pending', NULL, NULL, TIMESTAMP '2026-08-24 16:00:00'),
(10022, 10026, NULL, 35000.00, 1750.00, 0.00, 'cbpay', 'pending', NULL, NULL, TIMESTAMP '2026-08-23 10:30:00'),
(10027, 10012, NULL, 20000.00, 1000.00, 0.00, 'kpay', 'paid', NULL, TIMESTAMP '2026-08-08 14:30:00', TIMESTAMP '2026-08-08 14:30:00'),
(10028, 10014, NULL, 35000.00, 1750.00, 0.00, 'wavepay', 'paid', NULL, TIMESTAMP '2026-08-15 10:15:00', TIMESTAMP '2026-08-15 10:15:00'),
(10029, 10015, NULL, 25000.00, 1250.00, 0.00, 'cash', 'paid', NULL, TIMESTAMP '2026-08-19 16:15:00', TIMESTAMP '2026-08-19 16:15:00')
ON CONFLICT DO NOTHING;

-- Case 8: Full standard system permissions (50 system permissions)
INSERT INTO tbl_permission (id, menu, action) VALUES
(10001, 'Appointments', 'View'),
(10002, 'Appointments', 'Create'),
(10003, 'Appointments', 'Update'),
(10004, 'Appointments', 'UpdateStatus'),
(10005, 'Appointments', 'Delete'),
(10006, 'Patients', 'View'),
(10007, 'Patients', 'Create'),
(10008, 'Patients', 'Update'),
(10009, 'Patients', 'Delete'),
(10010, 'Patients', 'ExportPdf'),
(10011, 'Prescriptions', 'View'),
(10012, 'Prescriptions', 'Create'),
(10013, 'Prescriptions', 'Update'),
(10014, 'Prescriptions', 'Delete'),
(10015, 'Prescriptions', 'ExportPdf'),
(10016, 'Medicines', 'View'),
(10017, 'Medicines', 'Create'),
(10018, 'Medicines', 'Update'),
(10019, 'Medicines', 'Delete'),
(10020, 'Medicines', 'AdjustStock'),
(10021, 'Payments', 'View'),
(10022, 'Payments', 'Create'),
(10023, 'Payments', 'Update'),
(10024, 'Payments', 'Delete'),
(10025, 'Payments', 'ExportPdf'),
(10026, 'FollowUps', 'View'),
(10027, 'FollowUps', 'Create'),
(10028, 'FollowUps', 'Update'),
(10029, 'FollowUps', 'Delete'),
(10030, 'Diseases', 'View'),
(10031, 'Diseases', 'Create'),
(10032, 'Diseases', 'Update'),
(10033, 'Diseases', 'Delete'),
(10034, 'Notifications', 'View'),
(10035, 'Notifications', 'Create'),
(10036, 'Notifications', 'Update'),
(10037, 'Notifications', 'Delete'),
(10038, 'Dashboards', 'View'),
(10039, 'Reports', 'View'),
(10040, 'Reports', 'ExportPdf'),
(10041, 'Roles', 'View'),
(10042, 'Roles', 'Create'),
(10043, 'Roles', 'Update'),
(10044, 'Roles', 'Delete'),
(10045, 'Permissions', 'View'),
(10046, 'Users', 'View'),
(10047, 'Users', 'Create'),
(10048, 'Users', 'Update'),
(10049, 'Users', 'Delete'),
(10050, 'Mcp', 'Access')
ON CONFLICT DO NOTHING;

-- Map role permissions dynamically for all roles
-- 1. Owner & Admin roles get ALL permissions
INSERT INTO tbl_role_permission (role_id, permission_id)
SELECT ur.id, p.id
FROM tbl_user_role ur
CROSS JOIN tbl_permission p
WHERE lower(ur.role) IN ('admin', 'owner')
ON CONFLICT DO NOTHING;

-- 2. Doctor roles get clinical and consultation permissions
INSERT INTO tbl_role_permission (role_id, permission_id)
SELECT ur.id, p.id
FROM tbl_user_role ur
CROSS JOIN tbl_permission p
WHERE lower(ur.role) = 'doctor'
  AND (lower(p.menu) || '.' || lower(p.action)) IN (
    'appointments.view', 'appointments.create', 'appointments.update', 'appointments.updatestatus', 'appointments.delete',
    'patients.view', 'patients.create', 'patients.update', 'patients.exportpdf',
    'prescriptions.view', 'prescriptions.create', 'prescriptions.update', 'prescriptions.delete', 'prescriptions.exportpdf',
    'medicines.view',
    'followups.view', 'followups.create', 'followups.update', 'followups.delete',
    'diseases.view', 'diseases.create', 'diseases.update',
    'notifications.view', 'notifications.create', 'notifications.update',
    'dashboards.view',
    'reports.view', 'reports.exportpdf',
    'mcp.access'
  )
ON CONFLICT DO NOTHING;

-- 3. Patient / User roles get patient portal permissions
INSERT INTO tbl_role_permission (role_id, permission_id)
SELECT ur.id, p.id
FROM tbl_user_role ur
CROSS JOIN tbl_permission p
WHERE lower(ur.role) = 'user'
  AND (lower(p.menu) || '.' || lower(p.action)) IN (
    'appointments.view', 'appointments.create',
    'patients.view',
    'prescriptions.view',
    'payments.view', 'payments.create',
    'notifications.view', 'notifications.update',
    'dashboards.view'
  )
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
