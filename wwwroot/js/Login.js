$("#loginUsers").click(function (e) {
    e.preventDefault();

    var data = {
        Email: $("#email").val(),
        PasswordHash: $("#password").val()
    };

    $.ajax({
        type: "POST",
        url: "/ChatsHub/LoginUsers",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(data),
        dataType: "json",
        beforeSend: function () {
            showLoader();
        },
        success: function (res) {
            if (res.success) {
                showToast(res.message, 'success');

                // ✅ SAVE TOKEN CORRECTLY
                localStorage.setItem("token", res.token);

                setTimeout(function () {
                    window.location.href = "/chatshub/dashboard";
                }, 1000);
            } else {
                showToast(res.message, 'danger');
            }
        },
        error: function (jqXHR) {
            if (jqXHR.responseJSON && jqXHR.responseJSON.message) {
                showToast(jqXHR.responseJSON.message, 'danger');
            } else {
                showToast('Something went wrong!', 'danger');
            }
        },
        complete: function () {
            hideLoader();
        }
    });
});




function logout() {
    showLoader();

    localStorage.removeItem("token"); 

    setTimeout(function () {
        window.location.href = "/chatshub/login";
    }, 800);
}
