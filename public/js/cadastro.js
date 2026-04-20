(async function verificarPermissao() {
    const sessao = sessionStorage.getItem("usuarioLogado");

    let dados;
    try {
        dados = JSON.parse(sessao);
    } catch (e) {
        window.location.href = "/pages/login.html";
        return;
    }

    if (!dados || dados.permissao !== "adm") {
        await modalConfirm("Você não tem permissão para acessar esta página. Faça login como ADM");
        window.location.href = "/pages/login.html";
    }
})();

// MÁSCARA DE CPF
const cpfInput = document.getElementById("cpf");

cpfInput.addEventListener("input", function () {
    let value = this.value.replace(/\D/g, "");

    if (value.length > 11) value = value.slice(0, 11);

    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

    this.value = value;
});

// FUNÇÃO PARA GERAR SENHA ALEATÓRIA
function gerarSenhaNoInput(tamanho = 10) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%!&*";
    let senha = "";

    for (let i = 0; i < tamanho; i++) {
        senha += chars[Math.floor(Math.random() * chars.length)];
    }

    document.getElementById("senha").value = senha;
}

// FUNÇÃO PARA COPIAR SENHA GERADA
function copiarSenha() {
    const input = document.getElementById("senha");

    if (!input || !input.value) {
        notify.warning("Nenhuma senha para copiar");
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = input.value;

    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        document.execCommand("copy");
        notify.success("Senha copiada!");
    } catch (erro) {
        console.error(erro);
        notify.error("Não foi possível copiar a senha");
    }

    document.body.removeChild(textarea);
}

// LISTENER PARA QUANDO SELECIONAR O PERFIL
document.getElementById("perfil").addEventListener("change", async function () {
    const perfil = this.value;
    const selectEmpresa = document.getElementById("empresa");
    const empresaGroup = document.getElementById("empresaGroup");
    const selectsUnidade = document.querySelectorAll(".unidade-select");
    const btnAddUnidade = document.getElementById("btnAddUnidade");

    if (perfil === "ADMINISTRADOR") {
        // Mostrar campos de empresa e unidade
        empresaGroup.style.display = "block";

        // Empresa fixo TODAS
        selectEmpresa.innerHTML = '<option value="TODAS">TODAS</option>';
        selectEmpresa.value = "TODAS";
        selectEmpresa.disabled = true;

        // Unidades fixo TODAS
        selectsUnidade.forEach(select => {
            select.innerHTML = '<option value="TODAS">TODAS</option>';
            select.value = "TODAS";
            select.disabled = true;
        });

        // Esconder botão de adicionar unidade
        btnAddUnidade.style.display = "none";
    } else if (perfil === "EMPRESA" || perfil === "CREDENCIADA") {
        // Mostrar campo empresa normalmente
        empresaGroup.style.display = "block";
        selectEmpresa.required = true;
        selectEmpresa.disabled = false;
        carregarEmpresas(perfil);

        // Unidades habilitadas, botão visível após carregar unidades
        selectsUnidade.forEach(select => {
            select.disabled = false;
            select.innerHTML = '<option value="">Selecione...</option>';
        });
        btnAddUnidade.style.display = "inline-block";
    } else {
        empresaGroup.style.display = "none";
        selectEmpresa.disabled = true;
        selectsUnidade.forEach(select => select.disabled = true);
        btnAddUnidade.style.display = "none";
    }
});

// FUNÇÃO PARA CARREGAR EMPRESAS
async function carregarEmpresas(perfil) {
    const select = document.getElementById("empresa");
    if (!select) return;

    try {
        const res = await fetch("/api/empresas");
        let empresas = await res.json();

        // SE O PERFIL FOR CREDENCIADA, CARREGAR EMPRESAS DA SALUBRITA APENAS
        if (perfil === "CREDENCIADA") {
            empresas = empresas.filter(e =>
                e.nome &&
                e.nome.toLowerCase().startsWith("salubrita")
            );
        }

        select.innerHTML = '<option value="">Selecione...</option>';

        // Adiciona a opção "TODAS" no topo
        const todasOption = document.createElement("option");
        todasOption.value = "TODAS";
        todasOption.textContent = "TODAS";
        select.appendChild(todasOption);

        if (empresas.length === 0) {
            select.innerHTML += '<option value="">Nenhuma empresa disponível</option>';
            select.disabled = true;
            return;
        }

        empresas.forEach(e => {
            const opt = document.createElement("option");
            opt.value = e.codigo;
            opt.textContent = e.nome;
            select.appendChild(opt);
        });

        select.disabled = false;
    } catch (erro) {
        console.error(erro);

        select.innerHTML = '<option value="">Erro ao carregar</option>';
        select.disabled = true;
    }
}

// Chamar sempre que empresa mudar
document.getElementById("empresa").addEventListener("change", async function () {
    const empresaCodigo = this.value;

    const selects = document.querySelectorAll(".unidade-select");

    if (empresaCodigo === "TODAS") {
        // define TODAS nas unidades
        selects.forEach(select => {
            select.innerHTML = "";
            const opt = document.createElement("option");
            opt.value = "TODAS";
            opt.textContent = "TODAS";
            select.appendChild(opt);
            select.value = "TODAS";
            select.disabled = true; // desabilita para evitar mudanças
        });
    } else {
        // empresa específica
        selects.forEach(select => {
            select.disabled = false;
            select.innerHTML = '<option value="">Selecione...</option>';
        });
        await carregarUnidades(empresaCodigo);
    }

    atualizarBotaoAddUnidade(); // atualiza visibilidade do botão
});

// Chamar sempre que uma unidade mudar (se você tiver listener para cada select)
document.querySelectorAll(".unidade-select").forEach(select => {
    select.addEventListener("change", atualizarBotaoAddUnidade);
});

function atualizarBotaoAddUnidade() {
    const selects = document.querySelectorAll(".unidade-select");
    const btnAddUnidade = document.getElementById("btnAddUnidade");

    // Verifica se existe pelo menos uma unidade válida
    const possuiUnidadeValida = [...selects].some(s => s.options.length > 1 && s.value !== "TODAS" && !s.disabled);

    btnAddUnidade.style.display = possuiUnidadeValida ? "inline-block" : "none";
}

// FUNÇÃO PARA CARREGAR UNIDADES DA EMPRESA SELECIONADA
async function carregarUnidades(empresaCodigo) {
    const selects = document.querySelectorAll(".unidade-select");
    const btnAddUnidade = document.getElementById("btnAddUnidade");

    if (!empresaCodigo) return;

    try {
        // Se empresa "TODAS" estiver selecionada, buscar todas as unidades
        let url = empresaCodigo === "TODAS" ? `/unidades` : `/api/unidades/${empresaCodigo}`;
        const res = await fetch(url);
        const unidades = await res.json();

        selects.forEach(select => {
            select.innerHTML = ""; // limpa opções

            if (!unidades || unidades.length === 0) {
                // Nenhuma unidade disponível
                const opt = document.createElement("option");
                opt.value = "";
                opt.textContent = "Nenhuma unidade disponível";
                select.appendChild(opt);
                select.disabled = true; // desabilita select
            } else {
                select.disabled = false;

                // Adiciona opção "Selecione..."
                const placeholder = document.createElement("option");
                placeholder.value = "";
                placeholder.textContent = "Selecione...";
                select.appendChild(placeholder);

                // Adiciona a opção "Todas"
                const todasOption = document.createElement("option");
                todasOption.value = "TODAS";
                todasOption.textContent = "TODAS";
                select.appendChild(todasOption);

                // Adiciona as unidades normais
                unidades.forEach(u => {
                    const opt = document.createElement("option");
                    opt.value = u.codigo;
                    opt.textContent = u.nome;
                    opt.dataset.nome = u.nome;
                    select.appendChild(opt);
                });
            }
        });

        // Mostrar ou esconder botão de adicionar unidade
        if (!unidades || unidades.length === 0 || empresaCodigo === "TODAS") {
            btnAddUnidade.style.display = "none";
        } else {
            btnAddUnidade.style.display = "inline-block";
        }
    } catch (erro) {
        console.error(erro);

        selects.forEach(select => {
            select.innerHTML = '<option value="">Erro ao carregar unidades</option>';
            select.disabled = true;
        });

        btnAddUnidade.style.display = "none";
    }
}

const MAX_UNIDADES = 5;

// Botão adicionar unidade
document.getElementById("btnAddUnidade").addEventListener("click", () => {
    const container = document.getElementById("unidadesContainer");
    const selects = container.querySelectorAll(".unidade-select");

    if (selects.length >= MAX_UNIDADES) {
        notify.warning("Máximo de 5 unidades permitido");
        return;
    }

    const novo = selects[0].parentElement.cloneNode(true);

    const select = novo.querySelector("select");
    select.value = "";

    container.appendChild(novo);
});

// CAMPO DE NOME SEMPRE MAIÚSCULO E SEM CARACTERES ESPECIAIS
const nomeInput = document.getElementById("nome");

nomeInput.addEventListener("input", function () {
    let valor = this.value.toUpperCase();

    valor = valor.replace(/[^A-ZÇÀ-Ÿ\s]/g, "");

    valor = valor
        .replace(/[ÁÀÂÃ]/g, "A")
        .replace(/[ÉÈÊ]/g, "E")
        .replace(/[ÍÌÎ]/g, "I")
        .replace(/[ÓÒÔÕ]/g, "O")
        .replace(/[ÚÙÛ]/g, "U");

    this.value = valor;
});

// SUBMIT DO FORMULÁRIO
document.getElementById("cadastroForm").addEventListener("submit", async e => {
    e.preventDefault();

    const empresaSelect = document.getElementById("empresa");
    const selectsUnidade = document.querySelectorAll(".unidade-select");

    let empresaNome = empresaSelect.options[empresaSelect.selectedIndex]?.text || null;
    let unidades = [];

    if (perfil.value === "ADMINISTRADOR") {
        // Para administrador: sempre usar TODAS
        empresaNome = "TODAS";
        unidades = [{ cod_unidade: "TODAS", nome_unidade: "TODAS" }];
    } else {
        // ⚠ Verifica se existe pelo menos uma unidade válida
        const possuiUnidadeValida = [...selectsUnidade].some(s => !s.disabled && s.options.length > 1);
        if (!possuiUnidadeValida) {
            notify.error("Não é possível cadastrar: a empresa selecionada não possui unidades.");
            return;
        }

        unidades = [...selectsUnidade]
            .filter(s => s.value)
            .map(s => ({
                cod_unidade: s.value,
                nome_unidade: s.options[s.selectedIndex].text
            }));
    }

    const body = {
        nome: nome.value,
        cpf: cpf.value,
        email: email.value,
        senha: senha.value,
        perfil: perfil.value,
        cod_empresa: empresaSelect.value,
        nome_empresa: empresaNome,
        unidades
    };

    const res = await fetch(`/api/cadastro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
        notify.error(data.erro || "Erro ao cadastrar");
        return;
    }

    notify.success("Usuário cadastrado com sucesso!");
    e.target.reset();
});