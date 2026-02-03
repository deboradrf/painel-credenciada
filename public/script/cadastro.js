const API = "http://localhost:3001";

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

    if (!input.value) {
        alert("Nenhuma senha para copiar");
        return;
    }

    input.select();
    input.setSelectionRange(0, 99999);

    navigator.clipboard.writeText(input.value)
        .then(() => {
            alert("Senha copiada!");
        })
        .catch(() => {
            // Fallback caso clipboard API falhe
            document.execCommand("copy");
            alert("Senha copiada!");
        });

    window.getSelection().removeAllRanges();
}

// LISTENER PARA QUANDO SELECIONAR O PERFIL
document.getElementById("perfil").addEventListener("change", function () {
    const perfil = this.value;
    const selectEmpresa = document.getElementById("empresa");

    if (perfil === "EMPRESA" || perfil === "CREDENCIADA") {
        carregarEmpresas(perfil);
    } else {
        selectEmpresa.disabled = true;
    }
});

// FUNÇÃO PARA CARREGAR EMPRESAS
async function carregarEmpresas(perfil) {
    const select = document.getElementById("empresa");
    if (!select) return;

    try {
        const res = await fetch("http://localhost:3001/empresas");
        let empresas = await res.json();

        // SE O PERFIL FOR CREDENCIADA, CARREGAR EMPRESAS DA SALUBRITA APENAS
        if (perfil === "CREDENCIADA") {
            empresas = empresas.filter(e =>
                e.nome &&
                e.nome.toLowerCase().startsWith("salubrita")
            );
        }

        select.innerHTML = '<option value="">Selecione...</option>';

        if (empresas.length === 0) {
            select.innerHTML = '<option value="">Nenhuma empresa disponível</option>';
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
    } catch (err) {
        console.error("Erro ao carregar empresas:", err);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
        select.disabled = true;
    }
}

document.getElementById("empresa").addEventListener("change", function () {
    const empresaCodigo = this.value;
    carregarUnidades(empresaCodigo);
});

// FUNÇÃO PARA CARREGAR UNIDADES DA EMPRESA SELECIONADA
async function carregarUnidades(empresaCodigo) {
    const select = document.getElementById("unidade");
    if (!select) return;

    if (!empresaCodigo) {
        select.disabled = true;
        return;
    }

    select.disabled = true;

    try {
        const res = await fetch(`http://localhost:3001/unidades/${empresaCodigo}`);
        const unidades = await res.json();

        if (!unidades || unidades.length === 0) {
            select.innerHTML = '<option value="">Nenhuma unidade nesta empresa</option>';
            select.disabled = true;
            return;
        }

        select.innerHTML = '<option value="">Selecione...</option>';

        unidades.forEach(u => {
            const opt = document.createElement("option");
            opt.value = u.codigo;
            opt.textContent = u.nome;
            opt.dataset.nome = u.nome;
            select.appendChild(opt);
        });

        select.disabled = false;
    } catch (err) {
        console.error("Erro ao carregar unidades:", err);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

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

    const empresaNome = empresa.options[empresa.selectedIndex]?.text || null;

    const unidadeNome = unidade.options[unidade.selectedIndex]?.text || null;

    const body = {
        nome: nome.value,
        cpf: cpf.value,
        email: email.value,
        senha: senha.value,
        perfil: perfil.value,
        cod_empresa: empresa.value,
        nome_empresa: empresaNome,
        cod_unidade: unidade.value,
        nome_unidade: unidadeNome
    };

    const res = await fetch(`${API}/cadastro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.erro || "Erro ao cadastrar");
        return;
    }

    alert("Usuário cadastrado com sucesso!");
    e.target.reset();
});