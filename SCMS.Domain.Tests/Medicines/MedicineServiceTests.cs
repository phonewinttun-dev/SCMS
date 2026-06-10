using Microsoft.EntityFrameworkCore;
using SCMS.Domain.Features.Medicines;
using SCMS.Domain.Tests.TestSupport;
using SCMS.Shared;
using SCMS.Domain.DTOs.Medicines;

namespace SCMS.Domain.Tests.Medicines;

public class MedicineServiceTests
{
    [Fact]
    public async Task SearchMedicinesAsync_ReturnsOnlyUsableActiveBatches()
    {
        using var db = new TestDatabase();
        var medicine = TestData.AddMedicine(db, "Paracetamol");
        TestData.AddBatch(db, medicine, quantity: 10, expiryDate: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(20)), batchNo: "ACTIVE-1");
        TestData.AddBatch(db, medicine, quantity: 7, expiryDate: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)), batchNo: "EXPIRED-1");
        TestData.AddBatch(db, medicine, quantity: 5, status: "disposed", batchNo: "DISPOSED-1");
        var service = new MedicineService(db.Context);

        var result = await service.SearchMedicinesAsync("para", new PaginationRequest());

        Assert.True(result.IsSuccess);
        var item = Assert.Single(result.Data);
        Assert.Equal(10, item.TotalStock);
        Assert.Single(item.ActiveBatches);
        Assert.Equal("ACTIVE-1", item.ActiveBatches[0].BatchNo);
        Assert.True(item.HasLowStockWarning);
        Assert.True(item.HasNearExpiryWarning);
    }

    [Fact]
    public async Task QuarantineExpiredBatchesAsync_UpdatesOnlyExpiredActiveBatches()
    {
        using var db = new TestDatabase();
        var medicine = TestData.AddMedicine(db);
        var expiredActive = TestData.AddBatch(db, medicine, expiryDate: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)), status: "active");
        var futureActive = TestData.AddBatch(db, medicine, expiryDate: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)), status: "active");
        var service = new MedicineService(db.Context);

        var result = await service.QuarantineExpiredBatchesAsync();

        Assert.True(result.IsSuccess);
        Assert.Equal("quarantined", (await db.Context.TblMedicineBatches.FindAsync(expiredActive.Id))!.Status);
        Assert.Equal("active", (await db.Context.TblMedicineBatches.FindAsync(futureActive.Id))!.Status);
    }

    [Fact]
    public async Task GetInventoryAlertsAsync_ReturnsLowStockAndNearExpiryButNotExpired()
    {
        using var db = new TestDatabase();
        var medicine = TestData.AddMedicine(db, "Amoxicillin");
        TestData.AddBatch(db, medicine, quantity: 5, expiryDate: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)), batchNo: "NEAR");
        TestData.AddBatch(db, medicine, quantity: 2, expiryDate: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-5)), batchNo: "OLD");
        var service = new MedicineService(db.Context);

        var result = await service.GetInventoryAlertsAsync(new PaginationRequest());

        Assert.True(result.IsSuccess);
        Assert.Contains(result.Data, x => x.AlertType == "Low Stock" && x.CurrentQuantity == 5);
        Assert.Contains(result.Data, x => x.AlertType == "Nearing Expiry" && x.BatchNo == "NEAR");
        Assert.DoesNotContain(result.Data, x => x.BatchNo == "OLD");
    }

    [Fact]
    public async Task CreateInventoryAlertNotificationsAsync_CreatesAndDeduplicatesAlerts()
    {
        using var db = new TestDatabase();
        var medicine = TestData.AddMedicine(db, "Cefixime");
        TestData.AddBatch(db, medicine, quantity: 4, expiryDate: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)), batchNo: "ALERT");
        var service = new MedicineService(db.Context);

        await service.CreateInventoryAlertNotificationsAsync();
        await service.CreateInventoryAlertNotificationsAsync();

        Assert.Equal(1, await db.Context.TblNotifications.CountAsync(n => n.Title == "Low Stock Alert"));
        Assert.Equal(1, await db.Context.TblNotifications.CountAsync(n => n.Title == "Batch Nearing Expiry"));
    }

    [Fact]
    public async Task GetCategoriesAsync_ReturnsAllCategories()
    {
        using var db = new TestDatabase();
        var cat1 = TestData.AddMedicineCategory(db, "Antibiotic");
        var cat2 = TestData.AddMedicineCategory(db, "Analgesic");
        var service = new MedicineService(db.Context);

        var result = await service.GetCategoriesAsync();

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Contains(result.Data, c => c.Name.StartsWith("Antibiotic"));
        Assert.Contains(result.Data, c => c.Name.StartsWith("Analgesic"));
    }

    [Fact]
    public async Task CreateMedicineAsync_SuccessfullyCreatesMedicine()
    {
        using var db = new TestDatabase();
        var cat = TestData.AddMedicineCategory(db, "Vitamins");
        var service = new MedicineService(db.Context);
        var request = new CreateMedicineRequest
        {
            Name = "Vitamin C",
            Description = "Supports immune system",
            CategoryId = cat.Id,
            UnitPrice = 250.50m
        };

        var result = await service.CreateMedicineAsync(request, imageFile: null);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal("Vitamin C", result.Data.Name);
        Assert.Equal(250.50m, result.Data.UnitPrice);

        var created = await db.Context.TblMedicines.FirstOrDefaultAsync(m => m.Name == "Vitamin C");
        Assert.NotNull(created);
        Assert.Equal(cat.Id, created.CategoryId);
        Assert.Equal("Supports immune system", created.Description);
        Assert.False(created.DeleteFlag);
    }

    [Fact]
    public async Task CreateMedicineAsync_FailsWithDuplicateName()
    {
        using var db = new TestDatabase();
        var existing = TestData.AddMedicine(db, "Aspirin");
        var service = new MedicineService(db.Context);
        var request = new CreateMedicineRequest
        {
            Name = "aspirin", // case insensitive check
            UnitPrice = 500m
        };

        var result = await service.CreateMedicineAsync(request, imageFile: null);

        Assert.False(result.IsSuccess);
        Assert.Contains("already exists", result.Message);
    }

    [Fact]
    public async Task UpdateMedicineAsync_SuccessfullyUpdatesMedicine()
    {
        using var db = new TestDatabase();
        var med = TestData.AddMedicine(db, "Paracetamol");
        var cat2 = TestData.AddMedicineCategory(db, "Fever");
        var service = new MedicineService(db.Context);
        var request = new UpdateMedicineRequest
        {
            Name = "Paracetamol Extra",
            Description = "Stronger formulation",
            CategoryId = cat2.Id,
            UnitPrice = 1500m,
            RemoveImage = false
        };

        var result = await service.UpdateMedicineAsync(med.MedicineId, request, imageFile: null);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal("Paracetamol Extra", result.Data.Name);
        Assert.Equal(1500m, result.Data.UnitPrice);

        var updated = await db.Context.TblMedicines.FindAsync(med.MedicineId);
        Assert.NotNull(updated);
        Assert.Equal("Paracetamol Extra", updated.Name);
        Assert.Equal("Stronger formulation", updated.Description);
        Assert.Equal(cat2.Id, updated.CategoryId);
    }

    [Fact]
    public async Task DeleteMedicineAsync_SoftDeletesMedicineAndBatches()
    {
        using var db = new TestDatabase();
        var med = TestData.AddMedicine(db, "Ibuprofen");
        var batch1 = TestData.AddBatch(db, med, quantity: 10);
        var batch2 = TestData.AddBatch(db, med, quantity: 20);
        var service = new MedicineService(db.Context);

        var result = await service.DeleteMedicineAsync(med.MedicineId);

        Assert.True(result.IsSuccess);

        var deletedMed = await db.Context.TblMedicines.FindAsync(med.MedicineId);
        Assert.NotNull(deletedMed);
        Assert.True(deletedMed.DeleteFlag);

        var dbBatch1 = await db.Context.TblMedicineBatches.FindAsync(batch1.Id);
        var dbBatch2 = await db.Context.TblMedicineBatches.FindAsync(batch2.Id);
        Assert.True(dbBatch1!.DeleteFlag);
        Assert.True(dbBatch2!.DeleteFlag);
    }

    [Fact]
    public async Task DeleteMedicineAsync_FailsIfAllocatedToActivePrescription()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user);
        var appointment = TestData.AddAppointment(db, patient, status: "pending");
        var med = TestData.AddMedicine(db, "Amoxicillin");
        var batch = TestData.AddBatch(db, med);
        var prescription = TestData.AddPrescription(db, patient, appointment);
        TestData.AddPrescriptionItem(db, prescription, med, batch);
        var service = new MedicineService(db.Context);

        var result = await service.DeleteMedicineAsync(med.MedicineId);

        Assert.False(result.IsSuccess);
        Assert.Contains("allocated to active prescription", result.Message);

        var dbMed = await db.Context.TblMedicines.FindAsync(med.MedicineId);
        Assert.False(dbMed!.DeleteFlag);
    }
}
