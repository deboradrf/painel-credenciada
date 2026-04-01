const usuarioLogado = getUsuario();
const nomeEmpresa = getEmpresaNome();

let usuarioSelecionado = null;
let empresaSelecionada = null;
let nomeEmpresaSelecionada = null;

const listaUsuarios = document.getElementById("usuariosList");

const listaTodasUnidades = document.getElementById("listaTodasUnidades");
const listaUnidadesUsuario = document.getElementById("listaUnidadesUsuario");
const btnAddUnidade = document.getElementById("btnAddUnidade");

const listaTodasEmpresas = document.getElementById("listaTodasEmpresas");
const listaEmpresasUsuario = document.getElementById("listaEmpresasUsuario");
const btnAddEmpresa = document.getElementById("btnAddEmpresa");

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
                <button class="btn-empresas principal"
                    onclick="abrirModalUnidades(${u.id}, '${u.cod_empresa}', '${u.nome_empresa}')">
                    ${u.nome_empresa}
                </button>
            `;
        }

        // EMPRESAS EXTRAS
        if (u.empresas_extras) {
            u.empresas_extras.forEach(e => {
                empresasHTML += `
                    <button class="btn-empresas extra"
                        onclick="abrirModalUnidades(${u.id}, '${e.cod_empresa}', '${e.nome_empresa}')">
                        ${e.nome_empresa}
                    </button>
                `;
            });
        }

        li.innerHTML = `
        <div class="usuario-card shadow-sm">
            <div class="usuario-header">
                <div class="usuario-left">
                    <div class="usuario-avatar">
                        <i class="fa-solid fa-user fa-lg"></i>
                    </div>

                    <div class="usuario-text">
                        <b>${u.nome}</b>
                        <small>CPF: ${u.cpf}</small>
                        <small>ID: ${u.id}</small> 
                    </div>
                </div>

                <button class="btn-gerenciar" onclick="abrirModalEmpresas(${u.id})">
                    <i class="fa-solid fa-gear"></i>
                    Gerenciar empresas
                </button>
            </div>

            <div class="empresas-area">
                <div class="empresas-label mt-4">Empresas do usuário</div>
                <div class="empresas-wrapper mt-2">
                    ${empresasHTML}
                </div>
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

    await exibirLog(idUsuario, "empresas");
}

// FUNÇÃO PARA CARREGAR TODAS AS EMPRESAS
async function carregarTodasEmpresas() {
    const res = await fetch("/empresas");
    const empresas = await res.json();
    
    listaTodasEmpresas.innerHTML = '<option value="">Selecione uma empresa...</option>';
    
    empresas.forEach(e => {
        const opt = document.createElement("option");
        opt.value = e.codigo;
        opt.textContent = e.nome;
        listaTodasEmpresas.appendChild(opt);
    });
}

// FUNÇÃO PARA CARREGAR AS EMPRESAS DO USUÁRIO
async function carregarEmpresasUsuario(idUsuario) {
    const res = await fetch(`/usuarios/${idUsuario}/empresas`);
    const empresas = await res.json();
    
    listaEmpresasUsuario.innerHTML = "";
    
    empresas.forEach(e => adicionarEmpresaNaLista(e.cod_empresa, e.nome_empresa, e.principal));
    
    atualizarEstadoLista();
}

// FUNÇÃO PARA ADICINAR EMPRESA NA LISTA
function adicionarEmpresaNaLista(cod, nome, principal = false) {
    const jaExiste = [...listaEmpresasUsuario.querySelectorAll("li")]
        .some(li => li.dataset.cod === String(cod));
    if (jaExiste) return;

    const li = document.createElement("li");
    li.dataset.cod = cod;
    li.dataset.nome = nome;

    li.innerHTML = `
        <div class="empresa-item-left">
            <div class="empresa-icon ${principal ? "principal-icon" : ""}">
                <i class="fa-solid fa-building"></i>
            </div>
            <div>
                <p class="empresa-nome">${nome}</p>
                ${principal ? `<p class="empresa-sub">Empresa principal</p>` : ""}
            </div>
        </div>
        ${principal
            ? ""
            : `<button class="btn-remove-empresa" onclick="removerEmpresaDaLista(this)">
                   <i class="fa-solid fa-trash"></i>
               </button>`
        }
    `;

    listaEmpresasUsuario.appendChild(li);
    atualizarEstadoLista();
}

// FUNÇÃO PARA REMOVER EMPRESA DA LISTA
function removerEmpresaDaLista(btn) {
    const li = btn.closest("li");
    const opt = document.createElement("option");
    opt.value = li.dataset.cod;
    opt.textContent = li.dataset.nome;
    listaTodasEmpresas.appendChild(opt);
    li.remove();
    atualizarEstadoLista();
}

// BOTÃO DE ADICIONAR EMPRESA
btnAddEmpresa.addEventListener("click", () => {
    const opt = listaTodasEmpresas.selectedOptions[0];
    
    if (!opt || !opt.value) return;
    
    adicionarEmpresaNaLista(opt.value, opt.textContent.trim());
    
    listaTodasEmpresas.remove(listaTodasEmpresas.selectedIndex);
    
    listaTodasEmpresas.value = "";
});

// helper — atualiza contador e empty state
function atualizarEstadoLista() {
    const items = listaEmpresasUsuario.querySelectorAll("li");
    const total = items.length;

    document.getElementById("contadorEmpresas").textContent = total === 1 ? "1 empresa" : `${total} empresas`;
}

// FUNÇÃO PARA SALVAR AS EMPRESAS SELECIONADAS
async function salvarEmpresas() {
    const empresas = [...listaEmpresasUsuario.querySelectorAll("li")]
        .filter(li => li.querySelector(".btn-remove-empresa"))
        .map(li => ({ cod_empresa: li.dataset.cod, nome_empresa: li.dataset.nome }));

    const usuario = JSON.parse(sessionStorage.getItem("usuarioLogado"));

    await fetch("/usuarios/salvar-empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            usuario_id: usuarioSelecionado,
            empresas,
            alterado_por: usuario?.nome
        })
    });

    notify.success("Empresas salvas com sucesso!");
    await carregarUsuarios();
    await exibirLog(usuarioSelecionado, "empresas");

    bootstrap.Modal.getInstance(document.getElementById("modalEmpresas")).hide();
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

    await exibirLog(idUsuario, "unidades", codEmpresa);
}

// FUNÇÃO PARA CARREGAR TODAS UNIDADES DA EMPRESA
async function carregarUnidades(codEmpresa) {
    const res = await fetch(`/unidades/${codEmpresa}`);
    const unidades = await res.json();

    listaTodasUnidades.innerHTML = '<option value="">Escolha uma unidade...</option>';

    const optTodas = document.createElement("option");
    optTodas.value = "TODAS";
    optTodas.textContent = "Todas as unidades";
    listaTodasUnidades.appendChild(optTodas);

    unidades.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.codigo;
        opt.textContent = u.nome;
        listaTodasUnidades.appendChild(opt);
    });
}

// FUNÇÃO PARA CARREGAR AS UNIDADES DO USUÁRIO
async function carregarUnidadesUsuario(idUsuario, codEmpresa) {
    const res = await fetch(`/usuarios/${idUsuario}/unidades/${codEmpresa}`);
    const unidades = await res.json();

    listaUnidadesUsuario.innerHTML = "";

    // SE NO BANCO ESTIVER 'TODAS', EXPANDE TODAS AS UNIDADES
    if (unidades.length && unidades[0].codigo === "TODAS") {
        [...listaTodasUnidades.options].forEach(opt => {
            if (opt.value && opt.value !== "TODAS" && opt.value !== "") {
                adicionarUnidadeNaLista(opt.value, opt.textContent);
            }
        });
    } else {
        unidades.forEach(u => adicionarUnidadeNaLista(u.codigo, u.nome));
    }

    atualizarEstadoListaUnidades();
}

// HELPER — adiciona <li> na lista de unidades
function adicionarUnidadeNaLista(cod, nome) {
    const jaExiste = [...listaUnidadesUsuario.querySelectorAll("li")]
        .some(li => li.dataset.cod === String(cod));
    if (jaExiste) return;

    const li = document.createElement("li");
    li.dataset.cod = cod;
    li.dataset.nome = nome;

    li.innerHTML = `
        <div class="empresa-item-left">
            <div class="empresa-icon">
                <i class="fa-solid fa-location-dot"></i>
            </div>
            <p class="empresa-nome">${nome}</p>
        </div>
        <button class="btn-remove-empresa" onclick="removerUnidadeDaLista(this)" title="Remover">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;

    listaUnidadesUsuario.appendChild(li);
    atualizarEstadoListaUnidades();
}

// HELPER — remove item e devolve ao select
function removerUnidadeDaLista(btn) {
    const li = btn.closest("li");
    const opt = document.createElement("option");
    opt.value = li.dataset.cod;
    opt.textContent = li.dataset.nome;
    listaTodasUnidades.appendChild(opt);
    li.remove();
    atualizarEstadoListaUnidades();
}

// HELPER — atualiza contador e empty state
function atualizarEstadoListaUnidades() {
    const total = listaUnidadesUsuario.querySelectorAll("li").length;
    document.getElementById("contadorUnidades").textContent =
        total === 1 ? "1 unidade" : `${total} unidades`;
    document.getElementById("emptyStateUnidades").style.display =
        total === 0 ? "flex" : "none";
}

// BOTÃO DE ADICIONAR UNIDADE
btnAddUnidade.addEventListener("click", () => {
    const sel = listaTodasUnidades;
    const idx = sel.selectedIndex;
    const opt = sel.options[idx];

    if (!opt || !opt.value) return;

    if (opt.value === "TODAS") {
        [...sel.options].forEach(o => {
            if (o.value && o.value !== "TODAS" && o.value !== "") {
                adicionarUnidadeNaLista(o.value, o.textContent);
            }
        });
        sel.value = "";
        return;
    }

    adicionarUnidadeNaLista(opt.value, opt.textContent.trim());
    sel.remove(idx);
    sel.selectedIndex = 0;
});

// FUNÇÃO PARA SALVAR AS UNIDADES SELECIONADAS
async function salvarUnidades() {
    const itens = [...listaUnidadesUsuario.querySelectorAll("li")];

    // VERIFICA SE TODAS AS UNIDADES ESTÃO SELECIONADAS
    const todasOpts = [...listaTodasUnidades.options]
        .filter(o => o.value && o.value !== "TODAS" && o.value !== "");
    const todas = todasOpts.length === 0 && itens.length > 0;

    let unidades;
    if (todas) {
        unidades = [{ cod_unidade: "TODAS", nome_unidade: "TODAS" }];
    } else {
        unidades = itens.map(li => ({
            cod_unidade: li.dataset.cod,
            nome_unidade: li.dataset.nome
        }));
    }

    const usuario = JSON.parse(sessionStorage.getItem("usuarioLogado"));

    await fetch("/usuarios/salvar-unidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            usuario_id: usuarioSelecionado,
            cod_empresa: empresaSelecionada,
            nome_empresa: nomeEmpresaSelecionada,
            unidades,
            alterado_por: usuario?.nome
        })
    });

    notify.success("Unidades salvas com sucesso!");
    await exibirLog(usuarioSelecionado, "unidades", empresaSelecionada);

    bootstrap.Modal.getInstance(document.getElementById("modalUnidades")).hide();
}

// HELPER — busca e exibe o log no modal
async function exibirLog(idUsuario, tipo, codEmpresa = null) {
    const params = new URLSearchParams({ tipo });
    if (codEmpresa) params.append("cod_empresa", codEmpresa);

    const res = await fetch(`/usuarios/${idUsuario}/log?${params}`);
    const log = await res.json();

    const elementId = tipo === "empresas" ? "logEmpresas" : "logUnidades";
    const el = document.getElementById(elementId);

    if (log) {
        const data = new Date(log.data_alteracao).toLocaleString("pt-BR");
        el.textContent = `Última alteração por ${log.alterado_por} em ${data}`;
    } else {
        el.textContent = "Nenhuma alteração registrada";
    }
}