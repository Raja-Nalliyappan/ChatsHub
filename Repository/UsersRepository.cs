using ChatsHub.Models;
using ChatsHub.Repository.Interface;
using Dapper;
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
            return _dbConnection.Query<Users>("SELECT * FROM \"Users\"").ToList();
        }

        public List<Users> GetChatUsers(int currentUserId)
        {
            return _dbConnection.Query<Users>(
                "SELECT * FROM \"Users\" WHERE \"Id\" != @CurrentUserId",
                new { CurrentUserId = currentUserId }
            ).ToList();
        }

        public List<Messages> GetMessages(int currentUserId, int otherUserId)
        {
            string sql = @"
                SELECT * FROM ""Messages""
                WHERE (""SenderId"" = @CurrentUserId AND ""ReceiverId"" = @OtherUserId)
                   OR (""SenderId"" = @OtherUserId AND ""ReceiverId"" = @CurrentUserId)
                ORDER BY ""CreateAt"" ASC
            ";
            return _dbConnection.Query<Messages>(sql, new { CurrentUserId = currentUserId, OtherUserId = otherUserId }).ToList();
        }

        public Users GetNameAndPassword(string email, string password)
        {
            string sql = "SELECT * FROM \"Users\" WHERE \"Email\"=@Email AND \"PasswordHash\"=@PasswordHash";
            return _dbConnection.QueryFirstOrDefault<Users>(sql, new { Email = email, PasswordHash = password });
        }

        public void InsertMessage(Messages msg)
        {
            if (_dbConnection.State != ConnectionState.Open)
                _dbConnection.Open();

            string sql = @"
                INSERT INTO ""Messages"" (""SenderId"", ""ReceiverId"", ""Message"", ""MessageReceiverName"", ""CreateAt"")
                VALUES (@SenderId, @ReceiverId, @Message, @MessageReceiverName, @CreateAt)
            ";

            _dbConnection.Execute(sql, new
            {
                SenderId = msg.SenderId,
                ReceiverId = msg.ReceiverId,
                Message = msg.Message,
                MessageReceiverName = msg.MessageReceiverName ?? "",
                CreateAt = msg.CreateAt
            });
        }
    }
}
