const usuarioLogado = getUsuario();
const nomeEmpresa = getEmpresaNome();

let usuarioSelecionado = null;
let empresaSelecionada = null;
let nomeEmpresaSelecionada = null;

const listaUsuarios = document.getElementById("usuariosList");

const listaTodasUnidades = document.getElementById("listaUnidadesTodas");
const listaUnidadesUsuario = document.getElementById("listaUnidadesUsuario");
const btnAddUnidade = document.getElementById("btnAddUnidade");
const btnRemoverUnidade = document.getElementById("btnRemoveUnidade");

const listaTodasEmpresas = document.getElementById("listaTodasEmpresas");
const listaEmpresasUsuario = document.getElementById("listaEmpresasUsuario");
const btnAddEmpresa = document.getElementById("btnAddEmpresa");
const btnRemoveEmpresa = document.getElementById("btnRemoveEmpresa");

// INIT
document.addEventListener("DOMContentLoaded", async () => {
    await dropdownPerfil();
    await carregarUsuarios();
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

// FUNÇÃO PARA CARREGAR TODOS OS USUÁRIOS
async function carregarUsuarios() {
    const res = await fetch("/usuarios");
    const usuarios = await res.json();

    listaUsuarios.innerHTML = "";

    usuarios.forEach(u => {

        const li = document.createElement("li");

        li.className = "list-group-item";

        let empresasHTML = "";

        // EMPRESA PRINCIPAL
        if (u.cod_empresa) {
            empresasHTML += `
                <button class="btn-empresa principal"
                    onclick="abrirModalUnidades(${u.id}, '${u.cod_empresa}', '${u.nome_empresa}')">
                    ${u.nome_empresa}
                </button>
            `;
        }

        // EMPRESAS EXTRAS
        if (u.empresas_extras) {
            u.empresas_extras.forEach(e => {
                empresasHTML += `
                    <button class="btn-empresa extra"
                        onclick="abrirModalUnidades(${u.id}, '${e.cod_empresa}', '${e.nome_empresa}')">
                        ${e.nome_empresa}
                    </button>
                `;
            });
        }

        li.innerHTML = `
            <div class="usuario-card">
                <div class="usuario-info">
                    <b>${u.id} - ${u.nome}</b>
                    <small>CPF: ${u.cpf}</small>

                    <div class="empresas-wrapper">
                        ${empresasHTML}
                    </div>
                </div>

                <div class="usuario-acoes">
                    <button class="btn-gerenciar" onclick="abrirModalEmpresas(${u.id})">
                        <i class="fa-solid fa-gear"></i>
                        Gerenciar empresas
                    </button>
                </div>
            </div>
        `;

        listaUsuarios.appendChild(li);
    });
}

// ABRIR MODAL DE EMPRESAS
async function abrirModalEmpresas(idUsuario) {
    usuarioSelecionado = idUsuario;

    const modal = new bootstrap.Modal(document.getElementById("modalEmpresas"));
    modal.show();

    await carregarTodasEmpresas();
    await carregarEmpresasUsuario(idUsuario);
}

// FUNÇÃO PARA CARREGAR TODAS AS EMPRESAS
async function carregarTodasEmpresas() {
    const res = await fetch("/empresas");
    const empresas = await res.json();

    listaTodasEmpresas.innerHTML = "";

    empresas.forEach(e => {

        const opt = document.createElement("option");

        opt.value = e.codigo;
        opt.textContent = `${e.codigo} - ${e.nome}`;

        listaTodasEmpresas.appendChild(opt);
    });
}

// FUNÇÃO PARA CARREGAR AS EMPRESAS DO USUÁRIO
async function carregarEmpresasUsuario(idUsuario) {
    const res = await fetch(`/usuarios/${idUsuario}/empresas`);
    const empresas = await res.json();

    listaEmpresasUsuario.innerHTML = "";

    empresas.forEach(e => {
        const opt = document.createElement("option");

        opt.value = e.cod_empresa;
        opt.textContent = `${e.cod_empresa} - ${e.nome_empresa}`;

        if (e.principal) {
            opt.disabled = true;
            opt.textContent += " (Principal)";
        }

        listaEmpresasUsuario.appendChild(opt);
    });
}

// BOTÃO DE ADICIONAR EMPRESA
btnAddEmpresa.addEventListener("click", () => {
    const selecionados = [...listaTodasEmpresas.selectedOptions];

    selecionados.forEach(opt => {
        listaEmpresasUsuario.appendChild(opt.cloneNode(true));
    });
});

// BOTÃO DE REMOVER EMPRESA
btnRemoveEmpresa.addEventListener("click", () => {
    const selecionados = [...listaEmpresasUsuario.selectedOptions];

    selecionados.forEach(opt => {
        if (!opt.disabled) {
            listaTodasEmpresas.appendChild(opt);
        }
    });
});

// FUNÇÃO PARA SALVAR AS EMPRESAS SELECIONADAS
async function salvarEmpresas() {
    const empresas = [...listaEmpresasUsuario.options]
        .filter(o => !o.disabled)
        .map(o => {

            const partes = o.textContent.split(" - ");
            partes.shift();

            return {
                cod_empresa: o.value,
                nome_empresa: partes.join(" - ")
            };
        });

    await fetch("/usuarios/salvar-empresas", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            usuario_id: usuarioSelecionado,
            empresas
        })
    });

    notify.success("Empresas salvas com sucesso!");

    await carregarUsuarios();
}

// ABRIR MODAL UNIDADES
async function abrirModalUnidades(idUsuario, codEmpresa, nomeEmpresa) {
    usuarioSelecionado = idUsuario;
    empresaSelecionada = codEmpresa;
    nomeEmpresaSelecionada = nomeEmpresa;

    const modal = new bootstrap.Modal(document.getElementById("modalUnidades"));

    modal.show();

    await carregarUnidades(codEmpresa);
    await carregarUnidadesUsuario(idUsuario, codEmpresa);
}

// FUNÇÃO PARA CARREGAR TODAS UNIDADES DA EMPRESA
async function carregarUnidades(codEmpresa) {
    const res = await fetch(`/unidades/${codEmpresa}`);
    const unidades = await res.json();

    listaTodasUnidades.innerHTML = "";

    // OPÇÃO 'TODAS'
    const optTodas = document.createElement("option");
    optTodas.value = "TODAS";
    optTodas.textContent = "TODAS";
    listaTodasUnidades.appendChild(optTodas);

    unidades.forEach(u => {
        const opt = document.createElement("option");

        opt.value = u.codigo;
        opt.textContent = `${u.codigo} - ${u.nome}`;

        listaTodasUnidades.appendChild(opt);
    });
}

// FUNÇÃO PARA CARREGAR AS UNIDADES DO USUÁRIO
async function carregarUnidadesUsuario(idUsuario, codEmpresa) {
    const res = await fetch(`/usuarios/${idUsuario}/unidades/${codEmpresa}`);
    const unidades = await res.json();

    listaUnidadesUsuario.innerHTML = "";

    // SE NO BANCO ESTIVER 'TODAS'
    if (unidades.length && unidades[0].codigo === "TODAS") {
        [...listaTodasUnidades.options].forEach(opt => {

            // IGNORA A OPÇÃO 'TODAS'
            if (opt.value !== "TODAS") {
                const novo = document.createElement("option");

                novo.value = opt.value;
                novo.textContent = opt.textContent;

                listaUnidadesUsuario.appendChild(novo);
            }
        });

        return;
    }

    // UNIDADES ESPECÍFICAS
    unidades.forEach(u => {
        const opt = document.createElement("option");

        opt.value = u.codigo;
        opt.textContent = `${u.codigo} - ${u.nome}`;

        listaUnidadesUsuario.appendChild(opt);
    });
}

// BOTÃO DE ADICIONAR UNIDADE
btnAddUnidade.addEventListener("click", () => {
    const selecionados = [...listaTodasUnidades.selectedOptions];

    selecionados.forEach(opt => {
        // SE ESCOLHER 'TODAS'
        if (opt.value === "TODAS") {

            listaUnidadesUsuario.innerHTML = "";

            const nova = document.createElement("option");
            nova.value = "TODAS";
            nova.textContent = "TODAS";

            listaUnidadesUsuario.appendChild(nova);

            return;
        }

        // SE JÁ EXISTIR 'TODAS', REMOVE
        if (listaUnidadesUsuario.options[0]?.value === "TODAS") {
            listaUnidadesUsuario.innerHTML = "";
        }

        listaUnidadesUsuario.appendChild(opt.cloneNode(true));
    });
});

// BOTÃO DE REMOVER UNIDADE
btnRemoverUnidade.addEventListener("click", () => {
    const selecionados = [...listaUnidadesUsuario.selectedOptions];

    selecionados.forEach(opt => { listaTodasUnidades.appendChild(opt); });
});

// FUNÇÃO PARA SALVAR AS UNIDADES SELECIONADAS
async function salvarUnidades() {
    const primeira = listaUnidadesUsuario.options[0];

    let unidades = [];

    // SE FOR 'TODAS'
    if (primeira && primeira.value === "TODAS") {

        unidades = [{
            cod_unidade: "TODAS",
            nome_unidade: "TODAS"
        }];
    }
    else {
        unidades = [...listaUnidadesUsuario.options].map(o => {
            const partes = o.textContent.split(" - ");
            partes.shift();
            return {
                cod_unidade: o.value,
                nome_unidade: partes.join(" - ")
            };
        });
    }

    await fetch("/usuarios/salvar-unidades", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            usuario_id: usuarioSelecionado,
            cod_empresa: empresaSelecionada,
            nome_empresa: nomeEmpresaSelecionada,
            unidades
        })
    });

    notify.success("Unidades salvas com sucesso!");
}