// Global variables
const CURRENT_USER_ID = parseInt(document.getElementById("currentUserId").value, 10);

let SELECTED_USER_ID = null;
let SELECTED_USER_NAME = null;
const IST_TIMEZONE = "Asia/Kolkata";


// Format a date string into a readable format
function formatTime(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString("en-IN", {
        timeZone: IST_TIMEZONE
    });
}

// Show an error message in console and alert
function showError(msg, err) {
    console.error(msg, err);
    alert(msg);
}

// Load chat list
async function loadChatList() {
    try {
        const token = localStorage.getItem("token");

        const response = await fetch('/ChatsHub/GetChatUsers', {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        let users = await response.json();

        const chatList = document.getElementById("chatList");
        chatList.innerHTML = "<strong>Chats</strong>";

        let usersWithMessages = [];

        // 🔥 KEEP ONLY USERS WHO HAVE MESSAGES
        for (const user of users) {
            const msgResponse = await fetch(`/ChatsHub/GetMessages?otherUserId=${user.id}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const messages = await msgResponse.json();

            if (messages && messages.length > 0) {
                usersWithMessages.push({
                    ...user,
                    lastMessageTime: messages[messages.length - 1].createAt
                });
            }
        }

        // Sort by latest message
        usersWithMessages.sort((a, b) => {
            const dateA = new Date(
                new Date(a.lastMessageTime).toLocaleString("en-US", { timeZone: IST_TIMEZONE })
            );
            const dateB = new Date(
                new Date(b.lastMessageTime).toLocaleString("en-US", { timeZone: IST_TIMEZONE })
            );
            return dateB - dateA;
        });


        let firstUser = null;

        // Render chat list
        usersWithMessages.forEach((user, index) => {
            const chatItem = document.createElement("div");
            chatItem.className = "chat-item mt-3";
            chatItem.dataset.userId = user.id;
            chatItem.dataset.userName = user.name;
            chatItem.dataset.userEmail = user.email;
            chatItem.innerHTML = `<strong>${user.name}</strong>`;

            chatList.appendChild(chatItem);

            if (index === 0) firstUser = user;
        });

        // Auto-select latest chat
        if (firstUser) {
            selectUser(firstUser.id, firstUser.name, firstUser.email);
        }

    } catch (err) {
        showError("Unable to load chat list", err);
    }
}

// Load messages
async function loadMessages() {
    if (!SELECTED_USER_ID) return;

    try {
        const token = localStorage.getItem("token");
        if (!token) return showError("User not logged in", "Token missing");

        const response = await fetch(`/ChatsHub/GetMessages?otherUserId=${SELECTED_USER_ID}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const messages = await response.json();
        const container = document.getElementById("messagesContainer");
        container.innerHTML = "";

        if (!messages || messages.length === 0) return;

        let lastDate = null;

        messages.forEach(message => {
            const msgDate = new Date(
                new Date(message.createAt).toLocaleString("en-US", { timeZone: IST_TIMEZONE })
            ).toDateString()

            // Add date separator if day changed
            if (msgDate !== lastDate) {
                const separator = document.createElement("div");
                separator.dataset.msgDate = msgDate;
                separator.textContent = formatDateSeparator(message.createAt);
                separator.style.textAlign = "center";
                separator.style.color = "gray";
                separator.style.margin = "10px 0";
                separator.style.fontWeight = "bold";
                container.appendChild(separator);
                lastDate = msgDate;
            }

            const msgDiv = document.createElement("div");
            msgDiv.dataset.msgDate = msgDate;

            const isCurrentUser = message.senderId === CURRENT_USER_ID;

            // Teams-like bubble
            const bubble = document.createElement("div");
            bubble.style.display = "inline-block";
            bubble.style.padding = "8px 12px";
            bubble.style.margin = "5px 0";
            bubble.style.maxWidth = "70%";
            bubble.style.borderRadius = "10px";
            bubble.style.wordWrap = "break-word";
            bubble.style.backgroundColor = isCurrentUser ? "#0078d7" : "#f3f2f1";
            bubble.style.color = isCurrentUser ? "#fff" : "#000";
            bubble.style.position = "relative";

            // Message text
            const msgText = document.createElement("div");
            msgText.textContent = message.message;
            bubble.appendChild(msgText);

            // Timestamp below text
            const time = document.createElement("div");
            time.textContent = formatMessageTime(message.createAt);
            time.style.fontSize = "0.7em";
            time.style.color = isCurrentUser ? "#e0e0e0" : "gray";
            time.style.textAlign = "right";
            time.style.marginTop = "2px";

            bubble.appendChild(time);

            // Align message left or right
            msgDiv.style.display = "flex";
            msgDiv.style.justifyContent = isCurrentUser ? "flex-end" : "flex-start";

            msgDiv.appendChild(bubble);
            container.appendChild(msgDiv);
        });

        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    } catch (err) {
        showError("Unable to load messages", err);
    }
}






/// Select user to chat with
function selectUser(userId, userName, userEmail) {
    SELECTED_USER_ID = parseInt(userId, 10);
    SELECTED_USER_NAME = userName;

    const chatHeader = document.getElementById("chatHeaderUser");
    chatHeader.innerHTML = `<strong>${userName}</strong><br><small>Chat</small>`;

    // Remove unread dot
    const chatItem = document.querySelector(`.chat-item[data-user-id="${userId}"]`);
    if (chatItem) {
        const dot = chatItem.querySelector(".unread-dot");
        if (dot) dot.remove();
    }

    // ===== USER INFO PANEL =====
    const infoAvatar = document.getElementById("infoAvatar");
    const infoUserName = document.getElementById("infoUserName");
    const selectedUserInfo = document.getElementById("selectedUserInfo");
    const noUserSelected = document.getElementById("noUserSelected");
    const infoUserEmail = document.getElementById("infoUserEmail")

    if (infoAvatar && infoUserName) {
        infoAvatar.innerText = userName.charAt(0).toUpperCase();
        infoUserName.innerText = userName;
        infoUserEmail.innerText = userEmail || "";

        selectedUserInfo.classList.remove("d-none");
        noUserSelected.classList.add("d-none");
    }

    document.querySelectorAll(".chat-item").forEach(item => {
        item.classList.toggle("active", item.dataset.userId == userId);
    });

    loadMessages();
}


// SignalR connection
const token = localStorage.getItem("token"); // save token after login

if (!token) {
    alert("User not logged in. Token missing.");
}

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chatHub", {
        accessTokenFactory: () => token
    })
    .withAutomaticReconnect()
    .build();

connection.start()
    .then(() => {
        console.log("SignalR connected");
    })
    .catch(err => {
        console.error("SignalR connection failed:", err);
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

    const sendButton = document.getElementById("sendBtn");
    sendButton.disabled = true;  // Disable the button temporarily to prevent multiple clicks

    try {
        await connection.invoke("SendMessage", message, SELECTED_USER_ID);
        input.value = ""; // Clear input after sending

        // ===== Add user to chat list immediately if not present =====
        const chatList = document.getElementById("chatList");
        let chatItem = chatList.querySelector(`.chat-item[data-user-id="${SELECTED_USER_ID}"]`);
        if (!chatItem) {
            chatItem = document.createElement("div");
            chatItem.className = "chat-item mt-3";
            chatItem.dataset.userId = SELECTED_USER_ID;
            chatItem.dataset.userName = SELECTED_USER_NAME;
            chatItem.innerHTML = `<strong>${SELECTED_USER_NAME}</strong>`;
            chatList.insertBefore(chatItem, chatList.children[1]);
        }
    } catch (err) {
        showError("Unable to send message", err);
    } finally {
        sendButton.disabled = false;  // Re-enable the button
    }
}


// Event listeners

// Handle chat item clicks
document.addEventListener("click", (e) => {
    const chatItem = e.target.closest(".chat-item");
    if (chatItem) {
        selectUser(chatItem.dataset.userId, chatItem.dataset.userName, chatItem.dataset.userEmail);
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
    loadChatList();

    // Request permission for notifications
    if ("Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                console.log("Notification permission:", permission);
            });
        }
    }
});

// Click events (chat/user/search)
document.addEventListener("click", function (e) {
    try {
        const chatItem = e.target.closest(".chat-item");
        const userItem = e.target.closest(".user-item");
        const searchItem = e.target.closest(".search-user-item");

        if (chatItem) {
            selectUser(chatItem.dataset.userId, chatItem.dataset.userName, chatItem.dataset.userEmail);
        }

        if (userItem) {
            selectUser(userItem.dataset.userId, userItem.dataset.userName, userItem.dataset.userEmail);
        }

        if (searchItem) {
            selectUser(searchItem.dataset.userId, searchItem.dataset.userName, searchItem.dataset.userEmail || "");
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
                div.dataset.userEmail = user.dataset.userEmail;
                div.textContent = user.dataset.userName;

                resultsContainer.appendChild(div);
            }
        });

    } catch (error) {
        showError("Search failed", error);
    }
});





//Receive Notification
connection.on("ReceiveMessage", (senderName, message, receiverId, senderId, createAt) => {
    const container = document.getElementById("messagesContainer");
    const chatList = document.getElementById("chatList");

    const isCurrentChat =
        (senderId === SELECTED_USER_ID && receiverId === CURRENT_USER_ID) ||
        (senderId === CURRENT_USER_ID && receiverId === SELECTED_USER_ID);

    const msgDate = new Date(
        new Date(createAt).toLocaleString("en-US", { timeZone: IST_TIMEZONE })
    ).toDateString();


    if (isCurrentChat) {
        // Add date separator if the day has changed
        const lastMsgDate = container.lastChild?.dataset?.msgDate;
        if (msgDate !== lastMsgDate) {
            const separator = document.createElement("div");
            separator.dataset.msgDate = msgDate;
            separator.textContent = formatDateSeparator(createAt);
            separator.style.textAlign = "center";
            separator.style.color = "gray";
            separator.style.margin = "10px 0";
            container.appendChild(separator);
        }

        // Append the actual message
        renderMessage(container, {
            senderId,
            message,
            createAt
        });


        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

    } else if (senderId !== CURRENT_USER_ID) {
        // Add unread dot to chat list item
        let chatItem = chatList.querySelector(`.chat-item[data-user-id="${senderId}"]`);
        if (!chatItem) {
            chatItem = document.createElement("div");
            chatItem.className = "chat-item mt-3";
            chatItem.dataset.userId = senderId;
            chatItem.dataset.userName = senderName;
            chatItem.innerHTML = `<strong>${senderName}</strong>`;
            chatList.insertBefore(chatItem, chatList.children[1]);
        }

        if (!chatItem.querySelector(".unread-dot")) {
            const dot = document.createElement("span");
            dot.className = "unread-dot";
            chatItem.appendChild(dot);
        }

        // Browser notification
        if (Notification.permission === "granted") {
            const notif = new Notification(senderName, {
                body: message,
                icon: "/path/to/icon.png"
            });
            notif.onclick = () => {
                window.focus();
                selectUser(senderId, senderName, "");
            };
        }
    }

    // Move user to top of chat list
    const userId = senderId === CURRENT_USER_ID ? receiverId : senderId;
    const chatItem = chatList.querySelector(`.chat-item[data-user-id="${userId}"]`);
    if (chatItem) {
        chatItem.remove();
        chatList.insertBefore(chatItem, chatList.children[1]);
    }
});







//common dates Showing
function formatDateSeparator(dateStr) {
    const date = new Date(dateStr);

    const now = new Date();
    const istDate = new Date(now.toLocaleString("en-US", { timeZone: IST_TIMEZONE }));
    const istYesterday = new Date(istDate);
    istYesterday.setDate(istDate.getDate() - 1);

    const msgDateStr = date.toLocaleDateString("en-IN", { timeZone: IST_TIMEZONE });
    const todayStr = istDate.toLocaleDateString("en-IN");
    const yesterdayStr = istYesterday.toLocaleDateString("en-IN");

    if (msgDateStr === todayStr) return "Today";
    if (msgDateStr === yesterdayStr) return "Yesterday";

    return date.toLocaleDateString("en-IN", {
        timeZone: IST_TIMEZONE,
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}


function formatMessageTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-IN", {
        timeZone: IST_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    }).toUpperCase();
}



function renderMessage(container, messageObj) {
    const msgDate = new Date(
        new Date(messageObj.createAt).toLocaleString("en-US", { timeZone: IST_TIMEZONE })
    ).toDateString();

    const isCurrentUser = messageObj.senderId === CURRENT_USER_ID;

    const msgDiv = document.createElement("div");
    msgDiv.dataset.msgDate = msgDate;
    msgDiv.style.display = "flex";
    msgDiv.style.justifyContent = isCurrentUser ? "flex-end" : "flex-start";

    const bubble = document.createElement("div");
    bubble.style.display = "inline-block";
    bubble.style.padding = "8px 12px";
    bubble.style.margin = "5px 0";
    bubble.style.maxWidth = "70%";
    bubble.style.borderRadius = "10px";
    bubble.style.wordWrap = "break-word";
    bubble.style.backgroundColor = isCurrentUser ? "#0078d7" : "#f3f2f1";
    bubble.style.color = isCurrentUser ? "#fff" : "#000";

    const text = document.createElement("div");
    text.textContent = messageObj.message;

    const time = document.createElement("div");
    time.textContent = formatMessageTime(messageObj.createAt);
    time.style.fontSize = "0.7em";
    time.style.textAlign = "right";
    time.style.opacity = "0.8";

    bubble.appendChild(text);
    bubble.appendChild(time);
    msgDiv.appendChild(bubble);
    container.appendChild(msgDiv);
}

