let usuarioLogado = null;
let solicitacoes = [];
let solicitacaoAtualId = null;

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

  function getPrimeiroNomeESobrenome(nomeCompleto) {
    if (!nomeCompleto) return "";

    const partes = nomeCompleto.trim().split(" ");

    return partes.length >= 2
      ? `${partes[0]} ${partes[1]}`
      : partes[0];
  }

  // NOME
  userNameDropdown.innerText = getPrimeiroNomeESobrenome(usuarioLogado.nome);

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

  document.getElementById("btnBuscar").addEventListener("click", aplicarFiltros);

  document.getElementById("btnLimpar").addEventListener("click", () => {
    document.getElementById("filterStatus").value = "";
    document.getElementById("filterEmpresa").value = "";
    document.getElementById("filterFuncionario").value = "";
    renderizarTabela(solicitacoes);
  });

  carregarSolicitacoes();
});

// FUNÇÃO PARA CARREGAR SOLICITAÇÕES E RENDERIZAR A TABELA
async function carregarSolicitacoes() {
  const res = await fetch("http://localhost:3001/solicitacoes");
  solicitacoes = await res.json();
  renderizarTabela(solicitacoes);
}

// FUNÇÃO PARA RENDERIZAR TABELA COM AS SOLICITAÇÕES
function renderizarTabela(lista) {
  const tbody = document.querySelector("tbody");
  tbody.innerHTML = "";

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          Nenhuma solicitação encontrada
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach(s => {
    const tr = document.createElement("tr");
    const statusClass = s.status.toLowerCase();

    const podeEnviar = s.status === "APROVADO";

    let iconeTipo = "";

    if (s.tipo === "NOVO_CADASTRO") {
      iconeTipo = `
        <i class="fa-solid fa-user-plus" style="color: #F1AE33" title="Novo cadastro"></i>
      `;
    }

    if (s.tipo === "ASO") {
      iconeTipo = `
        <i class="fa-solid fa-file-circle-plus" style="color: #F1AE33"title="ASO"></i>
      `;
    }

    tr.innerHTML = `
      <td>${iconeTipo}</td>
      <td>${formatarData(s.solicitado_em)}</td>
      <td>${s.nome_empresa}</td>
      <td>${s.nome_funcionario}</td>
      <td>${s.cpf}</td>
      <td>
        <span class="status-pill ${statusClass}">
          ${s.status}
        </span>
      </td>
      <td class="actions">
        <button class="btn-outline" onclick="verDetalhes(${s.solicitacao_id}, '${s.tipo}')">
          Detalhes
        </button>

        <button class="btn-primary"
          ${s.status !== "APROVADO" ? "disabled" : ""}
          ${s.status === "APROVADO"
        ? `onclick="enviarSOC(${s.solicitacao_id})"`
        : ""}>
          Enviar
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// FUNÇÃO PARA APLICAR FILTROS
function aplicarFiltros() {
  const status = document.getElementById("filterStatus").value;
  const empresa = document.getElementById("filterEmpresa").value.toLowerCase();
  const funcionario = document.getElementById("filterFuncionario").value.toLowerCase();

  const filtradas = solicitacoes.filter(s => {
    const matchStatus = !status || s.status === status;
    const matchEmpresa = !empresa || s.nome_empresa.toLowerCase().includes(empresa);
    const matchFuncionario = !funcionario || s.nome_funcionario.toLowerCase().includes(funcionario);

    return matchStatus && matchEmpresa && matchFuncionario;
  });

  renderizarTabela(filtradas);
}

// FUNÇÃO PARA VER DETALHES
async function verDetalhes(id, tipo) {
  solicitacaoAtualId = id;

  try {
    const url =
      tipo === "ASO"
        ? `http://localhost:3001/solicitacoes/aso/${id}`
        : `http://localhost:3001/solicitacoes/novo-cadastro/${id}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error();

    const { dados } = await res.json();

    preencherModal(dados, tipo);

    const modalId =
      tipo === "ASO"
        ? "modalDetalhesASO"
        : "modalDetalhesNovoCadastro";

    new bootstrap.Modal(
      document.getElementById(modalId)
    ).show();

  } catch (err) {
    console.error(err);
    alert("Erro ao carregar detalhes");
  }
}

// FUNÇÃO PARA PREENHCER O MODAL
function preencherModal(s, tipo) {
  if (tipo === "NOVO_CADASTRO") {
    document.getElementById("cadastro_nome_funcionario").value = s.nome_funcionario;
    document.getElementById("cadastro_data_nascimento").value = formatarData(s.data_nascimento);
    document.getElementById("cadastro_sexo").value = s.sexo;
    document.getElementById("cadastro_estado_civil").value = s.estado_civil;
    document.getElementById("cadastro_doc_identidade").value = s.doc_identidade;
    document.getElementById("cadastro_cpf").value = s.cpf;
    document.getElementById("cadastro_matricula").value = s.matricula;
    document.getElementById("cadastro_data_admissao").value = formatarData(s.data_admissao);
    document.getElementById("cadastro_tipo_contratacao").value = s.tipo_contratacao;
    document.getElementById("cadastro_regime_trabalho").value = s.regime_trabalho;
    document.getElementById("cadastro_nome_empresa").value = s.nome_empresa;
    document.getElementById("cadastro_nome_unidade").value = s.nome_unidade;
    document.getElementById("cadastro_nome_setor").value = s.nome_setor;
    document.getElementById("cadastro_nome_cargo").value = s.nome_cargo;
    document.getElementById("cadastro_tipo_exame").value = s.tipo_exame;
    document.getElementById("cadastro_nome_clinica").value = s.nome_clinica;
    document.getElementById("cadastro_cidade_clinica").value = s.cidade_clinica;
    document.getElementById("cadastro_email_clinica").value = s.email_clinica;
    document.getElementById("cadastro_telefone_clinica").value = s.telefone_clinica;
    document.getElementById("cadastro_lab_toxicologico").value = s.lab_toxicologico;
  }

  if (tipo === "ASO") {
    document.getElementById("aso_nome_funcionario").value = s.nome_funcionario;
    document.getElementById("aso_data_nascimento").value = formatarData(s.data_nascimento);
    document.getElementById("aso_cpf").value = s.cpf;
    document.getElementById("aso_matricula").value = s.matricula;
    document.getElementById("aso_data_admissao").value = formatarData(s.data_admissao);
    document.getElementById("aso_nome_empresa").value = s.nome_empresa;
    document.getElementById("aso_nome_unidade").value = s.nome_unidade;
    document.getElementById("aso_nome_setor").value = s.nome_setor;
    document.getElementById("aso_nome_cargo").value = s.nome_cargo;
    document.getElementById("aso_tipo_exame").value = s.tipo_exame;
    document.getElementById("aso_nome_clinica").value = s.nome_clinica;
    document.getElementById("aso_cidade_clinica").value = s.cidade_clinica;
    document.getElementById("aso_email_clinica").value = s.email_clinica;
    document.getElementById("aso_telefone_clinica").value = s.telefone_clinica;
    document.getElementById("aso_lab_toxicologico").value = s.lab_toxicologico;
  }

  // STATUS
  const linha =
    tipo === "ASO"
      ? document.getElementById("linha_aprovacao_aso")
      : document.getElementById("linha_aprovacao_cadastro");

  if (s.status === "APROVADO" || s.status === "REPROVADO") {
    linha.textContent =
      `${s.status} por ${s.analisado_por_nome} em ${formatarData(s.analisado_em)}`;
  } else {
    linha.textContent = "Solicitação ainda não analisada";
  }

  // MOSTAR MOTIVO DE REPROVAÇÃO NA REAVALIAÇÃO
  const textareaMotivo =
    tipo === "ASO"
      ? document.getElementById("motivoReprovacaoASO")
      : document.getElementById("motivoReprovacaoCadastro");

  if (s.status === "PENDENTE_REAVALIACAO" || s.status === "REPROVADO") {
    textareaMotivo.value = s.motivo_reprovacao;
  } else {
    textareaMotivo.value = "";
  }
}

// FUNÇÃO PARA ENVIAR AO SOC
async function enviarSOC(id) {
  if (!confirm("Deseja enviar este funcionário ao SOC?")) return;

  const res = await fetch(
    `http://localhost:3001/soc/funcionarios/${id}/enviar`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario_id: usuarioLogado.id
      })
    }
  );

  if (res.ok) {
    alert("Enviado ao SOC com sucesso!");
    carregarSolicitacoes();
  } else {
    const erro = await res.json();
    alert(erro.erro || "Erro ao enviar ao SOC");
  }
}

// FUNÇÃO PARA FORMATAR DATAS
function formatarData(data) {
  if (!data) return "-";

  const d = new Date(data);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();

  return `${dia}/${mes}/${ano}`;
}

// BOTÃO DE APROVAR / REPROVAR
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".btn-aprovar").forEach(btn => {
    btn.addEventListener("click", () => analisarSolicitacao("APROVADO"));
  });

  document.querySelectorAll(".btn-reprovar").forEach(btn => {
    btn.addEventListener("click", () => analisarSolicitacao("REPROVADO"));
  });
});

// FUNÇÃO PARA APROVAR / REPROVAR SOLICITAÇÃO
async function analisarSolicitacao(status) {
  const isASO = document.getElementById("modalDetalhesASO").classList.contains("show");

  const motivoInput = isASO
    ? document.getElementById("motivoReprovacaoASO")
    : document.getElementById("motivoReprovacaoCadastro");

  const motivo = motivoInput.value;

  if (status === "REPROVADO" && !motivo.trim()) {
    alert("Informe o motivo da reprovação");
    return;
  }

  const tipo = isASO ? "ASO" : "NOVO_CADASTRO";

  const res = await fetch(
    `http://localhost:3001/solicitacoes/${tipo}/${solicitacaoAtualId}/analisar`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        motivo,
        usuario_id: usuarioLogado.id
      })
    }
  );

  if (res.ok) {
    alert("Solicitação analisada com sucesso");
    bootstrap.Modal.getInstance(document.querySelector(".modal.show")).hide();
    motivoInput.value = "";
    carregarSolicitacoes();
  } else {
    alert("Erro ao analisar solicitação");
  }
}

// FUNÇÃO DE LOGOUT
function logout() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("empresaCodigo");
  window.location.href = "login.html";
}