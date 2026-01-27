using System;
using System.Security.Cryptography;
using System.Text;

public class EncryptionService
{
    private readonly byte[] _key;

    public EncryptionService()
    {
        // Hard-coded 32-byte AES key (Base64)
        var keyBase64 = "uJ7XhN8+2gZLq5aT+H4oV7ZxvB0WQ3aP+1fS9yTqZ1M=";

        try
        {
            _key = Convert.FromBase64String(keyBase64);
        }
        catch
        {
            throw new Exception("Encryption Key is not valid Base64.");
        }

        if (_key.Length != 32)
            throw new Exception("Encryption Key must be 32 bytes (AES-256).");
    }

    // Encrypt with random IV
    public string Encrypt(string plainText)
    {
        using var aes = Aes.Create();
        aes.Key = _key;
        aes.GenerateIV(); // random IV for every message

        using var encryptor = aes.CreateEncryptor();
        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

        // Store IV + Cipher together, separated by ':'
        return $"{Convert.ToBase64String(aes.IV)}:{Convert.ToBase64String(cipherBytes)}";
    }

    // Decrypt by extracting IV from message
    public string Decrypt(string encryptedText)
    {
        if (string.IsNullOrEmpty(encryptedText))
            return encryptedText;

        try
        {
            var parts = encryptedText.Split(':', 2);
            var iv = Convert.FromBase64String(parts[0]);
            var cipherBytes = Convert.FromBase64String(parts[1]);

            using var aes = Aes.Create();
            aes.Key = _key;
            aes.IV = iv;

            using var decryptor = aes.CreateDecryptor();
            var plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
            return Encoding.UTF8.GetString(plainBytes);
        }
        catch
        {
            return encryptedText; // fallback for old/invalid data
        }
    }
}
