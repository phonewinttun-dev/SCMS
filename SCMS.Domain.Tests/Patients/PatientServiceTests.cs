using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SCMS.Domain.Features.Patients;
using SCMS.Domain.DTOs;
using SCMS.Domain.Tests.TestSupport;
using SCMS.Shared;

namespace SCMS.Domain.Tests.Patients;

public class PatientServiceTests
{
    [Fact]
    public async Task AddPatientProfileAsync_SavesMedicalMetadataAndListShowsOwnerProfilesOnly()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var otherUser = TestData.AddUser(db);
        TestData.AddPatient(db, otherUser, "Hidden Patient");
        var service = TestServices.CreatePatientService(db);

        var createResult = await service.AddPatientProfileAsync(new PatientProfileRequest
        {
            Name = " Mg Mg ",
            ActualAddress = "Yangon",
            Allergies = "Aspirin",
            ChronicConditions = "Asthma"
        }, user.UserId);

        Assert.True(createResult.IsSuccess);
        Assert.Equal("Mg Mg", createResult.Data!.Name);
        Assert.Equal("Aspirin", createResult.Data.Allergies);

        var listResult = await service.GetPatientProfilesAsync(user.UserId, new PaginationRequest());
        Assert.True(listResult.IsSuccess);
        Assert.Single(listResult.Data);
        Assert.Equal("Mg Mg", listResult.Data[0].Name);
    }

    [Fact]
    public async Task GetPatientProfilesAsync_ReturnsAllProfilesForStaff()
    {
        using var db = new TestDatabase();
        var staff = TestData.AddUser(db, role: "owner");
        var firstUser = TestData.AddUser(db);
        var secondUser = TestData.AddUser(db);
        TestData.AddPatient(db, firstUser, "Aye Aye");
        TestData.AddPatient(db, secondUser, "Mg Mg");
        TestData.AddPatient(db, secondUser, "Deleted", deleted: true);
        var service = TestServices.CreatePatientService(db);

        var listResult = await service.GetPatientProfilesAsync(staff.UserId, new PaginationRequest(), isStaff: true);

        Assert.True(listResult.IsSuccess);
        Assert.Equal(2, listResult.Data.Count);
        Assert.Equal(new[] { "Aye Aye", "Mg Mg" }, listResult.Data.Select(p => p.Name));
    }

    [Fact]
    public async Task AddPatientProfileAsync_StaffCreatesProfileForMatchingPatientUser()
    {
        using var db = new TestDatabase();
        var staff = TestData.AddUser(db, role: "doctor");
        var patientUser = TestData.AddUser(db, "Patient User");
        var service = TestServices.CreatePatientService(db);

        var result = await service.AddPatientProfileAsync(new PatientProfileRequest
        {
            Name = "Clinic Created",
            Email = patientUser.Email
        }, staff.UserId, isStaff: true);

        Assert.True(result.IsSuccess);
        Assert.Equal(patientUser.UserId, result.Data!.UserId);
        Assert.Equal(patientUser.UserId, db.Context.TblPatients.Single().UserId);
    }

    [Fact]
    public async Task AddPatientProfileAsync_StaffRequiresMatchingPatientUser()
    {
        using var db = new TestDatabase();
        var staff = TestData.AddUser(db, role: "doctor");
        var service = TestServices.CreatePatientService(db);

        var result = await service.AddPatientProfileAsync(new PatientProfileRequest
        {
            Name = "No Account",
            Email = "missing@example.test"
        }, staff.UserId, isStaff: true);

        Assert.True(result.IsFailure);
        Assert.Equal("Patient user account not found for the provided email or mobile number.", result.Message);
        Assert.Empty(db.Context.TblPatients);
    }

    [Fact]
    public async Task GetPatientProfileByIdAsync_AllowsOwnerOrAdminOnly()
    {
        using var db = new TestDatabase();
        var owner = TestData.AddUser(db);
        var stranger = TestData.AddUser(db);
        var admin = TestData.AddUser(db, role: "owner");
        var patient = TestData.AddPatient(db, owner);
        var service = TestServices.CreatePatientService(db);

        var ownerResult = await service.GetPatientProfileByIdAsync(patient.PatientId, owner.UserId);
        var strangerResult = await service.GetPatientProfileByIdAsync(patient.PatientId, stranger.UserId);
        var adminResult = await service.GetPatientProfileByIdAsync(patient.PatientId, admin.UserId);

        Assert.True(ownerResult.IsSuccess);
        Assert.True(strangerResult.IsFailure);
        Assert.True(adminResult.IsSuccess);
    }

    [Fact]
    public async Task GetPatientHistoryAsync_ReturnsAppointmentsPrescriptionsDiagnosisAndLabRequests()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user);
        var appointment = TestData.AddAppointment(db, patient, DateTime.UtcNow.AddDays(-2), "completed");
        var disease = TestData.AddDisease(db, "Flu");
        var medicine = TestData.AddMedicine(db, "Cetirizine");
        var batch = TestData.AddBatch(db, medicine);
        var notes = JsonSerializer.Serialize(new 
        {
            ActualNotes = "Rest well",
            LabTestRequests = "CBC"
        });
        var prescription = TestData.AddPrescription(db, patient, appointment, disease, "Rest well", "CBC");
        TestData.AddPrescriptionItem(db, prescription, medicine, batch);
        var service = TestServices.CreatePatientService(db);

        var result = await service.GetPatientHistoryAsync(patient.PatientId, user.UserId);

        Assert.True(result.IsSuccess);
        Assert.Contains(result.Data!.Timeline, x => x.Type == "Appointment");
        Assert.Contains(result.Data.Timeline, x => x.Type == "Prescription");
        Assert.Contains(result.Data.Timeline, x => x.Type == "Diagnosis");
        Assert.Contains(result.Data.Timeline, x => x.Type == "Lab Request" && x.Description.Contains("CBC"));
    }

    [Fact]
    public async Task GetMedicalSummaryAsync_ReturnsVitalsAndActivePrescriptions()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user, ActualAddress: "Some Address");
        patient.Allergies = "Penicillin";
        patient.ChronicConditions = "Diabetes";
        db.Context.SaveChanges();

        var appointment = TestData.AddAppointment(db, patient, DateTime.UtcNow.AddDays(-1), "completed");
        var disease = TestData.AddDisease(db);
        var medicine = TestData.AddMedicine(db);
        var prescription = TestData.AddPrescription(db, patient, appointment, disease, "Rest well", null);
        prescription.TemperatureC = 37.5;
        prescription.PulseBpm = 88;
        prescription.Spo2Percent = 98;
        prescription.HeightCm = 165;
        prescription.Bmi = 22.04;
        db.Context.SaveChanges();
        TestData.AddPrescriptionItem(db, prescription, medicine);
        var service = TestServices.CreatePatientService(db);

        var result = await service.GetMedicalSummaryAsync(patient.PatientId, user.UserId);

        Assert.True(result.IsSuccess);
        Assert.Equal("Penicillin", result.Data!.Allergies);
        Assert.Single(result.Data.VitalsHistory);
        Assert.Single(result.Data.ActivePrescriptions);
        Assert.Equal(37.5, result.Data.VitalsHistory[0].TemperatureC);
    }
}
