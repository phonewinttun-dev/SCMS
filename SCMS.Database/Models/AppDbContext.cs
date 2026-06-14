using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace SCMS.Database.Models;

public partial class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<TblAppointment> TblAppointments { get; set; }

    public virtual DbSet<TblDisease> TblDiseases { get; set; }

    public virtual DbSet<TblFollowUp> TblFollowUps { get; set; }

    public virtual DbSet<TblMedicine> TblMedicines { get; set; }

    public virtual DbSet<TblMedicineBatch> TblMedicineBatches { get; set; }

    public virtual DbSet<TblMedicineCategory> TblMedicineCategories { get; set; }

    public virtual DbSet<TblNotification> TblNotifications { get; set; }

    public virtual DbSet<TblPatient> TblPatients { get; set; }

    public virtual DbSet<TblPayment> TblPayments { get; set; }

    public virtual DbSet<TblPermission> TblPermissions { get; set; }

    public virtual DbSet<TblPrescription> TblPrescriptions { get; set; }

    public virtual DbSet<TblPrescriptionItem> TblPrescriptionItems { get; set; }

    public virtual DbSet<TblPrescriptionItemSchedule> TblPrescriptionItemSchedules { get; set; }

    public virtual DbSet<TblPrescriptionTemplate> TblPrescriptionTemplates { get; set; }

    public virtual DbSet<TblPrescriptionTemplateItem> TblPrescriptionTemplateItems { get; set; }

    public virtual DbSet<TblRolePermission> TblRolePermissions { get; set; }

    public virtual DbSet<TblUser> TblUsers { get; set; }

    public virtual DbSet<TblUserRole> TblUserRoles { get; set; }

    public virtual DbSet<TblUserToken> TblUserTokens { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TblAppointment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_appointment_pkey");

            entity.ToTable("tbl_appointment");

            entity.HasIndex(e => e.AppointmentCode, "tbl_appointment_appointment_code_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AppointmentCode)
                .HasMaxLength(50)
                .HasColumnName("appointment_code");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Datetime)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("datetime");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.PatientId).HasColumnName("patient_id");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasComment("pending / confirmed / cancelled / completed")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Patient).WithMany(p => p.TblAppointments)
                .HasForeignKey(d => d.PatientId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_appointment_patient");
        });

        modelBuilder.Entity<TblDisease>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_disease_pkey");

            entity.ToTable("tbl_disease");

            entity.HasIndex(e => e.Name, "tbl_disease_name_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.DeleteFlag).HasColumnName("delete_flag");
            entity.Property(e => e.Description)
                .HasMaxLength(255)
                .HasColumnName("description");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<TblFollowUp>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_follow_up_pkey");

            entity.ToTable("tbl_follow_up");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AppointmentId).HasColumnName("appointment_id");
            entity.Property(e => e.CompletedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("completed_at");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.DeleteFlag).HasColumnName("delete_flag");
            entity.Property(e => e.DueAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("due_at");
            entity.Property(e => e.PatientId).HasColumnName("patient_id");
            entity.Property(e => e.PrescriptionId).HasColumnName("prescription_id");
            entity.Property(e => e.Recommendation).HasColumnName("recommendation");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasComment("pending / completed")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Appointment).WithMany(p => p.TblFollowUps)
                .HasForeignKey(d => d.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_follow_up_appointment");

            entity.HasOne(d => d.Patient).WithMany(p => p.TblFollowUps)
                .HasForeignKey(d => d.PatientId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_follow_up_patient");

            entity.HasOne(d => d.Prescription).WithMany(p => p.TblFollowUps)
                .HasForeignKey(d => d.PrescriptionId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_follow_up_prescription");
        });

        modelBuilder.Entity<TblMedicine>(entity =>
        {
            entity.HasKey(e => e.MedicineId).HasName("tbl_medicine_pkey");

            entity.ToTable("tbl_medicine");

            entity.Property(e => e.MedicineId).HasColumnName("medicine_id");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.DeleteFlag).HasColumnName("delete_flag");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.ImageId)
                .HasMaxLength(255)
                .HasColumnName("image_id");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasColumnName("image_url");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.UnitPrice)
                .HasPrecision(10, 2)
                .HasColumnName("unit_price");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Category).WithMany(p => p.TblMedicines)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_medicine_category");
        });

        modelBuilder.Entity<TblMedicineBatch>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_medicine_batch_pkey");

            entity.ToTable("tbl_medicine_batch");

            entity.HasIndex(e => new { e.MedId, e.BatchNo }, "uq_med_batch").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BatchNo)
                .HasMaxLength(100)
                .HasColumnName("batch_no");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.DeleteFlag).HasColumnName("delete_flag");
            entity.Property(e => e.ExpiryDate).HasColumnName("expiry_date");
            entity.Property(e => e.MedId).HasColumnName("med_id");
            entity.Property(e => e.Quantity)
                .HasDefaultValue(0)
                .HasColumnName("quantity");
            entity.Property(e => e.ReceivedDate).HasColumnName("received_date");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasComment("active / expired / disposed")
                .HasColumnName("status");
            entity.Property(e => e.SupplierName)
                .HasMaxLength(255)
                .HasColumnName("supplier_name");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Med).WithMany(p => p.TblMedicineBatches)
                .HasForeignKey(d => d.MedId)
                .HasConstraintName("fk_batch_medicine");
        });

        modelBuilder.Entity<TblMedicineCategory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_medicine_category_pkey");

            entity.ToTable("tbl_medicine_category");

            entity.HasIndex(e => e.Name, "tbl_medicine_category_name_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
        });

        modelBuilder.Entity<TblNotification>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_notification_pkey");

            entity.ToTable("tbl_notification");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ActionRoute)
                .HasMaxLength(255)
                .HasColumnName("action_route");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.DeleteFlag).HasColumnName("delete_flag");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.TblNotifications)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_notification_user");
        });

        modelBuilder.Entity<TblPatient>(entity =>
        {
            entity.HasKey(e => e.PatientId).HasName("tbl_patient_pkey");

            entity.ToTable("tbl_patient");

            entity.Property(e => e.PatientId).HasColumnName("patient_id");
            entity.Property(e => e.ActualAddress).HasColumnName("actual_address");
            entity.Property(e => e.Allergies).HasColumnName("allergies");
            entity.Property(e => e.ChronicConditions).HasColumnName("chronic_conditions");
            entity.Property(e => e.PastSurgeries).HasColumnName("past_surgeries");
            entity.Property(e => e.FamilyHistory).HasColumnName("family_history");
            entity.Property(e => e.VaccinationHistory).HasColumnName("vaccination_history");
            entity.Property(e => e.BloodType)
                .HasMaxLength(5)
                .HasColumnName("blood_type");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.DateOfBirth).HasColumnName("date_of_birth");
            entity.Property(e => e.DeleteFlag).HasColumnName("delete_flag");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .HasColumnName("email");
            entity.Property(e => e.Gender)
                .HasMaxLength(20)
                .HasColumnName("gender");
            entity.Property(e => e.MobileNo)
                .HasMaxLength(50)
                .HasColumnName("mobile_no");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
            entity.Property(e => e.UserId)
                .HasComment("User can create family member patient profile")
                .HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.TblPatients)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("fk_patient_user");
        });

        modelBuilder.Entity<TblPayment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_payment_pkey");

            entity.ToTable("tbl_payment");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Amount)
                .HasPrecision(10, 2)
                .HasColumnName("amount");
            entity.Property(e => e.AppointmentId).HasColumnName("appointment_id");
            entity.Property(e => e.Charges)
                .HasPrecision(10, 2)
                .HasColumnName("charges");
            entity.Property(e => e.PaidAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("paid_at");
            entity.Property(e => e.PaymentMethod)
                .HasMaxLength(50)
                .HasComment("cash / online")
                .HasColumnName("payment_method");
            entity.Property(e => e.PaymentScreenshot)
                .HasMaxLength(500)
                .HasColumnName("payment_screenshot");
            entity.Property(e => e.PaymentStatus)
                .HasMaxLength(50)
                .HasComment("pending / paid / partial / failed / refunded")
                .HasColumnName("payment_status");
            entity.Property(e => e.PrescriptionId).HasColumnName("prescription_id");
            entity.Property(e => e.Tax)
                .HasPrecision(10, 2)
                .HasColumnName("tax");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Appointment).WithMany(p => p.TblPayments)
                .HasForeignKey(d => d.AppointmentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_payment_appointment");

            entity.HasOne(d => d.Prescription).WithMany(p => p.TblPayments)
                .HasForeignKey(d => d.PrescriptionId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_payment_prescription");
        });

        modelBuilder.Entity<TblPermission>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_permission_pkey");

            entity.ToTable("tbl_permission");

            entity.HasIndex(e => new { e.Menu, e.Action }, "uq_menu_action").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Action)
                .HasMaxLength(100)
                .HasColumnName("action");
            entity.Property(e => e.Menu)
                .HasMaxLength(100)
                .HasColumnName("menu");
        });

        modelBuilder.Entity<TblPrescription>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_prescription_pkey");

            entity.ToTable("tbl_prescription");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AppointmentId).HasColumnName("appointment_id");
            entity.Property(e => e.BloodPressureDiastolic).HasColumnName("blood_pressure_diastolic");
            entity.Property(e => e.BloodPressureSystolic).HasColumnName("blood_pressure_systolic");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.DeleteFlag).HasColumnName("delete_flag");
            entity.Property(e => e.DiseaseId).HasColumnName("disease_id");
            entity.Property(e => e.ActualNotes).HasColumnName("actual_notes");
            entity.Property(e => e.TemperatureC).HasColumnName("temperature_c");
            entity.Property(e => e.PulseBpm).HasColumnName("pulse_bpm");
            entity.Property(e => e.Spo2Percent).HasColumnName("spo2_percent");
            entity.Property(e => e.HeightCm).HasColumnName("height_cm");
            entity.Property(e => e.Bmi).HasColumnName("bmi");
            entity.Property(e => e.LabTestRequests).HasColumnName("lab_test_requests");
            entity.Property(e => e.PatientId).HasColumnName("patient_id");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
            entity.Property(e => e.WeightKg).HasColumnName("weight_kg");

            entity.HasOne(d => d.Appointment).WithMany(p => p.TblPrescriptions)
                .HasForeignKey(d => d.AppointmentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_prescription_appointment");

            entity.HasOne(d => d.Disease).WithMany(p => p.TblPrescriptions)
                .HasForeignKey(d => d.DiseaseId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_prescription_disease");

            entity.HasOne(d => d.Patient).WithMany(p => p.TblPrescriptions)
                .HasForeignKey(d => d.PatientId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_prescription_patient");
        });

        modelBuilder.Entity<TblPrescriptionItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_prescription_item_pkey");

            entity.ToTable("tbl_prescription_item");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Days).HasColumnName("days");
            entity.Property(e => e.DeleteFlag).HasColumnName("delete_flag");
            entity.Property(e => e.Dosage)
                .HasMaxLength(100)
                .HasColumnName("dosage");
            entity.Property(e => e.Instruction).HasColumnName("instruction");
            entity.Property(e => e.MedicineBatchId).HasColumnName("medicine_batch_id");
            entity.Property(e => e.MedicineId).HasColumnName("medicine_id");
            entity.Property(e => e.PrescriptionId).HasColumnName("prescription_id");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.MedicineBatch).WithMany(p => p.TblPrescriptionItems)
                .HasForeignKey(d => d.MedicineBatchId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_item_batch");

            entity.HasOne(d => d.Medicine).WithMany(p => p.TblPrescriptionItems)
                .HasForeignKey(d => d.MedicineId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_item_medicine");

            entity.HasOne(d => d.Prescription).WithMany(p => p.TblPrescriptionItems)
                .HasForeignKey(d => d.PrescriptionId)
                .HasConstraintName("fk_item_prescription");
        });

        modelBuilder.Entity<TblPrescriptionItemSchedule>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_prescription_item_schedule_pkey");

            entity.ToTable("tbl_prescription_item_schedule");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BodySite)
                .HasMaxLength(100)
                .HasComment("left eye / right ear / skin area")
                .HasColumnName("body_site");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.DayOfWeek)
                .HasMaxLength(20)
                .HasColumnName("day_of_week");
            entity.Property(e => e.DeleteFlag).HasColumnName("delete_flag");
            entity.Property(e => e.DoseQuantity)
                .HasPrecision(10, 2)
                .HasColumnName("dose_quantity");
            entity.Property(e => e.DoseTime)
                .HasMaxLength(50)
                .HasComment("morning / afternoon / evening / night / bedtime / custom")
                .HasColumnName("dose_time");
            entity.Property(e => e.DoseUnit)
                .HasMaxLength(50)
                .HasComment("tablet / capsule / ml / drop / puff / injection")
                .HasColumnName("dose_unit");
            entity.Property(e => e.EndDate).HasColumnName("end_date");
            entity.Property(e => e.IntervalDays)
                .HasComment("Every X days")
                .HasColumnName("interval_days");
            entity.Property(e => e.IntervalHours)
                .HasComment("Every X hours")
                .HasColumnName("interval_hours");
            entity.Property(e => e.IsAsNeeded)
                .HasDefaultValue(false)
                .HasComment("Take when needed")
                .HasColumnName("is_as_needed");
            entity.Property(e => e.MealTiming)
                .HasMaxLength(50)
                .HasComment("before_meal / after_meal / with_meal / anytime")
                .HasColumnName("meal_timing");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.PrescriptionItemId).HasColumnName("prescription_item_id");
            entity.Property(e => e.Route)
                .HasMaxLength(50)
                .HasComment("oral / topical / injection / eye_drop / ear_drop / inhalation")
                .HasColumnName("route");
            entity.Property(e => e.StartDate).HasColumnName("start_date");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.PrescriptionItem).WithMany(p => p.TblPrescriptionItemSchedules)
                .HasForeignKey(d => d.PrescriptionItemId)
                .HasConstraintName("fk_schedule_item");
        });

        modelBuilder.Entity<TblPrescriptionTemplate>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_prescription_template_pkey");

            entity.ToTable("tbl_prescription_template");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.DeleteFlag).HasColumnName("delete_flag");
            entity.Property(e => e.DiseaseId).HasColumnName("disease_id");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Disease).WithMany(p => p.TblPrescriptionTemplates)
                .HasForeignKey(d => d.DiseaseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_template_disease");
        });

        modelBuilder.Entity<TblPrescriptionTemplateItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_prescription_template_item_pkey");

            entity.ToTable("tbl_prescription_template_item");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Days).HasColumnName("days");
            entity.Property(e => e.DeleteFlag).HasColumnName("delete_flag");
            entity.Property(e => e.Dosage)
                .HasMaxLength(100)
                .HasColumnName("dosage");
            entity.Property(e => e.Instruction).HasColumnName("instruction");
            entity.Property(e => e.MedicineId).HasColumnName("medicine_id");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.TemplateId).HasColumnName("template_id");

            entity.HasOne(d => d.Medicine).WithMany(p => p.TblPrescriptionTemplateItems)
                .HasForeignKey(d => d.MedicineId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_template_item_medicine");

            entity.HasOne(d => d.Template).WithMany(p => p.TblPrescriptionTemplateItems)
                .HasForeignKey(d => d.TemplateId)
                .HasConstraintName("fk_template_item_template");
        });

        modelBuilder.Entity<TblRolePermission>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_role_permission_pkey");

            entity.ToTable("tbl_role_permission");

            entity.HasIndex(e => new { e.RoleId, e.PermissionId }, "uq_role_permission").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.PermissionId).HasColumnName("permission_id");
            entity.Property(e => e.RoleId).HasColumnName("role_id");

            entity.HasOne(d => d.Permission).WithMany(p => p.TblRolePermissions)
                .HasForeignKey(d => d.PermissionId)
                .HasConstraintName("fk_rp_permission");

            entity.HasOne(d => d.Role).WithMany(p => p.TblRolePermissions)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("fk_rp_role");
        });

        modelBuilder.Entity<TblUser>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("tbl_user_pkey");

            entity.ToTable("tbl_user");

            entity.HasIndex(e => e.Email, "tbl_user_email_key").IsUnique();

            entity.HasIndex(e => e.MobileNo, "tbl_user_mobile_no_key").IsUnique();

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.DeleteFlag).HasColumnName("delete_flag");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .HasColumnName("email");
            entity.Property(e => e.MobileNo)
                .HasMaxLength(50)
                .HasColumnName("mobile_no");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasColumnName("password_hash");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<TblUserRole>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_user_role_pkey");

            entity.ToTable("tbl_user_role");

            entity.HasIndex(e => new { e.UserId, e.Role }, "uq_user_role").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Role)
                .HasMaxLength(50)
                .HasComment("admin / user")
                .HasColumnName("role");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.TblUserRoles)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("fk_role_user");
        });

        modelBuilder.Entity<TblUserToken>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tbl_user_token_pkey");

            entity.ToTable("tbl_user_token");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.ExpiresAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("expires_at");
            entity.Property(e => e.Revoked)
                .HasDefaultValue(false)
                .HasColumnName("revoked");
            entity.Property(e => e.TokenHash)
                .HasMaxLength(500)
                .HasColumnName("token_hash");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.TblUserTokens)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("fk_token_user");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
