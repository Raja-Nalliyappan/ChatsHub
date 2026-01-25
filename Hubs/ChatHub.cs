using ChatsHub.Models;
using ChatsHub.Repository.Interface;
using Microsoft.AspNetCore.SignalR;

public class ChatHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        int? userId = httpContext?.Session.GetInt32("UserId");

        // Fallback: query string for WebSocket connections
        if (!userId.HasValue && httpContext?.Request.Query["userId"].Count > 0)
        {
            if (int.TryParse(httpContext.Request.Query["userId"], out int qsUserId))
                userId = qsUserId;
        }

        if (userId.HasValue)
        {
            Console.WriteLine($"User {userId.Value} connected: {Context.ConnectionId}");
            await Groups.AddToGroupAsync(Context.ConnectionId, userId.Value.ToString());
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

        if (!senderId.HasValue || string.IsNullOrWhiteSpace(message)) return;

        var createdAt = DateTime.Now;

        // ----- INSERT INTO DATABASE -----
        var usersRepo = httpContext.RequestServices.GetService<IUsersRepository>();
        var receiver = usersRepo.GetAllUsers().FirstOrDefault(u => u.Id == receiverId);

        usersRepo.InsertMessage(new Messages
        {
            SenderId = senderId.Value,
            ReceiverId = receiverId,
            Message = message,
            MessageReceiverName = receiver?.Name ?? "",
            CreateAt = createdAt
        });

        // ----- SEND TO RECEIVER -----
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