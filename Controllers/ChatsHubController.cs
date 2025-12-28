using ChatsHub.Repository.Interface;
using Microsoft.AspNetCore.Mvc;

namespace ChatsHub.Controllers
{
    [Route("")]
    public class ChatsHubController : Controller
    {
        private readonly IUsersRepository _usersRepository;
        public ChatsHubController (IUsersRepository usersRepository)
        {
            _usersRepository = usersRepository;
        }

        [HttpGet("")]
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
        public IActionResult SendMessage(int receiverId, string message)
        {
            int currentUserId = 1;
            if (string.IsNullOrWhiteSpace(message))
                return BadRequest("Message cannot be empty");

            _usersRepository.InsertMessage(currentUserId, receiverId, message);
            return Ok();
        }

        public IActionResult LoginPage()
        {
            return View();
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
