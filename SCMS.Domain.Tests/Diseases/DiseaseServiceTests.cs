using Microsoft.EntityFrameworkCore;
using SCMS.Database.Models;
using SCMS.Domain.Features.Diseases;
using SCMS.Shared;
using SCMS.Domain.DTOs.Diseases;
using SCMS.Domain.Tests.TestSupport;
using Xunit;

namespace SCMS.Domain.Tests.Diseases
{
    public class DiseaseServiceTests : IDisposable
    {
        private readonly TestDatabase _db;
        private readonly AppDbContext _context;
        private readonly DiseaseService _diseaseService;

        public DiseaseServiceTests()
        {
            _db = new TestDatabase();
            _context = _db.Context;
            _diseaseService = new DiseaseService(_context);
        }

        public void Dispose()
        {
            _db.Dispose();
        }

        [Fact]
        public async Task CreateDisease_ShouldReturnSuccess_WhenValidRequest()
        {
            // Arrange
            var request = new CreateDiseaseRequest
            {
                Name = "Diabetes",
                Description = "Chronic condition affecting blood sugar levels"
            };

            // Act
            var result = await _diseaseService.CreateDiseaseAsync(request);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);
            Assert.Equal("Diabetes", result.Data.Name);
            Assert.Equal("Chronic condition affecting blood sugar levels", result.Data.Description);
        }

        [Fact]
        public async Task CreateDisease_ShouldReturnFailure_WhenNameIsEmpty()
        {
            // Arrange
            var request = new CreateDiseaseRequest
            {
                Name = "",
                Description = "Test description"
            };

            // Act
            var result = await _diseaseService.CreateDiseaseAsync(request);

            // Assert
            Assert.False(result.IsSuccess);
            Assert.Contains("Disease name is required", result.Message!);
        }

        [Fact]
        public async Task UpdateDisease_ShouldReturnSuccess_WhenValidRequest()
        {
            // Arrange
            var disease = new TblDisease
            {
                Name = "Hypertension",
                Description = "High blood pressure",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _context.TblDiseases.Add(disease);
            await _context.SaveChangesAsync();

            var request = new UpdateDiseaseRequest
            {
                Id = disease.Id,
                Name = "Hypertension Updated",
                Description = "Updated description for high blood pressure"
            };

            // Act
            var result = await _diseaseService.UpdateDiseaseAsync(request);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);
            Assert.Equal("Hypertension Updated", result.Data.Name);
            Assert.Equal("Updated description for high blood pressure", result.Data.Description);
        }

        [Fact]
        public async Task UpdateDisease_ShouldReturnFailure_WhenNameIsEmpty()
        {
            // Arrange
            var disease = new TblDisease
            {
                Name = "Asthma",
                Description = "Respiratory condition",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _context.TblDiseases.Add(disease);
            await _context.SaveChangesAsync();

            var request = new UpdateDiseaseRequest
            {
                Id = disease.Id,
                Name = "",
                Description = "Updated description"
            };

            // Act
            var result = await _diseaseService.UpdateDiseaseAsync(request);

            // Assert
            Assert.False(result.IsSuccess);
            Assert.Contains("Disease name is required", result.Message!);
        }

        [Fact]
        public async Task DeactivateDisease_ShouldReturnSuccess_WhenDiseaseNotReferenced()
        {
            // Arrange
            var disease = new TblDisease
            {
                Name = "Arthritis",
                Description = "Joint inflammation",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _context.TblDiseases.Add(disease);
            await _context.SaveChangesAsync();

            // Act
            var result = await _diseaseService.DeactivateDiseaseAsync(disease.Id);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.True(result.Data);

            // Verify the disease is actually deactivated (soft delete)
            var deactivatedDisease = await _context.TblDiseases.FindAsync(disease.Id);
            Assert.True(deactivatedDisease!.DeleteFlag);
        }

        [Fact]
        public async Task DeactivateDisease_ShouldReturnFailure_WhenDiseaseIsReferenced()
        {
            // Arrange
            var user = TestData.AddUser(_db);
            var patient = TestData.AddPatient(_db, user);
            var appointment = TestData.AddAppointment(_db, patient);

            var disease = new TblDisease
            {
                Name = "Cancer",
                Description = "Malignant disease",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _context.TblDiseases.Add(disease);
            await _context.SaveChangesAsync();

            // Create a prescription referencing this disease
            var prescription = new TblPrescription
            {
                AppointmentId = appointment.Id,
                PatientId = patient.PatientId,
                DiseaseId = disease.Id,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _context.TblPrescriptions.Add(prescription);
            await _context.SaveChangesAsync();

            // Act
            var result = await _diseaseService.DeactivateDiseaseAsync(disease.Id);

            // Assert
            Assert.False(result.IsSuccess);
            Assert.Contains("Cannot deactivate disease as it is referenced in active prescriptions", result.Message!);

            // Verify the disease is still active
            var activeDisease = await _context.TblDiseases.FindAsync(disease.Id);
            Assert.False(activeDisease!.DeleteFlag);
        }

        [Fact]
        public async Task GetDiseasesAsync_ShouldReturnDiseases_WhenCalled()
        {
            // Arrange
            var disease1 = new TblDisease
            {
                Name = "Flu",
                Description = "Influenza virus",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            var disease2 = new TblDisease
            {
                Name = "Cold",
                Description = "Common cold",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _context.TblDiseases.AddRange(disease1, disease2);
            await _context.SaveChangesAsync();

            // Act
            var result = await _diseaseService.GetDiseasesAsync(string.Empty, new PaginationRequest { PageNumber = 1, PageSize = 10 });

            // Assert
            Assert.True(result.IsSuccess);
            Assert.Equal(2, result.Data.Count);
            Assert.Contains(result.Data, d => d.Name == "Flu");
            Assert.Contains(result.Data, d => d.Name == "Cold");
        }

        [Fact]
        public async Task GetDiseasesAsync_ShouldFilterByQuery_WhenProvided()
        {
            // Arrange
            var disease1 = new TblDisease
            {
                Name = "Diabetes Mellitus",
                Description = "Sugar diabetes",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            var disease2 = new TblDisease
            {
                Name = "Hypertension",
                Description = "High blood pressure",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _context.TblDiseases.AddRange(disease1, disease2);
            await _context.SaveChangesAsync();

            // Act
            var result = await _diseaseService.GetDiseasesAsync("diabetes", new PaginationRequest { PageNumber = 1, PageSize = 10 });

            // Assert
            Assert.True(result.IsSuccess);
            Assert.Single(result.Data);
            Assert.Equal("Diabetes Mellitus", result.Data[0].Name);
        }

        [Fact]
        public async Task GetDiseasesAsync_ShouldExcludeDeactivatedDiseases_ByDefault()
        {
            // Arrange
            var disease1 = new TblDisease
            {
                Name = "Measles",
                Description = "Viral infection",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            var disease2 = new TblDisease
            {
                Name = "Mumps",
                Description = "Another viral infection",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = true // Deactivated
            };
            _context.TblDiseases.AddRange(disease1, disease2);
            await _context.SaveChangesAsync();

            // Act
            var result = await _diseaseService.GetDiseasesAsync(string.Empty, new PaginationRequest { PageNumber = 1, PageSize = 10 });

            // Assert
            Assert.True(result.IsSuccess);
            Assert.Single(result.Data); // Only the active disease should be returned
            Assert.Equal("Measles", result.Data[0].Name);
        }
    }
}