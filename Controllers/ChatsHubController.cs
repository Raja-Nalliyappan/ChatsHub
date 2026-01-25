using ChatsHub.Models;
using ChatsHub.Repository.Interface;
using ChatsHub.Service;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Linq;
using System.Threading.Tasks;

[Route("chatsHub")]
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
    public IActionResult Root() => Redirect("/chatsHub/login");

    [HttpGet("dashboard")]
    public IActionResult Index()
    {
        int currentUserId = HttpContext.Session.GetInt32("UserId") ?? 0;
        if (currentUserId == 0) return Redirect("/chatsHub/login");

        ViewBag.UserId = currentUserId;
        ViewBag.UserName = HttpContext.Session.GetString("UserName");
        ViewBag.UserEmail = HttpContext.Session.GetString("Email");

        var users = _usersRepository.GetAllUsers();
        return View(users);
    }

    [HttpGet("GetChatUsers")]
    public IActionResult GetChatUsers()
    {
        int currentUserId = HttpContext.Session.GetInt32("UserId") ?? 0;
        var users = _usersRepository.GetChatUsers(currentUserId);
        return Json(users);
    }

    [HttpGet("GetMessages")]
    public IActionResult GetMessages(int otherUserId)
    {
        int currentUserId = HttpContext.Session.GetInt32("UserId") ?? 0;
        var messages = _usersRepository.GetMessages(currentUserId, otherUserId)
            .OrderBy(m => m.CreateAt)
            .Select(m => new
            {
                m.SenderId,
                m.ReceiverId,
                m.MessageReceiverName,
                m.Message,
                m.CreateAt
            });
        return Json(messages);
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
            message = "Login successful",
            token,
            user = new { user.Id, user.Name, user.Email, user.Role }
        });
    }
}
