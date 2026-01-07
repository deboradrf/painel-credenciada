// DADOS DA EMPRESA LOGADA
let empresaCodigo = localStorage.getItem("empresaCodigo");
let nomeEmpresa = localStorage.getItem("empresaNome");

// USUÁRIO LOGADO
const usuarioLogado = JSON.parse(localStorage.getItem("usuario"));

if (!usuarioLogado) {
  alert("Sessão expirada. Faça login novamente.");
  window.location.href = "/login.html";
}

// PERFIL DO USUÁRIO
document.addEventListener("DOMContentLoaded", () => {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!usuario) {
    window.location.href = "/login.html";
    return;
  }

  // PREENCHE A EMPRESA NO FORMULÁRIO
  document.getElementById("empresaNomeView").value = usuario.nome_empresa;
  document.getElementById("empresaCodigoHidden").value = usuario.cod_empresa;

  const avatarIcon = document.getElementById("avatarIcon");
  const avatarIconDropdown = document.getElementById("avatarIconDropdown");

  const userNameDropdown = document.getElementById("userNameDropdown");
  const dropdownUserExtra = document.getElementById("dropdownUserExtra");

  const avatarBtn = document.querySelector(".profile-trigger .avatar-circle");
  const avatarDrop = document.querySelector(".profile-header .avatar-circle");

  function getPrimeiroNome(nomeCompleto) {
    if (!nomeCompleto) return "";
    const partes = nomeCompleto.trim().split(" ");
    return partes.slice(0, 2).join(" ");
  }

  // NOME
  userNameDropdown.textContent = getPrimeiroNome(usuario.nome);

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

async function init() {
  await carregarNomeEmpresa();
  await carregarUnidades();
  await carregarCargos();

  const cardMudancaFuncao = document.getElementById("cardMudancaFuncao");
  cardMudancaFuncao.style.display = "none";
}

document.addEventListener("DOMContentLoaded", init);

// FUNÇÃO DE CARREGAMENTO INICIAL
async function carregarNomeEmpresa() {
  if (!empresaCodigo) return;

  try {
    const res = await fetch("http://localhost:3001/empresas");
    const empresas = await res.json();

    const empresaSelecionada = empresas.find(
      e => String(e.codigo) === String(empresaCodigo)
    );

    if (empresaSelecionada) {
      nomeEmpresa = empresaSelecionada.nome;
      console.log("empresaSelecionada:", empresaSelecionada);
    }
  } catch (err) {
    console.error("Erro ao carregar nome da empresa:", err);
  }
}

// MOSTRAR / ESCONDER SEÇÃO
document.getElementById("tipo_exame").addEventListener("change", function () {
  const cardMudancaFuncao = document.getElementById("cardMudancaFuncao");
  const cardToxicologico = document.getElementById("cardToxicologico");

  // Mostrar Mudança de Função / Riscos Operacionais
  if (this.value === "MUDANCA_RISCOS_OPERACIONAIS") {
    cardMudancaFuncao.style.display = "block";
  }
  else {
    cardMudancaFuncao.style.display = "none";
  }

  // Mostrar CNH para Toxicológico
  if (this.value === "TOXICOLOGICO") {
    cardToxicologico.style.display = "block";
  }
  else {
    cardToxicologico.style.display = "none";
  }
});

// CARREGAR UNIDADES (filtrado por empresa)
async function carregarUnidades() {
  if (!empresaCodigo) return;

  const res = await fetch(`http://localhost:3001/unidades/${empresaCodigo}`);
  const unidades = await res.json();

  const select = document.getElementById("unidadeSelect");
  select.innerHTML = '<option value="">Selecione...</option>';

  unidades.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.codigo;
    opt.textContent = u.ativo ? u.nome : `${u.nome} (inativa)`;
    opt.dataset.nome = u.nome;
    select.appendChild(opt);
  });
}

document.getElementById("unidadeSelect").addEventListener("change", function () {
  const unidadeCodigo = this.value;

  if (!unidadeCodigo) {
    document.getElementById("setorSelect").innerHTML =
      '<option value="">Selecione...</option>';
    return;
  }

  carregarSetores(unidadeCodigo);
});

// CARREGAR SETORES (filtrado por empresa)
async function carregarSetores() {
  if (!empresaCodigo) return;

  try {
    const res = await fetch(`http://localhost:3001/setores/${empresaCodigo}`);
    const setores = await res.json();

    const select = document.getElementById("setorSelect");
    select.innerHTML = '<option value="">Selecione...</option>';

    setores.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.codigo;
      opt.textContent = s.ativo ? s.nome : `${s.nome} (inativo)`;
      opt.dataset.nome = s.nome;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Erro ao carregar setores:", err);
  }
}

// CARREGAR CARGOS (TODAS AS EMPRESAS - não tem filtro por empresa)
async function carregarCargos() {
  const res = await fetch(`http://localhost:3001/cargos/${empresaCodigo}`);
  const cargos = await res.json();

  const select = document.getElementById("cargoSelect");
  select.innerHTML = '<option value="">Selecione...</option>';

  cargos.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.codigo;
    opt.textContent = c.ativo ? c.nome : `${c.nome} (inativo)`;
    opt.dataset.nome = c.nome;
    select.appendChild(opt);
  });
}

// MAPA DAS CATEGORIAS DO ESOCIAL
const codCategoriaMap = {
  CLT: "101",
  COOPERADO: "741",
  TERCEIRIZADO: "102",
  AUTONOMO: "701",
  TEMPORARIO: "106",
  PESSOA_JURIDICA: "",
  ESTAGIARIO: "901",
  MENOR_APRENDIZ: "103",
  ESTATUTARIO: "",
  COMISSIONADO_INTERNO: "",
  COMISSIONADO_EXTERNO: "",
  APOSENTADO: "",
  APOSENTADO_INATIVO_PREFEITURA: "",
  PENSIONISTA: "",
  SERVIDOR_PUBLICO_EFETIVO: "",
  EXTRANUMERARIO: "",
  AUTARQUICO: "",
  INATIVO: "",
  TITULO_PRECARIO: "",
  SERVIDOR_ADM_CENTRALIZADA_OU_DESCENTRALIZADA: ""
};

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

// MÁSCARA DE RG
const rgInput = document.getElementById("doc_identidade");

rgInput.addEventListener("input", function () {
  let value = rgInput.value.toUpperCase();

  // 1. Extrair as 2 primeiras letras (UF)
  let uf = value.slice(0, 2).replace(/[^A-Z]/g, "");

  // 2. Extrair apenas números do restante
  let numeros = value.slice(2).replace(/\D/g, "");

  // 3. Separar os primeiros 8 números e o último dígito
  let numerosAntesTraco = numeros.slice(0, 8);
  let ultimoDigito = numeros.slice(8, 9);

  // 4. Formatar os 8 números com pontos
  let numerosFormatados = numerosAntesTraco;

  if (numerosAntesTraco.length > 5) {
    numerosFormatados = numerosAntesTraco.replace(/(\d{2})(\d{3})(\d{1,3})/, "$1.$2.$3");
  } else if (numerosAntesTraco.length > 2) {
    numerosFormatados = numerosAntesTraco.replace(/(\d{2})(\d{1,3})/, "$1.$2");
  }

  // MONTAR VALOR FINAL
  let finalValue = uf;
  if (numerosFormatados) finalValue += " " + numerosFormatados;
  if (ultimoDigito) finalValue += "-" + ultimoDigito;

  rgInput.value = finalValue;
});

// ENVIO DO FORMULÁRIO
document.getElementById("formCadastro").addEventListener("submit", async function (e) {
  e.preventDefault();

  const unidadeSelect = document.getElementById("unidadeSelect");
  const setorSelect = document.getElementById("setorSelect");
  const cargoSelect = document.getElementById("cargoSelect");

  const tipoContratacaoValue =
    document.getElementById("tipo_contratacao").value;

  const dados = {
    nome_funcionario: document.getElementById("nome").value,
    data_nascimento: document.getElementById("data-nascimento").value,
    sexo: document.getElementById("sexo").value,
    estado_civil: document.getElementById("estado_civil").value,
    doc_identidade: document.getElementById("doc_identidade").value,
    cpf: document.getElementById("cpf").value,
    matricula: document.getElementById("matricula").value,
    data_admissao: document.getElementById("data_admissao").value,
    tipo_contratacao: tipoContratacaoValue,
    cod_categoria: codCategoriaMap[tipoContratacaoValue],
    regime_trabalho: document.getElementById("regime_trabalho").value,
    cod_empresa: empresaCodigo,
    nome_empresa: nomeEmpresa,
    cod_unidade: unidadeSelect.value,
    nome_unidade: unidadeSelect.selectedOptions[0].dataset.nome,
    cod_setor: setorSelect.value,
    nome_setor: setorSelect.selectedOptions[0].dataset.nome,
    cod_cargo: cargoSelect.value,
    nome_cargo: cargoSelect.selectedOptions[0].dataset.nome,
    tipo_exame: document.getElementById("tipo_exame").value,
    funcao_anterior: document.getElementById("funcao_anterior").value || null,
    funcao_atual: document.getElementById("funcao_atual").value || null,
    setor_atual: document.getElementById("setor_atual").value || null,
    cnh: document.getElementById("cnh").value || null,
    vencimento_cnh: document.getElementById("vencimento_cnh").value || null,
    nome_clinica: document.getElementById("nome_clinica").value,
    cidade_clinica: document.getElementById("cidade_clinica").value,
    email_clinica: document.getElementById("email_clinica").value,
    telefone_clinica: document.getElementById("telefone_clinica").value,
    lab_toxicologico: document.getElementById("lab_toxicologico").value,

    usuario_id: usuarioLogado.id
  };

  try {
    await fetch("http://localhost:3001/funcionarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });

    document.getElementById("mensagem").innerHTML =
      "<div class='alert alert-success'>Cadastro enviado com sucesso!</div>";

    document.getElementById("formCadastro").reset();

  } catch (erro) {
    document.getElementById("mensagem").innerHTML =
      "<div class='alert alert-danger'>Erro ao enviar cadastro</div>";
  }
});

// FUNÇÃO DE EDITAR PERFIL
function editarPerfil() {
  alert("Abrir tela de edição de perfil");
}

// FUNÇÃO DE CONFIGURAÇÃO
function abrirConfiguracoes() {
  alert("Abrir configurações");
}

// FUNÇÃO DE LOGOUT
function logout() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("empresaCodigo");
  window.location.href = "login.html";
}