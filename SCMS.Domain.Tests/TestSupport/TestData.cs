using SCMS.Database.Models;

namespace SCMS.Domain.Tests.TestSupport;

public static class TestData
{
    public static TblUser AddUser(TestDatabase db, string name = "Test User", string? role = null)
    {
        var user = new TblUser
        {
            Name = name,
            Email = $"{Guid.NewGuid():N}@example.test",
            MobileNo = Guid.NewGuid().ToString("N")[..12],
            PasswordHash = "hash",
            CreatedAt = DateTime.UtcNow,
            DeleteFlag = false
        };

        db.Context.TblUsers.Add(user);
        db.Context.SaveChanges();

        if (!string.IsNullOrWhiteSpace(role))
        {
            db.Context.TblUserRoles.Add(new TblUserRole
            {
                UserId = user.UserId,
                Role = role
            });
            db.Context.SaveChanges();
        }

        return user;
    }

    public static TblPatient AddPatient(TestDatabase db, TblUser user, string name = "Patient", bool deleted = false, string? ActualAddress = null)
    {
        var patient = new TblPatient
        {
            UserId = user.UserId,
            Name = name,
            MobileNo = "09123456789",
            Email = $"{Guid.NewGuid():N}@patient.test",
            DateOfBirth = new DateOnly(1990, 1, 1),
            Gender = "female",
            BloodType = "O+",
            ActualAddress = "",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            DeleteFlag = deleted
        };

        db.Context.TblPatients.Add(patient);
        db.Context.SaveChanges();
        return patient;
    }

    private static int _appointmentSeq = 0;

    public static TblAppointment AddAppointment(
        TestDatabase db,
        TblPatient patient,
        DateTime? datetime = null,
        string status = "pending",
        string? Notes = "Consultation",
        string? appointmentCode = null)
    {
        var code = appointmentCode ?? $"APT-{Interlocked.Increment(ref _appointmentSeq):D3}";
        var appointment = new TblAppointment
        {
            AppointmentCode = code,
            PatientId = patient.PatientId,
            Datetime = datetime ?? DateTime.UtcNow.AddHours(2),
            Status = status,
            Notes = "",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Context.TblAppointments.Add(appointment);
        db.Context.SaveChanges();
        return appointment;
    }

    public static TblDisease AddDisease(TestDatabase db, string name = "Common Cold", bool deleted = false)
    {
        var disease = new TblDisease
        {
            Name = $"{name}-{Guid.NewGuid():N}"[..Math.Min(name.Length + 33, 255)],
            Description = "Test disease",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            DeleteFlag = deleted
        };

        db.Context.TblDiseases.Add(disease);
        db.Context.SaveChanges();
        return disease;
    }

    public static TblMedicineCategory AddMedicineCategory(TestDatabase db, string name = "General")
    {
        var category = new TblMedicineCategory
        {
            Name = $"{name}-{Guid.NewGuid():N}"[..Math.Min(name.Length + 33, 255)]
        };

        db.Context.TblMedicineCategories.Add(category);
        db.Context.SaveChanges();
        return category;
    }

    public static TblMedicine AddMedicine(TestDatabase db, string name = "Paracetamol", bool deleted = false)
    {
        var category = AddMedicineCategory(db);
        var medicine = new TblMedicine
        {
            CategoryId = category.Id,
            Name = name,
            Description = "Pain reliever",
            UnitPrice = 1000m,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            DeleteFlag = deleted
        };

        db.Context.TblMedicines.Add(medicine);
        db.Context.SaveChanges();
        return medicine;
    }

    public static TblMedicineBatch AddBatch(
        TestDatabase db,
        TblMedicine medicine,
        int quantity = 10,
        DateOnly? expiryDate = null,
        string status = "active",
        bool deleted = false,
        string? batchNo = null)
    {
        var batch = new TblMedicineBatch
        {
            MedId = medicine.MedicineId,
            BatchNo = batchNo ?? $"B-{Guid.NewGuid():N}"[..20],
            Quantity = quantity,
            ExpiryDate = expiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(90)),
            ReceivedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-10)),
            SupplierName = "Supplier",
            Status = status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            DeleteFlag = deleted
        };

        db.Context.TblMedicineBatches.Add(batch);
        db.Context.SaveChanges();
        return batch;
    }

    public static TblPrescription AddPrescription(
        TestDatabase db,
        TblPatient patient,
        TblAppointment appointment,
        TblDisease? disease = null,
        string? actualNotes = null, string? labTestRequests = null,
        DateTime? createdAt = null)
    {
        var prescription = new TblPrescription
        {
            AppointmentId = appointment.Id,
            PatientId = patient.PatientId,
            DiseaseId = disease?.Id,
            WeightKg = 60,
            BloodPressureSystolic = 120,
            BloodPressureDiastolic = 80,
            ActualNotes = actualNotes ?? "", LabTestRequests = labTestRequests,
            CreatedAt = createdAt ?? DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            DeleteFlag = false
        };

        db.Context.TblPrescriptions.Add(prescription);
        db.Context.SaveChanges();
        return prescription;
    }

    public static TblPrescriptionItem AddPrescriptionItem(
        TestDatabase db,
        TblPrescription prescription,
        TblMedicine medicine,
        TblMedicineBatch? batch = null,
        int quantity = 2)
    {
        var item = new TblPrescriptionItem
        {
            PrescriptionId = prescription.Id,
            MedicineId = medicine.MedicineId,
            MedicineBatchId = batch?.Id,
            Dosage = "1 tablet",
            Days = 3,
            Quantity = quantity,
            Instruction = "After meal",
            CreatedAt = DateTime.UtcNow,
            DeleteFlag = false
        };

        db.Context.TblPrescriptionItems.Add(item);
        db.Context.SaveChanges();
        return item;
    }

    public static TblPayment AddPayment(
        TestDatabase db,
        TblAppointment appointment,
        string status = "pending",
        decimal amount = 10000m,
        DateTime? paidAt = null)
    {
        var payment = new TblPayment
        {
            AppointmentId = appointment.Id,
            Amount = amount,
            Tax = amount * 0.05m,
            Charges = 0,
            PaymentMethod = "kbzpay",
            PaymentStatus = status,
            PaymentScreenshot = status == "pending" ? "proof.png" : null,
            PaidAt = paidAt,
            UpdatedAt = DateTime.UtcNow
        };

        db.Context.TblPayments.Add(payment);
        db.Context.SaveChanges();
        return payment;
    }
}
