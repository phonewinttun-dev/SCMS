using System;

namespace SCMS.Domain.DTOs.Notifications
{
    public class CreateNotificationRequest
        {
            public int? UserId { get; set; }
            public string Title { get; set; } = null!;
            public string Description { get; set; } = null!;
            public string? ActionRoute { get; set; }
        }

    public class NotificationResponse
        {
            public int Id { get; set; }
            public string Title { get; set; } = null!;
            public string? Description { get; set; }
            public string? ActionRoute { get; set; }
            public DateTime CreatedAt { get; set; }
        }
}
