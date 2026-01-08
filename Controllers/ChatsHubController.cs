using ChatsHub.Models;
using ChatsHub.Repository.Interface;
using ChatsHub.Service;
using Microsoft.AspNetCore.Mvc;

namespace ChatsHub.Controllers
{
    [Route("chatsHub")]
    public class ChatsHubController : Controller
    {
        private readonly IUsersRepository _usersRepository;
        private readonly JwtTokenService _jwtTokenService;
        public ChatsHubController (IUsersRepository usersRepository, JwtTokenService jwtTokenService)
        {
            _usersRepository = usersRepository;
            _jwtTokenService = jwtTokenService;
        }

        [HttpGet("/")]
        public IActionResult Root()
        {
            return Redirect("/chatsHub/login");
        }

        [HttpGet("dashboard")]
        public IActionResult Index()
        {
            int currentUserId = 1;
            var users = _usersRepository.GetAllUsers();
            return View(users);
        }

        // AJAX: Get messages for selected user
        [HttpGet("GetMessages")]
        public IActionResult GetMessages(int otherUserId)
        {
            int currentUserId = 1;
            var messages = _usersRepository.GetMessages(currentUserId, otherUserId);
            return Json(messages);
        }

        // AJAX: Send message
        [HttpPost("SendMessage")]
        public IActionResult SendMessage(int receiverId,string messagereceivername, string message)
        {
            int currentUserId = 1;
            if (string.IsNullOrWhiteSpace(message))
                return BadRequest("Message cannot be empty");

            _usersRepository.InsertMessage(currentUserId, receiverId, message, messagereceivername);
            return Ok();
        }

        
        [HttpGet("login")]
        public IActionResult LoginPage()
        {
            return View();
        }

        [HttpPost("LoginUsers")]
        public IActionResult LoginUsers([FromBody] Users loginReqeust)
        {
      
            if(string.IsNullOrEmpty(loginReqeust.Email) || string.IsNullOrEmpty(loginReqeust.PasswordHash))
            {
                return Json(new { success = false, message = "Email and Password are required." });
            }

            var users = _usersRepository.GetNameAndPassword(loginReqeust.Email, loginReqeust.PasswordHash);

            if (users == null)
            {
                return Unauthorized(new { success = false, message = "Invalid email or password." });
            }
            else
            {
                var token = _jwtTokenService.GenerateToken(users);
                return Ok(new { success = true, message = "Welcome back! You are now logged in.", token = token, users = new { users.Id, users.Name, users.Email, users.Role } });
            } 
        }

        [HttpGet("GetChatUsers")]
        public IActionResult GetChatUsers()
        {
            int currentUserId = 1;
            var users = _usersRepository.GetChatUsers(currentUserId);
            return Json(users);
        }
    }
}
