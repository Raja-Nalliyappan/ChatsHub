using ChatsHub.Models;
using ChatsHub.Models.DtoFiles;
using ChatsHub.Repository.Interface;
using Dapper;
using Microsoft.Data.SqlClient;
using Npgsql;
using System.Data;

namespace ChatsHub.Repository
{
    public class UsersRepository : IUsersRepository
    {
        private readonly IConfiguration _configuration;

        public UsersRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        private IDbConnection CreateConnection()
        {
            return new NpgsqlConnection(_configuration.GetConnectionString("DefaultConnection"));
        }


        public bool DeleteChat(int currentUserId, int otherUserId)
        {
            using var connection = CreateConnection();

            string query = @"
                DELETE FROM ""Messages""
                WHERE (""SenderId"" = @CurrentUserId AND ""ReceiverId"" = @OtherUserId)
                   OR (""SenderId"" = @OtherUserId AND ""ReceiverId"" = @CurrentUserId)
            ";

            int rows = connection.Execute(query, new
            {
                CurrentUserId = currentUserId,
                OtherUserId = otherUserId
            });

            return rows > 0;
        }

        public List<Users> GetAllUsers()
        {
            using var connection = CreateConnection();

            string AllUsers = "Select * from \"Users\"";

            List<Users> UserList = connection.Query<Users>(AllUsers).ToList();

            return UserList;
        }

        public List<Users> GetChatUsers(int currentUserId)
        {
            using var connection = CreateConnection();

            return connection.Query<Users>("SELECT * FROM \"GetChatUsers\"(@CurrentUserId)", new { CurrentUserId = currentUserId }).ToList();
        }

        public List<Messages> GetMessages(int currentUserId, int otherUserId)
        {
            using var connection = CreateConnection();

            return connection.Query<Messages>("SELECT * FROM \"GetMessages\"(@CurrentUserId, @OtherUserId)", new { CurrentUserId = currentUserId, OtherUserId = otherUserId }).ToList();
        }

        public Users GetNameAndPassword(string email, string password)
        {
            using var connection = CreateConnection();

            string loginUser = "SELECT \"Id\",\"Name\",\"Email\",\"PasswordHash\",\"Role\" FROM \"Users\" WHERE \"Email\"=@Email AND \"PasswordHash\"=@PasswordHash";
            
            return connection.QueryFirstOrDefault<Users>(loginUser, new { Email = email, PasswordHash = password });
        }

        public void InsertMessage(Messages msg)
        {
            using var connection = CreateConnection();

            connection.Execute(
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


        // Repository method returning DTO
        async Task<List<ChattedUserDto>> IUsersRepository.GetChattedUsersAsync(int currentUserId)
        {
            using var connection = CreateConnection();

            const string sql = @"
                    SELECT DISTINCT 
                        u.""Id"",
                        u.""Name"",
                        u.""Email"",
                        u.""Phone"",
                        u.""Role"",
                        u.""IsActive""
                    FROM ""Users"" u
                    INNER JOIN ""Messages"" m
                        ON (
                            (m.""SenderId"" = @UserId AND m.""ReceiverId"" = u.""Id"")
                            OR
                            (m.""ReceiverId"" = @UserId AND m.""SenderId"" = u.""Id"")
                        )
                    WHERE u.""Id"" <> @UserId;
                ";

            var users = await connection.QueryAsync<ChattedUserDto>(
                sql,
                new { UserId = currentUserId }
            );

            return users.ToList();
        }

    }
}
