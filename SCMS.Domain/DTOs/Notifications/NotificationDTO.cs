using System;
using System.ComponentModel.DataAnnotations;

namespace SCMS.Domain.DTOs.Notifications
{
    public class CreateNotificationRequest
    {
        public int? UserId { get; set; }

        [Required(ErrorMessage = "Notification title is required.")]
        public string Title { get; set; } = null!;

        [Required(ErrorMessage = "Notification description is required.")]
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
