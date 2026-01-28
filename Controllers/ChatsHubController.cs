using ChatsHub.Models;
using ChatsHub.Repository;
using ChatsHub.Repository.Interface;
using ChatsHub.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Linq;
using System.Security.Claims;

[Route("chatshub")]
public class ChatsHubController : Controller
{
    private readonly IUsersRepository _usersRepository;
    private readonly JwtTokenService _jwtTokenService;
    private readonly IHubContext<ChatHub> _hubContext;

    public ChatsHubController(IUsersRepository usersRepository, JwtTokenService jwtTokenService, IHubContext<ChatHub> hubContext)
    {
        _usersRepository = usersRepository;
        _jwtTokenService = jwtTokenService;
        _hubContext = hubContext;
    }

    [HttpGet("/")]
    public IActionResult Root() => Redirect("/chatshub/login");

    [HttpGet("dashboard")]
    public IActionResult Index()
    {
        int currentUserId = HttpContext.Session.GetInt32("UserId") ?? 0;
        if (currentUserId == 0) return Redirect("/chatshub/login");

        ViewBag.UserId = currentUserId;
        ViewBag.UserName = HttpContext.Session.GetString("UserName");
        ViewBag.UserEmail = HttpContext.Session.GetString("Email");

        var users = _usersRepository.GetAllUsers();
        return View(users);
    }

    [Authorize]
    [HttpGet("GetChatUsers")]
    public IActionResult GetChatUsers()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized();

        int currentUserId = int.Parse(userIdClaim.Value);

        var users = _usersRepository.GetChatUsers(currentUserId);
        return Json(users);
    }


    [Authorize]
    [HttpGet("GetMessages")]
    public IActionResult GetMessages(int otherUserId)
    {
        int currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var encryption = HttpContext.RequestServices.GetRequiredService<EncryptionService>();

        var messages = _usersRepository
            .GetMessages(currentUserId, otherUserId)
            .OrderBy(m => m.CreateAt)
            .Select(m => new
            {
                m.SenderId,
                m.ReceiverId,
                // Safely decrypt each message
                Message = SafeDecrypt(encryption, m.Message),
                m.CreateAt
            });

        return Json(messages);
    }

    // Helper method to safely decrypt messages
    private string SafeDecrypt(EncryptionService encryption, string encryptedMessage)
    {
        try
        {
            return encryption.Decrypt(encryptedMessage);
        }
        catch
        {
            // If decryption fails (old messages or plain text), return as-is
            return encryptedMessage;
        }
    }



    [HttpGet("login")]
    public IActionResult LoginPage() => View();

    [HttpPost("LoginUsers")]
    public IActionResult LoginUsers([FromBody] Users loginRequest)
    {
        if (string.IsNullOrEmpty(loginRequest.Email) || string.IsNullOrEmpty(loginRequest.PasswordHash))
            return Json(new { success = false, message = "Email and password required" });

        var user = _usersRepository.GetNameAndPassword(loginRequest.Email, loginRequest.PasswordHash);
        if (user == null)
            return Unauthorized(new { success = false, message = "Invalid email or password" });

        HttpContext.Session.SetInt32("UserId", user.Id);
        HttpContext.Session.SetString("UserName", user.Name);
        HttpContext.Session.SetString("Email", user.Email);

        var token = _jwtTokenService.GenerateToken(user);

        return Ok(new
        {
            success = true,
            message = "Login successful ! Welcome back",
            token,
            user = new { user.Id, user.Name, user.Email, user.Role }
        });
    }

    //[Authorize]
    //[HttpGet("GetAllUsers")]
    //public IActionResult GetAllUsers()
    //{
    //    var allUsers = _usersRepository.GetAllUsers();
    //    return Json(allUsers);
    //}

    [Authorize]
    [HttpDelete("Chats/DeleteChat")]
    public IActionResult DeleteChat(int receiverId)
    {
        int currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // Delete all messages where current user is sender OR receiver
        bool result = _usersRepository.DeleteChat(currentUserId, receiverId);

        return result
            ? Ok(new { message = "Your chat deleted" })
            : NotFound(new { message = "No messages found" });
    }


    [HttpGet("GetChattedUsers")]
    public async Task<IActionResult> GetChattedUsers()
    {
        int currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var users = await _usersRepository.GetChattedUsersAsync(currentUserId);

        return Ok(users);
    }

}

