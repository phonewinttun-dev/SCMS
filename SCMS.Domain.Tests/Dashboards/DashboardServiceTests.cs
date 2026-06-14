using System.Text.Json;
using SCMS.Domain.Features.Dashboards;
using SCMS.Domain.Features.Patients;
using SCMS.Domain.Tests.TestSupport;

namespace SCMS.Domain.Tests.Dashboards;

public class DashboardServiceTests
{
    [Fact]
    public async Task GetDoctorDashboardAsync_ReturnsTodayWorkloadRevenueAndInventoryAlerts()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user);
        var todayAppointment = TestData.AddAppointment(db, patient, DateTime.UtcNow.Date.AddHours(9), "confirmed");
        TestData.AddAppointment(db, patient, DateTime.UtcNow.AddDays(1), "pending");
        TestData.AddPayment(db, todayAppointment, status: "paid", amount: 25000m, paidAt: DateTime.UtcNow);
        var medicine = TestData.AddMedicine(db, "Low Stock Med");
        TestData.AddBatch(db, medicine, quantity: 5, expiryDate: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)));
        var service = new DashboardService(db.Context);

        var result = await service.GetDoctorDashboardAsync();

        Assert.True(result.IsSuccess);
        Assert.Equal(1, result.Data!.TodayAppointmentsCount);
        Assert.Single(result.Data.NextPatients);
        Assert.Equal(25000m, result.Data.DailyRevenue);
        Assert.Equal(1, result.Data.LowStockAlertsCount);
        Assert.Equal(1, result.Data.ExpiringBatchesCount);
    }

    [Fact]
    public async Task GetPatientDashboardAsync_ReturnsOnlySelectedUsersDashboardData()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var otherUser = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user, "Visible Patient");
        TestData.AddPatient(db, otherUser, "Hidden Patient");
        var appointment = TestData.AddAppointment(db, patient, DateTime.UtcNow.AddDays(1), "pending");
        TestData.AddPayment(db, appointment, status: "pending", amount: 15000m);
        var disease = TestData.AddDisease(db);
        var medicine = TestData.AddMedicine(db);
        var notes = JsonSerializer.Serialize(new 
        {
            ActualNotes = "Dashboard note"
        });
        var prescription = TestData.AddPrescription(db, patient, appointment, disease, notes);
        TestData.AddPrescriptionItem(db, prescription, medicine);
        var service = new DashboardService(db.Context);

        var result = await service.GetPatientDashboardAsync(user.UserId);

        Assert.True(result.IsSuccess);
        var data = result.Data!;
        Assert.Single(data.PatientProfiles);
        Assert.Equal("Visible Patient", data.PatientProfiles[0].Name);
        Assert.Single(data.UpcomingAppointments);
        Assert.Single(data.PrescriptionHistory);
        Assert.Single(data.OutstandingBalances);
    }
}
