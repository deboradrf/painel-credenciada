let empresasCom = [];
let empresasSem = [];
let filtroAtual = "";

const usuarioLogado = getUsuario();
const nomeEmpresa = getEmpresaNome();

// INIT
document.addEventListener("DOMContentLoaded", async () => {
    await dropdownPerfil();
    await carregarEmpresas();
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
    if (usuarioLogado.perfil === "ADMINISTRADOR") {
        avatarIcon.classList.add("fa-user-gear");
        avatarIconDropdown.classList.add("fa-user-gear");

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

const listaEmpresas = document.getElementById("listaEmpresas");

// FUNÇÃO PARA LISTAR TODAS AS EMPRESAS
async function carregarEmpresas() {
    listaEmpresas.innerHTML = `
        <small class="list-group-item text-center text-muted">
            <i class="fa-solid fa-arrow-rotate-right fa-spin" style="color: #F1AE33"></i>
            Carregando empresas...
        </small>
    `;

    const res = await fetch("/api/empresas");
    const empresas = await res.json();

    const itens = await Promise.all(empresas.map(async (emp) => {
        const res = await fetch(`/empresa/${emp.codigo}/responsavel`);
        const responsavel = await res.json();

        return {
            emp,
            email: responsavel?.emails || []
        };
    }));

    empresasCom = itens.filter(e => e.email.length > 0);
    empresasSem = itens.filter(e => e.email.length === 0);

    renderizarLista("com");
}

// FUNÇÃO DE FILTRO
function filtrar() {
    const input = document.getElementById("filtroEmail");
    filtroAtual = input.value.toLowerCase();

    const abaAtiva = document.getElementById("tabCom").classList.contains("active")
        ? "com"
        : "sem";

    renderizarLista(abaAtiva);
}

// FUNÇÃO PARA TROCAR A ABA
function trocarAba(tipo) {
    document.getElementById("tabCom").classList.toggle("active", tipo === "com");
    document.getElementById("tabSem").classList.toggle("active", tipo === "sem");

    const input = document.getElementById("filtroEmail");

    input.value = "";
    filtroAtual = "";

    input.placeholder =
        tipo === "com"
            ? "Buscar por e-mail do responsável..."
            : "Buscar por nome da empresa...";

    renderizarLista(tipo);
}

// FUNÇÃO PARA RENDERIZAR A LISTA DE EMPRESAS
function renderizarLista(tipo) {
    listaEmpresas.innerHTML = "";

    let dados = tipo === "com" ? empresasCom : empresasSem;

    // FILTROS
    if (filtroAtual) {
        if (tipo === "com") {
            // filtra por EMAIL
            dados = dados.filter(item =>
                item.email.some(e =>
                    e.toLowerCase().includes(filtroAtual)
                )
            );
        } else {
            // filtra por NOME DA EMPRESA
            dados = dados.filter(item =>
                item.emp.nome.toLowerCase().includes(filtroAtual)
            );
        }
    }

    if (dados.length === 0) {
        listaEmpresas.innerHTML = `
            <small class="list-group-item text-center text-muted">
                <i class="fa-solid fa-circle-exclamation" style="color: #F1AE33"></i>
                ${
                    filtroAtual
                        ? tipo === "com"
                            ? "Nenhuma empresa encontrada para esse e-mail"
                            : "Nenhuma empresa encontrada para esse nome"
                        : tipo === "com"
                            ? "Nenhuma empresa com responsável"
                            : "Nenhuma empresa sem responsável"
                }
            </small>
        `;
        return;
    }

    dados.forEach(({ emp, email }) => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center";

        li.innerHTML = `
            <div>
                <strong>${emp.nome}</strong><br>
                <small>${email.length ? email.join(", ") : "Sem responsável definido"}</small>
            </div>

            <button class="btn-editar" onclick='editarEmpresa(${JSON.stringify(emp.codigo)}, ${JSON.stringify(emp.nome)}, ${JSON.stringify(email)})'>
                <i class="fa-solid fa-pen-to-square"></i>    
                Editar
            </button>
        `;

        listaEmpresas.appendChild(li);
    });
}

// FUNÇÃO PARA EDITAR O RESPONSÁVEL
let empresaAtual = {};

async function editarEmpresa(id, nome, emails) {
    empresaAtual = { id, nome };

    const container = document.getElementById("emailsContainer");
    container.innerHTML = "";

    if (Array.isArray(emails) && emails.length > 0) {
        emails.forEach(e => adicionarCampoEmail(e));
    } else {
        adicionarCampoEmail();
    }

    // 👇 BUSCAR LOG
    const res = await fetch(`/log-responsavel-empresa/${id}`);
    const log = await res.json();

    const info = document.getElementById("infoAlteracao");

    if (log) {
        info.innerText = `Última alteração por ${log.alterado_por} em ${new Date(log.data_alteracao).toLocaleString()}`;
    } else {
        info.innerText = "Nenhuma alteração registrada";
    }

    const modal = new bootstrap.Modal(document.getElementById("modalResponsavel"));
    modal.show();
}

// FUNÇÃO PARA SALVAR
document.getElementById("btnSalvarModal").onclick = async () => {
    const inputs = document.querySelectorAll(".email-input");

    const emails = Array.from(inputs)
        .map(input => input.value.trim())
        .filter(e => e);

    const emailsUnicos = [...new Set(emails)];

    const usuario = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    const nomeUsuario = usuario?.nome;

    const res = await fetch("/empresa/responsavel", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: empresaAtual.id,
            nome: empresaAtual.nome,
            emails: emailsUnicos,
            alteradoPor: nomeUsuario
        })
    });

    if (res.ok) {
        notify.success("Responsável atualizado com sucesso!");

        const modalEl = document.getElementById("modalResponsavel");
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();

        await carregarEmpresas();
        trocarAba("com");

    } else {
        notify.error("Não foi possível salvar");
    }
};

function adicionarCampoEmail(valor = "") {
    const container = document.getElementById("emailsContainer");

    const div = document.createElement("div");
    div.className = "d-flex align-items-center mt-2 gap-2";

    div.innerHTML = `
        <div class="input-wrapper flex-grow-1">
            <div class="input-icon">
                <i class="fa-solid fa-envelope"></i>
            </div>
            <input type="email" class="email-input" value="${valor}">
        </div>

        <button type="button" class="btn-add" onclick="adicionarCampoEmail()">
            <i class="fa-solid fa-plus"></i>
        </button>

        <button type="button" class="btn-excluir"
            onclick="
                const container = document.getElementById('emailsContainer');
                if (container.children.length > 1) {
                    this.parentElement.remove();
                } else {
                    this.parentElement.querySelector('.email-input').value = '';
                }
            ">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;

    container.appendChild(div);
}