let usuario = null;

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

// FUNÇÃO PARA CARREGAR HISTÓRICO DAS SOLICITAÇÕES
document.addEventListener("DOMContentLoaded", carregarHistorico);

async function carregarHistorico() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!usuario) {
    window.location.href = "login.html";
    return;
  }

  const res = await fetch(
    `http://localhost:3001/minhas-solicitacoes/${usuario.id}`
  );

  const solicitacoes = await res.json();
  renderizarTabela(solicitacoes);
}

// FUNÇÃO PARA RENDERIZAR A TABELA E MOSTRAR OS DADOS
function renderizarTabela(lista) {
  const tbody = document.getElementById("tabelaHistorico");
  tbody.innerHTML = "";

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" class="text-muted text-center">
          Nenhuma solicitação encontrada
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach(s => {
    const iconeTipo =
      s.tipo === "ASO"
        ? `<i class="fa-solid fa-file-circle-plus fa-lg" style="color: #F1AE33" title="ASO"></i>`
        : `<i class="fa-solid fa-user-plus fa-lg" style="color: #F1AE33" title="Novo Cadastro"></i>`;

    tbody.innerHTML += `
      <tr>
        <td>${iconeTipo}</td>
        <td>${formatarData(s.solicitado_em)}</td>
        <td>${s.nome_funcionario}</td>
        <td>${s.cpf}</td>
        <td>
          <span class="status-pill ${s.status.toLowerCase()}">
            ${s.status}
          </span>
        </td>
        <td class="actions">
          ${s.status === "REPROVADO"
        ? `
                <button onclick="verMotivo('${(s.motivo_reprovacao).replace(/'/g, "\\'")}')">
                  Ver motivo
                </button>

                <button onclick="abrirModalEditar(${s.solicitacao_id}, '${s.tipo}')">
                  Editar
                </button>
              `
        : `<span class="text-muted">Solicitação em análise</span>`
      }
        </td>
      </tr>
    `;
  });
}

// ABRIR MODAL DO MOTIVO
function verMotivo(motivo) {
  document.getElementById("textoMotivo").innerText = motivo;

  const modal = new bootstrap.Modal(
    document.getElementById("modalMotivo")
  );

  modal.show();
}

// ABRIR MODAL DE EDITAR
async function abrirModalEditar(id, tipo) {
  const url =
    tipo === "ASO"
      ? `http://localhost:3001/solicitacoes/aso/${id}`
      : `http://localhost:3001/solicitacoes/novo-cadastro/${id}`;

  const res = await fetch(url);
  if (!res.ok) {
    alert("Erro ao carregar dados para edição");
    return;
  }

  const { dados: s } = await res.json();

  if (tipo === "ASO") {
    preencherModalEditarASO(s);
    new bootstrap.Modal(
      document.getElementById("modalEditarASO")
    ).show();
  } else {
    preencherModalEditarCadastro(s);
    new bootstrap.Modal(
      document.getElementById("modalEditarCadastro")
    ).show();
  }
}

// FUNÇÃO PARA PREENCHER OS CAMPOS DO MODAL - NOVO CADASTRO
function preencherModalEditarCadastro(s) {
  document.getElementById("editCadId").value = s.solicitacao_id;

  document.getElementById("editCadNomeFuncionario").value = s.nome_funcionario;
  document.getElementById("editCadDataNascimento").value = dataParaInputDate(s.data_nascimento);
  document.getElementById("editCadSexo").value = s.sexo;
  document.getElementById("editCadEstadoCivil").value = s.estado_civil;
  document.getElementById("editCadDocIdentidade").value = s.doc_identidade;
  document.getElementById("editCadCPF").value = s.cpf;
  document.getElementById("editCadMatricula").value = s.matricula;
  document.getElementById("editCadDataAdmissao").value = dataParaInputDate(s.data_admissao);
  document.getElementById("editCadTipoContratacao").value = s.tipo_contratacao;
  document.getElementById("editCadRegimeTrabalho").value = s.regime_trabalho;
  document.getElementById("editCadNomeEmpresa").value = s.nome_empresa;
  document.getElementById("editCadNomeUnidade").value = s.nome_unidade;
  document.getElementById("editCadNomeSetor").value = s.nome_setor;
  document.getElementById("editCadNomeCargo").value = s.nome_cargo;
  document.getElementById("editCadTipoExame").value = s.tipo_exame;
  document.getElementById("editCadNomeClinica").value = s.nome_clinica;
  document.getElementById("editCadCidadeClinica").value = s.cidade_clinica;
  document.getElementById("editCadEmailClinica").value = s.email_clinica;
  document.getElementById("editCadTelefoneClinica").value = s.telefone_clinica;
  document.getElementById("editCadLabToxicologico").value = s.lab_toxicologico;
  document.getElementById("editCadObservacao").value = s.observacao;
}

// FUNÇÃO PARA PREENHCER OS CAMPOS DO MODAL - ASO
function preencherModalEditarASO(s) {
  document.getElementById("editAsoId").value = s.solicitacao_id;

  document.getElementById("editAsoNomeFuncionario").value = s.nome_funcionario;
  document.getElementById("editAsoDataNascimento").value = dataParaInputDate(s.data_nascimento);
  document.getElementById("editAsoCPF").value = s.cpf;
  document.getElementById("editAsoMatricula").value = s.matricula;
  document.getElementById("editAsoDataAdmissao").value = dataParaInputDate(s.data_admissao);
  document.getElementById("editAsoNomeEmpresa").value = s.nome_empresa;
  document.getElementById("editAsoNomeUnidade").value = s.nome_unidade;
  document.getElementById("editAsoNomeSetor").value = s.nome_setor;
  document.getElementById("editAsoNomeCargo").value = s.nome_cargo;
  document.getElementById("editAsoTipoExame").value = s.tipo_exame;
  document.getElementById("editAsoFuncaoAnterior").value = s.funcao_anterior || "";
  document.getElementById("editAsoFuncaoAtual").value = s.funcao_atual || "";
  document.getElementById("editAsoSetorAtual").value = s.setor_atual || "";
  document.getElementById("editAsoCNH").value = s.cnh || "";
  document.getElementById("editAsoVencimentoCNH").value = s.vencimento_cnh || "";
  document.getElementById("editAsoNomeClinica").value = s.nome_clinica;
  document.getElementById("editAsoCidadeClinica").value = s.cidade_clinica;
  document.getElementById("editAsoEmailClinica").value = s.email_clinica;
  document.getElementById("editAsoTelefoneClinica").value = s.telefone_clinica;
  document.getElementById("editAsoLabToxicologico").value = s.lab_toxicologico;
  document.getElementById("editAsoObservacao").value = s.observacao;
}

// FUNÇÃO PARA SALVAR EDIÇÃO NOVO CADASTRO
async function salvarEdicaoCadastro() {
  const id = document.getElementById("editCadId").value;

  const dados = {
    nome_funcionario: document.getElementById("editCadNomeFuncionario").value,
    data_nascimento: tratarData(document.getElementById("editCadDataNascimento").value),
    sexo: document.getElementById("editCadSexo").value,
    estado_civil: document.getElementById("editCadEstadoCivil").value,
    doc_identidade: document.getElementById("editCadDocIdentidade").value,
    cpf: document.getElementById("editCadCPF").value,
    matricula: document.getElementById("editCadMatricula").value,
    data_admissao: tratarData(document.getElementById("editCadDataAdmissao").value),
    tipo_contratacao: document.getElementById("editCadTipoContratacao").value,
    regime_trabalho: document.getElementById("editCadRegimeTrabalho").value,
    nome_empresa: document.getElementById("editCadNomeEmpresa").value,
    nome_unidade: document.getElementById("editCadNomeUnidade").value,
    nome_setor: document.getElementById("editCadNomeSetor").value,
    nome_cargo: document.getElementById("editCadNomeCargo").value,
    tipo_exame: document.getElementById("editCadTipoExame").value,
    nome_clinica: document.getElementById("editCadNomeClinica").value,
    cidade_clinica: document.getElementById("editCadCidadeClinica").value,
    email_clinica: document.getElementById("editCadEmailClinica").value,
    telefone_clinica: document.getElementById("editCadTelefoneClinica").value,
    lab_toxicologico: document.getElementById("editCadLabToxicologico").value,
    observacao: document.getElementById("editCadObservacao").value,
    status: "PENDENTE"
  };

  const res = await fetch(`http://localhost:3001/solicitacoes/cadastro/${id}/editar`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });

  const resposta = await res.json();

  if (!res.ok) {
    alert(resposta.erro || "Erro ao salvar edição");
    return;
  }

  bootstrap.Modal
    .getInstance(document.getElementById("modalEditarCadastro"))
    .hide();

  carregarHistorico();
}

// FUNÇÃO PARA SALVAR EDIÇÃO ASO
async function salvarEdicaoASO() {
  const id = document.getElementById("editAsoId").value;

  const dados = {
    nome_funcionario: document.getElementById("editAsoNomeFuncionario").value,
    data_nascimento: tratarData(document.getElementById("editAsoDataNascimento").value),
    cpf: document.getElementById("editAsoCPF").value,
    matricula: document.getElementById("editAsoMatricula").value || null,
    data_admissao: tratarData(document.getElementById("editAsoDataAdmissao").value),
    nome_empresa: document.getElementById("editAsoNomeEmpresa").value,
    nome_unidade: document.getElementById("editAsoNomeUnidade").value,
    nome_setor: document.getElementById("editAsoNomeSetor").value,
    nome_cargo: document.getElementById("editAsoNomeCargo").value,
    tipo_exame: document.getElementById("editAsoTipoExame").value,
    funcao_anterior: document.getElementById("editAsoFuncaoAnterior").value || null,
    funcao_atual: document.getElementById("editAsoFuncaoAtual").value || null,
    setor_atual: document.getElementById("editAsoSetorAtual").value || null,
    cnh: document.getElementById("editAsoCNH").value || null,
    vencimento_cnh: document.getElementById("editAsoVencimentoCNH").value || null,
    nome_clinica: document.getElementById("editAsoNomeClinica").value,
    cidade_clinica: document.getElementById("editAsoCidadeClinica").value,
    email_clinica: document.getElementById("editAsoEmailClinica").value,
    telefone_clinica: document.getElementById("editAsoTelefoneClinica").value,
    lab_toxicologico: document.getElementById("editAsoLabToxicologico").value,
    observacao: document.getElementById("editAsoObservacao").value,
    status: "PENDENTE"
  };

  const res = await fetch(`http://localhost:3001/solicitacoes/aso/${id}/editar`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });

  const resposta = await res.json();

  if (!res.ok) {
    alert(resposta.erro || "Erro ao salvar edição");
    return;
  }

  bootstrap.Modal
    .getInstance(document.getElementById("modalEditarASO"))
    .hide();

  carregarHistorico();
}

function dataParaInputDate(data) {
  if (!data) return "";
  return new Date(data).toISOString().split("T")[0];
}

function tratarData(valor) {
  if (!valor) return null;

  if (valor.includes("-")) return valor;

  const [dia, mes, ano] = valor.split("/");
  return `${ano}-${mes}-${dia}`;
}

function formatarData(data) {
  if (!data) return "";

  return new Date(data).toLocaleDateString("pt-BR");
}

// FUNÇÃO DE LOGOUT
function logout() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("empresaCodigo");
  window.location.href = "login.html";
}