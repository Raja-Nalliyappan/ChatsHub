using ChatsHub.Models;
using ChatsHub.Repository.Interface;
using Dapper;
using Microsoft.Data.SqlClient;
using System.Data;

namespace ChatsHub.Repository
{
    public class UsersRepository : IUsersRepository
    {
        private readonly IDbConnection _dbConnection;
        public UsersRepository(IConfiguration configuration)
        {
            _dbConnection = new SqlConnection(configuration.GetConnectionString("DefaultConnection"));
        }

        public List<Users> GetAllUsers()
        {
            string AllUsers = "Select * from Users";

            List<Users> UserList = _dbConnection.Query<Users>(AllUsers).ToList();

            return UserList;
        }

        public List<Users> GetChatUsers(int currentUserId)
        {
            return _dbConnection.Query<Users>("GetChatUsers",new { CurrentUserId = currentUserId }, commandType: CommandType.StoredProcedure).ToList();
        }

        public List<Messages> GetMessages(int currentUserId, int otherUserId)
        {
            return _dbConnection.Query<Messages>("GetMessages", new { CurrentUserId = currentUserId, OtherUserId = otherUserId }, commandType: CommandType.StoredProcedure).ToList();
        }

        public void InsertMessage(int senderId, int receiverId, string message)
        {
            _dbConnection.Execute("InsertMessage", new { SenderId = senderId, ReceiverId = receiverId, Message = message }, commandType: CommandType.StoredProcedure);
        }
    }
}
