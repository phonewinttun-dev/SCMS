using Microsoft.EntityFrameworkCore;
using SCMS.Domain.Features.FollowUps;
using SCMS.Domain.Tests.TestSupport;
using SCMS.Shared;
using SCMS.Domain.DTOs.FollowUps;

namespace SCMS.Domain.Tests.FollowUps;

public class FollowUpServiceTests
{
    [Fact]
    public async Task CreateFollowUpAsync_AddsRecommendationAndReminderNotification()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user);
        var service = new FollowUpService(db.Context);

        var result = await service.CreateFollowUpAsync(new FollowUpRequest
        {
            PatientId = patient.PatientId,
            DueAt = DateTime.UtcNow.AddDays(7),
            Recommendation = "Review blood pressure and medication tolerance."
        });

        Assert.True(result.IsSuccess);
        Assert.Equal("pending", result.Data!.Status);
        Assert.True(await db.Context.TblFollowUps.AnyAsync(f => f.PatientId == patient.PatientId));
        Assert.True(await db.Context.TblNotifications.AnyAsync(n => n.UserId == user.UserId && n.Title == "Follow-up Scheduled"));
    }

    [Fact]
    public async Task CompleteFollowUpAsync_MarksFollowUpComplete()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user);
        var service = new FollowUpService(db.Context);
        var created = await service.CreateFollowUpAsync(new FollowUpRequest
        {
            PatientId = patient.PatientId,
            DueAt = DateTime.UtcNow.AddDays(3),
            Recommendation = "Check symptoms"
        });

        var result = await service.CompleteFollowUpAsync(created.Data!.Id);

        Assert.True(result.IsSuccess);
        Assert.Equal("completed", result.Data!.Status);
        Assert.NotNull(result.Data.CompletedAt);
    }

    [Fact]
    public async Task GetFollowUpsAsync_RestrictsPatientsToOwnedFollowUps()
    {
        using var db = new TestDatabase();
        var owner = TestData.AddUser(db);
        var otherUser = TestData.AddUser(db);
        var ownerPatient = TestData.AddPatient(db, owner, "Owner");
        var otherPatient = TestData.AddPatient(db, otherUser, "Other");
        var service = new FollowUpService(db.Context);
        await service.CreateFollowUpAsync(new FollowUpRequest { PatientId = ownerPatient.PatientId, DueAt = DateTime.UtcNow.AddDays(1), Recommendation = "Owned" });
        await service.CreateFollowUpAsync(new FollowUpRequest { PatientId = otherPatient.PatientId, DueAt = DateTime.UtcNow.AddDays(2), Recommendation = "Hidden" });

        var result = await service.GetFollowUpsAsync(null, owner.UserId, false, new PaginationRequest());

        Assert.True(result.IsSuccess);
        var followUp = Assert.Single(result.Data);
        Assert.Equal("Owned", followUp.Recommendation);
    }
}
