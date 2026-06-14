using SCMS.Domain.Features.Notifications;
using SCMS.Domain.Tests.TestSupport;
using SCMS.Shared;

namespace SCMS.Domain.Tests.Notifications;

public class NotificationServiceTests
{
    [Fact]
    public async Task GetNotificationsAsync_ReturnsUserAndBroadcastNotifications()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var otherUser = TestData.AddUser(db);
        var service = new NotificationService(db.Context);

        await service.CreateNotificationAsync(new SCMS.Domain.DTOs.Notifications.CreateNotificationRequest { UserId = user.UserId, Title = "Mine", Description = "User notification", ActionRoute = "/mine" });
        await service.CreateNotificationAsync(new SCMS.Domain.DTOs.Notifications.CreateNotificationRequest { UserId = null, Title = "Broadcast", Description = "Clinic alert", ActionRoute = "/alerts" });
        await service.CreateNotificationAsync(new SCMS.Domain.DTOs.Notifications.CreateNotificationRequest { UserId = otherUser.UserId, Title = "Other", Description = "Other notification", ActionRoute = "/other" });

        var result = await service.GetNotificationsAsync(user.UserId, new PaginationRequest());

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Data.Count);
        Assert.Contains(result.Data, x => x.Title == "Mine");
        Assert.Contains(result.Data, x => x.Title == "Broadcast");
        Assert.DoesNotContain(result.Data, x => x.Title == "Other");
    }

    [Fact]
    public async Task MarkAsReadAsync_AllowsOnlyOwnerAndHidesNotification()
    {
        using var db = new TestDatabase();
        var owner = TestData.AddUser(db);
        var stranger = TestData.AddUser(db);
        var service = new NotificationService(db.Context);
        await service.CreateNotificationAsync(new SCMS.Domain.DTOs.Notifications.CreateNotificationRequest { UserId = owner.UserId, Title = "Mine", Description = "Read me", ActionRoute = null });
        var notificationId = db.Context.TblNotifications.Single().Id;

        var strangerResult = await service.MarkAsReadAsync(notificationId, stranger.UserId);
        var ownerResult = await service.MarkAsReadAsync(notificationId, owner.UserId);
        var listResult = await service.GetNotificationsAsync(owner.UserId, new PaginationRequest());

        Assert.True(strangerResult.IsFailure);
        Assert.True(ownerResult.IsSuccess);
        Assert.Empty(listResult.Data);
    }

    [Fact]
    public async Task CreateNotificationAsync_RejectsMissingRequiredText()
    {
        using var db = new TestDatabase();
        var service = new NotificationService(db.Context);

        var result = await service.CreateNotificationAsync(new SCMS.Domain.DTOs.Notifications.CreateNotificationRequest { UserId = null, Title = " ", Description = " ", ActionRoute = null });

        Assert.True(result.IsFailure);
        Assert.Empty(db.Context.TblNotifications);
    }
}
