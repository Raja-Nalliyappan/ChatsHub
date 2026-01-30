using ChatsHub.Models;
using ChatsHub.Repository.Interface;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.Text.RegularExpressions;

public class ChatHub : Hub
{
    private int? GetUserId()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
        return userIdClaim != null ? int.Parse(userIdClaim.Value) : null;
    }

    private string GetUserName()
    {
        return Context.User?.Identity?.Name ?? "Unknown";
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();

        if (userId.HasValue)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, userId.Value.ToString());
            Console.WriteLine($"User {userId.Value} connected");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();

        if (userId.HasValue)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId.Value.ToString());
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(string message, int receiverId)
    {
        var senderId = GetUserId();
        var senderName = GetUserName();

        if (!senderId.HasValue) return;

        var services = Context.GetHttpContext()!.RequestServices;
        var usersRepo = services.GetRequiredService<IUsersRepository>();
        var encryption = services.GetRequiredService<EncryptionService>();

        string encryptedMessage = encryption.Encrypt(message);
        var createdAt = DateTime.Now;

        var receiver = usersRepo.GetAllUsers()
                                .FirstOrDefault(u => u.Id == receiverId);

        // ✅ Save message and get the DB ID
        int messageId = usersRepo.InsertMessage(new Messages
        {
            SenderId = senderId.Value,
            ReceiverId = receiverId,
            Message = encryptedMessage,
            MessageReceiverName = receiver?.Name ?? "",
            CreateAt = createdAt
        });

        // ✅ Include the message ID when sending to clients
        await Clients.Group(receiverId.ToString())
            .SendAsync("ReceiveMessage", senderName, message, receiverId, senderId.Value, createdAt, receiver, messageId);

        await Clients.Group(senderId.Value.ToString())
            .SendAsync("ReceiveMessage", senderName, message, receiverId, senderId.Value, createdAt, receiver, messageId);
    }



}
