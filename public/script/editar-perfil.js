let usuarioLogado = null;
let dadosOriginais = {};

// DROPDOWN DO PERFIL
document.addEventListener("DOMContentLoaded", () => {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario"));

    if (!usuarioLogado) {
        window.location.href = "login.html";
    }

    const userNameDropdown = document.getElementById("userNameDropdown");
    const dropdownUserExtra = document.getElementById("dropdownUserExtra");

    const avatarIcon = document.getElementById("avatarIcon");
    const avatarIconDropdown = document.getElementById("avatarIconDropdown");

    const avatarBtn = document.querySelector(".profile-trigger .avatar-circle");
    const avatarDrop = document.querySelector(".profile-header .avatar-circle");

    // NOME
    userNameDropdown.innerText = usuarioLogado.nome?.trim() || "";

    // EMPRESA E UNIDADE
    dropdownUserExtra.innerHTML = `
    <div class="company-name">${usuarioLogado.nome_empresa}</div>
    <div class="unit-name">${usuarioLogado.nome_unidade}</div>
  `;

    // LÓGICA DOS PERFIS DE ACESSO
    if (usuarioLogado.perfil === "CREDENCIADA") {
        avatarIcon.classList.add("fa-hospital");
        avatarIconDropdown.classList.add("fa-hospital");

        avatarBtn.classList.add("credenciada");
        avatarDrop.classList.add("credenciada");
    }

    if (usuarioLogado.perfil === "EMPRESA") {
        avatarIcon.classList.add("fa-city");
        avatarIconDropdown.classList.add("fa-city");

        avatarBtn.classList.add("empresa");
        avatarDrop.classList.add("empresa");
    }

    // BLUR
    const profileBtn = document.querySelector(".profile-trigger");

    profileBtn.addEventListener("show.bs.dropdown", () => {
        document.body.classList.add("blur-main");
    });

    profileBtn.addEventListener("hide.bs.dropdown", () => {
        document.body.classList.remove("blur-main");
    });
});

carregarPerfil();

async function carregarPerfil() {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario"));

    if (!usuarioLogado) {
        window.location.href = "login.html";
    }

    const res = await fetch(`/usuarios/${usuarioLogado.id}`);
    const user = await res.json();

    if (!res.ok) {
        alert(user.erro);
        return;
    }

    preencherTela(user);
}

function preencherTela(user) {
    document.getElementById("perfilNome").innerText = user.nome;

    if (user.perfil === "EMPRESA") {
        document.getElementById("perfilTipo").innerText = "Empresa";
    }
    if (user.perfil === "CREDENCIADA") {
        document.getElementById("perfilTipo").innerText = "Credenciada";
    }

    document.getElementById("cpf").value = user.cpf;
    document.getElementById("email").value = user.email;
    document.getElementById("senha").value = user.senha;

    ajustarIcone(user.perfil);
}

function ajustarIcone(perfil) {
    const iconCard = document.getElementById("avatarIconCard");
    const avatarCard = document.querySelector(".avatar");

    if (!iconCard || !avatarCard) return;

    iconCard.className = "fa-solid";
    avatarCard.classList.remove("empresa", "credenciada");

    if (perfil === "EMPRESA") {
        iconCard.classList.add("fa-city");
        avatarCard.classList.add("empresa");
    }

    if (perfil === "CREDENCIADA") {
        iconCard.classList.add("fa-hospital");
        avatarCard.classList.add("credenciada");
    }
}

// FUNÇÃO PARA ENTRAR NO MODO EDIÇÃO DE PERFIL
function editarPerfil() {
    const card = document.querySelector(".card");
    card.classList.add("editando");

    const email = document.getElementById("email");
    const senha = document.getElementById("senha");

    // guarda valores atuais
    dadosOriginais.email = email.value;
    dadosOriginais.senha = senha.value;

    habilitarInput("email");
    habilitarInput("senha");

    // mostra botões
    document.getElementById("acoesEdicao").classList.remove("d-none");
}

// FUNÇÃO PARA TRANSFORMAR EMAIL E SENHA EM INPUT PARA EDIÇÃO
function habilitarInput(id) {
    const input = document.getElementById(id);
    if (!input) return;

    input.removeAttribute("readonly");
    input.focus();
}

// FUNÇÃO PARA CANCELAR O MODO DE EDIÇÃO DE PERFIL
function cancelarEdicao() {
    const card = document.querySelector(".card");
    card.classList.remove("editando");

    const email = document.getElementById("email");
    const senha = document.getElementById("senha");

    email.value = dadosOriginais.email;
    senha.value = dadosOriginais.senha;

    email.setAttribute("readonly", true);
    senha.setAttribute("readonly", true);

    document.getElementById("acoesEdicao").classList.add("d-none");
}

// FUNÇÃO PARA SALVAR EDIÇÃO
async function salvarEdicao() {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario"));

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    const res = await fetch(`/usuarios/${usuarioLogado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha })
    });

    if (!res.ok) {
        alert("Erro ao salvar dados");
        return;
    }

    document.querySelector(".card").classList.remove("editando");
    document.getElementById("email").setAttribute("readonly", true);
    document.getElementById("senha").setAttribute("readonly", true);
    document.getElementById("acoesEdicao").classList.add("d-none");

    alert("Dados atualizados com sucesso!");
}

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

// FUNÇÃO DE LOGOUT
function logout() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("empresaCodigo");
  window.location.href = "login.html";
}