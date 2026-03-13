const usuarioLogado = getUsuario();
const nomeEmpresa = getEmpresaNome();

// INIT
document.addEventListener("DOMContentLoaded", async () => {
    await dropdownPerfil();
    await carregarPermissoes();
});

// FUNÇÃO DO DROPDOWN DO PERFIL
async function dropdownPerfil() {
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
            <span style="color: #F1AE33">Empresa Atual:</span> ${nomeEmpresa}
        </div>
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
};

// FUNÇÃO PARA MOSTRAR AS PERMISSÕES DO USUÁRIO
async function carregarPermissoes() {
    const usuario = JSON.parse(sessionStorage.getItem("usuario"));

    const res = await fetch(`/permissoes/${usuario.id}`);
    const dados = await res.json();

    const container = document.getElementById("listaPermissoes");
    container.innerHTML = "";

    dados.empresas.forEach(empresa => {
        const card = document.createElement("div");
        card.className = "col-md-4 mb-4";

        let unidadesHtml = "";
        empresa.unidades.forEach(un => {
            unidadesHtml += `
                <li class="unit-item">
                    <span>${un.nome_unidade}</span>
                </li>
            `;
        });

        card.innerHTML = `
            <div class="card-permissao">
                <div class="empresa-header">
                    <h6>${empresa.nome_empresa}</h6>
                </div>

                <ul class="lista-unidades">
                    ${unidadesHtml}
                </ul>
            </div>
        `;

        container.appendChild(card);
    });
}