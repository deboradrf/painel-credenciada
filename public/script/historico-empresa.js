let usuario = null;

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

function renderizarTabela(lista) {
  const tbody = document.getElementById("tabelaHistorico");
  tbody.innerHTML = "";

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-muted text-center">
          Nenhuma solicitação encontrada
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach(s => {
    tbody.innerHTML += `
      <tr>
        <td>${formatarData(s.solicitado_em)}</td>
        <td>${s.nome_funcionario}</td>
        <td>${s.cpf}</td>
        <td>
          <span class="status-pill ${s.status.toLowerCase()}">
            ${s.status}
          </span>
        </td>
        <td class="actions">
          ${
            s.status === "PENDENTE" || s.status === "PENDENTE_REAVALIACAO"
              ? `<span class="text-muted">Solicitação em análise</span>`
              : s.status === "REPROVADO" && s.motivo_reprovacao
              ? `
                <button class="btn-outline"
                  onclick="verMotivo('${s.motivo_reprovacao.replace(/'/g, "\\'")}')">
                  Ver motivo
                </button>
                <button class="btn btn-outline"
                  onclick="abrirModalEditar(${s.solicitacao_id})">
                  Editar
                </button>
                `
              : `
                <span class="text-muted">
                  Atualizado por ${s.analisado_por_nome}
                  em ${formatarData(s.analisado_em)}
                </span>
                `
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
async function abrirModalEditar(id) {
  const res = await fetch(`http://localhost:3001/solicitacoes/${id}`);
  const s = await res.json();

  document.getElementById("edit_id").value = s.solicitacao_id;
  document.getElementById("edit_nome_funcionario").value = s.nome_funcionario;
  document.getElementById("edit_cpf").value = s.cpf;
  document.getElementById("edit_data_nascimento").value = dataParaInputDate(s.data_nascimento);
  document.getElementById("edit_sexo").value = s.sexo;
  document.getElementById("edit_estado_civil").value = s.estado_civil ?? "";
  document.getElementById("edit_matricula").value = s.matricula ?? "";
  document.getElementById("edit_data_admissao").value = dataParaInputDate(s.data_admissao);
  document.getElementById("edit_tipo_contratacao").value = s.tipo_contratacao ?? "";
  document.getElementById("edit_cod_cargo").value = s.cod_cargo ?? "";
  document.getElementById("edit_nome_cargo").value = s.nome_cargo ?? "";

  const modal = new bootstrap.Modal(
    document.getElementById("modalEditarSolicitacao")
  );
  modal.show();
}

// FUNÇÃO PARA SALVAR EDIÇÃO
async function salvarEdicao() {
  const id = document.getElementById("edit_id").value;

  const dados = {
    nome_funcionario: document.getElementById("edit_nome_funcionario").value,
    cpf: document.getElementById("edit_cpf").value,
    sexo: document.getElementById("edit_sexo").value,

    data_nascimento: tratarData(
      document.getElementById("edit_data_nascimento").value
    ),

    estado_civil: document.getElementById("edit_estado_civil").value || null,
    matricula: document.getElementById("edit_matricula").value || null,

    data_admissao: tratarData(
      document.getElementById("edit_data_admissao").value
    ),

    tipo_contratacao:
      document.getElementById("edit_tipo_contratacao").value || null,

    cod_cargo: document.getElementById("edit_cod_cargo").value || null,
    nome_cargo: document.getElementById("edit_nome_cargo").value || null,

    // 👇 CAMPOS QUE O BACKEND ESPERA
    cod_categoria: null,
    regime_trabalho: null,
    tipo_exame: null,
    cod_setor: null,
    nome_setor: null
  };

  const res = await fetch(
    `http://localhost:3001/solicitacoes/${id}/editar`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    }
  );

  if (!res.ok) {
    const erro = await res.text();
    console.error("Erro backend:", erro);
    alert("Erro ao salvar edição");
    return;
  }

  bootstrap.Modal
    .getInstance(document.getElementById("modalEditarSolicitacao"))
    .hide();

  carregarHistorico();
}

function dataParaInputDate(data) {
  if (!data) return "";
  return new Date(data).toISOString().split("T")[0];
}

function tratarData(valor) {
  if (!valor) return null;

  // yyyy-mm-dd (input type="date")
  if (valor.includes("-")) return valor;

  // dd/mm/yyyy
  const [dia, mes, ano] = valor.split("/");
  return `${ano}-${mes}-${dia}`;
}

function formatarData(data) {
  return new Date(data).toLocaleString("pt-BR");
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