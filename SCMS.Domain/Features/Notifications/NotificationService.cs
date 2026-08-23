using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SCMS.Database.Models;
using SCMS.Domain.Features.Notifications.Models;
using SCMS.Domain.Realtime;
using SCMS.Shared;

namespace SCMS.Domain.Features.Notifications
{
    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<NotificationsHub>? _hubContext;
        private readonly ILogger<NotificationService>? _logger;

        public NotificationService(
            AppDbContext context, 
            IHubContext<NotificationsHub>? hubContext = null,
            ILogger<NotificationService>? logger = null)
        {
            _context = context;
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task<PagedResult<GetNotificationsResponse>> GetNotificationsAsync(GetNotificationsRequest request, int? userId, bool isStaff = false)
        {
            request ??= new GetNotificationsRequest();
            if (request.PageNumber <= 0) request.PageNumber = 1;
            if (request.PageSize <= 0) request.PageSize = 10;

            var query = _context.TblNotifications
                .AsNoTracking()
                .Where(n => n.DeleteFlag != true);

            if (userId.HasValue)
            {
                if (isStaff)
                {
                    // Staff can see both user-specific notifications and clinic broadcasts
                    query = query.Where(n => n.UserId == userId.Value || n.UserId == null);
                }
                else
                {
                    // Regular patients should ONLY receive their own notifications
                    query = query.Where(n => n.UserId == userId.Value);
                }
            }
            else
            {
                // Staff/Clinic broad alerts only
                query = query.Where(n => n.UserId == null);
            }

            var totalCount = await query.CountAsync();
            var notifications = await query
                .OrderBy(n => n.Id)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync();

            var list = notifications.Select(n => new GetNotificationsResponse
            {
                Id = n.Id,
                Title = n.Title,
                Description = n.Description,
                ActionRoute = n.ActionRoute,
                CreatedAt = n.CreatedAt ?? DateTime.UtcNow
            }).ToList();

            var pagination = new Pagination(request.PageNumber, request.PageSize, totalCount);
            return PagedResult<GetNotificationsResponse>.Success(list, pagination);
        }

        public async Task<Result> MarkAsReadAsync(int notificationId, int userId)
        {
            var n = await _context.TblNotifications.FindAsync(notificationId);
            if (n == null)
            {
                return Result.Failure("Notification not found.");
            }
            if (n.UserId != userId)
            {
                return Result.Failure("Notification not found for this user.");
            }

            n.DeleteFlag = true; // Use delete_flag to hide
            n.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Result.Success("Notification marked as read.");
        }

        public async Task<Result<CreateNotificationResponse>> CreateNotificationAsync(CreateNotificationRequest request)
        {
            var result = await CreateNotificationAsync(request.UserId, request.Title, request.Description, request.ActionRoute);
            if (result.IsFailure || result.Data == null)
            {
                return Result<CreateNotificationResponse>.Failure(result.Message ?? "Failed to create notification.");
            }

            var response = new CreateNotificationResponse
            {
                Id = result.Data.Id,
                Title = result.Data.Title,
                Description = result.Data.Description,
                ActionRoute = result.Data.ActionRoute,
                CreatedAt = result.Data.CreatedAt
            };

            return Result<CreateNotificationResponse>.Success(response, result.Message);
        }

        public async Task<Result<NotificationResponse>> CreateNotificationAsync(int? userId, string title, string description, string? actionRoute)
        {
            var n = new TblNotification
            {
                UserId = userId,
                Title = title.Trim(),
                Description = description.Trim(),
                ActionRoute = actionRoute,
                CreatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };

            _context.TblNotifications.Add(n);
            await _context.SaveChangesAsync();

            var response = new NotificationResponse
            {
                Id = n.Id,
                Title = n.Title,
                Description = n.Description,
                ActionRoute = n.ActionRoute,
                CreatedAt = n.CreatedAt ?? DateTime.UtcNow
            };

            try
            {
                if (_hubContext != null)
                {
                    if (userId.HasValue)
                    {
                        var userKey = userId.Value.ToString();
                        await _hubContext.Clients.User(userKey).SendAsync("ReceiveNotification", response);
                        await _hubContext.Clients.Group($"user-{userKey}").SendAsync("ReceiveNotification", response);
                        await _hubContext.Clients.User(userKey).SendAsync("NotificationsChanged");
                        await _hubContext.Clients.Group($"user-{userKey}").SendAsync("NotificationsChanged");
                    }
                    else
                    {
                        await _hubContext.Clients.Group("clinic-notifications").SendAsync("ReceiveNotification", response);
                        await _hubContext.Clients.Group("clinic-notifications").SendAsync("NotificationsChanged");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "SignalR broadcast notification failed for user {UserId}", userId);
            }

            return Result<NotificationResponse>.Success(response, "Notification created.");
        }

        public async Task<int> CleanupSoftDeletedNotificationsAsync(int daysOld = 30)
        {
            var cutoff = DateTime.UtcNow.AddDays(-daysOld);
            var oldNotifications = await _context.TblNotifications
                .Where(n => n.DeleteFlag == true && n.CreatedAt < cutoff)
                .ToListAsync();

            if (oldNotifications.Count > 0)
            {
                _context.TblNotifications.RemoveRange(oldNotifications);
                return await _context.SaveChangesAsync();
            }

            return 0;
        }
    }
}
