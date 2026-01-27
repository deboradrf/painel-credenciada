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
        <td>${formatarDataHora(s.solicitado_em)}</td>
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
            <button onclick="verMotivo('${(s.motivo_reprovacao || s.retorno_soc_erro || "Erro no envio ao SOC").replace(/'/g, "\\'")}')">
              Ver motivo
            </button>
            <button onclick="abrirModalEditar(${s.solicitacao_id}, '${s.tipo}')">
              Editar
            </button>
            `
          : s.status === "ENVIADO_SOC"
            ? `<span class="text-muted">Solicitação finalizada</span>`
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

// FUNÇÃO PARA FORMATAR CPF
function formatarCPF(cpf) {
  if (!cpf) return "";

  let numeros = cpf.replace(/\D/g, "");

  numeros = numeros.substring(0, 11);

  if (numeros.length > 9) {
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
  } else if (numeros.length > 6) {
    return numeros.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
  } else if (numeros.length > 3) {
    return numeros.replace(/(\d{3})(\d{0,3})/, "$1.$2");
  }

  return numeros;
}

document.addEventListener("DOMContentLoaded", () => {
  const editCadCPF = document.getElementById("editCadCPF");
  if (editCadCPF) {
    editCadCPF.addEventListener("input", (e) => {
      e.target.value = formatarCPF(e.target.value);
    });
  }

  const editAsoCPF = document.getElementById("editAsoCPF");
  if (editAsoCPF) {
    editAsoCPF.addEventListener("input", (e) => {
      e.target.value = formatarCPF(e.target.value);
    });
  }
});

// FUNÇÃO PARA PREENCHER OS CAMPOS DO MODAL - NOVO CADASTRO
function preencherModalEditarCadastro(s) {
  document.getElementById("editCadId").value = s.solicitacao_id;

  document.getElementById("editCadNomeFuncionario").value = s.nome_funcionario;
  document.getElementById("editCadDataNascimento").value = dataParaInputDate(s.data_nascimento);
  document.getElementById("editCadSexo").value = s.sexo;
  document.getElementById("editCadEstadoCivil").value = s.estado_civil;
  document.getElementById("editCadDocIdentidade").value = s.doc_identidade;
  document.getElementById("editCadCPF").value = s.cpf;
  document.getElementById("editCadMatricula").value = s.matricula || "-";
  document.getElementById("editCadDataAdmissao").value = dataParaInputDate(s.data_admissao);
  document.getElementById("editCadTipoContratacao").value = s.tipo_contratacao;
  document.getElementById("editCadRegimeTrabalho").value = s.regime_trabalho;
  document.getElementById("editCadNomeEmpresa").value = s.nome_empresa;
  document.getElementById("editCadNomeUnidade").value = s.nome_unidade;
  document.getElementById("editCadNomeSetor").value = s.nome_setor;
  document.getElementById("editCadNomeCargo").value = s.nome_cargo;
  document.getElementById("editCadTipoExame").value = s.tipo_exame;
  document.getElementById("editCadCNH").value = s.cnh || "-";
  document.getElementById("editCadVencimentoCNH").value = dataParaInputDate(s.vencimento_cnh) || "-";
  document.getElementById("editCadLabToxicologico").value = s.lab_toxicologico || "-";
  document.getElementById("editCadEstadoClinica").value = s.estado_clinica || "-";
  document.getElementById("editCadCidadeClinica").value = s.cidade_clinica || "-";
  document.getElementById("editCadNomeClinica").value = s.nome_clinica || "-";
  document.getElementById("editCadEstadoCredenciamento").value = s.estado_credenciamento || "-";
  document.getElementById("editCadCidadeCredenciamento").value = s.cidade_credenciamento || "-";
  document.getElementById("editCadObservacao").value = s.observacao || "-";

  const blocoClinica = document.getElementById("blocoCadClinica");
  const blocoCredenciamento = document.getElementById("blocoCadCredenciamento");

  if (s.solicitar_credenciamento === true) {
    blocoClinica.classList.add("d-none");
    blocoCredenciamento.classList.remove("d-none");

    document.getElementById("editCadEstadoCredenciamento").innerText = s.estado_credenciamento || "-";
    document.getElementById("editCadCidadeCredenciamento").innerText = s.cidade_credenciamento || "-";

  } else {
    blocoClinica.classList.remove("d-none");
    blocoCredenciamento.classList.add("d-none");

    document.getElementById("editCadEstadoClinica").innerText = s.estado_clinica || "-";
    document.getElementById("editCadCidadeClinica").innerText = s.cidade_clinica || "-";
    document.getElementById("editCadNomeClinica").innerText = s.nome_clinica || "-";
  }
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
  document.getElementById("editAsoLabToxicologico").value = s.lab_toxicologico;
  document.getElementById("editAsoEstadoClinica").value = s.estado_clinica;
  document.getElementById("editAsoCidadeClinica").value = s.cidade_clinica;
  document.getElementById("editAsoNomeClinica").value = s.nome_clinica;
  document.getElementById("editAsoEstadoCredenciamento").value = s.estado_credenciamento;
  document.getElementById("editAsoCidadeCredenciamento").value = s.estado_credenciamento;
  document.getElementById("editAsoObservacao").value = s.observacao;

  const blocoClinica = document.getElementById("blocoAsoClinica");
  const blocoCredenciamento = document.getElementById("blocoAsoCredenciamento");

  if (s.solicitar_credenciamento === true) {
    blocoClinica.classList.add("d-none");
    blocoCredenciamento.classList.remove("d-none");

    document.getElementById("editAsoEstadoCredenciamento").innerText = s.estado_credenciamento || "-";
    document.getElementById("editAsoCidadeCredenciamento").innerText = s.cidade_credenciamento || "-";

  } else {
    blocoClinica.classList.remove("d-none");
    blocoCredenciamento.classList.add("d-none");

    document.getElementById("editAsoEstadoClinica").innerText = s.estado_clinica || "-";
    document.getElementById("editAsoCidadeClinica").innerText = s.cidade_clinica || "-";
    document.getElementById("editAsoNomeClinica").innerText = s.nome_clinica || "-";
  }

  // BLOQUEAR CAMPOS QUE VÊM DO SOC (NÃO EDITÁVEIS)
  const camposBloqueados = [
    "editAsoNomeFuncionario",
    "editAsoDataNascimento",
    "editAsoCPF",
    "editAsoMatricula",
    "editAsoDataAdmissao",
    "editAsoNomeEmpresa",
    "editAsoNomeUnidade",
    "editAsoNomeSetor",
    "editAsoNomeCargo"
  ];

  camposBloqueados.forEach(id => {
    const campo = document.getElementById(id);
    if (campo) {
      campo.disabled = true;
    }
  });
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
    cnh: document.getElementById("editCadCNH").value,
    vencimento_cnh: document.getElementById("editCadVencimentoCNH").value,
    lab_toxicologico: document.getElementById("editCadLabToxicologico").value,
    estado_clinica: document.getElementById("editCadEstadoClinica").value,
    cidade_clinica: document.getElementById("editCadCidadeClinica").value,
    nome_clinica: document.getElementById("editCadNomeClinica").value,
    estado_credenciamento: document.getElementById("editCadEstadoCredenciamento").value,
    cidade_credenciamento: document.getElementById("editCadCidadeCredenciamento").value,
    observacao: document.getElementById("editCadObservacao").value
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
    matricula: document.getElementById("editAsoMatricula").value,
    data_admissao: tratarData(document.getElementById("editAsoDataAdmissao").value),
    nome_empresa: document.getElementById("editAsoNomeEmpresa").value,
    nome_unidade: document.getElementById("editAsoNomeUnidade").value,
    nome_setor: document.getElementById("editAsoNomeSetor").value,
    nome_cargo: document.getElementById("editAsoNomeCargo").value,
    tipo_exame: document.getElementById("editAsoTipoExame").value,
    funcao_anterior: document.getElementById("editAsoFuncaoAnterior").value,
    funcao_atual: document.getElementById("editAsoFuncaoAtual").value,
    setor_atual: document.getElementById("editAsoSetorAtual").value,
    cnh: document.getElementById("editAsoCNH").value,
    vencimento_cnh: document.getElementById("editAsoVencimentoCNH").value,
    lab_toxicologico: document.getElementById("editAsoLabToxicologico").value,
    estado_clinica: document.getElementById("editAsoEstadoClinica").value,
    cidade_clinica: document.getElementById("editAsoCidadeClinica").value,
    nome_clinica: document.getElementById("editAsoNomeClinica").value,
    estado_credenciamento: document.getElementById("editAsoEstadoCredenciamento").value,
    cidade_credenciamento: document.getElementById("editAsoCidadeCredenciamento").value,
    observacao: document.getElementById("editAsoObservacao").value
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

function formatarDataHora(data) {
  if (!data) return "";

  const d = new Date(data);

  const dataFormatada = d.toLocaleDateString("pt-BR"); // dd/mm/aaaa
  const horaFormatada = d.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }); // hh:mm

  return `${dataFormatada} ${horaFormatada}`;
}

// FUNÇÃO DE LOGOUT
function logout() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("empresaCodigo");
  window.location.href = "login.html";
}