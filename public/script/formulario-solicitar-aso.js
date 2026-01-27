// USUÁRIO LOGADO (PRIMEIRO DE TUDO)
const usuarioLogado = JSON.parse(localStorage.getItem("usuario"));

if (!usuarioLogado) {
  alert("Usuário não logado");
  window.location.href = "login.html";
}

// DADOS DA EMPRESA (DEPOIS)
const empresaCodigo = usuarioLogado.cod_empresa;
const nomeEmpresa = usuarioLogado.nome_empresa;

// CACHE
let prestadoresCache = [];
let usuario = null;

const API = "http://localhost:3001";

// DROPDOWN DO PERFIL
document.addEventListener("DOMContentLoaded", () => {
  usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!usuario) {
    window.location.href = "login.html";
    return;
  }

  const userNameDropdown = document.getElementById("userNameDropdown");
  const dropdownUserExtra = document.getElementById("dropdownUserExtra");

  const avatarIcon = document.getElementById("avatarIcon");
  const avatarIconDropdown = document.getElementById("avatarIconDropdown");

  const avatarBtn = document.querySelector(".profile-trigger .avatar-circle");
  const avatarDrop = document.querySelector(".profile-header .avatar-circle");

  function getPrimeiroNomeESobrenome(nomeCompleto) {
    if (!nomeCompleto) return "";
    const partes = nomeCompleto.trim().split(" ");
    return partes.length >= 2
      ? `${partes[0]} ${partes[1]}`
      : partes[0];
  }

  // NOME
  userNameDropdown.innerText = getPrimeiroNomeESobrenome(usuario.nome);

  // EMPRESA E UNIDADE
  dropdownUserExtra.innerHTML = `
    <div class="company-name">${usuario.nome_empresa}</div>
    <div class="unit-name">${usuario.nome_unidade}</div>
  `;

  // LÓGICA DOS PERFIS DE ACESSO
  if (usuario.perfil === "CREDENCIADA") {
    avatarIcon.classList.add("fa-hospital");
    avatarIconDropdown.classList.add("fa-hospital");

    avatarBtn.classList.add("credenciada");
    avatarDrop.classList.add("credenciada");
  }

  if (usuario.perfil === "EMPRESA") {
    avatarIcon.classList.add("fa-building");
    avatarIconDropdown.classList.add("fa-building");

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

// INIT
document.addEventListener("DOMContentLoaded", async () => {
  preencherEmpresaUsuario();
  await carregarUnidades();
  await carregarSetores();
  await carregarCargos();
  preencherFuncionarioASO();
  await carregarPrestadores();
});

// CARREGAR PRESTADORES
async function carregarPrestadores() {
  if (!empresaCodigo) return;

  const select = document.getElementById("nome_clinica");
  if (!select) return;

  try {
    await fetch(`http://localhost:3001/prestadores/${empresaCodigo}`);

    await listarPrestadores();

  } catch (err) {
    console.error("Erro ao carregar prestadores:", err);
  }
}

// LISTAR OS PRESTADORES
async function listarPrestadores() {
  const res = await fetch(`http://localhost:3001/prestadores/${empresaCodigo}`);
  const prestadoresBase = await res.json();

  const detalhes = [];

  for (const p of prestadoresBase) {
    const prestador = await buscarDetalhesPrestador(p.codigo);
    if (prestador) detalhes.push(prestador);
  }

  prestadoresCache = detalhes;

  console.table(
    prestadoresCache.map(p => ({
      codigo: p.codigo,
      estado: p.estado,
      cidade: p.cidade
    }))
  );

  popularSelectEstados(extrairEstados(prestadoresCache));
}

// PEGAR OS DETALHES DO PRESTADOR
async function buscarDetalhesPrestador(codigo) {
  try {
    const res = await fetch(`http://localhost:3001/prestador/${empresaCodigo}/${codigo}`);
    if (!res.ok) throw new Error();

    const dados = await res.json();

    return {
      codigo,
      nome: dados.nomePrestador || dados.nome || "",
      cidade: dados.cidade || "",
      estado: dados.estado || ""
    };
  } catch {
    return null;
  }
}

// EXTRAÍR TODOS OS ESTADOS DAS CLÍNICAS
function extrairEstados(prestadores) {
  return [...new Set(
    prestadores
      .map(p => p.estado)
      .filter(estado => estado)
  )].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// POPULAR O SELECT DE ESTADOS
function popularSelectEstados(estados) {
  const select = document.getElementById("estado_clinica");
  if (!select) return;

  select.innerHTML = '<option value="">Selecione...</option>';

  estados.forEach(estado => {
    const opt = document.createElement("option");
    opt.value = estado;
    opt.textContent = estado;
    select.appendChild(opt);
  });
}

// QUANDO SELECIONAR O ESTADO, FILTRAR POR CIDADES
document.getElementById("estado_clinica").addEventListener("change", function () {
  const estadoSelecionado = this.value;
  const selectCidade = document.getElementById("cidade_clinica");

  selectCidade.innerHTML = '<option value="">Selecione...</option>';

  if (!estadoSelecionado) return;

  const cidadesUnicas = [...new Set(
    prestadoresCache
      .filter(p => p.estado === estadoSelecionado)
      .map(p => p.cidade)
      .filter(cidade => cidade)
  )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  cidadesUnicas.forEach(cidade => {
    const opt = document.createElement("option");
    opt.value = cidade;
    opt.textContent = cidade;
    selectCidade.appendChild(opt);
  });
});

// QUANDO SELECIONAR A CIDADE, FILTRAR AS CLÍNICAS
document.getElementById("cidade_clinica").addEventListener("change", function () {
  const estadoSelecionado = document.getElementById("estado_clinica").value;
  const cidadeSelecionada = this.value;

  const selectClinica = document.getElementById("nome_clinica");
  selectClinica.innerHTML = '<option value="">Selecione...</option>';

  if (!estadoSelecionado || !cidadeSelecionada) return;

  const clinicasFiltradas = prestadoresCache
    .filter(p =>
      p.estado === estadoSelecionado &&
      p.cidade === cidadeSelecionada)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  clinicasFiltradas.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.codigo;
    opt.textContent = p.nome;
    selectClinica.appendChild(opt);
  });
});

// MOSTRAR SEÇÃO DE NOVO CREDENCIAMENTO
document.addEventListener("DOMContentLoaded", () => {
  const chkCredenciamento = document.getElementById("solicitarCredenciamento");

  const selectEstado = document.getElementById("estado_clinica");
  const selectCidade = document.getElementById("cidade_clinica");
  const selectClinica = document.getElementById("nome_clinica");

  const cardCredenciamento = document.getElementById("cardCredenciamento");
  const estadoCredenciamento = document.getElementById("estado_credenciamento");
  const cidadeCredenciamento = document.getElementById("cidade_credenciamento");

  if (!chkCredenciamento) return;

  function resetarSelect(select, texto = "Selecione...") {
    if (!select) return;
    select.innerHTML = `<option value="">${texto}</option>`;
    select.value = "";
  }

  function limparCampos() {
    estadoCredenciamento.value = "";
    cidadeCredenciamento.value = "";
  }

  chkCredenciamento.addEventListener("change", () => {
    if (chkCredenciamento.checked) {
      resetarSelect(selectEstado);
      resetarSelect(selectCidade);
      resetarSelect(selectClinica);

      selectEstado.disabled = true;
      selectCidade.disabled = true;
      selectClinica.disabled = true;

      cardCredenciamento.style.display = "block";
    }
    else {
      selectEstado.disabled = false;
      selectCidade.disabled = false;
      selectClinica.disabled = false;

      cardCredenciamento.style.display = "none";

      limparCampos();
    }
  });
});

// NÃO PERMITIR DATAS MANUAIS COM MAIS DE 4 DÍGITOS NO ANO
document.addEventListener("DOMContentLoaded", function () {
  const inputVencimentoCNH = document.getElementById("vencimento_cnh");

  if (inputVencimentoCNH) {
    inputVencimentoCNH.addEventListener("input", function () {
      let valor = inputVencimentoCNH.value;
      const partes = valor.split("-");

      if (partes[0]) partes[0] = partes[0].slice(0, 4);

      inputVencimentoCNH.value = partes.join("-");
    });
  }
});

// PREENCHER O CAMPO COM O NOME DA EMPRESA DO USUÁRIO LOGADO
function preencherEmpresaUsuario() {
  document.getElementById("empresaNomeView").value = usuarioLogado.nome_empresa;
  document.getElementById("empresaCodigoHidden").value = usuarioLogado.cod_empresa;
}

// FUNÇÃO PARA PREENCHER O FORMULÁRIO COM OS DADOS ENCONTRADOS NO SOC
function preencherFuncionarioASO() {
  const f = JSON.parse(localStorage.getItem("funcionarioASO"));

  if (!f) {
    alert("Pesquise um funcionário primeiro");
    window.location.href = "solicitar-aso.html";
    return;
  }

  document.getElementById("nome").value = f.nome;
  document.getElementById("cpf").value = formatarCPF(f.cpf);
  document.getElementById("matricula").value = f.matricula || "NÃO POSSUI MATRÍCULA";

  // FORMATAR DATAS
  if (f.data_nascimento) {
    const [d, m, a] = f.data_nascimento.split("/");
    document.getElementById("data-nascimento").value = `${a}-${m}-${d}`;
  }

  if (f.data_admissao) {
    const [d, m, a] = f.data_admissao.split("/");
    document.getElementById("data_admissao").value = `${a}-${m}-${d}`;
  }

  document.getElementById("cpf").readOnly = true;

  setTimeout(() => {
    const unidadeSelect = document.getElementById("unidadeSelect");
    const setorSelect = document.getElementById("setorSelect");
    const cargoSelect = document.getElementById("cargoSelect");
    const funcaoAnterior = document.getElementById("funcao_anterior");

    unidadeSelect.value = f.cod_unidade;
    setorSelect.value = f.cod_setor;
    cargoSelect.value = f.cod_cargo;

    unidadeSelect.disabled = true;
    setorSelect.disabled = true;
    cargoSelect.disabled = true;

    funcaoAnterior.value = cargoSelect.options[cargoSelect.selectedIndex]?.text || "";
  }, 500);
}

// FUNÇÃO PARA CARREGAR O SELECT DAS UNIDADES
async function carregarUnidades() {
  const res = await fetch(`${API}/unidades/${usuarioLogado.cod_empresa}`);

  const dados = await res.json();

  const select = document.getElementById("unidadeSelect");
  const selectFuncaoAtual = document.getElementById("funcao_atual");

  select.innerHTML = `<option value="">Selecione...</option>`;
  dados.forEach(u => {
    select.innerHTML += `<option value="${u.codigo}">${u.nome}</option>`;
  });

  selectFuncaoAtual.innerHTML = `<option value="">Selecione...</option>`;
  dados.forEach(c => {
    selectFuncaoAtual.innerHTML += `<option value="${c.codigo}">${c.nome}</option>`;
  });
}

// FUNÇÃO PARA CARREGAR O SELECT DOS SETORES
async function carregarSetores() {
  const res = await fetch(`${API}/setores/${usuarioLogado.cod_empresa}`);

  const dados = await res.json();

  const select = document.getElementById("setorSelect");
  const selectSetorAtual = document.getElementById("setor_atual");

  select.innerHTML = `<option value="">Selecione...</option>`;
  dados.forEach(s => {
    select.innerHTML += `<option value="${s.codigo}">${s.nome}</option>`;
  });

  selectSetorAtual.innerHTML = `<option value="">Selecione...</option>`;
  dados.forEach(c => {
    selectSetorAtual.innerHTML += `<option value="${c.codigo}">${c.nome}</option>`;
  });
}

// FUNÇÃO PARA CARREGAR O SELECT DOS CARGOS
async function carregarCargos() {
  const res = await fetch(`${API}/cargos/${usuarioLogado.cod_empresa}`);

  const dados = await res.json();

  const select = document.getElementById("cargoSelect");

  select.innerHTML = `<option value="">Selecione...</option>`;
  dados.forEach(c => {
    select.innerHTML += `<option value="${c.codigo}">${c.nome}</option>`;
  });
}

// MOSTRAR / OCULTAR SEÇÃO DE MUDANÇA DE FUNÇÃO
document.addEventListener("DOMContentLoaded", () => {
  const tipoExame = document.getElementById("tipo_exame");
  const cardMudancaFuncao = document.getElementById("cardMudancaFuncao");

  tipoExame.addEventListener("change", () => {
    cardMudancaFuncao.style.display = "none";

    if (tipoExame.value === "MUDANCA_RISCOS_OCUPACIONAIS") {
      cardMudancaFuncao.style.display = "block";
    }
  });
});

// MOSTRAR SEÇÃO DE NOVA FUNCÃO
document.getElementById("solicitarNovaFuncao").addEventListener("change", function () {
  const wrapper = document.getElementById("novaFuncaoWrapper");
  wrapper.style.display = this.checked ? "block" : "none";
});

// MOSTRAR SEÇÃO DE NOVO SETOR
document.getElementById("solicitarNovoSetor").addEventListener("change", function () {
  const wrapper = document.getElementById("novoSetorWrapper");
  wrapper.style.display = this.checked ? "block" : "none";
});

// FUNÇÃO PARA FORMATAR CPF
function formatarCPF(cpf) {
  if (!cpf) return "";

  const numeros = cpf.replace(/\D/g, "");

  if (numeros.length !== 11) return cpf;

  return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// ENVIO DO FORMULÁRIO
document.getElementById("formCadastro").addEventListener("submit", async function (e) {
  e.preventDefault();

  const unidadeSelect = document.getElementById("unidadeSelect");
  const setorSelect = document.getElementById("setorSelect");
  const cargoSelect = document.getElementById("cargoSelect");

  const solicitarNovaFuncao = document.getElementById("solicitarNovaFuncao")?.checked === true;
  const solicitarNovoSetor = document.getElementById("solicitarNovoSetor")?.checked === true;

  const funcaoSelect = document.getElementById("funcao_atual");
  const setorAtualSelect = document.getElementById("setor_atual");

  const nomeNovaFuncao = document.getElementById("novaFuncao")?.value || null;
  const nomeNovoSetor = document.getElementById("novoSetor")?.value || null;

  const solicitarCredenciamento = document.getElementById("solicitarCredenciamento")?.checked === true;

  const clinicaSelect = document.getElementById("nome_clinica");

  const dados = {
    nome_funcionario: document.getElementById("nome").value,
    data_nascimento: document.getElementById("data-nascimento").value,
    cpf: document.getElementById("cpf").value,
    matricula: document.getElementById("matricula").value || null,
    data_admissao: document.getElementById("data_admissao").value,
    cod_empresa: usuarioLogado.cod_empresa,
    nome_empresa: document.getElementById("empresaNomeView").value,
    cod_unidade: unidadeSelect.value,
    nome_unidade: unidadeSelect.options[unidadeSelect.selectedIndex]?.text || null,
    cod_setor: setorSelect.value,
    nome_setor: setorSelect.options[setorSelect.selectedIndex]?.text || null,
    cod_cargo: cargoSelect.value,
    nome_cargo: cargoSelect.options[cargoSelect.selectedIndex]?.text || null,
    tipo_exame: document.getElementById("tipo_exame").value,
    funcao_anterior: document.getElementById("funcao_anterior")?.value || null,
    funcao_atual: funcaoSelect.value ? funcaoSelect.options[funcaoSelect.selectedIndex].text : null,
    solicitar_nova_funcao: solicitarNovaFuncao,
    nome_nova_funcao: solicitarNovaFuncao ? nomeNovaFuncao : null,
    setor_atual: setorAtualSelect.value ? setorAtualSelect.options[setorAtualSelect.selectedIndex].text : null,
    solicitar_novo_setor: solicitarNovoSetor,
    nome_novo_setor: solicitarNovoSetor ? nomeNovoSetor : null,
    cnh: document.getElementById("cnh").value || null,
    vencimento_cnh: document.getElementById("vencimento_cnh").value || null,
    lab_toxicologico: document.getElementById("lab_toxicologico").value,
    solicitar_credenciamento: solicitarCredenciamento,
    observacao: document.getElementById("observacao").value,

    usuario_id: usuarioLogado.id
  };

  if (solicitarCredenciamento) {
    dados.estado_credenciamento = document.getElementById("estado_credenciamento").value;
    dados.cidade_credenciamento = document.getElementById("cidade_credenciamento").value;
  } else {
    dados.estado_clinica = document.getElementById("estado_clinica").value;
    dados.cidade_clinica = document.getElementById("cidade_clinica").value;
    dados.nome_clinica = clinicaSelect.options[clinicaSelect.selectedIndex]?.text || null;
  }

  try {
    const res = await fetch("http://localhost:3001/solicitar-exame", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });

    if (!res.ok) {
      throw new Error("Erro no envio");
    } else {
      alert("Solicitação enviada com sucesso!");

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }

    document.getElementById("formCadastro").reset();

  } catch (erro) {
    console.error(erro);
    alert("Erro ao enviar solicitação");
  }
});

// FUNÇÃO DE LOGOUT
function logout() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("empresaCodigo");
  window.location.href = "login.html";
}