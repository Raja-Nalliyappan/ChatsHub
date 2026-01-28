namespace ChatsHub.Models.DtoFiles
{
    public class ChattedUserDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string Email { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Role { get; set; } = "";
        public bool IsActive { get; set; }
    }

}
