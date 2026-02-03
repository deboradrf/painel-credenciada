document.getElementById("loginForm").onsubmit = async e => {
    e.preventDefault();

    const res = await fetch(`/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: email.value,
            senha: senha.value
        })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.erro);
        return;
    }

    localStorage.setItem("usuario", JSON.stringify(data));

    window.location.href = "index.html";
};

// MOSTRAR / OCULTAR SENHA
function toggleSenha() {
    const input = document.getElementById("senha");
    const icon = document.getElementById("toggleSenha");

    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
    }
}