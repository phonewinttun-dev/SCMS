using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SCMS.Domain.Features.Medicines;
using SCMS.Domain.Tests.TestSupport;
using SCMS.Shared;
using SCMS.Domain.DTOs.Medicines;
using Xunit;

namespace SCMS.Domain.Tests.Medicines
{
    public class MedicineBatchCRUDTests
    {
        [Fact]
        public async Task GetBatchesAsync_WithFiltersAndSorting_ReturnsExpectedResults()
        {
            using var db = new TestDatabase();
            var med1 = TestData.AddMedicine(db, "Aspirin");
            var med2 = TestData.AddMedicine(db, "Paracetamol");

            // Add batches
            TestData.AddBatch(db, med1, quantity: 50, expiryDate: new DateOnly(2026, 12, 31), batchNo: "ASP-01", status: "active");
            TestData.AddBatch(db, med1, quantity: 20, expiryDate: new DateOnly(2026, 6, 30), batchNo: "ASP-02", status: "expired");
            TestData.AddBatch(db, med2, quantity: 100, expiryDate: new DateOnly(2027, 1, 1), batchNo: "PARA-01", status: "active");

            var service = new MedicineService(db.Context);

            // Filter by medicine ID
            var resultMedId = await service.GetBatchesAsync(
                query: null, status: null, medicineId: med1.MedicineId,
                sortBy: null, sortDescending: false, new PaginationRequest { PageNumber = 1, PageSize = 10 });
            
            Assert.True(resultMedId.IsSuccess);
            Assert.Equal(2, resultMedId.Data.Count);
            Assert.All(resultMedId.Data, b => Assert.Equal(med1.MedicineId, b.MedId));

            // Filter by status
            var resultStatus = await service.GetBatchesAsync(
                query: null, status: "expired", medicineId: null,
                sortBy: null, sortDescending: false, new PaginationRequest { PageNumber = 1, PageSize = 10 });

            Assert.True(resultStatus.IsSuccess);
            var expiredBatch = Assert.Single(resultStatus.Data);
            Assert.Equal("ASP-02", expiredBatch.BatchNo);

            // Search query
            var resultQuery = await service.GetBatchesAsync(
                query: "PARA", status: null, medicineId: null,
                sortBy: null, sortDescending: false, new PaginationRequest { PageNumber = 1, PageSize = 10 });

            Assert.True(resultQuery.IsSuccess);
            var searchedBatch = Assert.Single(resultQuery.Data);
            Assert.Equal("PARA-01", searchedBatch.BatchNo);

            // Sort by quantity descending
            var resultSort = await service.GetBatchesAsync(
                query: null, status: null, medicineId: null,
                sortBy: "Quantity", sortDescending: true, new PaginationRequest { PageNumber = 1, PageSize = 10 });

            Assert.True(resultSort.IsSuccess);
            Assert.Equal(3, resultSort.Data.Count);
            Assert.Equal(100, resultSort.Data[0].Quantity); // PARA-01 (100)
            Assert.Equal(50, resultSort.Data[1].Quantity);  // ASP-01 (50)
            Assert.Equal(20, resultSort.Data[2].Quantity);  // ASP-02 (20)
        }

        [Fact]
        public async Task CreateBatchAsync_ValidatesExpiryDateAfterManufactureDate()
        {
            using var db = new TestDatabase();
            var medicine = TestData.AddMedicine(db);
            var service = new MedicineService(db.Context);

            var request = new CreateBatchRequest
            {
                MedId = medicine.MedicineId,
                BatchNo = "NEW-01",
                Quantity = 10,
                ManufactureDate = new DateOnly(2026, 5, 10),
                ExpiryDate = new DateOnly(2026, 5, 9), // invalid: before mfg
                Manufacturer = "Test Mfg",
                Status = "active"
            };

            var result = await service.CreateBatchAsync(request);

            Assert.True(result.IsFailure);
            Assert.Equal("Expiry date must be after manufacture date.", result.Message);
        }

        [Fact]
        public async Task CreateBatchAsync_BlocksDuplicates()
        {
            using var db = new TestDatabase();
            var medicine = TestData.AddMedicine(db);
            TestData.AddBatch(db, medicine, batchNo: "DUP-01");
            var service = new MedicineService(db.Context);

            var request = new CreateBatchRequest
            {
                MedId = medicine.MedicineId,
                BatchNo = "DUP-01", // duplicate
                Quantity = 10,
                ManufactureDate = new DateOnly(2026, 5, 1),
                ExpiryDate = new DateOnly(2026, 12, 1),
                Manufacturer = "Test Mfg",
                Status = "active"
            };

            var result = await service.CreateBatchAsync(request);

            Assert.True(result.IsFailure);
            Assert.Contains("already exists", result.Message);
        }

        [Fact]
        public async Task DeleteBatchAsync_BlocksIfInActivePrescriptions()
        {
            using var db = new TestDatabase();
            var user = TestData.AddUser(db);
            var patient = TestData.AddPatient(db, user);
            var medicine = TestData.AddMedicine(db);
            var batch = TestData.AddBatch(db, medicine);

            // Active appointment (pending)
            var appointment = TestData.AddAppointment(db, patient, status: "pending");
            var prescription = TestData.AddPrescription(db, patient, appointment);
            TestData.AddPrescriptionItem(db, prescription, medicine, batch);

            var service = new MedicineService(db.Context);

            var result = await service.DeleteBatchAsync(batch.Id, force: false);

            Assert.True(result.IsFailure);
            Assert.Contains("active prescription", result.Message);

            // Check it was not deleted
            var batchInDb = await db.Context.TblMedicineBatches.FindAsync(batch.Id);
            Assert.NotNull(batchInDb);
            Assert.False(batchInDb.DeleteFlag);
        }

        [Fact]
        public async Task DeleteBatchAsync_WarnsIfInPastPrescriptions_SucceedsWithForce()
        {
            using var db = new TestDatabase();
            var user = TestData.AddUser(db);
            var patient = TestData.AddPatient(db, user);
            var medicine = TestData.AddMedicine(db);
            var batch = TestData.AddBatch(db, medicine);

            // Completed appointment
            var appointment = TestData.AddAppointment(db, patient, status: "completed");
            var prescription = TestData.AddPrescription(db, patient, appointment);
            TestData.AddPrescriptionItem(db, prescription, medicine, batch);

            var service = new MedicineService(db.Context);

            // Delete without force
            var resultNoForce = await service.DeleteBatchAsync(batch.Id, force: false);
            Assert.True(resultNoForce.IsFailure);
            Assert.Contains("WARNING:", resultNoForce.Message);

            // Check it was not deleted
            var batchInDb1 = await db.Context.TblMedicineBatches.FindAsync(batch.Id);
            Assert.NotNull(batchInDb1);
            Assert.False(batchInDb1.DeleteFlag);

            // Delete with force
            var resultForce = await service.DeleteBatchAsync(batch.Id, force: true);
            Assert.True(resultForce.IsSuccess);

            // Check it was soft deleted
            var batchInDb2 = await db.Context.TblMedicineBatches.FindAsync(batch.Id);
            Assert.NotNull(batchInDb2);
            Assert.True(batchInDb2.DeleteFlag);
        }
    }
}
