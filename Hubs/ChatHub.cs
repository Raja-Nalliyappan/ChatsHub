using Microsoft.AspNetCore.SignalR;

public class ChatHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        int? userId = httpContext?.Session.GetInt32("UserId");

        // If session doesn't exist, try query string (for WebSockets)
        if (!userId.HasValue && httpContext?.Request.Query["userId"].Count > 0 == true)
        {
            if (int.TryParse(httpContext.Request.Query["userId"], out int qsUserId))
                userId = qsUserId;
        }

        if (userId.HasValue)
        {
            Console.WriteLine($"User {userId.Value} connected: {Context.ConnectionId}");
            await Groups.AddToGroupAsync(Context.ConnectionId, userId.Value.ToString());
        }
        else
        {
            Console.WriteLine("No UserId found in session or query string on connection");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception exception)
    {
        var httpContext = Context.GetHttpContext();
        int? userId = httpContext?.Session.GetInt32("UserId");

        if (userId.HasValue)
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId.Value.ToString());

        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(string message, int receiverId)
    {
        var httpContext = Context.GetHttpContext();
        int? senderId = httpContext?.Session.GetInt32("UserId");
        string senderName = httpContext?.Session.GetString("UserName") ?? "Unknown";

        // Fallback to query string if session is null
        if (!senderId.HasValue && httpContext?.Request.Query["userId"].Count > 0 == true)
        {
            if (int.TryParse(httpContext.Request.Query["userId"], out int qsUserId))
                senderId = qsUserId;
        }

        if (!senderId.HasValue || string.IsNullOrWhiteSpace(message)) return;

        var createdAt = DateTime.Now;

        // Send to receiver
        await Clients.Group(receiverId.ToString())
            .SendAsync("ReceiveMessage", senderName, message, receiverId, senderId.Value, createdAt);

        // Echo to sender
        await Clients.Group(senderId.Value.ToString())
            .SendAsync("ReceiveMessage", senderName, message, receiverId, senderId.Value, createdAt);

        // Notification
        await Clients.Group(receiverId.ToString())
            .SendAsync("ReceiveNotification", new
            {
                FromUserId = senderId.Value,
                FromUserName = senderName,
                Message = message,
                Time = createdAt
            });
    }
}
