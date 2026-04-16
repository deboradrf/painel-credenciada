const usuarioLogado = getUsuario();
const nomeEmpresa = getEmpresaNome();

let dadosOriginais = {};

// DROPDOWN DO PERFIL
document.addEventListener("DOMContentLoaded", () => {
    const userNameDropdown = document.getElementById("userNameDropdown");
    const dropdownUserExtra = document.getElementById("dropdownUserExtra");

    const avatarIcon = document.getElementById("avatarIcon");
    const avatarIconDropdown = document.getElementById("avatarIconDropdown");

    const avatarBtn = document.querySelector(".profile-trigger .avatar-circle");
    const avatarDrop = document.querySelector(".profile-header .avatar-circle");

    // NOME
    userNameDropdown.innerText = usuarioLogado.nome?.trim() || "";

    // EMPRESA
    dropdownUserExtra.innerHTML = `
        <div class="company-name">
            <small>${nomeEmpresa}</small>
        </div>
    `;

    // LÓGICA DOS PERFIS DE ACESSO
    if (usuarioLogado.perfil === "CREDENCIADA") {
        avatarIcon.classList.add("fa-hospital");
        avatarIconDropdown.classList.add("fa-hospital");

        avatarBtn.classList.add("credenciada");
        avatarDrop.classList.add("credenciada");
    }

    if (usuarioLogado.perfil === "EMPRESA" || usuarioLogado.perfil === "EMPRESA_INTEGRACAO") {
        avatarIcon.classList.add("fa-city");
        avatarIconDropdown.classList.add("fa-city");

        avatarBtn.classList.add("empresa");
        avatarDrop.classList.add("empresa");
    }

    if (usuarioLogado.perfil === "ADMINISTRADOR") {
        avatarIcon.classList.add("fa-users-gear");
        avatarIconDropdown.classList.add("fa-users-gear");

        avatarBtn.classList.add("administrador");
        avatarDrop.classList.add("administrador");
    }

    // BLUR
    const profileBtn = document.querySelector(".profile-trigger");

    profileBtn.addEventListener("show.bs.dropdown", () => {
        document.body.classList.add("blur-main");
    });

    profileBtn.addEventListener("hide.bs.dropdown", () => {
        document.body.classList.remove("blur-main");
    });

    carregarPerfil();
});

async function carregarPerfil() {
    const usuarioLogado = getUsuario();

    if (!usuarioLogado || !usuarioLogado.id) {
        console.error("Usuário inválido:", usuarioLogado);
        return;
    }

    const res = await fetch(`/api/usuarios/${usuarioLogado.id}`);
    const user = await res.json();

    if (!res.ok) {
        notify.error(user.erro || "Erro ao carregar perfil");
        return;
    }

    preencherTela(user);
}

function preencherTela(user) {
    document.getElementById("perfilNome").innerText = user.nome;

    if (user.perfil === "EMPRESA") {
        document.getElementById("perfilTipo").innerText = "Perfil Empresa";
    }

    if (user.perfil === "EMPRESA_INTEGRACAO") {
        document.getElementById("perfilTipo").innerText = "Perfil Empresa Integração";
    }

    if (user.perfil === "CREDENCIADA") {
        document.getElementById("perfilTipo").innerText = "Perfil Credenciada";
    }

    if (user.perfil === "ADMINISTRADOR") {
        document.getElementById("perfilTipo").innerText = "Perfil Administrador";
    }

    document.getElementById("cpf").value = user.cpf;
    document.getElementById("email").value = user.email;
    document.getElementById("senha").value = "";

    ajustarIcone(user.perfil);
}

function ajustarIcone(perfil) {
    const iconCard = document.getElementById("avatarIconCard");
    const avatarCard = document.querySelector(".avatar");

    if (!iconCard || !avatarCard) return;

    iconCard.className = "fa-solid";
    avatarCard.classList.remove("empresa", "credenciada", "administrador");

    if (perfil === "EMPRESA" || perfil === "EMPRESA_INTEGRACAO") {
        iconCard.classList.add("fa-city");
        avatarCard.classList.add("empresa");
    }

    if (perfil === "CREDENCIADA") {
        iconCard.classList.add("fa-hospital");
        avatarCard.classList.add("credenciada");
    }

    if (perfil === "ADMINISTRADOR") {
        iconCard.classList.add("fa-users-gear");
        avatarCard.classList.add("administrador");
    }
}

// FUNÇÃO PARA ENTRAR NO MODO EDIÇÃO DE PERFIL
function editarPerfil() {
    const card = document.querySelector(".card");
    card.classList.add("editando");

    const email = document.getElementById("email");

    // guarda valores atuais
    dadosOriginais.email = email.value;
    dadosOriginais.senha = "";

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
    senha.value = "";

    email.setAttribute("readonly", true);
    senha.setAttribute("readonly", true);

    document.getElementById("acoesEdicao").classList.add("d-none");
}

// FUNÇÃO PARA SALVAR EDIÇÃO
async function salvarEdicao() {
    const usuarioLogado = getUsuario();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    // objeto base
    const body = { email };

    // só adiciona senha se tiver valor
    if (senha.trim() !== "") {
        body.senha = senha;
    }

    const res = await fetch(`/api/usuarios/${usuarioLogado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        notify.error("Erro ao salvar dados");
        return;
    }

    notify.success("Dados atualizados com sucesso!");

    setTimeout(() => {
        location.reload();
    }, 3000);
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