// Global Variables
const CURRENT_USER_ID = 1;
let SELECTED_USER_ID = null;

// Global Error Handler
function showError(message, error) {
    console.error(message, error);
    alert(message); // Replace with toast later if needed
}

// Load chat list (existing chats)
async function loadChatList() {
    try {
        const res = await fetch('/GetChatUsers');

        if (!res.ok) {
            throw new Error(`Failed to load users. Status: ${res.status}`);
        }

        const users = await res.json();
        const chatList = document.getElementById("chatList");

        chatList.innerHTML = "<strong>Chat</strong>";

        users.forEach(user => {
            const div = document.createElement("div");
            div.className = "chat-item mt-3";
            div.dataset.userId = user.id;
            div.dataset.userName = user.name;
            div.innerHTML = `
                <strong>${user.name}</strong><br>
                <small class="text-muted">${user.lastLoginAt ?? ""}</small>
            `;
            chatList.appendChild(div);
        });

    } catch (error) {
        showError("Unable to load chat list", error);
    }
}

// Load messages for selected user
async function loadMessages() {
    if (!SELECTED_USER_ID) return;

    try {
        const chatItem = document.querySelector(
            `#chatList .chat-item[data-user-id='${SELECTED_USER_ID}']`
        );

        const userItem = document.querySelector(
            `.user-item[data-user-id='${SELECTED_USER_ID}']`
        );

        const selectedUserName =
            (chatItem || userItem)?.dataset.userName || "";

        document.getElementById("chatHeaderUser").innerHTML = `
            <strong>${selectedUserName}</strong><br>
            <small class="text-muted">Chat</small>
        `;

        const res = await fetch(`/GetMessages?otherUserId=${SELECTED_USER_ID}`);

        if (!res.ok) {
            throw new Error(`Failed to load messages. Status: ${res.status}`);
        }

        const messages = await res.json();
        const container = document.getElementById("messagesContainer");
        container.innerHTML = "";

        messages.forEach(m => {
            const div = document.createElement("div");
            div.className =
                m.senderId == CURRENT_USER_ID
                    ? "msg msg-right"
                    : "msg msg-left";

            div.innerHTML = `
                ${m.massage}<br>
                <small class="text-muted">
                    ${new Date(m.createAt).toLocaleTimeString()}
                </small>
            `;

            container.appendChild(div);
        });

        container.scrollTop = container.scrollHeight;

    } catch (error) {
        showError("Unable to load messages", error);
    }
}

// Send message
document.getElementById("sendBtn").addEventListener("click", async function () {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();

    if (!message || !SELECTED_USER_ID) return;

    try {
        const res = await fetch('/SendMessage', {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `receiverId=${SELECTED_USER_ID}&message=${encodeURIComponent(message)}`
        });

        if (!res.ok) {
            throw new Error(`Message send failed. Status: ${res.status}`);
        }

        input.value = "";
        await loadMessages();
        await loadChatList();

    } catch (error) {
        showError("Unable to send message", error);
    }
});

// Select user
function selectUser(userId, userName) {
    try {
        SELECTED_USER_ID = userId;

        document.getElementById("chatHeaderUser").innerHTML = `
            <strong>${userName}</strong><br>
            <small class="text-muted">Chat</small>
        `;

        loadMessages();

        if (!document.querySelector(`#chatList .chat-item[data-user-id='${userId}']`)) {
            const chatList = document.getElementById("chatList");
            const div = document.createElement("div");

            div.className = "chat-item mt-3";
            div.dataset.userId = userId;
            div.dataset.userName = userName;
            div.innerHTML = `
                <strong>${userName}</strong><br>
                <small class="text-muted"></small>
            `;

            chatList.appendChild(div);
        }

    } catch (error) {
        showError("User selection failed", error);
    }
}

// Click events (chat/user/search)
document.addEventListener("click", function (e) {
    try {
        const chatItem = e.target.closest(".chat-item");
        const userItem = e.target.closest(".user-item");
        const searchItem = e.target.closest(".search-user-item");

        if (chatItem) {
            selectUser(chatItem.dataset.userId, chatItem.dataset.userName);
        }

        if (userItem) {
            selectUser(userItem.dataset.userId, userItem.dataset.userName);
        }

        if (searchItem) {
            selectUser(searchItem.dataset.userId, searchItem.dataset.userName);
            document.getElementById("searchResults").innerHTML = "";
            document.getElementById("searchInput").value = "";
        }

    } catch (error) {
        showError("Click handling error", error);
    }
});

// Search functionality
document.getElementById("searchInput").addEventListener("input", function () {
    try {
        const query = this.value.toLowerCase();
        const resultsContainer = document.getElementById("searchResults");
        resultsContainer.innerHTML = "";

        if (!query) return;

        document.querySelectorAll(".user-item").forEach(user => {
            const name = user.dataset.userName.toLowerCase();

            if (name.includes(query)) {
                const div = document.createElement("div");
                div.className = "search-user-item p-2 border-bottom";
                div.dataset.userId = user.dataset.userId;
                div.dataset.userName = user.dataset.userName;
                div.textContent = user.dataset.userName;

                resultsContainer.appendChild(div);
            }
        });

    } catch (error) {
        showError("Search failed", error);
    }
});

// Initial load
document.addEventListener("DOMContentLoaded", async function () {
    try {
        await loadChatList();
    } catch (error) {
        showError("Application failed to initialize", error);
    }
});
