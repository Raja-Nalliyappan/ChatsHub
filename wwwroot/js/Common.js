//Time Format
function formatMessageTime(dateStr) {
    if (!dateStr) return "";

    return new Date(dateStr).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata", 
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    }).toUpperCase();
}





//Toast Message
function showToast(message, type) {
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center ${type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'} border-0`;
    toastEl.role = 'alert';
    toastEl.ariaLive = 'assertive';
    toastEl.ariaAtomic = 'true';
    toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

    const container = document.getElementById('toastContainer');
    container.appendChild(toastEl);

    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}






//Loader
(function () {
    function createLoader() {
        if (document.getElementById("pageLoader")) return;

        const loader = document.createElement("div");
        loader.id = "pageLoader";
        loader.innerHTML = `
      <div class="loader">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
        document.body.appendChild(loader);
    }

    window.showLoader = function () {
        createLoader();
        document.getElementById("pageLoader").style.display = "flex";
    };

    window.hideLoader = function () {
        const loader = document.getElementById("pageLoader");
        if (loader) loader.style.display = "none";
    };
})();





//Token Expire Check

async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem("token");

    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            "Authorization": `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        alert("Session expired. Please login again.");
        localStorage.removeItem("token");
        window.location.href = "/chatshub/login";
        throw new Error("Unauthorized"); 
    }

    return response;
}



