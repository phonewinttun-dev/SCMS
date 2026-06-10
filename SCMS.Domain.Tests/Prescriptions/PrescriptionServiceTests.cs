using Microsoft.EntityFrameworkCore;
using SCMS.Domain.Features.Prescriptions;
using SCMS.Domain.DTOs.Prescriptions;
using SCMS.Domain.Tests.TestSupport;
using SCMS.Shared;

namespace SCMS.Domain.Tests.Prescriptions;

public class PrescriptionServiceTests
{
    [Fact]
    public async Task CreatePrescriptionAsync_DeductsStockFifoAndCreatesItemsSchedules()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user);
        var appointment = TestData.AddAppointment(db, patient, status: "confirmed");
        var disease = TestData.AddDisease(db);
        var medicine = TestData.AddMedicine(db, "Paracetamol");
        var batch1 = TestData.AddBatch(db, medicine, quantity: 5, expiryDate: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(40)), batchNo: "FIFO-1");
        var batch2 = TestData.AddBatch(db, medicine, quantity: 10, expiryDate: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(90)), batchNo: "FIFO-2");
        var service = new PrescriptionService(db.Context);

        var result = await service.CreatePrescriptionAsync(new CreatePrescriptionRequest
        {
            AppointmentId = appointment.Id,
            PatientId = patient.PatientId,
            DiseaseId = disease.Id,
            WeightKg = 60,
            HeightCm = 165,
            Notes = "Take rest",
            Items =
            {
                new PrescriptionItemDto
                {
                    MedicineId = medicine.MedicineId,
                    Dosage = "1 tablet",
                    Days = 3,
                    Quantity = 7,
                    DoseTime = "morning",
                    DoseQuantity = 1,
                    DoseUnit = "tablet",
                    MealTiming = "after_meal",
                    Route = "oral"
                }
            }
        });

        Assert.True(result.IsSuccess);
        Assert.Equal("completed", (await db.Context.TblAppointments.FindAsync(appointment.Id))!.Status);
        Assert.Equal(0, (await db.Context.TblMedicineBatches.FindAsync(batch1.Id))!.Quantity);
        Assert.Equal(8, (await db.Context.TblMedicineBatches.FindAsync(batch2.Id))!.Quantity);
        Assert.Equal(2, await db.Context.TblPrescriptionItems.CountAsync());
        Assert.Equal(2, await db.Context.TblPrescriptionItemSchedules.CountAsync());
        Assert.Equal(7, result.Data!.Items.Sum(i => i.Quantity));
        Assert.NotNull(result.Data.Bmi);
    }

    [Fact]
    public async Task CreatePrescriptionAsync_RejectsAppointmentPatientMismatch()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user, "Patient A");
        var otherPatient = TestData.AddPatient(db, user, "Patient B");
        var appointment = TestData.AddAppointment(db, otherPatient);
        var medicine = TestData.AddMedicine(db);
        TestData.AddBatch(db, medicine, quantity: 10);
        var service = new PrescriptionService(db.Context);

        var result = await service.CreatePrescriptionAsync(new CreatePrescriptionRequest
        {
            AppointmentId = appointment.Id,
            PatientId = patient.PatientId,
            Items =
            {
                new PrescriptionItemDto
                {
                    MedicineId = medicine.MedicineId,
                    Days = 1,
                    Quantity = 1,
                    DoseQuantity = 1
                }
            }
        });

        Assert.True(result.IsFailure);
        Assert.Equal("Appointment does not belong to the selected patient.", result.Message);
        Assert.Empty(db.Context.TblPrescriptions);
    }

    [Fact]
    public async Task CreatePrescriptionAsync_InsufficientStockDoesNotDeductOrCreatePrescription()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user);
        var appointment = TestData.AddAppointment(db, patient);
        var medicine = TestData.AddMedicine(db);
        var batch = TestData.AddBatch(db, medicine, quantity: 2);
        var service = new PrescriptionService(db.Context);

        var result = await service.CreatePrescriptionAsync(new CreatePrescriptionRequest
        {
            AppointmentId = appointment.Id,
            PatientId = patient.PatientId,
            Items =
            {
                new PrescriptionItemDto
                {
                    MedicineId = medicine.MedicineId,
                    Days = 3,
                    Quantity = 5,
                    DoseQuantity = 1
                }
            }
        });

        Assert.True(result.IsFailure);
        Assert.Equal(2, (await db.Context.TblMedicineBatches.FindAsync(batch.Id))!.Quantity);
        Assert.Empty(db.Context.TblPrescriptions);
    }

    [Fact]
    public async Task SaveTemplateAsync_AndGetTemplatesAsync_PersistTemplateInDatabase()
    {
        DeleteTemplateFile();
        try
        {
            using var db = new TestDatabase();
            var disease = TestData.AddDisease(db);
            var medicine = TestData.AddMedicine(db);
            var service = new PrescriptionService(db.Context);

            var saveResult = await service.SaveTemplateAsync(new SaveTemplateRequest
            {
                Name = "Cold template",
                DiseaseId = disease.Id,
                Items =
                {
                    new TemplateItemDto
                    {
                        MedicineId = medicine.MedicineId,
                        Days = 3,
                        Quantity = 6,
                        Dosage = "1 tablet"
                    }
                }
            });
            var listResult = await service.GetTemplatesAsync(disease.Id, new PaginationRequest());

            Assert.True(saveResult.IsSuccess);
            Assert.True(listResult.IsSuccess);
            var template = Assert.Single(listResult.Data);
            Assert.Equal("Cold template", template.Name);
            Assert.Equal(medicine.MedicineId, template.Items[0].MedicineId);
            Assert.Equal(1, await db.Context.TblPrescriptionTemplates.CountAsync());
            Assert.Equal(1, await db.Context.TblPrescriptionTemplateItems.CountAsync());
        }
        finally
        {
            DeleteTemplateFile();
        }
    }

    private static void DeleteTemplateFile()
    {
        var templatePath = Path.Combine(AppContext.BaseDirectory, "App_Data", "prescription_templates.json");
        if (File.Exists(templatePath))
        {
            File.Delete(templatePath);
        }
    }
}
