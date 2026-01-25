using ChatsHub.Models;
using ChatsHub.Repository.Interface;
using Dapper;
using Microsoft.Data.SqlClient;
using Npgsql;
using System.Data;

namespace ChatsHub.Repository
{
    public class UsersRepository : IUsersRepository
    {
        private readonly IDbConnection _dbConnection;
        public UsersRepository(IConfiguration configuration)
        {
            _dbConnection = new NpgsqlConnection(configuration.GetConnectionString("DefaultConnection"));
        }

        public List<Users> GetAllUsers()
        {
            string AllUsers = "Select * from \"Users\"";

            List<Users> UserList = _dbConnection.Query<Users>(AllUsers).ToList();

            return UserList;
        }

        public List<Users> GetChatUsers(int currentUserId)
        {
            return _dbConnection.Query<Users>("SELECT * FROM \"GetChatUsers\"(@CurrentUserId)", new { CurrentUserId = currentUserId }).ToList();
        }

        public List<Messages> GetMessages(int currentUserId, int otherUserId)
        {
            return _dbConnection.Query<Messages>("SELECT * FROM \"GetMessages\"(@CurrentUserId, @OtherUserId)", new { CurrentUserId = currentUserId, OtherUserId = otherUserId }).ToList();
        }

        public Users GetNameAndPassword(string email, string password)
        {
            string loginUser = "SELECT \"Id\",\"Name\",\"Email\",\"PasswordHash\",\"Role\" FROM \"Users\" WHERE \"Email\"=@Email AND \"PasswordHash\"=@PasswordHash";
            return _dbConnection.QueryFirstOrDefault<Users>(loginUser, new { Email = email, PasswordHash = password });
        }

        public void InsertMessage(Messages msg)
        {
            _dbConnection.Execute(
                "SELECT \"InsertMessage\"(@SenderId, @ReceiverId, @Message, @MessageReceiverName, @CreateAt)",
                new
                {
                    SenderId = msg.SenderId,
                    ReceiverId = msg.ReceiverId,
                    Message = msg.Message,
                    MessageReceiverName = msg.MessageReceiverName,
                    CreateAt = msg.CreateAt
                }
            );
        }


    }
}
