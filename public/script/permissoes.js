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
    const usuarioLogado = getUsuario();

    const res = await fetch(`/permissoes/${usuarioLogado.id}`);
    const dados = await res.json();

    const container = document.getElementById("listaPermissoes");
    container.innerHTML = "";

    dados.empresas.forEach(empresa => {
        const card = document.createElement("div");
        card.className = "col-lg-4 col-sm-8 mb-4";

        const totalUnidades = empresa.unidades.length;
        const labelUnidades = totalUnidades === 1 ? "1 unidade" : `${totalUnidades} unidades`;

        let unidadesHtml = "";
        empresa.unidades.forEach(un => {
            unidadesHtml += `
                <li class="unit-item">
                    <span class="unit-dot"></span>
                    <span>${un.nome_unidade}</span>
                </li>
            `;
        });

        card.innerHTML = `
            <div class="card-permissao shadow-sm">
                <div class="empresa-header">
                    <div class="empresa-icon">
                        <i class="fa-solid fa-city"></i>
                    </div>
                    <h6>${empresa.nome_empresa}</h6>
                    <span class="empresa-badge">${labelUnidades}</span>
                </div>
                <ul class="lista-unidades">
                    ${unidadesHtml}
                </ul>
            </div>
        `;

        container.appendChild(card);
    });
}