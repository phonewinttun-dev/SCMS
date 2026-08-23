using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SCMS.Domain.Security;

namespace SCMS.Domain.Realtime
{
    [Authorize]
    public class NotificationsHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.GetUserId();
            if (userId.HasValue)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId.Value}");
            }

            if (Context.User?.IsStaff() == true)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "clinic-notifications");
            }
            await base.OnConnectedAsync();
        }
    }
}
