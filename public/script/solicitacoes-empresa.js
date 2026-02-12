let usuarioLogado = null;
let solicitacoes = [];

// DROPDOWN DO PERFIL
document.addEventListener("DOMContentLoaded", () => {
  usuarioLogado = JSON.parse(localStorage.getItem("usuario"));

  if (!usuarioLogado) {
    window.location.href = "login.html";
    return;
  }

  const userNameDropdown = document.getElementById("userNameDropdown");
  const dropdownUserExtra = document.getElementById("dropdownUserExtra");

  const avatarIcon = document.getElementById("avatarIcon");
  const avatarIconDropdown = document.getElementById("avatarIconDropdown");

  const avatarBtn = document.querySelector(".profile-trigger .avatar-circle");
  const avatarDrop = document.querySelector(".profile-header .avatar-circle");

  // NOME
  userNameDropdown.innerText = usuarioLogado.nome?.trim() || "";

  // EMPRESA E UNIDADE
  dropdownUserExtra.innerHTML = `
    <div class="company-name">${usuarioLogado.nome_empresa}</div>
    <div class="unit-name">${usuarioLogado.nome_unidade}</div>
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

  // BLUR
  const profileBtn = document.querySelector(".profile-trigger");

  profileBtn.addEventListener("show.bs.dropdown", () => {
    document.body.classList.add("blur-main");
  });

  profileBtn.addEventListener("hide.bs.dropdown", () => {
    document.body.classList.remove("blur-main");
  });

  document.getElementById("btnBuscar").addEventListener("click", aplicarFiltros);

  document.getElementById("btnLimpar").addEventListener("click", () => {
    document.getElementById("filterTipo").value = "";
    document.getElementById("filterCPF").value = "";
    document.getElementById("filterStatus").value = "";

    renderizarTabela(solicitacoes);
  });

  carregarSolicitacoes();
});

// FUNÇÃO PARA APLICAR FILTROS
function aplicarFiltros() {
  const tipo = document.getElementById("filterTipo").value;
  const cpf = document.getElementById("filterCPF").value;
  const status = document.getElementById("filterStatus").value;

  const filtradas = solicitacoes.filter(s => {
    const matchTipo = !tipo || s.tipo === tipo;
    const matchCPF = !cpf || s.cpf.includes(cpf);
    const matchStatus = !status || s.status === status;

    return matchTipo && matchCPF && matchStatus;
  });

  renderizarTabela(filtradas);
}

// FUNÇÃO PARA CARREGAR HISTÓRICO DAS SOLICITAÇÕES
async function carregarSolicitacoes() {
  const res = await fetch(`/solicitacoes-empresa/${usuarioLogado.id}`);

  solicitacoes = await res.json();

  solicitacoes.sort((a, b) => {
    return new Date(a.solicitado_em) - new Date(b.solicitado_em);
  });

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
      s.tipo === "NOVO_EXAME"
        ? `<i class="fa-solid fa-file-circle-plus fa-lg" style="color: #F1AE33"></i>`
        : `<i class="fa-solid fa-user-plus fa-lg" style="color: #F1AE33"></i>`;

    // TEXTO DA SITUAÇÃO
    let situacao = "—";

    if (s.status === "PENDENTE_UNIDADE") situacao = "Aguardando criação de unidade";
    if (s.status === "PENDENTE_SC") situacao = "Aguardando criação de setor/cargo";
    if (s.status === "PENDENTE_CREDENCIAMENTO") situacao = "Aguardando credenciamento";
    if (s.status === "PENDENTE") situacao = "Solicitação em análise";
    if (s.status === "PENDENTE_REAVALIACAO") situacao = "Solicitação em análise";
    if (s.status === "APROVADO") situacao = "Solicitação aprovada";
    if (s.status === "REPROVADO") situacao = "Ajustes necessários";
    if (s.status === "ENVIADO_SOC") situacao = "Solicitação finalizada";
    if (s.status === "CANCELADO") situacao = "Solicitação cancelada";

    // AÇÕES
    let acoes = "Nenhuma ação a ser feita";

    if (s.status === "PENDENTE_UNIDADE" || s.status === "PENDENTE_SC" || s.status === "PENDENTE_CREDENCIAMENTO") {
      acoes = `
        <button onclick="cancelarSolicitacao(${s.solicitacao_id}, '${s.tipo}', ${usuarioLogado.id})">
          Cancelar
        </button>
      `;
    }

    if (s.status === "REPROVADO") {
      acoes = `
        <button onclick="verMotivo('${s.motivo_reprovacao}')">
          Ver motivo
        </button>

        <button onclick="abrirModalEditar(${s.solicitacao_id}, '${s.tipo}')">
          Editar
        </button>
      `;
    }

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
        <td class="text-muted">
          ${situacao}
        </td>
        <td class="actions text-muted">
          ${acoes || "-"}
        </td>
      </tr>
    `;
  });
}

// FUNÇÃO PARA CANCELAR SOLICITAÇÃO PENDENTE
async function cancelarSolicitacao(id, tipo, usuarioLogadoId) {
  const confirmar = confirm("Tem certeza que deseja cancelar esta solicitação?");
  if (!confirmar) return;

  try {
    const response = await fetch(`/solicitacoes/${tipo}/${id}/cancelar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioLogado: usuarioLogadoId })
    });

    if (!response.ok) throw new Error("Erro na comunicação com o servidor");

    const data = await response.json();

    if (data.sucesso) {
      alert("Solicitação cancelada com sucesso!");
      carregarSolicitacoes();
    } else {
      alert(data.erro || "Não foi possível cancelar a solicitação.");
    }
  } catch (err) {
    console.error(err);
    alert("Erro na comunicação com o servidor.");
  }
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
    tipo === "NOVO_EXAME" ? `/solicitacoes/novo-exame/${id}` : `/solicitacoes/novo-cadastro/${id}`;

  const res = await fetch(url);
  if (!res.ok) {
    alert("Erro ao carregar dados para edição");
    return;
  }

  const { dados: s } = await res.json();

  if (tipo === "NOVO_EXAME") {
    preencherModalEditarExame(s);

    new bootstrap.Modal(document.getElementById("modalEditarExame")).show();
  } else {
    preencherModalEditarCadastro(s);

    new bootstrap.Modal(document.getElementById("modalEditarCadastro")).show();
  }
}

// CAMPO DE NOME FANTASIA SEMPRE MAIÚSCULO
const inputNomeFantasia = document.getElementById("editCadNomeFantasia");

inputNomeFantasia.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE RAZÃO SOCIAL SEMPRE MAIÚSCULO
const inputRazaoSocial = document.getElementById("editCadRazaoSocial");

inputRazaoSocial.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE RUA SEMPRE MAIÚSCULO
const inputRua = document.getElementById("editCadRua");

inputRua.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE BAIRRO SEMPRE MAIÚSCULO
const inputBairro = document.getElementById("editCadBairro");

inputBairro.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE ESTADO SEMPRE MAIÚSCULO
const inputEstado = document.getElementById("editCadEstado");

inputEstado.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// MÁSCARA DE CEP
const inputCep = document.getElementById("editCadCep");

inputCep.addEventListener("input", function () {
  let valor = this.value.replace(/\D/g, "");

  if (valor.length > 8) valor = valor.slice(0, 8);

  if (valor.length > 5) {
    this.value = valor.replace(/^(\d{5})(\d)/, "$1-$2");
  } else {
    this.value = valor;
  }
});

// CAMPO DE NOVO SETOR SEMPRE MAIÚSCULO
const inputNovoSetor = document.getElementById("editCadNovoSetor");

inputNovoSetor.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE NOVO CARGO SEMPRE MAIÚSCULO
const inputNovoCargo = document.getElementById("editCadNovoCargo");

inputNovoCargo.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE NOME LABORATÓRIO SEMPRE MAIÚSCULO
const inputNomeLaboratorio = document.getElementById("editCadLabToxicologico");

inputNomeLaboratorio.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE ESTADO CREDENCIAMENTO SEMPRE MAIÚSCULO
const inputEstadoCredenciamento = document.getElementById("editCadEstadoCredenciamento");

inputEstadoCredenciamento.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE CIDADE CREDENCIAMENTO SEMPRE MAIÚSCULO
const inputCidadeCredenciamento = document.getElementById("editCadCidadeCredenciamento");

inputCidadeCredenciamento.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

function formatarDataParaInput(dataIso) {
  if (!dataIso) return "";

  const data = dataIso.split("T")[0];
  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}/${ano}`;
}

// MÁSCARA DE DATA
document.querySelectorAll('.data-mask').forEach(input => {
  input.addEventListener('input', function (e) {
    let valor = e.target.value.replace(/\D/g, '');

    if (valor.length > 8) valor = valor.slice(0, 8);

    if (valor.length >= 5) {
      e.target.value = valor.replace(/(\d{2})(\d{2})(\d+)/, '$1/$2/$3');
    } else if (valor.length >= 3) {
      e.target.value = valor.replace(/(\d{2})(\d+)/, '$1/$2');
    } else {
      e.target.value = valor;
    }
  });
});

// CAMPO DE NOVA FUNÇÃO SEMPRE MAIÚSCULO
const inputNovaFuncao = document.getElementById("editExameNovaFuncao");

inputNovaFuncao.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE NOVO SETOR SEMPRE MAIÚSCULO
const inputExameNovoSetor = document.getElementById("editExameNovoSetor");

inputExameNovoSetor.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE NOME LABORATORIO SEMPRE MAIÚSCULO
const inputLaboratorioToxicologico = document.getElementById("editExameLabToxicologico");

inputLaboratorioToxicologico.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE ESTADO PARA CREDENCIAMENTO SEMPRE MAIÚSCULO
const inputExameEstadoCredenciamento = document.getElementById("editExameEstadoCredenciamento");

inputExameEstadoCredenciamento.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE CIDADE PARA CREDENCIAMENTO SEMPRE MAIÚSCULO
const inputExameCidadeCredenciamento = document.getElementById("editExameCidadeCredenciamento");

inputExameCidadeCredenciamento.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// FUNÇÃO PARA PREENCHER OS CAMPOS DO MODAL - NOVO CADASTRO
function preencherModalEditarCadastro(s) {
  const tipoFaturamento = s.tipo_faturamento;

  document.getElementById("editCadId").value = s.solicitacao_id;

  document.getElementById("editCadNomeFuncionario").value = s.nome_funcionario;
  document.getElementById("editCadDataNascimento").value = formatarDataParaInput(s.data_nascimento);
  document.getElementById("editCadSexo").value = s.sexo;
  document.getElementById("editCadEstadoCivil").value = s.estado_civil;
  document.getElementById("editCadDocIdentidade").value = s.doc_identidade;
  document.getElementById("editCadCPF").value = s.cpf;
  document.getElementById("editCadMatricula").value = s.matricula;
  document.getElementById("editCadDataAdmissao").value = formatarDataParaInput(s.data_admissao);
  document.getElementById("editCadTipoContratacao").value = s.tipo_contratacao;
  document.getElementById("editCadRegimeTrabalho").value = s.regime_trabalho;
  document.getElementById("editCadNomeEmpresa").value = s.nome_empresa;
  document.getElementById("editCadNomeUnidade").value = s.nome_unidade;
  document.getElementById("editCadNomeFantasia").value = s.nome_fantasia;
  document.getElementById("editCadRazaoSocial").value = s.razao_social;
  document.getElementById("editCadCnpj").value = s.cnpj;
  document.getElementById("editCadCnae").value = s.cnae;
  document.getElementById("editCadCep").value = s.cep;
  document.getElementById("editCadRua").value = s.rua;
  document.getElementById("editCadNumero").value = s.numero;
  document.getElementById("editCadBairro").value = s.bairro;
  document.getElementById("editCadEstado").value = s.estado;
  
  if (tipoFaturamento === "JUNTO") {
    document.getElementById("faturamento_junto").checked = true;
  } else if (tipoFaturamento === "SEPARADO") {
    document.getElementById("faturamento_separado").checked = true;
  }

  document.getElementById("editCadEmail").value = s.email;
  document.getElementById("editCadNomeSetor").value = s.nome_setor;
  document.getElementById("editCadNovoSetor").value = s.nome_novo_setor;
  document.getElementById("editCadNomeCargo").value = s.nome_cargo;
  document.getElementById("editCadNovoCargo").value = s.nome_novo_cargo;
  document.getElementById("editCadDescricaoAtividade").value = s.descricao_atividade;
  document.getElementById("editCadRac").value = s.rac,
  document.getElementById("editCadTiposRac").value = s.tipos_rac;
  document.getElementById("editCadTipoExame").value = s.tipo_exame;
  document.getElementById("editCadDataExame").value = formatarDataParaInput(s.data_exame);
  document.getElementById("editCadMaisUnidades").innerText = s.mais_unidades;
  document.getElementById("editCadCNH").value = s.cnh;
  document.getElementById("editCadVencimentoCNH").value = formatarDataParaInput(s.vencimento_cnh);
  document.getElementById("editCadLabToxicologico").value = s.lab_toxicologico;
  document.getElementById("editCadEstadoClinica").value = s.estado_clinica;
  document.getElementById("editCadCidadeClinica").value = s.cidade_clinica;
  document.getElementById("editCadNomeClinica").value = s.nome_clinica;
  document.getElementById("editCadEstadoCredenciamento").value = s.estado_credenciamento;
  document.getElementById("editCadCidadeCredenciamento").value = s.cidade_credenciamento;
  document.getElementById("editCadObservacao").value = s.observacao;

  // MOSTRAR / OCULTAR SEÇÃO DE NOVA UNIDADE
  const blocoUnidade = document.getElementById("divCadUnidade");

  const blocoNomeFantasia = document.getElementById("divCadNomeFantasia");
  const blocoRazaoSocial = document.getElementById("divCadRazaoSocial");
  const blocoCnpj = document.getElementById("divCadCnpj");
  const blocoCnae = document.getElementById("divCadCnae");
  const blocoCep = document.getElementById("divCadCep");
  const blocoRua = document.getElementById("divCadRua");
  const blocoNumero = document.getElementById("divCadNumero");
  const blocoBairro = document.getElementById("divCadBairro");
  const blocoEstado = document.getElementById("divCadEstado");
  const blocoFaturamentoJunto = document.getElementById("divCadFaturamentoJunto");
  const blocoFaturamentoSeparado = document.getElementById("divCadFaturamentoSeparado");
  const blocoEmail = document.getElementById("divCadEmail");

  if (s.solicitar_nova_unidade === true) {
    blocoUnidade.classList.add("d-none");
  }
  else {
    blocoUnidade.classList.remove("d-none");
  }

  if (s.solicitar_nova_unidade === false) {
    blocoNomeFantasia.classList.add("d-none");
    blocoRazaoSocial.classList.add("d-none");
    blocoCnpj.classList.add("d-none");
    blocoCnae.classList.add("d-none");
    blocoCep.classList.add("d-none");
    blocoRua.classList.add("d-none");
    blocoNumero.classList.add("d-none");
    blocoBairro.classList.add("d-none");
    blocoEstado.classList.add("d-none");
    blocoFaturamentoJunto.classList.add("d-none");
    blocoFaturamentoSeparado.classList.add("d-none");
    blocoEmail.classList.add("d-none");
  }
  else {
    blocoNomeFantasia.classList.remove("d-none");
    blocoRazaoSocial.classList.remove("d-none");
    blocoCnpj.classList.remove("d-none");
    blocoCnae.classList.remove("d-none");
    blocoCep.classList.remove("d-none");
    blocoRua.classList.remove("d-none");
    blocoNumero.classList.remove("d-none");
    blocoBairro.classList.remove("d-none");
    blocoEstado.classList.remove("d-none");
    blocoFaturamentoJunto.classList.remove("d-none");
    blocoFaturamentoSeparado.classList.remove("d-none");
    blocoEmail.classList.remove("d-none");
  }

  // MOSTRAR / OCULTAR SEÇÃO DE NOVO SETOR / CARGO
  const blocoSetorAtual = document.getElementById("divCadSetorAtual");
  const blocoNovoSetor = document.getElementById("divNovoSetor");
  const blocoCargoAtual = document.getElementById("divCargoAtual");
  const blocoNovoCargo = document.getElementById("divNovoCargo");

  if (s.solicitar_novo_setor === true) {
    blocoSetorAtual.classList.add("d-none");
    blocoNovoSetor.classList.remove("d-none");

    document.getElementById("editCadNovoSetor").value = s.nome_novo_setor;
  } else {
    blocoSetorAtual.classList.remove("d-none");
    blocoNovoSetor.classList.add("d-none");
  }

  if (s.solicitar_novo_cargo === true) {
    blocoCargoAtual.classList.add("d-none");
    blocoNovoCargo.classList.remove("d-none");

    document.getElementById("editCadNovoCargo").value = s.nome_novo_cargo;
  } else {
    blocoCargoAtual.classList.remove("d-none");
    blocoNovoCargo.classList.add("d-none");
  }

  const blocoDescricaoAtividade = document.getElementById("divCadDescricaoAtividade");

  if (s.solicitar_novo_cargo === true) {
    blocoDescricaoAtividade.classList.remove("d-none");
  } else {
    blocoDescricaoAtividade.classList.add("d-none");
  }

  // MOSTRAR / OCULTAR SEÇÃO DE TIPO RAC
  const blocoTiposRac = document.getElementById("divCadTiposRac");

  if (s.rac !== "FORMULARIO_RAC_VALE") {
    blocoTiposRac.classList.add("d-none");
  }
  else {
    blocoTiposRac.classList.remove("d-none");
  }

  // MOSTRAR / ESCONDER SEÇÃO DE NOVO CREDENCIAMENTO
  const blocoClinica = document.getElementById("blocoCadClinica");
  const blocoCredenciamento = document.getElementById("blocoCadCredenciamento");

  if (s.solicitar_credenciamento === true) {
    blocoClinica.classList.add("d-none");
    blocoCredenciamento.classList.remove("d-none");

    document.getElementById("editCadEstadoCredenciamento").innerText = s.estado_credenciamento;
    document.getElementById("editCadCidadeCredenciamento").innerText = s.cidade_credenciamento;

  } else {
    blocoClinica.classList.remove("d-none");
    blocoCredenciamento.classList.add("d-none");

    document.getElementById("editCadEstadoClinica").innerText = s.estado_clinica;
    document.getElementById("editCadCidadeClinica").innerText = s.cidade_clinica;
    document.getElementById("editCadNomeClinica").innerText = s.nome_clinica;
  }

  const blocoMaisUnidades = document.getElementById("bloco_mais_unidades");
  const editCadMaisUnidades = document.getElementById("editCadMaisUnidades");

  if (s.solicitar_mais_unidades && Array.isArray(s.mais_unidades) && s.mais_unidades.length > 0) {
    editCadMaisUnidades.innerHTML = "";
    s.mais_unidades.forEach(u => {
      const div = document.createElement("div");
      div.classList.add("mb-1");
      div.innerText = `${u.nome_unidade}`;
      editCadMaisUnidades.appendChild(div);
    });
    blocoMaisUnidades.classList.remove("d-none");
  } else {
    editCadMaisUnidades.innerHTML = "";
    blocoMaisUnidades.classList.add("d-none");
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
});

// FUNÇÃO PARA PREENHCER OS CAMPOS DO MODAL - NOVO EXAME
function preencherModalEditarExame(s) {
  document.getElementById("editExameId").value = s.solicitacao_id;

  document.getElementById("editExameNomeFuncionario").value = s.nome_funcionario;
  document.getElementById("editExameDataNascimento").value = formatarDataParaInput(s.data_nascimento);
  document.getElementById("editExameCPF").value = s.cpf;
  document.getElementById("editExameMatricula").value = s.matricula;
  document.getElementById("editExameDataAdmissao").value = formatarDataParaInput(s.data_admissao);
  document.getElementById("editExameNomeEmpresa").value = s.nome_empresa;
  document.getElementById("editExameNomeUnidade").value = s.nome_unidade;
  document.getElementById("editExameNomeSetor").value = s.nome_setor;
  document.getElementById("editExameNomeCargo").value = s.nome_cargo;
  document.getElementById("editExameTipoExame").value = s.tipo_exame;
  document.getElementById("editExameDataExame").value = formatarDataParaInput(s.data_exame);
  document.getElementById("editExameMaisUnidades").innerText = s.mais_unidades;
  document.getElementById("editExameRac").value = s.rac;
  document.getElementById("editExameTiposRac").value = s.tipos_rac;
  document.getElementById("editExameFuncaoAnterior").value = s.funcao_anterior;
  document.getElementById("editExameFuncaoAtual").value = s.funcao_atual;
  document.getElementById("editExameNovaFuncao").value = s.nome_nova_funcao;
  document.getElementById("editExameDescricaoAtividade").value = s.descricao_atividade;
  document.getElementById("editExameSetorAtual").value = s.setor_atual;
  document.getElementById("editExameNovoSetor").value = s.nome_novo_setor;
  document.getElementById("editExameMotivoConsulta").value = s.motivo_consulta;
  document.getElementById("editExameCNH").value = s.cnh;
  document.getElementById("editExameVencimentoCNH").value = formatarDataParaInput(s.vencimento_cnh);
  document.getElementById("editExameLabToxicologico").value = s.lab_toxicologico;
  document.getElementById("editExameEstadoClinica").value = s.estado_clinica;
  document.getElementById("editExameCidadeClinica").value = s.cidade_clinica;
  document.getElementById("editExameNomeClinica").value = s.nome_clinica;
  document.getElementById("editExameEstadoCredenciamento").value = s.estado_credenciamento;
  document.getElementById("editExameCidadeCredenciamento").value = s.cidade_credenciamento;
  document.getElementById("editExameObservacao").value = s.observacao;

  // MOSTRAR / OCULTAR SEÇÃO DE MUDANÇA DE RISCOS OCUPACIONAIS
  const blocoFuncaoAnterior = document.getElementById("divFuncaoAnterior");
  const blocoFuncaoAtual = document.getElementById("divFuncaoAtual");
  const blocoNovaFuncao = document.getElementById("divNovaFuncao");
  const blocoSetorAtual = document.getElementById("divExameSetorAtual");
  const blocoNovoSetor = document.getElementById("divExameNovoSetor");

  // OCULTAR CAMPOS DE FUNÇÃO E SETOR QUANDO NÃO FOR MUDANÇA DE RISCOS OCUPACIONAIS
  if (s.tipo_exame === "MUDANCA_RISCOS_OCUPACIONAIS") {
    // MOSTRAR OS BLOCOS DE FUNÇÃO E SETOR
    blocoFuncaoAnterior.classList.remove("d-none");
    blocoFuncaoAtual.classList.remove("d-none");
    blocoSetorAtual.classList.remove("d-none");

    // SE FOR SOLICITAR CRIAÇÃO DE NOVA FUNÇÃO, MOSTRAR CAMPO
    if (s.solicitar_nova_funcao === true) {
      blocoFuncaoAtual.classList.add("d-none");
      blocoNovaFuncao.classList.remove("d-none");

      document.getElementById("editExameFuncaoAtual").innerText = "";
      document.getElementById("editExameNovaFuncao").innerText = s.nome_nova_funcao;
    } else {
      blocoFuncaoAtual.classList.remove("d-none");
      blocoNovaFuncao.classList.add("d-none");

      document.getElementById("editExameFuncaoAtual").innerText = s.funcao_atual;
    }

    // SE FOR SOLICITAR CRIAÇÃO DE NOVO SETOR, MOSTRAR CAMPO
    if (s.solicitar_novo_setor === true) {
      blocoSetorAtual.classList.add("d-none");
      blocoNovoSetor.classList.remove("d-none");

      document.getElementById("editExameSetorAtual").innerText = "";
      document.getElementById("editExameNovoSetor").innerText = s.nome_novo_setor;
    } else {
      blocoSetorAtual.classList.remove("d-none");
      blocoNovoSetor.classList.add("d-none");

      document.getElementById("editExameSetorAtual").innerText = s.setor_atual;
    }
  } else {
    blocoFuncaoAnterior.classList.add("d-none");
    blocoFuncaoAtual.classList.add("d-none");
    blocoNovaFuncao.classList.add("d-none");
    blocoSetorAtual.classList.add("d-none");
    blocoNovoSetor.classList.add("d-none");
  }

  const blocoMaisUnidades = document.getElementById("bloco_exame_mais_unidades");
  const editExameMaisUnidades = document.getElementById("editExameMaisUnidades");

  if (s.solicitar_mais_unidades && Array.isArray(s.mais_unidades) && s.mais_unidades.length > 0) {
    editExameMaisUnidades.innerHTML = "";
    s.mais_unidades.forEach(u => {
      const div = document.createElement("div");
      div.classList.add("mb-1");
      div.innerText = `${u.nome_unidade}`;
      editExameMaisUnidades.appendChild(div);
    });
    blocoMaisUnidades.classList.remove("d-none");
  } else {
    editExameMaisUnidades.innerHTML = "";
    blocoMaisUnidades.classList.add("d-none");
  }

  // MOSTRAR / OCULTAR SEÇÃO DE TIPO RAC
  const blocoTiposRac = document.getElementById("divExameTiposRac");

  if (s.rac !== "FORMULARIO_RAC_VALE") {
    blocoTiposRac.classList.add("d-none");
  }
  else {
    blocoTiposRac.classList.remove("d-none");
  }

  const blocoDescricaoAtividade = document.getElementById("divExameDescricaoAtividade");

  if (s.solicitar_nova_funcao === true) {
    blocoDescricaoAtividade.classList.remove("d-none");
  } else {
    blocoDescricaoAtividade.classList.add("d-none");
  }

  // MOSTRAR / ESCONDER TEXTAREA DE MOTIVO DA CONSULTA
  const blocoMotivoConsulta = document.getElementById("divMotivoConsulta");

  if (s.tipo_exame === "CONSULTA_ASSISTENCIAL") {
    blocoMotivoConsulta.classList.remove("d-none");
  } else {
    blocoMotivoConsulta.classList.add("d-none");
  }

  // MOSTRAR / ESCONDER SEÇÃO DE NOVO CREDENCIAMENTO
  const blocoClinica = document.getElementById("blocoExameClinica");
  const blocoCredenciamento = document.getElementById("blocoExameCredenciamento");

  if (s.solicitar_credenciamento === true) {
    blocoClinica.classList.add("d-none");
    blocoCredenciamento.classList.remove("d-none");

    document.getElementById("editExameEstadoCredenciamento").innerText = s.estado_credenciamento;
    document.getElementById("editExameCidadeCredenciamento").innerText = s.cidade_credenciamento;

  } else {
    blocoClinica.classList.remove("d-none");
    blocoCredenciamento.classList.add("d-none");

    document.getElementById("editExameEstadoClinica").innerText = s.estado_clinica;
    document.getElementById("editExameCidadeClinica").innerText = s.cidade_clinica;
    document.getElementById("editExameNomeClinica").innerText = s.nome_clinica;
  }
}

// MAPA DAS CATEGORIAS DO ESOCIAL
const codCategoriaMap = {
  CLT: "101",
  COOPERADO: "741",
  TERCEIRIZADO: "102",
  AUTONOMO: "701",
  TEMPORARIO: "106",
  PESSOA_JURIDICA: "701",
  ESTAGIARIO: "901",
  MENOR_APRENDIZ: "103"
};

function dataParaFormatoBanco(dataBr) {
  if (!dataBr || dataBr.length !== 10) return null;

  const [dia, mes, ano] = dataBr.split('/');
  return `${ano}-${mes}-${dia}`;
}

function stringParaArrayRac(valor) {
  if (!valor) return [];
  return valor
    .split(',')
    .map(v => v.trim())
    .filter(v => v.length > 0);
}

// FUNÇÃO PARA SALVAR EDIÇÃO - NOVO CADASTRO
async function salvarEdicaoCadastro() {
  const id = document.getElementById("editCadId").value;
  const tipoContratacaoValue = document.getElementById("editCadTipoContratacao").value;
  const tipoFaturamentoSelecionado = document.querySelector('input[name="tipo_faturamento"]:checked')?.value;

  const dados = {
    nome_funcionario: document.getElementById("editCadNomeFuncionario").value,
    data_nascimento: dataParaFormatoBanco(document.getElementById("editCadDataNascimento").value),
    sexo: document.getElementById("editCadSexo").value,
    estado_civil: document.getElementById("editCadEstadoCivil").value,
    doc_identidade: document.getElementById("editCadDocIdentidade").value,
    cpf: document.getElementById("editCadCPF").value,
    matricula: document.getElementById("editCadMatricula").value,
    data_admissao: dataParaFormatoBanco(document.getElementById("editCadDataAdmissao").value),
    tipo_contratacao: document.getElementById("editCadTipoContratacao").value,
    cod_categoria: codCategoriaMap[tipoContratacaoValue],
    regime_trabalho: document.getElementById("editCadRegimeTrabalho").value,
    nome_empresa: document.getElementById("editCadNomeEmpresa").value,
    nome_unidade: document.getElementById("editCadNomeUnidade").value,
    nome_fantasia: document.getElementById("editCadNomeFantasia").value,
    razao_social: document.getElementById("editCadRazaoSocial").value,
    cnpj: document.getElementById("editCadCnpj").value,
    cnae: document.getElementById("editCadCnae").value,
    cep: document.getElementById("editCadCep").value,
    rua: document.getElementById("editCadRua").value,
    numero: document.getElementById("editCadNumero").value,
    bairro: document.getElementById("editCadBairro").value,
    estado: document.getElementById("editCadEstado").value,
    tipo_faturamento: tipoFaturamentoSelecionado,
    email: document.getElementById("editCadEmail").value,
    nome_setor: document.getElementById("editCadNomeSetor").value,
    nome_novo_setor: document.getElementById("editCadNovoSetor").value,
    nome_cargo: document.getElementById("editCadNomeCargo").value,
    nome_novo_cargo: document.getElementById("editCadNovoCargo").value,
    descricao_atividade: document.getElementById("editCadDescricaoAtividade").value,
    rac: document.getElementById("editCadRac").value,
    tipos_rac: stringParaArrayRac(document.getElementById("editCadTiposRac").value),
    tipo_exame: document.getElementById("editCadTipoExame").value,
    data_exame: dataParaFormatoBanco(document.getElementById("editCadDataExame").value),
    cnh: document.getElementById("editCadCNH").value,
    vencimento_cnh: dataParaFormatoBanco(document.getElementById("editCadVencimentoCNH").value),
    lab_toxicologico: document.getElementById("editCadLabToxicologico").value,
    estado_clinica: document.getElementById("editCadEstadoClinica").value,
    cidade_clinica: document.getElementById("editCadCidadeClinica").value,
    nome_clinica: document.getElementById("editCadNomeClinica").value,
    estado_credenciamento: document.getElementById("editCadEstadoCredenciamento").value,
    cidade_credenciamento: document.getElementById("editCadCidadeCredenciamento").value,
    observacao: document.getElementById("editCadObservacao").value
  };

  const res = await fetch(`/solicitacoes/novo-cadastro/${id}/editar`, {
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

  carregarSolicitacoes();
}

// FUNÇÃO PARA SALVAR EDIÇÃO - NOVO EXAME
async function salvarEdicaoExame() {
  const id = document.getElementById("editExameId").value;

  const dados = {
    nome_funcionario: document.getElementById("editExameNomeFuncionario").value,
    data_nascimento: dataParaFormatoBanco(document.getElementById("editExameDataNascimento").value),
    cpf: document.getElementById("editExameCPF").value,
    matricula: document.getElementById("editExameMatricula").value,
    data_admissao: dataParaFormatoBanco(document.getElementById("editExameDataAdmissao").value),
    nome_empresa: document.getElementById("editExameNomeEmpresa").value,
    nome_unidade: document.getElementById("editExameNomeUnidade").value,
    nome_setor: document.getElementById("editExameNomeSetor").value,
    nome_cargo: document.getElementById("editExameNomeCargo").value,
    rac: document.getElementById("editExameRac").value,
    tipos_rac: stringParaArrayRac(document.getElementById("editExameTiposRac").value),
    tipo_exame: document.getElementById("editExameTipoExame").value,
    data_exame: dataParaFormatoBanco(document.getElementById("editExameDataExame").value),
    funcao_anterior: document.getElementById("editExameFuncaoAnterior").value,
    funcao_atual: document.getElementById("editExameFuncaoAtual").value || null,
    nome_nova_funcao: document.getElementById("editExameNovaFuncao").value || null,
    descricao_atividade: document.getElementById("editExameDescricaoAtividade").value,
    setor_atual: document.getElementById("editExameSetorAtual").value || null,
    nome_novo_setor: document.getElementById("editExameNovoSetor").value || null,
    motivo_consulta: document.getElementById("editExameMotivoConsulta").value || null,
    cnh: document.getElementById("editExameCNH").value || null,
    vencimento_cnh: dataParaFormatoBanco(document.getElementById("editExameVencimentoCNH").value),
    lab_toxicologico: document.getElementById("editExameLabToxicologico").value || null,
    estado_clinica: document.getElementById("editExameEstadoClinica").value || null,
    cidade_clinica: document.getElementById("editExameCidadeClinica").value || null,
    nome_clinica: document.getElementById("editExameNomeClinica").value || null,
    estado_credenciamento: document.getElementById("editExameEstadoCredenciamento").value || null,
    cidade_credenciamento: document.getElementById("editExameCidadeCredenciamento").value || null,
    observacao: document.getElementById("editExameObservacao").value || null
  };

  const res = await fetch(`/solicitacoes/novo-exame/${id}/editar`, {
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
    .getInstance(document.getElementById("modalEditarExame"))
    .hide();

  carregarSolicitacoes();
}

// MÁSCARA DE CPF
const cpfInput = document.getElementById("filterCPF");

cpfInput.addEventListener("input", function () {
  let value = this.value.replace(/\D/g, "");

  if (value.length > 11) value = value.slice(0, 11);

  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  this.value = value;
});

// FUNÇÃO PARA FORAMATAR DATA E HORA DAS SOLICITAÇÕES
function formatarDataHora(data) {
  if (!data) return "";

  const d = new Date(data);

  const dataFormatada = d.toLocaleDateString("pt-BR");
  const horaFormatada = d.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });

  return `${dataFormatada} ${horaFormatada}`;
}

// FUNÇÃO PARA FORMATAR DATAS
function formatarData(dataISO) {
  if (!dataISO) return "";

  const [data] = dataISO.split("T");
  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}/${ano}`;
}

// MÁSCARA DE RG
const rgInput = document.getElementById("editCadDocIdentidade");

rgInput.addEventListener("input", function () {
  let value = rgInput.value.toUpperCase();
  let uf = value.slice(0, 2).replace(/[^A-Z]/g, "");
  let numeros = value.slice(2).replace(/\D/g, "");
  let numerosAntesTraco = numeros.slice(0, 8);
  let ultimoDigito = numeros.slice(8, 9);
  let numerosFormatados = numerosAntesTraco;

  if (numerosAntesTraco.length > 5) {
    numerosFormatados = numerosAntesTraco.replace(/(\d{2})(\d{3})(\d{1,3})/, "$1.$2.$3");
  }
  else if (numerosAntesTraco.length > 2) {
    numerosFormatados = numerosAntesTraco.replace(/(\d{2})(\d{1,3})/, "$1.$2");
  }

  // MONTAR VALOR FINAL
  let finalValue = uf;
  if (numerosFormatados) finalValue += " " + numerosFormatados;
  if (ultimoDigito) finalValue += "-" + ultimoDigito;

  rgInput.value = finalValue;
});

// CAMPO DE NOME SEMPRE MAIÚSCULO E SEM CARACTERES ESPECIAIS
const nomeInput = document.getElementById("editCadNomeFuncionario");

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

// FUNÇÃO DE LOGOUT
function logout() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("empresaCodigo");
  window.location.href = "login.html";
}