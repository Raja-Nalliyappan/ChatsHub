// Global variables
const CURRENT_USER_ID = parseInt(document.getElementById("currentUserId").value, 10);

let SELECTED_USER_ID = null;
let SELECTED_USER_NAME = null;
const IST_TIMEZONE = "Asia/Kolkata";
let selectedImageFile = null;
let isSending = false;


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
    showLoader();
    try {
        // Fetch only users you've chatted with
        const response = await fetchWithAuth("/ChatsHub/GetChattedUsers");
        const users = await response.json();

        const chatList = document.getElementById("chatList");
        chatList.innerHTML = "<strong>Chats</strong>";

        if (!users || users.length === 0) {
            chatList.innerHTML += "<div>No chats yet</div>";
            return;
        }

        // Sort by last message if backend provides it
        users.sort((a, b) => {
            if (!a.lastMessageTime) return 1;
            if (!b.lastMessageTime) return -1;
            return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
        });

        let firstUser = null;

        users.forEach((user, index) => {
            const chatItem = document.createElement("div");
            chatItem.className = "chat-item mt-3";
            chatItem.dataset.userId = user.id;
            chatItem.dataset.userName = user.name;
            chatItem.dataset.userEmail = user.email || "";
            chatItem.innerHTML = `
                <strong>${user.name}</strong>
                <span class="delete-chat" title="Delete chat"> 🗑️</span>
            `;

            chatList.appendChild(chatItem);

            if (index === 0) firstUser = user;
        });

        // Auto-select the first chat
        if (firstUser) {
            selectUser(firstUser.id, firstUser.name, firstUser.email);
        }

    } catch (err) {
        showError("Unable to load chat list", err);
    } finally {
        hideLoader();
    }
}


// Load messages
async function loadMessages() {
    if (!SELECTED_USER_ID) return;

    showLoader();

    try {
        const token = localStorage.getItem("token");
        if (!token) return showError("User not logged in", "Token missing");

        const response = await fetchWithAuth(`/ChatsHub/GetMessages?otherUserId=${SELECTED_USER_ID}`)
        const messages = await response.json();
        const container = document.getElementById("messagesContainer");
        container.scrollTop = container.scrollHeight;
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
            bubble.style.maxWidth = "100%";
            bubble.style.borderRadius = "10px";
            bubble.style.wordWrap = "break-word";
            bubble.style.backgroundColor = isCurrentUser ? "#0078d7" : "#f3f2f1";
            bubble.style.color = isCurrentUser ? "#fff" : "#000";
            bubble.style.position = "relative";

            // Message text
            let data;
            try {
                data = JSON.parse(message.message);
            } catch {
                data = { text: message.message, image: null };
            }

            // Image
            if (data.image) {
                const img = document.createElement("img");
                img.src = data.image;
                img.style.maxWidth = "650px";
                img.style.borderRadius = "8px";
                img.style.display = "block";
                img.style.marginBottom = "5px";
                bubble.appendChild(img);
            }

            // Text
            if (data.text) {
                const msgText = document.createElement("div");
                msgText.textContent = data.text;
                bubble.appendChild(msgText);
            }


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

        //container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    } catch (err) {
        showError("Unable to load messages", err);
    } finally {
        hideLoader();
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
        accessTokenFactory: () => localStorage.getItem("token")
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



// ✅ SEND MESSAGE 
async function sendMessage() {
    if (isSending) return;

    const input = document.getElementById("messageInput");
    const textMessage = input.value.trim();

    if (!textMessage && !selectedImageFile) {
        alert("Type a message or select an image");
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

    isSending = true;
    document.getElementById("sendBtn").disabled = true;

    try {
        let imageUrl = null;

        // Upload image first
        if (selectedImageFile) {
            const formData = new FormData();
            formData.append("image", selectedImageFile);

            const token = localStorage.getItem("token");
            if (!token) throw new Error("User not logged in");

            const response = await fetchWithAuth("/ChatsHub/upload-image", {
                method: "POST",
                body: formData
            });


            if (!response.ok) throw new Error("Image upload failed");

            // Parse as text instead of JSON
            const result = await response.json();
            imageUrl = result.image;

        }


        // Send SignalR message
        const messageObj = {
            text: textMessage,
            image: imageUrl
        };

        await connection.invoke("SendMessage", JSON.stringify(messageObj), SELECTED_USER_ID);

        // Clear inputs
        input.value = "";
        document.getElementById("imageInput").value = "";
        selectedImageFile = null;

    } catch (err) {
        console.error(err);
        alert(err.message || "Unable to send message");
    } finally {
        isSending = false;
        document.getElementById("sendBtn").disabled = false;
        const preview = document.getElementById("imagePreview");
        preview.innerHTML = "";
        preview.style.display = "none"
    }
}


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
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
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

let searchTimeout;

const searchInput = document.getElementById("searchInput");
const resultsContainer = document.getElementById("searchResults");

searchInput.addEventListener("input", function () {
    const query = this.value.trim().toLowerCase();

    clearTimeout(searchTimeout); // cancel previous search
    resultsContainer.innerHTML = ""; // clear immediately

    if (!query) return;

    searchTimeout = setTimeout(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetchWithAuth("/ChatsHub/GetAllUsers");
            const users = await response.json();

            const seenUserIds = new Set();

            users
                .filter(u => u.name.toLowerCase().includes(query))
                .forEach(user => {
                    if (seenUserIds.has(user.id)) return;
                    seenUserIds.add(user.id);

                    const div = document.createElement("div");
                    div.className = "search-user-item p-2 border-bottom";
                    div.dataset.userId = user.id;
                    div.dataset.userName = user.name;
                    div.dataset.userEmail = user.email || "";
                    div.textContent = user.name;

                    // Click on search result
                    div.addEventListener("click", () => {
                        selectUser(user.id, user.name, user.email || "");
                        resultsContainer.innerHTML = ""; // clear results
                        searchInput.value = ""; // clear input
                    });

                    resultsContainer.appendChild(div);
                });

        } catch (err) {
            console.error("Search failed:", err);
        }
    }, 300); // 300ms debounce
});

// Click outside input and results → clear search and input
document.addEventListener("click", function (e) {
    if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
        resultsContainer.innerHTML = ""; // clear results
        searchInput.value = "";          // clear input letters
    }
});






//Receive Message
connection.on("ReceiveMessage", (senderName, message, receiverId, senderId, createAt, receiver) => {
    let parsed;
    try {
        parsed = JSON.parse(message);
    } catch {
        parsed = { text: message, image: null };
    }

    const container = document.getElementById("messagesContainer");
    const chatList = document.getElementById("chatList");

    const isCurrentChat =
        (senderId === SELECTED_USER_ID && receiverId === CURRENT_USER_ID) ||
        (senderId === CURRENT_USER_ID && receiverId === SELECTED_USER_ID);

    const msgDate = new Date(
        new Date(createAt).toLocaleString("en-US", { timeZone: IST_TIMEZONE })
    ).toDateString();

    if (isCurrentChat) {
        // Date separator
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

        // Render message
        renderMessage(container, {
            senderId,
            message: JSON.stringify(parsed),
            createAt
        });

        container.scrollTop = container.scrollHeight; // auto scroll
    }

    // Handle chat list item (existing or new)
    const userId = senderId === CURRENT_USER_ID ? receiverId : senderId;
    let chatItem = chatList.querySelector(`.chat-item[data-user-id="${userId}"]`);

    if (!chatItem) {
        // NEW USER: create chat item
        chatItem = document.createElement("div");
        chatItem.className = "chat-item mt-3";
        chatItem.dataset.userId = userId;
        chatItem.dataset.userName = receiver.name; 
        chatItem.dataset.userEmail = ""; 
        chatItem.innerHTML = `<strong>${receiver.name}</strong><span class="delete-chat"> 🗑️</span>`;
        chatList.insertBefore(chatItem, chatList.children[1]);
    }

    // Add unread dot if the message is from other user
    if (senderId !== CURRENT_USER_ID && !chatItem.querySelector(".unread-dot")) {
        const dot = document.createElement("span");
        dot.className = "unread-dot";
        chatItem.appendChild(dot);
    }

    // Move chat item to top
    chatItem.remove();
    chatList.insertBefore(chatItem, chatList.children[1]);

    // Browser notification for new message
    if (senderId !== CURRENT_USER_ID && Notification.permission === "granted") {
        const notif = new Notification(senderName, {
            body: parsed.text || "📷 Image",
            icon: "/path/to/icon.png"
        });
        notif.onclick = () => {
            window.focus();
            selectUser(userId, senderName, "");
            notif.close();
        };
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

    // ✅ Parse message (text + image)
    let data;
    try {
        data = JSON.parse(messageObj.message);
    } catch {
        // fallback for old text-only messages
        data = { text: messageObj.message, image: null };
    }

    // ✅ Show Image (if exists)
    if (data.image) {
        const img = document.createElement("img");
        img.src = data.image;
        img.style.maxWidth = "650px";
        img.style.borderRadius = "8px";
        img.style.display = "block";
        img.style.marginBottom = "5px";
        bubble.appendChild(img);
    }

    // ✅ Show Text (if exists)
    if (data.text) {
        const text = document.createElement("div");
        text.textContent = data.text;
        bubble.appendChild(text);
    }

    // ✅ Time
    const time = document.createElement("div");
    time.textContent = formatMessageTime(messageObj.createAt);
    time.style.fontSize = "0.7em";
    time.style.textAlign = "right";
    time.style.opacity = "0.8";

    bubble.appendChild(time);
    msgDiv.appendChild(bubble);
    container.appendChild(msgDiv);
}




//Delete User Chat
document.addEventListener("click", async (e) => {
    const deleteBtn = e.target.closest(".delete-chat");
    if (!deleteBtn) return;

    e.stopPropagation();

    const chatItem = deleteBtn.closest(".chat-item");
    const otherUserId = parseInt(chatItem.dataset.userId, 10);

    if (!confirm("This will delete the chat for both you and the other user. Are you sure?")) return;

    try {
        const token = localStorage.getItem("token");

        const response = await fetchWithAuth(
            `/chatshub/Chats/DeleteChat?receiverId=${otherUserId}`,
            {
                method: "DELETE"
            }
        );


        if (!response.ok) throw new Error("Delete failed");

        // ✅ Remove chat from UI
        chatItem.remove();

        const chatList = document.getElementById("chatList");
        const remainingChats = chatList.querySelectorAll(".chat-item");

        // If the deleted chat was open, select the next one
        if (SELECTED_USER_ID === otherUserId) {
            document.getElementById("messagesContainer").innerHTML = "";
            document.getElementById("chatHeaderUser").innerHTML = "";
            SELECTED_USER_ID = null;

            if (remainingChats.length > 0) {
                // Pick the first remaining chat
                const firstChat = remainingChats[0];
                const nextUserId = parseInt(firstChat.dataset.userId, 10);
                const nextUserName = firstChat.dataset.userName;
                const nextUserEmail = firstChat.dataset.userEmail;

                selectUser(nextUserId, nextUserName, nextUserEmail);
            }
        }

    } catch (err) {
        showError("Unable to delete chat", err);
    }
});



connection.onclose(async (error) => {
    console.log("SignalR disconnected", error);

    if (error && error.message.includes("401")) {
        alert("Session expired. Please login again.");
        localStorage.removeItem("token");
        window.location.href = "/chatshub/login";
    }
});


// Image input change
document.getElementById("imageInput").addEventListener("change", function () {
    selectedImageFile = this.files[0];
    showImagePreview(selectedImageFile);
});

// Paste screenshot
document.getElementById("messageInput").addEventListener("paste", function (event) {
    const items = (event.clipboardData || window.clipboardData).items;
    for (let item of items) {
        if (item.type.includes("image")) {
            selectedImageFile = item.getAsFile();
            showImagePreview(selectedImageFile);
        }
    }
});

// Function to display image preview
function showImagePreview(file) {
    const preview = document.getElementById("imagePreview");
    preview.style.display = "flex"
    preview.innerHTML = "";

    if (!file) return;

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = "650px";
    img.style.borderRadius = "8px";
    img.style.objectFit = "cover";
    img.style.display = "block";

    const removeBtn = document.createElement("span");
    removeBtn.textContent = "✖";
    removeBtn.style.cursor = "pointer";
    removeBtn.style.marginLeft = "8px";
    removeBtn.style.color = "red";
    removeBtn.style.fontWeight = "bold";
    removeBtn.onclick = () => {
        selectedImageFile = null;
        preview.innerHTML = "";
        document.getElementById("imageInput").value = "";
    };

    preview.appendChild(img);
    preview.appendChild(removeBtn);
}



