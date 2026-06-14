using System.Threading.Tasks;
using SCMS.Domain.DTOs.Notifications;
using SCMS.Shared;

namespace SCMS.Domain.Features.Notifications
{
    public interface INotificationService
    {
        Task<PagedResult<NotificationResponse>> GetNotificationsAsync(int? userId, PaginationRequest paginationRequest);
        Task<Result> MarkAsReadAsync(int notificationId, int userId);
        Task<Result<NotificationResponse>> CreateNotificationAsync(CreateNotificationRequest request);
    }
}
