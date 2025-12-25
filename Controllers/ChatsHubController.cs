using Microsoft.AspNetCore.Mvc;

namespace ChatsHub.Controllers
{
    public class ChatsHubController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult LoginPage()
        {
            return View();
        }
    }
}
