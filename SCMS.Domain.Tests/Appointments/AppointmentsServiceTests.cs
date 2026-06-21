using Microsoft.EntityFrameworkCore;
using SCMS.Domain.Features.Appointments;
using SCMS.Domain.DTOs.Appointments;
using SCMS.Domain.Tests.TestSupport;
using SCMS.Shared;

namespace SCMS.Domain.Tests.Appointments;

public class AppointmentsServiceTests
{
    [Fact]
    public async Task BookAppointmentAsync_CreatesPendingAppointmentAndNotification_ForOwner()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user, "Aye Aye");
        var service = TestServices.CreateAppointmentsService(db);

        var result = await service.BookAppointmentAsync(new BookAppointmentRequest
        {
            PatientId = patient.PatientId,
            Datetime = DateTime.UtcNow.AddHours(4),
            Notes = "Headache"
        }, user.UserId);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal("pending", result.Data.Status);

        var appointment = await db.Context.TblAppointments.SingleAsync();
        Assert.Equal(patient.PatientId, appointment.PatientId);
        Assert.Equal("pending", appointment.Status);
        Assert.StartsWith("APT-", appointment.AppointmentCode);

        var notification = await db.Context.TblNotifications.SingleAsync();
        Assert.Equal(user.UserId, notification.UserId);
        Assert.Contains("pending approval", notification.Description);
    }

    [Fact]
    public async Task BookAppointmentAsync_RejectsPatientOwnedByAnotherUser()
    {
        using var db = new TestDatabase();
        var owner = TestData.AddUser(db, "Owner");
        var otherUser = TestData.AddUser(db, "Other");
        var patient = TestData.AddPatient(db, owner);
        var service = TestServices.CreateAppointmentsService(db);

        var result = await service.BookAppointmentAsync(new BookAppointmentRequest
        {
            PatientId = patient.PatientId,
            Datetime = DateTime.UtcNow.AddHours(2)
        }, otherUser.UserId);

        Assert.True(result.IsFailure);
        Assert.Equal("Patient not found.", result.Message);
        Assert.Empty(db.Context.TblAppointments);
    }

    [Fact]
    public async Task UpdateAppointmentStatusAsync_RejectsInvalidStatus()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user);
        var appointment = TestData.AddAppointment(db, patient);
        var service = TestServices.CreateAppointmentsService(db);

        var result = await service.UpdateAppointmentStatusAsync(appointment.Id, new UpdateAppointmentStatusRequest
        {
            Status = "approved"
        });

        Assert.True(result.IsFailure);
        Assert.Equal("pending", (await db.Context.TblAppointments.FindAsync(appointment.Id))!.Status);
    }

    [Fact]
    public async Task GetAppointmentsAsync_FiltersByStatusAndPatient()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user);
        var otherPatient = TestData.AddPatient(db, user, "Other Patient");
        TestData.AddAppointment(db, patient, DateTime.UtcNow.AddHours(2), "confirmed");
        TestData.AddAppointment(db, patient, DateTime.UtcNow.AddHours(3), "pending");
        TestData.AddAppointment(db, otherPatient, DateTime.UtcNow.AddHours(4), "confirmed");
        var service = TestServices.CreateAppointmentsService(db);

        var result = await service.GetAppointmentsAsync(new AppointmentDetailsRequest
        {
            Status = "confirmed",
            PatientId = patient.PatientId
        }, new PaginationRequest());

        Assert.True(result.IsSuccess);
        Assert.Single(result.Data);
        Assert.Equal("confirmed", result.Data[0].Status);
        Assert.Equal(patient.PatientId, result.Data[0].PatientId);
    }

    [Fact]
    public async Task CallNextPatientAsync_ConfirmsNextPendingAppointmentAndNotifiesPatient()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user);
        var appointment = TestData.AddAppointment(db, patient, DateTime.UtcNow.Date.AddHours(10), "pending");
        var service = TestServices.CreateAppointmentsService(db);

        var result = await service.CallNextPatientAsync();

        Assert.True(result.IsSuccess);
        Assert.Equal("confirmed", result.Data!.Status);
        Assert.Equal("confirmed", (await db.Context.TblAppointments.FindAsync(appointment.Id))!.Status);
        Assert.Contains("It's Your Turn", db.Context.TblNotifications.Single().Title);
    }

    [Fact]
    public async Task CallNextPatientAsync_CompletesCurrentConfirmedAndConfirmsNextPending()
    {
        using var db = new TestDatabase();
        var currentUser = TestData.AddUser(db, "Current");
        var nextUser = TestData.AddUser(db, "Next");
        var currentPatient = TestData.AddPatient(db, currentUser, "Current Patient");
        var nextPatient = TestData.AddPatient(db, nextUser, "Next Patient");
        var current = TestData.AddAppointment(db, currentPatient, DateTime.UtcNow.Date.AddHours(9), "confirmed");
        var next = TestData.AddAppointment(db, nextPatient, DateTime.UtcNow.Date.AddHours(10), "pending");
        var service = TestServices.CreateAppointmentsService(db);

        var result = await service.CallNextPatientAsync();

        Assert.True(result.IsSuccess);
        Assert.Equal(next.Id, result.Data!.Id);
        Assert.Equal("completed", (await db.Context.TblAppointments.FindAsync(current.Id))!.Status);
        Assert.Equal("confirmed", (await db.Context.TblAppointments.FindAsync(next.Id))!.Status);
        Assert.Equal(nextUser.UserId, db.Context.TblNotifications.Single(n => n.Title == "It's Your Turn!").UserId);
    }

    [Fact]
    public async Task GetPatientQueueStatusAsync_AllowsOwnerOrStaffOnly()
    {
        using var db = new TestDatabase();
        var owner = TestData.AddUser(db);
        var stranger = TestData.AddUser(db);
        var staff = TestData.AddUser(db, role: "doctor");
        var patient = TestData.AddPatient(db, owner);
        var appointment = TestData.AddAppointment(db, patient, DateTime.UtcNow.Date.AddHours(10), "pending");
        var service = TestServices.CreateAppointmentsService(db);

        var ownerResult = await service.GetPatientQueueStatusAsync(appointment.Id, owner.UserId, isStaff: false);
        var strangerResult = await service.GetPatientQueueStatusAsync(appointment.Id, stranger.UserId, isStaff: false);
        var staffResult = await service.GetPatientQueueStatusAsync(appointment.Id, staff.UserId, isStaff: true);

        Assert.True(ownerResult.IsSuccess);
        Assert.True(strangerResult.IsFailure);
        Assert.Equal("Appointment not found.", strangerResult.Message);
        Assert.True(staffResult.IsSuccess);
    }

    [Fact]
    public async Task CallNextPatientAsync_FailsWhenTodayQueueIsEmpty()
    {
        using var db = new TestDatabase();
        var service = TestServices.CreateAppointmentsService(db);

        var result = await service.CallNextPatientAsync();

        Assert.True(result.IsFailure);
        Assert.Equal("No more patients in queue for today.", result.Message);
    }
}
