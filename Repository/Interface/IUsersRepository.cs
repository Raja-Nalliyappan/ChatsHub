using ChatsHub.Models;
using ChatsHub.Models.DtoFiles;

namespace ChatsHub.Repository.Interface
{
    public interface IUsersRepository
    {
        //List<Users> GetAllUsers();
        List<Users> GetChatUsers(int currentUserId);
        List<Messages> GetMessages(int currentUserId, int otherUserId);
        Users GetNameAndPassword(string email, string password);
        void InsertMessage(Messages msg);
        bool DeleteChat(int senderId, int receiverId);
        Task<List<ChattedUserDto>> GetChattedUsersAsync(int currentUserId);
    }
}
