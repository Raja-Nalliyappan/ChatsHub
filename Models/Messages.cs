using System;

namespace ChatsHub.Models
{
    public class Messages
    {
        public int Id { get; set; }
        public int SenderId { get; set; }
        public int ReceiverId { get; set; }
        public string MessageReceiverName { get; set; }
        public string Message { get; set; }
        public DateTime CreateAt { get; set; }
    }
}
