-- ==========================================
-- PostgreSQL Schema for Project SCMS (Modified)
-- Removed: Tbl_Lab_Report table and all associated constraints
-- ==========================================

-- 1. Create Tables
-- ------------------------------------------

CREATE TABLE Tbl_User (
                          user_id SERIAL PRIMARY KEY,
                          name VARCHAR(255) NOT NULL,
                          mobile_no VARCHAR(50) UNIQUE,
                          email VARCHAR(100) UNIQUE,
                          password_hash VARCHAR(255) NOT NULL,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP,
                          delete_flag BOOLEAN
);

CREATE TABLE Tbl_User_Token (
                                id SERIAL PRIMARY KEY,
                                user_id INT NOT NULL,
                                token_hash VARCHAR(500) NOT NULL,
                                expires_at TIMESTAMP NOT NULL,
                                revoked BOOLEAN NOT NULL DEFAULT FALSE,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Tbl_User_Role (
                               id SERIAL PRIMARY KEY,
                               user_id INT NOT NULL,
                               role VARCHAR(50) NOT NULL
);

CREATE TABLE Tbl_Patient (
                             patient_id SERIAL PRIMARY KEY,
                             user_id INT NOT NULL,
                             name VARCHAR(255) NOT NULL,
                             mobile_no VARCHAR(50),
                             email VARCHAR(100),
                             date_of_birth DATE,
                             gender VARCHAR(20),
                             blood_type VARCHAR(5),
                             actual_address TEXT,
                             allergies TEXT,
                             chronic_conditions TEXT,
                             past_surgeries TEXT,
                             family_history TEXT,
                             vaccination_history TEXT,
                             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                             updated_at TIMESTAMP,
                             delete_flag BOOLEAN
);

CREATE TABLE Tbl_Appointment (
                                 id SERIAL PRIMARY KEY,
                                 appointment_code VARCHAR(50) NOT NULL UNIQUE,
                                 patient_id INT NOT NULL,
                                 datetime TIMESTAMP NOT NULL,
                                 status VARCHAR(50) NOT NULL,
                                 notes TEXT,
                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 updated_at TIMESTAMP
);

CREATE TABLE Tbl_Disease (
                             id SERIAL PRIMARY KEY,
                             name VARCHAR(255) NOT NULL UNIQUE,
                             description VARCHAR(255),
                             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                             updated_at TIMESTAMP,
                             delete_flag BOOLEAN
);

CREATE TABLE Tbl_Prescription (
                                  id SERIAL PRIMARY KEY,
                                  appointment_id INT NOT NULL,
                                  patient_id INT NOT NULL,
                                  disease_id INT,
                                  weight_kg DOUBLE PRECISION,
                                  blood_pressure_systolic INT,
                                  blood_pressure_diastolic INT,
                                  actual_notes TEXT,
                                  temperature_c DOUBLE PRECISION,
                                  pulse_bpm INT,
                                  spo2_percent INT,
                                  height_cm DOUBLE PRECISION,
                                  bmi DOUBLE PRECISION,
                                  lab_test_requests TEXT,
                                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                  updated_at TIMESTAMP,
                                  delete_flag BOOLEAN
);

CREATE TABLE Tbl_Medicine_Category (
                                       id SERIAL PRIMARY KEY,
                                       name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE Tbl_Medicine (
                              medicine_id SERIAL PRIMARY KEY,
                              category_id INT,
                              name VARCHAR(255) NOT NULL,
                              description TEXT,
                              image_url VARCHAR(500), 
                              image_id VARCHAR(255),
                              unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                              updated_at TIMESTAMP,
                              delete_flag BOOLEAN
);

CREATE TABLE Tbl_Medicine_Batch (
                                    id SERIAL PRIMARY KEY,
                                    med_id INT NOT NULL,
                                    batch_no VARCHAR(100) NOT NULL,
                                    quantity INT NOT NULL DEFAULT 0,
                                    expiry_date DATE NOT NULL,
                                    received_date DATE,
                                    supplier_name VARCHAR(255),
                                    status VARCHAR(50) NOT NULL,
                                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                    updated_at TIMESTAMP,
                                    delete_flag BOOLEAN
);

CREATE TABLE Tbl_Prescription_Item (
                                       id SERIAL PRIMARY KEY,
                                       prescription_id INT NOT NULL,
                                       medicine_id INT NOT NULL,
                                       medicine_batch_id INT,
                                       dosage VARCHAR(100),
                                       days INT NOT NULL,
                                       quantity INT NOT NULL,
                                       instruction TEXT,
                                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                       updated_at TIMESTAMP,
                                       delete_flag BOOLEAN
);

CREATE TABLE Tbl_Prescription_Item_Schedule (
                                                id SERIAL PRIMARY KEY,
                                                prescription_item_id INT NOT NULL,
                                                start_date DATE,
                                                end_date DATE,
                                                dose_time VARCHAR(50),
                                                dose_quantity DECIMAL(10,2) NOT NULL,
                                                dose_unit VARCHAR(50),
                                                meal_timing VARCHAR(50),
                                                route VARCHAR(50),
                                                interval_hours INT,
                                                interval_days INT,
                                                day_of_week VARCHAR(20),
                                                is_as_needed BOOLEAN DEFAULT FALSE,
                                                body_site VARCHAR(100),
                                                note TEXT,
                                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                                updated_at TIMESTAMP,
                                                delete_flag BOOLEAN
);

CREATE TABLE Tbl_Payment (
                             id SERIAL PRIMARY KEY,
                             appointment_id INT NOT NULL,
                             prescription_id INT,
                             amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                             tax DECIMAL(10,2) NOT NULL DEFAULT 0,
                             charges DECIMAL(10,2) NOT NULL DEFAULT 0,
                             payment_method VARCHAR(50) NOT NULL,
                             payment_status VARCHAR(50) NOT NULL,
                             payment_screenshot VARCHAR(500),
                             paid_at TIMESTAMP,
                             updated_at TIMESTAMP
);

CREATE TABLE Tbl_Permission (
                                id SERIAL PRIMARY KEY,
                                menu VARCHAR(100) NOT NULL,
                                action VARCHAR(100) NOT NULL
);

CREATE TABLE Tbl_Role_Permission (
                                     id SERIAL PRIMARY KEY,
                                     role_id INT NOT NULL,
                                     permission_id INT NOT NULL
);

CREATE TABLE Tbl_Notification (
                                  id SERIAL PRIMARY KEY,
                                  user_id INT,
                                  title VARCHAR(255) NOT NULL,
                                  description TEXT,
                                  action_route VARCHAR(255),
                                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                  updated_at TIMESTAMP,
                                  delete_flag BOOLEAN
);

CREATE TABLE Tbl_Prescription_Template (
                                           id SERIAL PRIMARY KEY,
                                           name VARCHAR(255) NOT NULL,
                                           disease_id INT NOT NULL,
                                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                           updated_at TIMESTAMP,
                                           delete_flag BOOLEAN
);

CREATE TABLE Tbl_Prescription_Template_Item (
                                                id SERIAL PRIMARY KEY,
                                                template_id INT NOT NULL,
                                                medicine_id INT NOT NULL,
                                                dosage VARCHAR(100),
                                                days INT NOT NULL,
                                                quantity INT NOT NULL,
                                                instruction TEXT,
                                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                                delete_flag BOOLEAN
);

CREATE TABLE Tbl_Follow_Up (
                               id SERIAL PRIMARY KEY,
                               patient_id INT NOT NULL,
                               appointment_id INT,
                               prescription_id INT,
                               due_at TIMESTAMP NOT NULL,
                               recommendation TEXT NOT NULL,
                               status VARCHAR(50) NOT NULL,
                               completed_at TIMESTAMP,
                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                               updated_at TIMESTAMP,
                               delete_flag BOOLEAN
);

-- 2. Create Unique Constraints (Indexes)
-- ------------------------------------------

ALTER TABLE Tbl_User_Role
    ADD CONSTRAINT uq_user_role UNIQUE (user_id, role);

ALTER TABLE Tbl_Medicine_Batch
    ADD CONSTRAINT uq_med_batch UNIQUE (med_id, batch_no);

ALTER TABLE Tbl_Permission
    ADD CONSTRAINT uq_menu_action UNIQUE (menu, action);

ALTER TABLE Tbl_Role_Permission
    ADD CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id);


-- 3. Create Foreign Key Relationships
-- ------------------------------------------

ALTER TABLE Tbl_User_Token ADD CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES Tbl_User(user_id) ON DELETE CASCADE;
ALTER TABLE Tbl_User_Role ADD CONSTRAINT fk_role_user FOREIGN KEY (user_id) REFERENCES Tbl_User(user_id) ON DELETE CASCADE;
ALTER TABLE Tbl_Patient ADD CONSTRAINT fk_patient_user FOREIGN KEY (user_id) REFERENCES Tbl_User(user_id) ON DELETE CASCADE;
ALTER TABLE Tbl_Notification ADD CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES Tbl_User(user_id) ON DELETE CASCADE;

ALTER TABLE Tbl_Appointment ADD CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id) REFERENCES Tbl_Patient(patient_id);

ALTER TABLE Tbl_Prescription ADD CONSTRAINT fk_prescription_appointment FOREIGN KEY (appointment_id) REFERENCES Tbl_Appointment(id);
ALTER TABLE Tbl_Prescription ADD CONSTRAINT fk_prescription_patient FOREIGN KEY (patient_id) REFERENCES Tbl_Patient(patient_id);
ALTER TABLE Tbl_Prescription ADD CONSTRAINT fk_prescription_disease FOREIGN KEY (disease_id) REFERENCES Tbl_Disease(id) ON DELETE SET NULL;

ALTER TABLE Tbl_Prescription_Item ADD CONSTRAINT fk_item_prescription FOREIGN KEY (prescription_id) REFERENCES Tbl_Prescription(id) ON DELETE CASCADE;
ALTER TABLE Tbl_Prescription_Item ADD CONSTRAINT fk_item_medicine FOREIGN KEY (medicine_id) REFERENCES Tbl_Medicine(medicine_id);
ALTER TABLE Tbl_Prescription_Item ADD CONSTRAINT fk_item_batch FOREIGN KEY (medicine_batch_id) REFERENCES Tbl_Medicine_Batch(id) ON DELETE SET NULL;

ALTER TABLE Tbl_Prescription_Item_Schedule ADD CONSTRAINT fk_schedule_item FOREIGN KEY (prescription_item_id) REFERENCES Tbl_Prescription_Item(id) ON DELETE CASCADE;

ALTER TABLE Tbl_Medicine ADD CONSTRAINT fk_medicine_category FOREIGN KEY (category_id) REFERENCES Tbl_Medicine_Category(id) ON DELETE SET NULL;
ALTER TABLE Tbl_Medicine_Batch ADD CONSTRAINT fk_batch_medicine FOREIGN KEY (med_id) REFERENCES Tbl_Medicine(medicine_id) ON DELETE CASCADE;

ALTER TABLE Tbl_Payment ADD CONSTRAINT fk_payment_appointment FOREIGN KEY (appointment_id) REFERENCES Tbl_Appointment(id);
ALTER TABLE Tbl_Payment ADD CONSTRAINT fk_payment_prescription FOREIGN KEY (prescription_id) REFERENCES Tbl_Prescription(id) ON DELETE SET NULL;

ALTER TABLE Tbl_Role_Permission ADD CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES Tbl_User_Role(id) ON DELETE CASCADE;
ALTER TABLE Tbl_Role_Permission ADD CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES Tbl_Permission(id) ON DELETE CASCADE;

ALTER TABLE Tbl_Prescription_Template ADD CONSTRAINT fk_template_disease FOREIGN KEY (disease_id) REFERENCES Tbl_Disease(id);
ALTER TABLE Tbl_Prescription_Template_Item ADD CONSTRAINT fk_template_item_template FOREIGN KEY (template_id) REFERENCES Tbl_Prescription_Template(id) ON DELETE CASCADE;
ALTER TABLE Tbl_Prescription_Template_Item ADD CONSTRAINT fk_template_item_medicine FOREIGN KEY (medicine_id) REFERENCES Tbl_Medicine(medicine_id);

ALTER TABLE Tbl_Follow_Up ADD CONSTRAINT fk_follow_up_patient FOREIGN KEY (patient_id) REFERENCES Tbl_Patient(patient_id);
ALTER TABLE Tbl_Follow_Up ADD CONSTRAINT fk_follow_up_appointment FOREIGN KEY (appointment_id) REFERENCES Tbl_Appointment(id) ON DELETE SET NULL;
ALTER TABLE Tbl_Follow_Up ADD CONSTRAINT fk_follow_up_prescription FOREIGN KEY (prescription_id) REFERENCES Tbl_Prescription(id) ON DELETE SET NULL;

-- 4. Add DBML Notes as PostgreSQL Comments
-- ------------------------------------------

COMMENT ON COLUMN Tbl_User_Role.role IS 'admin / user';
COMMENT ON COLUMN Tbl_Patient.user_id IS 'User can create family member patient profile';
COMMENT ON COLUMN Tbl_Appointment.status IS 'pending / confirmed / cancelled / completed';
COMMENT ON COLUMN Tbl_Medicine_Batch.status IS 'active / expired / disposed';
COMMENT ON COLUMN Tbl_Prescription_Item_Schedule.dose_time IS 'morning / afternoon / evening / night / bedtime / custom';
COMMENT ON COLUMN Tbl_Prescription_Item_Schedule.dose_unit IS 'tablet / capsule / ml / drop / puff / injection';
COMMENT ON COLUMN Tbl_Prescription_Item_Schedule.meal_timing IS 'before_meal / after_meal / with_meal / anytime';
COMMENT ON COLUMN Tbl_Prescription_Item_Schedule.route IS 'oral / topical / injection / eye_drop / ear_drop / inhalation';
COMMENT ON COLUMN Tbl_Prescription_Item_Schedule.interval_hours IS 'Every X hours';
COMMENT ON COLUMN Tbl_Prescription_Item_Schedule.interval_days IS 'Every X days';
COMMENT ON COLUMN Tbl_Prescription_Item_Schedule.is_as_needed IS 'Take when needed';
COMMENT ON COLUMN Tbl_Prescription_Item_Schedule.body_site IS 'left eye / right ear / skin area';
COMMENT ON COLUMN Tbl_Payment.payment_method IS 'cash / online';
COMMENT ON COLUMN Tbl_Payment.payment_status IS 'pending / paid / partial / failed / refunded';
COMMENT ON COLUMN Tbl_Follow_Up.status IS 'pending / completed';