using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SCMS.Database.Models;
using SCMS.Domain.DTOs.Notifications;
using SCMS.Shared;
using Microsoft.AspNetCore.SignalR;
using SCMS.Domain.Realtime;

namespace SCMS.Domain.Features.Notifications
{
    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<NotificationsHub>? _hubContext;

        public NotificationService(AppDbContext context, IHubContext<NotificationsHub>? hubContext = null)
        {
            _context = context;
            _hubContext = hubContext;
        }

        public async Task<PagedResult<NotificationResponse>> GetNotificationsAsync(int? userId, PaginationRequest paginationRequest)
        {
            var query = _context.TblNotifications
                .Where(n => n.DeleteFlag != true);

            if (userId.HasValue)
            {
                // Returns user's notifications + system broadcast alerts (where UserId is null)
                query = query.Where(n => n.UserId == userId.Value || n.UserId == null);
            }
            else
            {
                // Staff/Clinic broad alerts only
                query = query.Where(n => n.UserId == null);
            }

            var totalCount = await query.CountAsync();
            var notifications = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((paginationRequest.PageNumber - 1) * paginationRequest.PageSize)
                .Take(paginationRequest.PageSize)
                .ToListAsync();

            var list = notifications.Select(n => new NotificationResponse
            {
                Id = n.Id,
                Title = n.Title,
                Description = n.Description,
                ActionRoute = n.ActionRoute,
                CreatedAt = n.CreatedAt ?? DateTime.UtcNow
            }).ToList();

            var pagination = new Pagination(paginationRequest.PageNumber, paginationRequest.PageSize, totalCount);
            return PagedResult<NotificationResponse>.Success(list, pagination);
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

        public async Task<Result<NotificationResponse>> CreateNotificationAsync(CreateNotificationRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return Result<NotificationResponse>.Failure("Notification title is required.");
            }
            if (string.IsNullOrWhiteSpace(request.Description))
            {
                return Result<NotificationResponse>.Failure("Notification description is required.");
            }

            var n = new TblNotification
            {
                UserId = request.UserId,
                Title = request.Title.Trim(),
                Description = request.Description.Trim(),
                ActionRoute = request.ActionRoute,
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
                    if (request.UserId.HasValue)
                    {
                        await _hubContext.Clients.User(request.UserId.Value.ToString()).SendAsync("ReceiveNotification", response);
                    }
                    else
                    {
                        await _hubContext.Clients.Group("clinic-notifications").SendAsync("ReceiveNotification", response);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"SignalR Broadcast failed: {ex.Message}");
            }

            return Result<NotificationResponse>.Success(response, "Notification created.");
        }
    }
}
