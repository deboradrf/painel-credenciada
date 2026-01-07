let usuario = null;
let solicitacoes = [];
let solicitacaoAtualId = null;

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

    tr.innerHTML = `
      <td>${s.nome_empresa}</td>
      <td>${s.nome_funcionario}</td>
      <td>${s.cpf}</td>
      <td>${formatarData(s.solicitado_em)}</td>
      <td>
        <span class="status-pill ${statusClass}">
          ${s.status}
        </span>
      </td>
      <td class="actions">
        <button
          class="btn-outline"
          onclick="verDetalhes(${s.solicitacao_id})">
          Detalhes
        </button>

        <button
          class="btn-primary"
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
    const matchFuncionario =
      !funcionario || s.nome_funcionario.toLowerCase().includes(funcionario);

    return matchStatus && matchEmpresa && matchFuncionario;
  });

  renderizarTabela(filtradas);
}

// FUNÇÃO PARA VER DETALHES
async function verDetalhes(id) {
  solicitacaoAtualId = id;

  try {
    const res = await fetch(`http://localhost:3001/solicitacoes/${id}`);
    if (!res.ok) throw new Error("Erro ao buscar detalhes");

    const s = await res.json();

    document.getElementById("show_nome_funcionario").value = s.nome_funcionario;
    document.getElementById("show_data_nascimento").value = s.data_nascimento;
    document.getElementById("show_sexo").value = s.sexo;
    document.getElementById("show_estado_civil").value = s.estado_civil;
    document.getElementById("show_doc_identidade").value = s.doc_identidade;
    document.getElementById("show_cpf").value = s.cpf;
    document.getElementById("show_cnh").value = s.cnh;
    document.getElementById("show_vencimento_cnh").value = s.vencimento_cnh;
    document.getElementById("show_matricula").value = s.matricula;

    document.getElementById("det_nome_empresa").value = s.nome_empresa;
    document.getElementById("det_nome_unidade").value = s.nome_unidade;
    document.getElementById("det_nome_setor").value = s.nome_setor;
    document.getElementById("det_nome_cargo").value = s.nome_cargo;

    const linha = document.getElementById("linha_aprovacao");

    if (s.status === "APROVADO" || s.status === "REPROVADO") {
      linha.textContent =
        `${s.status === "APROVADO" ? "Aprovado" : "Reprovado"} por ` +
        `${s.analisado_por_nome} em ${formatarData(s.analisado_em)}`;
    } else {
      linha.textContent = "Solicitação ainda não analisada";
    }

    new bootstrap.Modal(document.getElementById("modalDetalhes")).show();
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar detalhes");
  }
}

// FUNÇÃO PARA ALTERAR STATUS DA SOLICITAÇÃO
async function alterarStatus(status) {
  const motivoInput = document.getElementById("motivoReprovacao");

  if (status === "REPROVADO") {
    const motivo = motivoInput.value.trim();

    if (!motivo) {
      alert("Informe o motivo da reprovação.");
      return;
    }

    if (!confirm("Deseja reprovar esta solicitação?")) return;

    await enviarStatus(status, motivo);
    return;
  }

  if (!confirm("Deseja aprovar esta solicitação?")) return;

  await enviarStatus(status, null);
}

async function enviarStatus(status, motivo) {
  const res = await fetch(
    `http://localhost:3001/solicitacoes/${solicitacaoAtualId}/status`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        usuario_id: usuario.id,
        motivo
      })
    }
  );

  if (res.ok) {
    alert(`Solicitação ${status.toLowerCase()} com sucesso`);
    carregarSolicitacoes();

    bootstrap.Modal.getInstance(
      document.getElementById("modalDetalhes")
    ).hide();

    document.getElementById("motivoReprovacao").value = "";
  } else {
    alert("Erro ao alterar status");
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
        usuario_id: usuario.id
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

  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

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