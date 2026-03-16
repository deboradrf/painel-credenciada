const usuarioLogado = getUsuario();
const codigoEmpresa = getEmpresaCodigo();
const nomeEmpresa = getEmpresaNome();

// DROPDOWN DO PERFIL
document.addEventListener("DOMContentLoaded", () => {
    const cardsAdministrador = document.querySelectorAll(".card-administrador");
    const cardsEmpresa = document.querySelectorAll(".card-empresa");
    const cardsCredenciada = document.querySelectorAll(".card-credenciada");

    const userNameDropdown = document.getElementById("userNameDropdown");
    const dropdownUserExtra = document.getElementById("dropdownUserExtra");

    const avatarIcon = document.getElementById("avatarIcon");
    const avatarIconDropdown = document.getElementById("avatarIconDropdown");

    const avatarBtn = document.querySelector(".profile-trigger .avatar-circle");
    const avatarDrop = document.querySelector(".profile-header .avatar-circle");

    // NOME
    userNameDropdown.innerText = usuarioLogado.nome?.trim() || "";

    // EMPRESA ATUAL
    let empresasHTML = `
    <div class="company-name mb-2">
        <span style="color: #F1AE33">Empresa Atual:</span> ${nomeEmpresa}
    </div>
    `;

    // JUNTA TODAS AS EMPRESAS (PRINCIPAL + EXTRAS)
    let todasEmpresas = [
        {
            cod_empresa: usuarioLogado.cod_empresa,
            nome_empresa: usuarioLogado.nome_empresa,
            unidades: usuarioLogado.unidades
        }
    ];

    if (usuarioLogado.empresas_extras) {
        todasEmpresas = todasEmpresas.concat(usuarioLogado.empresas_extras);
    }

    // DROPDOWN
    empresasHTML += `
        <div class="dropdown mt-2">
            <button class="btn-trocar-empresa dropdown-toggle" data-bs-toggle="dropdown"
                onclick="event.stopPropagation()">
                Trocar empresa
            </button>
        <ul class="dropdown-menu w-100" onclick="event.stopPropagation()">
    `;

    // Filtra as empresas diferentes da atual
    const empresasParaTroca = todasEmpresas.filter(emp => emp.cod_empresa != codigoEmpresa);

    if (empresasParaTroca.length > 0) {
        empresasParaTroca.forEach(emp => {
            empresasHTML += `
                <li>
                    <a class="dropdown-item d-block text-truncate"
                        onclick='trocarEmpresa("${emp.cod_empresa}","${emp.nome_empresa}",${JSON.stringify(emp.unidades)})'>
                        ${emp.nome_empresa}
                    </a>
                </li>
            `;
        });
    } else {
        empresasHTML += `
            <li class="text-truncate" style="max-width: 100%;">
                <small class="dropdown-item text-muted d-block text-truncate" style="white-space: normal;">
                    Nenhuma empresa para ser trocada
                </small>
            </li>
        `;
    }

    empresasHTML += `
            </ul>
        </div>
    `;

    dropdownUserExtra.innerHTML = empresasHTML;

    // LÓGICA DOS PERFIS DE ACESSO
    if (usuarioLogado.perfil === "CREDENCIADA") {
        cardsCredenciada.forEach(card => card.style.display = "flex");
        cardsAdministrador.forEach(card => card.style.display = "none");
        cardsEmpresa.forEach(card => card.style.display = "none");

        avatarIcon.classList.add("fa-hospital");
        avatarIconDropdown.classList.add("fa-hospital");

        avatarBtn.classList.add("credenciada");
        avatarDrop.classList.add("credenciada");
    }

    if (usuarioLogado.perfil === "EMPRESA") {
        cardsEmpresa.forEach(card => card.style.display = "flex");
        cardsCredenciada.forEach(card => card.style.display = "none");
        cardsAdministrador.forEach(card => card.style.display = "none");

        avatarIcon.classList.add("fa-city");
        avatarIconDropdown.classList.add("fa-city");

        avatarBtn.classList.add("empresa");
        avatarDrop.classList.add("empresa");
    }

    if (usuarioLogado.perfil === "ADMINISTRADOR") {
        cardsAdministrador.forEach(card => card.style.display = "flex");
        cardsEmpresa.forEach(card => card.style.display = "none");
        cardsCredenciada.forEach(card => card.style.display = "none");

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
});

// MODAL DE AVISO
document.addEventListener("DOMContentLoaded", function () {
    const hoje = new Date().toISOString().split("T")[0];
    const ultimaExibicao = localStorage.getItem("modalManutencaoData");

    if (ultimaExibicao !== hoje) {
        const modal = new bootstrap.Modal(
            document.getElementById("modalManutencao")
        );
        modal.show();

        localStorage.setItem("modalManutencaoData", hoje);
    }
});