// Global variables
const CURRENT_USER_ID = parseInt(document.getElementById("currentUserId").value, 10);

let SELECTED_USER_ID = null;
let SELECTED_USER_NAME = null;

// Utility functions

// Format a date string into a readable format
function formatTime(dateStr) {
    if (!dateStr) {
        return "";
    }
    const date = new Date(dateStr);
    return date.toLocaleString();
}

// Show an error message in console and alert
function showError(msg, err) {
    console.error(msg, err);
    alert(msg);
}

// Load chat list
async function loadChatList() {
    try {
        // Fetch users who we have chat conversations with
        const response = await fetch('/ChatsHub/GetChatUsers');
        let users = await response.json();

        const chatList = document.getElementById("chatList");

        // Clear chat list and add header
        chatList.innerHTML = "<strong>Chats</strong>";

        // Sort users so that the user with the latest message comes first
        // Assuming your backend returns 'lastMessageAt' field for sorting
        users.sort((a, b) => {
            const dateA = new Date(a.lastMessageAt || 0);
            const dateB = new Date(b.lastMessageAt || 0);
            return dateB - dateA; // latest first
        });

        // Track the first user to select by default
        let firstUser = null;

        // Add each user to the chat list
        users.forEach((user, index) => {
            const chatItem = document.createElement("div");

            chatItem.className = "chat-item mt-3";
            chatItem.dataset.userId = user.id;
            chatItem.dataset.userName = user.name;
            chatItem.innerHTML = `<strong>${user.name}</strong>`;

            chatList.appendChild(chatItem);

            // Pick first user to select by default
            if (index === 0) firstUser = user;
        });

        // Automatically select the latest user
        if (firstUser) {
            selectUser(firstUser.id, firstUser.name);
        }

    } catch (err) {
        showError("Unable to load chat list", err);
    }
}


// Load messages
async function loadMessages() {
    if (!SELECTED_USER_ID) {
        return; // Do nothing if no user is selected
    }

    try {
        const url = `/ChatsHub/GetMessages?otherUserId=${SELECTED_USER_ID}`;
        const response = await fetch(url);
        const messages = await response.json();

        const container = document.getElementById("messagesContainer");

        // Clear previous messages
        container.innerHTML = "";

        // Append each message
        messages.forEach(message => {
            const msgDiv = document.createElement("div");

            if (message.senderId === CURRENT_USER_ID) {
                msgDiv.className = "msg msg-right"; // Outgoing message
            } else {
                msgDiv.className = "msg msg-left"; // Incoming message
            }

            msgDiv.innerHTML = `
                <strong>${message.senderId === CURRENT_USER_ID ? "You" : SELECTED_USER_NAME}</strong><br>
                ${message.message}<br>
                <small>${formatTime(message.createAt)}</small>
            `;

            container.appendChild(msgDiv);
        });

        // Scroll to the bottom
        container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth"
        });

    } catch (err) {
        showError("Unable to load messages", err);
    }
}

/// Select user to chat with
function selectUser(userId, userName) {
    SELECTED_USER_ID = parseInt(userId, 10);
    SELECTED_USER_NAME = userName;

    const chatHeader = document.getElementById("chatHeaderUser");
    chatHeader.innerHTML = `
        <strong>${userName}</strong><br>
        <small>Chat</small>
    `;

    // Remove unread dot for this user
    const chatItem = document.querySelector(`.chat-item[data-user-id="${SELECTED_USER_ID}"]`);
    if (chatItem) {
        const dot = chatItem.querySelector(".unread-dot");
        if (dot) {
            dot.remove();
        }
    }

    // Load messages with the selected user
    loadMessages();
}


// SignalR connection
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chatHub") // Hub URL must match server
    .withAutomaticReconnect()
    .build();

connection.start()
    .then(() => {
        console.log("SignalR connected");
    })
    .catch(err => {
        console.error("SignalR connection failed:", err);
    });

// Receive messages
connection.on("ReceiveMessage", (senderName, message, receiverId, senderId, createAt) => {
    const container = document.getElementById("messagesContainer");
    const isCurrentChat =
        (senderId === SELECTED_USER_ID && receiverId === CURRENT_USER_ID) ||
        (senderId === CURRENT_USER_ID && receiverId === SELECTED_USER_ID);

    // Append message if it's for the current chat
    if (isCurrentChat) {
        const msgDiv = document.createElement("div");
        msgDiv.className = senderId === CURRENT_USER_ID ? "msg msg-right" : "msg msg-left";
        msgDiv.innerHTML = `
            <strong>${senderId === CURRENT_USER_ID ? "You" : senderName}</strong><br>
            ${message}<br>
            <small>${formatTime(createAt)}</small>
        `;
        container.appendChild(msgDiv);

        container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth"
        });
    }

    // ===== Move user to top of chat list =====
    const userId = senderId === CURRENT_USER_ID ? receiverId : senderId; // the other user
    const chatList = document.getElementById("chatList");
    const chatItem = chatList.querySelector(`.chat-item[data-user-id="${userId}"]`);

    if (chatItem) {
        // Remove existing and re-add at top
        chatItem.remove();
        chatList.insertBefore(chatItem, chatList.children[1]); // after <strong>Chats</strong>
    } else {
        // If user is not yet in the list, optionally add them
        const newChatItem = document.createElement("div");
        newChatItem.className = "chat-item mt-3";
        newChatItem.dataset.userId = userId;
        newChatItem.dataset.userName = senderName;
        newChatItem.innerHTML = `<strong>${senderName}</strong>`;
        chatList.insertBefore(newChatItem, chatList.children[1]);
    }

    // Add unread dot if message is from another user and not currently selected
    if (!isCurrentChat && chatItem && !chatItem.querySelector(".unread-dot")) {
        const dot = document.createElement("span");
        dot.className = "unread-dot";
        chatItem.appendChild(dot);
    }
});


// Receive notifications
connection.on("ReceiveNotification", notification => {
    // Adjust property names to match backend JSON
    const fromUserId = notification.fromUserId ?? notification.FromUserId;
    const fromUserName = notification.fromUserName ?? notification.FromUserName;
    const message = notification.message ?? notification.Message;

    // Skip if current chat is open
    if (SELECTED_USER_ID === fromUserId) {
        return;
    }

    const chatItem = document.querySelector(`.chat-item[data-user-id="${fromUserId}"]`);

    if (chatItem && !chatItem.querySelector(".unread-dot")) {
        const dot = document.createElement("span");
        dot.className = "unread-dot";
        chatItem.appendChild(dot);
    }

    // Play notification sound
    new Audio('/sounds/notification.mp3').play();

    // Show browser notification
    if ("Notification" in window && Notification.permission === "granted") {
        const notif = new Notification(fromUserName, {
            body: message,
            icon: '/images/chat-icon.png',
            tag: `chat-${fromUserId}`,
            renotify: true
        });

        notif.onclick = (e) => {
            e.preventDefault();
            window.focus();
            selectUser(fromUserId, fromUserName);
            notif.close();
        };
    }
});


// Send message
async function sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();

    if (!message) {
        alert("Type a message");
        return;
    }

    if (!SELECTED_USER_ID) {
        alert("Select a user first");
        return;
    }

    if (connection.state !== signalR.HubConnectionState.Connected) {
        alert("SignalR not connected");
        return;
    }

    try {
        await connection.invoke("SendMessage", message, SELECTED_USER_ID);
        input.value = ""; // Clear input after sending
    } catch (err) {
        showError("Unable to send message", err);
    }
}

// Event listeners

// Handle chat item clicks
document.addEventListener("click", (e) => {
    const chatItem = e.target.closest(".chat-item");
    if (chatItem) {
        selectUser(chatItem.dataset.userId, chatItem.dataset.userName);
    }
});

// Handle send button click
document.getElementById("sendBtn").addEventListener("click", sendMessage);

// Handle Enter key in message input
document.getElementById("messageInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendMessage();
    }
});

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    // Request notification permission if not granted yet
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    // Load chat list
    loadChatList();
});


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