document.getElementById("loginForm").onsubmit = async e => {
    e.preventDefault();

    const usuario = document.getElementById("usuario").value;
    const senha = document.getElementById("senha").value.trim();

    const res = await fetch(`/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha })
    });

    const data = await res.json();

    if (!res.ok) {
        notify.error(data.erro || "Usuário ou senha inválidos");
        return;
    }

    const TEMPO_EXPIRACAO = 60 * 60 * 1000;
    
    const dadosSessao = {
        usuario: data,
        expiraEm: Date.now() + TEMPO_EXPIRACAO
    };

    sessionStorage.setItem("usuario", JSON.stringify(dadosSessao));

    // VERIFICA O TIPO DE USUÁRIO
    if (data.perfil === "ADMINISTRADOR") {
        window.location.href = "/pages/selecionar-perfil.html";
    } else {
        window.location.href = "/pages/index.html";
    }
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

// MÁSCARA DE CPF
const usuarioInput = document.getElementById("usuario");

usuarioInput.addEventListener("input", function () {
    let value = this.value.replace(/\D/g, "");

    value = value.replace(/^(\d{3})(\d)/, "$1.$2");
    value = value.replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3");
    value = value.replace(/\.(\d{3})(\d)/, ".$1-$2");

    this.value = value;
});