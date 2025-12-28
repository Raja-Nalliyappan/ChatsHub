namespace ChatsHub.Models
{
    public class Messages
    {
        public int Id { get; set; }
        public int SenderId { get; set; }
        public int ReceiverId { get; set; }
        public string Massage { get; set; }
        public DateTime CreateAt { get; set; }

    }
}
