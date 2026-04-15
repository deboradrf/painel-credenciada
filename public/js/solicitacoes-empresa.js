let prestadoresCache = [];
let solicitacoes = [];

let paginaAtual = 1;
const itensPorPagina = 20;
let listaFiltradaAtual = [];

const usuarioLogado = getUsuario();
const nomeEmpresa = getEmpresaNome();

let codEmpresaAtual = null;
let codUnidadeAtual = null;

// DROPDOWN DO PERFIL
document.addEventListener("DOMContentLoaded", () => {
  const userNameDropdown = document.getElementById("userNameDropdown");
  const dropdownUserExtra = document.getElementById("dropdownUserExtra");

  const avatarIcon = document.getElementById("avatarIcon");
  const avatarIconDropdown = document.getElementById("avatarIconDropdown");

  const avatarBtn = document.querySelector(".profile-trigger .avatar-circle");
  const avatarDrop = document.querySelector(".profile-header .avatar-circle");

  // NOME
  userNameDropdown.innerText = usuarioLogado.nome?.trim() || "";

  // EMPRESA
  dropdownUserExtra.innerHTML = `
    <div class="company-name">
      <small>${nomeEmpresa}</small>
    </div>
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
    document.getElementById("checkMostrarTudo").checked = false;

    aplicarFiltros();
  });

  configurarEventosClinica({
    estado: "editCadEstadoClinica",
    cidade: "editCadCidadeClinica",
    clinica: "editCadNomeClinica"
  });

  configurarEventosClinica({
    estado: "editExameEstadoClinica",
    cidade: "editExameCidadeClinica",
    clinica: "editExameNomeClinica"
  });

  carregarSolicitacoes();
});

// FUNÇÃO PARA APLICAR FILTROS
function aplicarFiltros() {
  const tipo = document.getElementById("filterTipo").value;
  const cpf = document.getElementById("filterCPF").value.trim();
  const status = document.getElementById("filterStatus").value;

  const temStatus = !!status;
  const temOutrosFiltros = !!tipo || !!cpf;

  const ignorarVisibilidade = temStatus && temOutrosFiltros;

  const filtradas = solicitacoes.filter(s => {
    const matchTipo = !tipo || s.tipo === tipo;
    const matchCPF = !cpf || s.cpf.includes(cpf);
    const matchStatus = !status || s.status === status;

    const matchVisibilidade = ignorarVisibilidade ? true : deveExibir(s);

    return matchTipo && matchCPF && matchStatus && matchVisibilidade;
  });

  paginaAtual = 1;
  listaFiltradaAtual = filtradas;

  renderizarTabela(filtradas);
}

// BOTÃO PARA MOSTRAR AS SOLICITAÇÕES CONCLUÍDAS
document.getElementById("checkMostrarTudo").addEventListener("change", function () {
  mostrarConcluidos = this.checked;
  aplicarFiltros();
});

// FUNÇÃO PARA ESCONDER SOLICITAÇÕES POR PADRÃO
let mostrarConcluidos = false;

const statusConcluidosPorTipo = { NOVO_EXAME: ["APROVADO"], NOVO_CADASTRO: ["ENVIADO_SOC"] };

function deveExibir(s) {
  const concluidosDoTipo = statusConcluidosPorTipo[s.tipo] || [];

  // MARCADO → mostrar concluídos + cancelados
  if (mostrarConcluidos) {
    return (
      concluidosDoTipo.includes(s.status) ||
      s.status === "CANCELADO"
    );
  }

  // DESMARCADO → mostrar somente pendentes
  return (
    !concluidosDoTipo.includes(s.status) &&
    s.status !== "CANCELADO"
  );
}

// FUNÇÃO DE PAGINAÇÃO
function paginar(lista, pagina, limite) {
  const inicio = (pagina - 1) * limite;
  return lista.slice(inicio, inicio + limite);
}

// FUNÇÃO PARA CARREGAR HISTÓRICO DAS SOLICITAÇÕES
async function carregarSolicitacoes() {
  const res = await fetch(`/solicitacoes-empresa/${usuarioLogado.id}`);

  solicitacoes = await res.json();

  solicitacoes.sort((a, b) => {
    return new Date(a.solicitado_em) - new Date(b.solicitado_em);
  });

  aplicarFiltros();
}

// FUNÇÃO PARA RENDERIZAR A TABELA E MOSTRAR OS DADOS
function renderizarTabela(lista) {
  const tbody = document.querySelector("tbody");
  tbody.classList.add("fade");

  setTimeout(() => {
    tbody.innerHTML = "";

    const listaPaginada = paginar(lista, paginaAtual, itensPorPagina);

    if (!listaPaginada.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" class="text-muted text-center">
            Nenhuma solicitação encontrada
          </td>
        </tr>
      `;

      tbody.classList.remove("fade");
      return;
    }

    listaPaginada.forEach(s => {
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
      if (s.status === "PENDENTE_AGENDAMENTO") situacao = "Aguardando horário de agendamento da clínica credenciada";
      if (s.status === "APROVADO") situacao = "Solicitação aprovada";
      if (s.status === "REPROVADO") situacao = "Ajustes necessários";
      if (s.status === "ENVIADO_SOC") situacao = "Solicitação finalizada";
      if (s.status === "CANCELADO") situacao = "Solicitação cancelada";

      // AÇÕES
      let acoes = `
        <button onclick="abrirHistorico(${s.solicitacao_id}, '${s.tipo}')">
          Histórico
        </button>
      `;

      // STATUS QUE MOSTRAM CONSULTA
      if (s.status === "APROVADO" || s.status === "ENVIADO_SOC") {
        acoes += `
          <button onclick="verConsulta(${s.solicitacao_id}, '${s.tipo}')">
            Ver Consulta
          </button>
        `;
      }

      // STATUS QUE PODEM CANCELAR
      else if (s.status === "PENDENTE_UNIDADE" || s.status === "PENDENTE_SC" || s.status === "PENDENTE_CREDENCIAMENTO" || s.status === "PENDENTE" || s.status === "PENDENTE_REAVALIACAO") {
        if (s.tipo === "NOVO_EXAME") {
          acoes += `
            <button onclick="cancelarSolicitacao(
              ${s.solicitacao_id},
              '${s.tipo}',
              ${usuarioLogado.id},
              '${s.status}',
              false,
              ${!!s.solicitar_novo_setor},
              false,
              ${!!s.solicitar_nova_funcao},
              ${!!s.solicitar_credenciamento}
            )">Cancelar</button>
          `;
        } else {
          acoes += `
            <button onclick="cancelarSolicitacao(
              ${s.solicitacao_id},
              '${s.tipo}',
              ${usuarioLogado.id},
              '${s.status}',
              ${!!s.solicitar_nova_unidade},
              ${!!s.solicitar_novo_setor},
              ${!!s.solicitar_novo_cargo},
              false,
              ${!!s.solicitar_credenciamento}
            )">Cancelar</button>
          `;
        }
      }

      // REPROVADO
      if (s.status === "REPROVADO") {
        acoes += `
          <button onclick='verMotivo(${JSON.stringify(s.motivo_reprovacao)})'>
            Ver motivo
          </button>

          <button onclick="abrirModalEditar(${s.solicitacao_id}, '${s.tipo}')">
            Editar
          </button>

          <button onclick="cancelarSolicitacao(
            ${s.solicitacao_id},
            '${s.tipo}',
            ${usuarioLogado.id},
            '${s.status}',
            ${!!s.solicitar_nova_unidade},
            ${!!s.solicitar_novo_setor},
            ${!!s.solicitar_novo_cargo},
            ${!!s.solicitar_nova_funcao},
            ${!!s.solicitar_credenciamento}
          )">
            Cancelar
          </button>
        `;
      }

      tbody.innerHTML += `
        <tr>
          <td>${iconeTipo}</td>
          <td class="col-data">${formatarDataHora(s.solicitado_em)}</td>
          <td class="col-funcionario">${(s.nome_funcionario).toUpperCase()}</td>
          <td>${s.cpf}</td>
          <td>
            <span class="status-pill ${s.status.toLowerCase()}">
              ${s.status}
            </span>
          </td>
          <td class="col-situacao text-muted">
            ${situacao}
          </td>
          <td class="actions text-muted">
            <div class="actions-wrapper">
              ${acoes}
            </div>
          </td>
        </tr>
      `;
    });

    tbody.classList.remove("fade");
  }, 100);

  renderizarPaginacao();
}

function renderizarPaginacao() {
  const totalPaginas = Math.ceil(listaFiltradaAtual.length / itensPorPagina);
  const container = document.getElementById("paginacao");
  container.innerHTML = "";

  if (totalPaginas <= 1) return;

  // BOTÃO ANTERIOR
  const btnAnterior = document.createElement("button");

  btnAnterior.innerHTML = "←";
  btnAnterior.classList.add("btn", "btn-sm", "mx-1", "btn-anterior");
  btnAnterior.disabled = paginaAtual === 1;

  btnAnterior.onclick = () => {
    if (paginaAtual > 1) {
      paginaAtual--;
      renderizarTabela(listaFiltradaAtual);
    }
  };

  container.appendChild(btnAnterior);

  const paginas = [];

  // Primeira página sempre
  paginas.push(1);

  let start = Math.max(paginaAtual - 1, 2);
  let end = Math.min(paginaAtual + 1, totalPaginas - 1);

  // Reticências antes do bloco do meio
  if (start > 2) {
    paginas.push("...");
  }

  // Bloco do meio (até 3 páginas)
  for (let i = start; i <= end; i++) {
    paginas.push(i);
  }

  // Reticências depois do bloco do meio
  if (end < totalPaginas - 1) {
    paginas.push("...");
  }

  // Última página sempre
  if (totalPaginas > 1) {
    paginas.push(totalPaginas);
  }

  const info = document.createElement("small");

  info.innerHTML = paginas
    .map(p =>
      p === "..."
        ? `<span class="pagina-ellipsis">...</span>`
        : `<span class="pagina-num ${p === paginaAtual ? "active" : ""}" data-pagina="${p}">${p}</span>`
    )
    .join(" ");

  container.appendChild(info);

  info.querySelectorAll(".pagina-num").forEach(el => {
    el.style.cursor = "pointer";
    el.onclick = () => {
      paginaAtual = Number(el.dataset.pagina);
      renderizarTabela(listaFiltradaAtual);
    };
  });

  // BOTÃO PRÓXIMO
  const btnProximo = document.createElement("button");

  btnProximo.innerHTML = "→";
  btnProximo.classList.add("btn", "btn-sm", "mx-1", "btn-proximo");
  btnProximo.disabled = paginaAtual === totalPaginas;

  btnProximo.onclick = () => {
    if (paginaAtual < totalPaginas) {
      paginaAtual++;
      renderizarTabela(listaFiltradaAtual);
    }
  };

  container.appendChild(btnProximo);
}

// FUNÇÃO PARA MOSTRAR O HISTÓRICO DAS SOLICITAÇÕES
async function abrirHistorico(id, tipo) {
  try {
    const res = await fetch(`/solicitacoes/${tipo}/${id}/historico`);
    if (!res.ok) throw new Error("Erro ao carregar histórico");

    const historico = await res.json();
    historico.sort((a, b) => new Date(a.data) - new Date(b.data));

    const container = document.getElementById("conteudoHistorico");

    if (!historico.length) {
      container.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="fa-regular fa-folder-open fa-2x mb-2"></i>
          <div>Sem histórico</div>
        </div>
      `;
      new bootstrap.Modal(document.getElementById("modalHistorico")).show();
      return;
    }

    const getIcon = (etapa) => {
      switch (etapa) {
        case "Solicitado":
          return { icon: "fa-file-circle-plus fa-lg", color: "#88A6BB" };

        case "Aprovado":
          return { icon: "fa-circle-check fa-lg", color: "#53A5A6" };

        case "Reprovado":
          return { icon: "fa-circle-xmark fa-lg", color: "#F05252" };

        case "Cancelado":
          return { icon: "fa-ban fa-lg", color: "#616161" };

        case "Editado":
          return { icon: "fa-pencil fa-lg", color: "#F1AE33" };

        case "Enviado ao SOC":
          return { icon: "fa-paper-plane fa-lg", color: "#88A6BB" };

        default:
          return { icon: "fa-circle fa-lg", color: "#000000" };
      }
    };

    const html = `
        <div class="timeline">
          ${historico.map(h => {
      const dataFormatada = h.data ? new Date(h.data).toLocaleString() : "-";
      const { icon, color } = getIcon(h.etapa);

      return `
              <div class="timeline-item">
                <div class="timeline-icon">
                  <i class="fa-solid ${icon}" style="color: ${color}"></i>
                </div>

                <div class="timeline-content">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <h6>${h.etapa}</h6>
                  </div>

                  <div class="d-flex justify-content-between align-items-center text-muted small">
                    <div>
                      <i class="fa-solid fa-user me-1"></i>
                      ${h.usuario || "-"}
                    </div>

                    <div>
                      <i class="fa-regular fa-clock me-1"></i>
                      ${dataFormatada}
                    </div>
                  </div>

                  ${h.motivo ? `
                    <div class="text-danger small mt-1">
                      <i class="fa-solid fa-ban me-1"></i>
                      ${h.motivo}
                    </div>
                  ` : ""}

                  ${h.erro ? `
                    <div class="text-warning small mt-1">
                      <i class="fa-solid fa-triangle-exclamation me-1"></i>
                      ${h.erro}
                    </div>
                  ` : ""}
                </div>
              </div>
            `;
    }).join("")}
        </div>
      `;

    container.innerHTML = html;
    new bootstrap.Modal(document.getElementById("modalHistorico")).show();
  } catch (erro) {
    console.error(erro);
  }
}

// MODAL DE VER CONSULTA
async function verConsulta(id, tipo) {
  let url = "";

  if (tipo === "NOVO_EXAME") {
    url = `/api/solicitacoes/novo-exame/${id}`;
  }

  if (tipo === "NOVO_CADASTRO") {
    url = `/api/solicitacoes/novo-cadastro/${id}`;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();

    document.getElementById("obsConsulta").innerText = data.dados.observacao_consulta;

    const modal = new bootstrap.Modal(document.getElementById("modalConsulta"));
    modal.show();

  } catch (erro) {
    console.error(erro);
  }
}

// FUNÇÃO PARA FORMATAR TIPO DE EXAME
const TIPO_EXAME_LABELS = {
  MUDANCA_RISCOS_OCUPACIONAIS: "MUDANÇA DE FUNÇÃO / RISCOS OCUPACIONAIS",
  CONSULTA_ASSISTENCIAL: "CONSULTA ASSINSTENCIAL",
  RETORNO_TRABALHO: "RETORNO AO TRABALHO"
};

function formatarTipoExame(tipo) {
  if (!tipo) return "-";
  return TIPO_EXAME_LABELS[tipo] || tipo;
}

// FUNÇÃO PARA RESOLVER CÓDIGO DA UNIDADE PELO NOME (USADO NO MODAL DE EDITAR EXAME)
async function obterCodigoUnidadePorNome(empresaCodigo, nomeUnidade) {
  try {
    const response = await fetch(`/api/unidades/${empresaCodigo}`);
    const unidades = await response.json();

    const normalizar = str => str?.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const unidade = unidades.find(u =>
      normalizar(u.nome) === normalizar(nomeUnidade)
    );

    return unidade?.codigo || null;
  } catch (erro) {
    console.error(erro);
    return null;
  }
}

// FUNÇÃO PARA CARREGAR OS SETORES DA UNIDADE
async function carregarSetores(empresaCodigo, unidadeCodigo, setorSelecionado = "", selectId = "") {
  const select = document.getElementById(selectId);

  if (!select) return;

  try {
    const response = await fetch(`/api/hierarquia/${empresaCodigo}/${unidadeCodigo}`);
    const setores = await response.json();

    setores.sort((a, b) =>
      a.nomeSetor.localeCompare(b.nomeSetor, 'pt-BR', { sensitivity: 'base' })
    );

    setores.forEach(setor => {
      const option = document.createElement("option");

      option.value = setor.codigoSetor;
      option.textContent = setor.nomeSetor;

      if (setor.codigoSetor == setorSelecionado) {
        option.selected = true;
      }

      select.appendChild(option);
    });

  } catch (erro) {
    console.error("Erro ao carregar setores:", erro);
  }
}

// FUNÇÃO PARA CARREGAR OS CARGOS DO SETOR SELECIONADO
async function carregarCargosDoSetorSelecionado(empresaCodigo, unidadeCodigo, setorCodigo, cargoSelecionado = "", selectId = "editCadNomeCargo") {
  const selectCargo = document.getElementById(selectId);

  if (!selectCargo) return;

  selectCargo.innerHTML = '<option value="">Selecione...</option>';

  try {
    const response = await fetch(`/api/hierarquia/${empresaCodigo}/${unidadeCodigo}/${setorCodigo}`);

    const cargos = await response.json();

    cargos.forEach(cargo => {
      const option = document.createElement("option");

      option.value = cargo.codigoCargo;
      option.textContent = cargo.nomeCargo;

      if (String(cargo.codigoCargo) === String(cargoSelecionado)) {
        option.selected = true;
      }

      selectCargo.appendChild(option);
    });

  } catch (erro) {
    console.error(erro);
  }
}

// LISTENER PARA QUANDO SELECIONAR UM SETOR NOVO, SER OBRIGATÓRIO SELECIONAR O CARGO NOVAMENTE
document.getElementById("editCadNomeSetor").addEventListener("change", async function () {
  const novoSetor = this.value;
  const selectCargo = document.getElementById("editCadNomeCargo");

  await carregarCargosDoSetorSelecionado(
    codEmpresaAtual,
    codUnidadeAtual,
    novoSetor,
    "",
    "editCadNomeCargo"
  );

  selectCargo.required = true;
});

// FUNÇÃO PARA FORMATAR RAC
const RAC_LABELS = {
  FORMULARIO_RAC_VALE: "FORMULÁRIO RAC VALE",
  FORMULARIO_UNIDADE_CSN: "FORMULÁRIO UNIDADE CSN",
  FORMULARIO_UNIDADE_VALLOUREC: "FORMULÁRIO UNIDADE VALLOUREC",
  FORMULARIO_UNIDADE_KINROSS: "FORMULÁRIO UNIDADE KINROSS"
};

function formatarRac(rac) {
  if (!rac) return "-";

  const lista = Array.isArray(rac)
    ? rac
    : rac.split(",");

  return lista
    .map(item => RAC_LABELS[item] || item)
    .join(", ");
}

// FUNÇÃO PARA FORMATAR OS TIPOS DE RAC
function formatarTiposRac(tipos) {
  if (!Array.isArray(tipos) || tipos.length === 0) return "";

  return tipos
    .map(t => t.replace("RAC_", "RAC "))
    .join(", ");
}

// FUNÇÃO PARA CANCELAR SOLICITAÇÃO PENDENTE
async function cancelarSolicitacao(id, tipo, usuarioLogadoId, status, solicitarNovaUnidade, solicitarNovoSetor, solicitarNovoCargo, solicitarNovaFuncao, solicitarCredenciamento) {
  const confirmar = await modalConfirm("Tem certeza que deseja cancelar esta solicitação?");
  if (!confirmar) return;

  // Status que sempre mostram aviso
  const statusComAviso = ["PENDENTE_UNIDADE", "PENDENTE_SC", "PENDENTE_CREDENCIAMENTO"];

  // Flags de aviso por tipo
  let flagEspecial = false;

  if (tipo === "NOVO_EXAME") {
    flagEspecial = solicitarNovaFuncao || solicitarNovoSetor || solicitarCredenciamento;
  } else {
    flagEspecial = solicitarNovaUnidade || solicitarNovoSetor || solicitarNovoCargo || solicitarCredenciamento;
  }

  const precisaAviso =
    statusComAviso.includes(status) || (status === "PENDENTE" && flagEspecial);

  try {
    if (precisaAviso) {
      const confirmar = await modalConfirm(
        "Para esta solicitação, o cancelamento deve ser formalizado por e-mail, pois a solicitação já se encontra em andamento"
      );

      if (!confirmar) {
        return;
      }
    }

    const response = await fetch(`/solicitacoes/${tipo}/${id}/cancelar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioLogadoId })
    });

    if (!response.ok) throw new Error("Erro na comunicação com o servidor");

    const data = await response.json();

    if (data.sucesso) {
      notify.success("Solicitação cancelada com sucesso!");
      carregarSolicitacoes();
    } else {
      notify.error(data.erro || "Não foi possível cancelar a solicitação");
    }
  } catch (erro) {
    console.error(erro);
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
  const url = tipo === "NOVO_EXAME" ? `/api/solicitacoes/novo-exame/${id}` : `/api/solicitacoes/novo-cadastro/${id}`;

  const res = await fetch(url);

  if (!res.ok) {
    notify.error("Erro ao carregar dados para edição");
    return;
  }

  const { dados: s } = await res.json();

  if (tipo === "NOVO_EXAME") {
    // 1. Abre o modal já mostrando o spinner
    const modal = new bootstrap.Modal(document.getElementById("modalEditarExame"));
    document.getElementById("loadingModalEditarExame").style.display = "block";
    document.getElementById("conteudoModalEditarExame").style.display = "none";
    modal.show();

    // 2. Preenche e carrega tudo em paralelo
    preencherModalEditarExame(s);
    await carregarPrestadores();
    preencherPrestadorNoSelect(s, {
      estado: "editExameEstadoClinica",
      cidade: "editExameCidadeClinica",
      clinica: "editExameNomeClinica"
    });

    // 3. Só agora exibe o conteúdo
    document.getElementById("loadingModalEditarExame").style.display = "none";
    document.getElementById("conteudoModalEditarExame").style.display = "block";
  }
  else {
    // 1. Abre o modal já mostrando o spinner
    const modal = new bootstrap.Modal(document.getElementById("modalEditarCadastro"));
    document.getElementById("loadingModalEditarCadastro").style.display = "block";
    document.getElementById("conteudoModalEditarCadastro").style.display = "none";
    modal.show();

    // 2. Preenche e carrega tudo em paralelo
    preencherModalEditarCadastro(s);
    await carregarPrestadores();
    preencherPrestadorNoSelect(s, {
      estado: "editCadEstadoClinica",
      cidade: "editCadCidadeClinica",
      clinica: "editCadNomeClinica"
    });

    // 3. Só agora exibe o conteúdo
    document.getElementById("loadingModalEditarCadastro").style.display = "none";
    document.getElementById("conteudoModalEditarCadastro").style.display = "block";
  }
}

// function preencherClinicaSelecionada(s) {
//   const estado = s.estado_clinica;
//   const cidade = s.cidade_clinica;
//   const nomeClinica = s.nome_clinica;

//   const selectEstado = document.getElementById("editCadEstadoClinica");
//   const selectCidade = document.getElementById("editCadCidadeClinica");
//   const selectClinica = document.getElementById("editCadNomeClinica");

//   if (!estado) return;

//   // 1. Seleciona estado
//   selectEstado.value = estado.toUpperCase();

//   // 2. Dispara o change manualmente pra carregar cidades
//   selectEstado.dispatchEvent(new Event("change"));

//   // Pequeno delay pra garantir DOM atualizado
//   setTimeout(() => {
//     if (cidade) {
//       selectCidade.value = cidade;

//       // dispara change pra carregar clínicas
//       selectCidade.dispatchEvent(new Event("change"));

//       setTimeout(() => {
//         if (nomeClinica) {
//           // seleciona pelo texto (nome)
//           const option = [...selectClinica.options].find(
//             opt => opt.textContent === nomeClinica
//           );

//           if (option) {
//             selectClinica.value = option.value;
//           }
//         }
//       }, 100);
//     }
//   }, 100);
// }

function preencherPrestadorNoSelect(s, ids) {
  const estado = s.estado_clinica;
  const cidade = s.cidade_clinica;
  const nomeClinica = s.nome_clinica;

  const selectEstado = document.getElementById(ids.estado);
  const selectCidade = document.getElementById(ids.cidade);
  const selectClinica = document.getElementById(ids.clinica);

  if (!selectEstado || !estado) return;

  // 1. Estado
  selectEstado.value = estado.toUpperCase();
  selectEstado.dispatchEvent(new Event("change"));

  setTimeout(() => {
    if (cidade) {
      selectCidade.value = cidade;
      selectCidade.dispatchEvent(new Event("change"));

      setTimeout(() => {
        if (nomeClinica) {
          const option = [...selectClinica.options].find(
            opt => opt.textContent === nomeClinica
          );

          if (option) {
            selectClinica.value = option.value;
          }
        }
      }, 100);
    }
  }, 100);
}

// MÁSCARA DE CEP CADASTRO
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

// MÁSCARA DE CEP EXAME
const inputCepExame = document.getElementById("editExameCep");

inputCepExame.addEventListener("input", function () {
  let valor = this.value.replace(/\D/g, "");

  if (valor.length > 8) valor = valor.slice(0, 8);

  if (valor.length > 5) {
    this.value = valor.replace(/^(\d{5})(\d)/, "$1-$2");
  } else {
    this.value = valor;
  }
});

// FUNÇÃO PARA FORMATAR DATA
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

// FUNÇÃO PARA PREENCHER OS CAMPOS DO MODAL - NOVO CADASTRO
function preencherModalEditarCadastro(s) {
  codEmpresaAtual = s.cod_empresa;
  codUnidadeAtual = s.cod_unidade;

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
  carregarSetores(s.cod_empresa, s.cod_unidade, s.cod_setor, "editCadNomeSetor");
  document.getElementById("editCadNovoSetor").value = s.nome_novo_setor;
  carregarCargosDoSetorSelecionado(s.cod_empresa, s.cod_unidade, s.cod_setor, s.cod_cargo, "editCadNomeCargo");
  document.getElementById("editCadNomeCargo").value = s.nome_cargo;
  document.getElementById("editCadNovoCargo").value = s.nome_novo_cargo;
  document.getElementById("editCadDescricaoAtividade").value = s.descricao_atividade;
  document.getElementById("editCadRac").value = formatarRac(s.rac),
    document.getElementById("editCadTiposRac").value = formatarTiposRac(s.tipos_rac);
  document.getElementById("editCadTipoExame").value = s.tipo_exame;
  document.getElementById("editCadDataExame").value = formatarDataParaInput(s.data_exame);
  document.getElementById("editCadNovaDataExame").value = formatarDataParaInput(s.nova_data_exame);
  document.getElementById("editCadMaisUnidades").innerText = s.mais_unidades;
  document.getElementById("editCadCNH").value = s.cnh;
  document.getElementById("editCadVencimentoCNH").value = formatarDataParaInput(s.vencimento_cnh);
  document.getElementById("editCadLabToxicologico").value = s.lab_toxicologico;
  document.getElementById("editCadEstadoClinica").value = s.estado_clinica;
  document.getElementById("editCadCidadeClinica").value = s.cidade_clinica;
  document.getElementById("editCadNomeClinica").value = s.nome_clinica;
  document.getElementById("editCadEstadoCredenciamento").value = s.estado_credenciamento;
  document.getElementById("editCadCidadeCredenciamento").value = s.cidade_credenciamento;
  document.getElementById("editCadObservacaoCredenciamento").value = s.observacao_credenciamento;
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

  const blocoDescricaoAtividade = document.getElementById("divDescricaoAtividade");

  if (s.solicitar_novo_cargo === true) {
    blocoDescricaoAtividade.classList.remove("d-none");
  } else {
    blocoDescricaoAtividade.classList.add("d-none");
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

  let unidadesExtras = [];

  if (Array.isArray(s.unidades_extras)) {
    unidadesExtras = s.unidades_extras;
  } else if (typeof s.unidades_extras === "string") {
    try {
      unidadesExtras = JSON.parse(s.unidades_extras);
    } catch {
      unidadesExtras = [];
    }
  }

  if (unidadesExtras.length > 0) {
    editCadMaisUnidades.innerHTML = "";

    unidadesExtras.forEach(u => {
      const div = document.createElement("div");
      div.classList.add("mb-1");
      div.textContent = u.nome_unidade;
      editCadMaisUnidades.appendChild(div);
    });

    blocoMaisUnidades.classList.remove("d-none");
  } else {
    editCadMaisUnidades.innerHTML = "";
    blocoMaisUnidades.classList.add("d-none");
  }
}

// FUNÇÃO PARA FORMATAR CPF FORMULÁRIO
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
async function preencherModalEditarExame(s) {
  codEmpresaAtual = s.cod_empresa;

  // SE TIVER UNIDADE DESTINO → USA ELA
  if (s.unidade_destino && s.unidade_destino.trim() !== "") {
    const codResolvido = await obterCodigoUnidadePorNome(
      s.cod_empresa,
      s.unidade_destino
    );

    codUnidadeAtual = codResolvido || s.cod_unidade;
  } else {
    codUnidadeAtual = s.cod_unidade;
  }

  const tipoFaturamento = s.tipo_faturamento;

  document.getElementById("editExameId").value = s.solicitacao_id;

  document.getElementById("editExameNomeFuncionario").value = s.nome_funcionario;
  document.getElementById("editExameDataNascimento").value = formatarDataParaInput(s.data_nascimento);
  document.getElementById("editExameCPF").value = s.cpf;
  document.getElementById("editExameMatricula").value = s.matricula;
  document.getElementById("editExameDataAdmissao").value = formatarDataParaInput(s.data_admissao);
  document.getElementById("editExameNomeEmpresa").value = s.nome_empresa;
  document.getElementById("editExameNomeUnidade").value = s.nome_unidade;
  document.getElementById("editExameNomeFantasia").value = s.nome_fantasia;
  document.getElementById("editExameRazaoSocial").value = s.razao_social;
  document.getElementById("editExameCnpj").value = s.cnpj;
  document.getElementById("editExameCnae").value = s.cnae;
  document.getElementById("editExameCep").value = s.cep;
  document.getElementById("editExameRua").value = s.rua;
  document.getElementById("editExameNumero").value = s.numero;
  document.getElementById("editExameBairro").value = s.bairro;
  document.getElementById("editExameEstado").value = s.estado;

  if (tipoFaturamento === "JUNTO") {
    document.getElementById("exame_faturamento_junto").checked = true;
  } else if (tipoFaturamento === "SEPARADO") {
    document.getElementById("exame_faturamento_separado").checked = true;
  }

  document.getElementById("editExameEmail").value = s.email;
  document.getElementById("editExameNomeSetor").value = s.nome_setor;
  document.getElementById("editExameNomeCargo").value = s.nome_cargo;
  document.getElementById("editExameTipoExame").value = formatarTipoExame(s.tipo_exame);
  document.getElementById("editExameDataExame").value = formatarDataParaInput(s.data_exame);
  document.getElementById("editExameNovaDataExame").value = formatarDataParaInput(s.nova_data_exame);
  document.getElementById("editExameMaisUnidades").innerText = s.mais_unidades;
  document.getElementById("editExameRac").value = formatarRac(s.rac);
  document.getElementById("editExameTiposRac").value = formatarTiposRac(s.tipos_rac);
  document.getElementById("editExameUnidadeDestino").value = s.unidade_destino;
  document.getElementById("editExameFuncaoDestino").value = s.funcao_destino;
  document.getElementById("editExameNovaFuncao").value = s.nome_nova_funcao;
  document.getElementById("editExameDescricaoAtividade").value = s.descricao_atividade;
  document.getElementById("editExameSetorDestino").value = s.setor_destino;
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
  document.getElementById("editExameObservacaoCredenciamento").value = s.observacao_credenciamento;
  document.getElementById("editExameObservacao").value = s.observacao;

  (async () => {
    let codUnidadeParaSetores = s.cod_unidade;

    if (s.unidade_destino && s.unidade_destino.trim() !== "") {
      const codResolvido = await obterCodigoUnidadePorNome(s.cod_empresa, s.unidade_destino);
      if (codResolvido) codUnidadeParaSetores = codResolvido;
    }

    let codSetorParaSelecionar = null;

    if (s.setor_destino && s.setor_destino.trim() !== "") {
      codSetorParaSelecionar = await obterCodigoSetorPorNome(
        s.cod_empresa,
        codUnidadeParaSetores,
        s.setor_destino
      );
    }

    // 🔥 PRIMEIRO: carrega setores
    await carregarSetores(
      s.cod_empresa,
      codUnidadeParaSetores,
      codSetorParaSelecionar,
      "editExameSetorDestino"
    );

    // 🔥 DEPOIS: carrega funções
    if (codSetorParaSelecionar) {
      let codFuncaoSelecionada = null;

      if (s.funcao_destino && s.funcao_destino.trim() !== "") {
        const response = await fetch(`/api/hierarquia/${s.cod_empresa}/${codUnidadeParaSetores}/${codSetorParaSelecionar}`);

        const funcoes = await response.json();

        const funcao = funcoes.find(f =>
          (f.nomeFuncao || f.nomeCargo || "").trim().toLowerCase() ===
          s.funcao_destino.trim().toLowerCase()
        );

        codFuncaoSelecionada = funcao?.codigoFuncao || funcao?.codigoCargo || null;
      }

      await carregarFuncoesDoSetorDestino(
        s.cod_empresa,
        codUnidadeParaSetores,
        codSetorParaSelecionar,
        codFuncaoSelecionada,
        "editExameFuncaoDestino"
      );
    }
  })();

  // MOSTRAR / OCULTAR SEÇÃO DE NOVA UNIDADE
  const blocoUnidade = document.getElementById("divUnidadeDestino");

  const blocoNomeFantasia = document.getElementById("divExameNomeFantasia");
  const blocoRazaoSocial = document.getElementById("divExameRazaoSocial");
  const blocoCnpj = document.getElementById("divExameCnpj");
  const blocoCnae = document.getElementById("divExameCnae");
  const blocoCep = document.getElementById("divExameCep");
  const blocoRua = document.getElementById("divExameRua");
  const blocoNumero = document.getElementById("divExameNumero");
  const blocoBairro = document.getElementById("divExameBairro");
  const blocoEstado = document.getElementById("divExameEstado");
  const blocoFaturamentoJunto = document.getElementById("divExameFaturamentoJunto");
  const blocoFaturamentoSeparado = document.getElementById("divExameFaturamentoSeparado");
  const blocoEmail = document.getElementById("divExameEmail");

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

  // MOSTRAR / OCULTAR SEÇÃO DE MUDANÇA DE RISCOS OCUPACIONAIS
  const blocoFuncaoDestino = document.getElementById("divFuncaoDestino");
  const blocoNovaFuncao = document.getElementById("divNovaFuncao");
  const blocoSetorDestino = document.getElementById("divExameSetorDestino");
  const blocoNovoSetor = document.getElementById("divExameNovoSetor");

  // OCULTAR CAMPOS DE FUNÇÃO E SETOR QUANDO NÃO FOR MUDANÇA DE RISCOS OCUPACIONAIS
  if (s.tipo_exame === "MUDANCA_RISCOS_OCUPACIONAIS") {
    // MOSTRAR OS BLOCOS DE FUNÇÃO E SETOR
    blocoFuncaoDestino.classList.remove("d-none");
    blocoSetorDestino.classList.remove("d-none");

    // SE FOR SOLICITAR CRIAÇÃO DE NOVA FUNÇÃO, MOSTRAR CAMPO
    if (s.solicitar_nova_funcao === true) {
      blocoFuncaoDestino.classList.add("d-none");
      blocoNovaFuncao.classList.remove("d-none");

      document.getElementById("editExameFuncaoDestino").innerText = "";
      document.getElementById("editExameNovaFuncao").innerText = s.nome_nova_funcao;
    } else {
      blocoFuncaoDestino.classList.remove("d-none");
      blocoNovaFuncao.classList.add("d-none");

      document.getElementById("editExameFuncaoDestino").innerText = s.funcao_destino;
    }

    // SE FOR SOLICITAR CRIAÇÃO DE NOVO SETOR, MOSTRAR CAMPO
    if (s.solicitar_novo_setor === true) {
      blocoSetorDestino.classList.add("d-none");
      blocoNovoSetor.classList.remove("d-none");

      document.getElementById("editExameSetorDestino").innerText = "";
      document.getElementById("editExameNovoSetor").innerText = s.nome_novo_setor;
    } else {
      blocoSetorDestino.classList.remove("d-none");
      blocoNovoSetor.classList.add("d-none");

      document.getElementById("editExameSetorDestino").innerText = s.setor_destino;
    }
  } else {
    blocoFuncaoDestino.classList.add("d-none");
    blocoNovaFuncao.classList.add("d-none");
    blocoSetorDestino.classList.add("d-none");
    blocoNovoSetor.classList.add("d-none");
  }

  // MOSTRAR / ESCONDER SEÇÃO DE UNIDADE DESTINO
  const blocoUnidadeDestino = document.getElementById("divUnidadeDestino");

  if (!s.unidade_destino || s.unidade_destino.trim() === "") {
    blocoUnidadeDestino.classList.add("d-none");
  } else {
    blocoUnidadeDestino.classList.remove("d-none");
    document.getElementById("editExameUnidadeDestino").innerText = s.unidade_destino;
  }

  const blocoMaisUnidades = document.getElementById("bloco_exame_mais_unidades");
  const editCadMaisUnidades = document.getElementById("editExameMaisUnidades");

  let unidadesExtras = [];

  if (Array.isArray(s.unidades_extras)) {
    unidadesExtras = s.unidades_extras;
  } else if (typeof s.unidades_extras === "string") {
    try {
      unidadesExtras = JSON.parse(s.unidades_extras);
    } catch {
      unidadesExtras = [];
    }
  }

  if (unidadesExtras.length > 0) {
    editCadMaisUnidades.innerHTML = "";

    unidadesExtras.forEach(u => {
      const div = document.createElement("div");
      div.classList.add("mb-1");
      div.textContent = u.nome_unidade;
      editCadMaisUnidades.appendChild(div);
    });

    blocoMaisUnidades.classList.remove("d-none");
  } else {
    editCadMaisUnidades.innerHTML = "";
    blocoMaisUnidades.classList.add("d-none");
  }

  // MOSTRAR / ESCONDER TEXTAREA DE DESCRIÇÃO DA ATIVIDADE
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

async function obterCodigoSetorPorNome(codEmpresa, codUnidade, nomeSetor) {
  const res = await fetch(`/api/hierarquia/${codEmpresa}/${codUnidade}`);

  const setores = await res.json();

  const setor = setores.find(s =>
    (s.nomeSetor || "").trim().toLowerCase() ===
    nomeSetor.trim().toLowerCase()
  );

  return setor ? setor.codigoSetor : null;
}

// FUNÇÃO PARA CARREGAR AS FUNÇÕES DO SETOR_DESTINO
async function carregarFuncoesDoSetorDestino(empresaCodigo, unidadeCodigo, setorCodigo, funcaoSelecionada = "", selectId = "editExameFuncaoDestino") {
  const selectFuncao = document.getElementById(selectId);

  if (!selectFuncao) {
    console.error("❌ SELECT NÃO ENCONTRADO:", selectId);
    return;
  }

  // limpa antes
  selectFuncao.innerHTML = '<option value="">Selecione...</option>';

  try {
    const url = `/api/hierarquia/${empresaCodigo}/${unidadeCodigo}/${setorCodigo}`;

    const response = await fetch(url);


    if (!response.ok) {
      console.error("❌ ERRO NA REQUISIÇÃO");
      return;
    }

    const funcoes = await response.json();

    if (!Array.isArray(funcoes) || funcoes.length === 0) {
      console.warn("⚠️ SEM FUNÇÕES PRA ESSE SETOR");
      return;
    }

    funcoes.forEach(funcao => {
      const option = document.createElement("option");

      option.value = funcao.codigoFuncao || funcao.codigoCargo;
      option.textContent = funcao.nomeFuncao || funcao.nomeCargo;

      if (String(option.value) === String(funcaoSelecionada)) {
        option.selected = true;
      }

      selectFuncao.appendChild(option);
    });

  } catch (erro) {
    console.error(erro);
  }
}

// LISTENER PARA ALTERAÇÃO DO SETOR DESTINO NO EXAME
document.addEventListener("change", async function (e) {
  if (e.target && e.target.id === "editExameSetorDestino") {

    const novoSetor = e.target.value;

    if (!novoSetor) {
      console.warn("Setor vazio!");
      return;
    }

    await carregarFuncoesDoSetorDestino(
      codEmpresaAtual,
      codUnidadeAtual,
      novoSetor,
      "",
      "editExameFuncaoDestino"
    );
  }
});

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
  const confirmar = await modalConfirm("Deseja salvar as alterações?");
  if (!confirmar) return;

  const usuarioLogado = getUsuario();

  const id = document.getElementById("editCadId").value;
  const tipoContratacaoValue = document.getElementById("editCadTipoContratacao").value;
  const tipoFaturamentoSelecionado = document.querySelector('input[name="tipo_faturamento"]:checked')?.value;
  const selectSetor = document.getElementById("editCadNomeSetor");
  const codSetor = selectSetor?.value || null;
  const nomeSetor = selectSetor?.options[selectSetor.selectedIndex]?.text || null;
  const selectCargo = document.getElementById("editCadNomeCargo");
  let codCargo = selectCargo?.value || null;
  let nomeCargo = selectCargo?.options[selectCargo.selectedIndex]?.text || null;

  // PARA O CARGO NÃO VIR COM "Selecione..." COMO VALOR
  if (nomeCargo === "Selecione...") {
    nomeCargo = null;
    codCargo = null;
  }

  const blocoClinicaCad = document.getElementById("blocoCadClinica");
  const clinicaCadVisivel = !blocoClinicaCad.classList.contains("d-none");

  const estadoClinica = document.getElementById("editCadEstadoClinica").value;
  const cidadeClinica = document.getElementById("editCadCidadeClinica").value;
  const selectClinica = document.getElementById("editCadNomeClinica");
  const nomeClinica = selectClinica.options[selectClinica.selectedIndex]?.text || null;

  const invalidos = ["", "Selecione..."];

  if (clinicaCadVisivel) {
    if (invalidos.includes(estadoClinica)) {
      notify.warning("Selecione o estado da clínica!");
      return;
    }
    if (invalidos.includes(cidadeClinica)) {
      notify.warning("Selecione a cidade da clínica!");
      return;
    }
    if (!nomeClinica || invalidos.includes(nomeClinica)) {
      notify.warning("Selecione a clínica!");
      return;
    }
  }

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
    cod_setor: codSetor,
    nome_setor: nomeSetor,
    nome_novo_setor: document.getElementById("editCadNovoSetor").value,
    cod_cargo: codCargo,
    nome_cargo: nomeCargo,
    nome_novo_cargo: document.getElementById("editCadNovoCargo").value,
    descricao_atividade: document.getElementById("editCadDescricaoAtividade").value,
    nova_data_exame: dataParaFormatoBanco(document.getElementById("editCadNovaDataExame").value),
    cnh: document.getElementById("editCadCNH").value,
    vencimento_cnh: dataParaFormatoBanco(document.getElementById("editCadVencimentoCNH").value),
    lab_toxicologico: document.getElementById("editCadLabToxicologico").value,
    estado_clinica: clinicaCadVisivel ? estadoClinica : null,
    cidade_clinica: clinicaCadVisivel ? cidadeClinica : null,
    nome_clinica: clinicaCadVisivel ? nomeClinica : null,
    estado_credenciamento: document.getElementById("editCadEstadoCredenciamento").value,
    cidade_credenciamento: document.getElementById("editCadCidadeCredenciamento").value,
    observacao_credenciamento: document.getElementById("editCadObservacaoCredenciamento").value,
    observacao: document.getElementById("editCadObservacao").value,

    usuario_id: usuarioLogado.id
  };

  const setorEl = document.getElementById("editCadNomeSetor");
  const cargoEl = document.getElementById("editCadNomeCargo");

  const setorSelecionado = setorEl.value?.trim();
  const funcaoSelecionada = cargoEl.value?.trim();

  // regra MAIS SEGURA: só valida se setor foi escolhido
  const precisaValidarCargo = !!setorSelecionado;

  // mas só se o select realmente está habilitado/ativo
  const funcaoAtiva = !cargoEl.disabled && cargoEl.offsetParent !== null;

  if (precisaValidarCargo && funcaoAtiva && !funcaoSelecionada) {
    notify.warning("Selecione um cargo para o setor escolhido!");
    return;
  }

  const res = await fetch(`/solicitacoes/novo-cadastro/${id}/editar`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });

  const resposta = await res.json();

  if (!res.ok) {
    notify.error(resposta.erro || "Erro ao salvar edição");
    return;
  }

  bootstrap.Modal
    .getInstance(document.getElementById("modalEditarCadastro"))
    .hide();

  carregarSolicitacoes();
}

// MÁSCARA DE CNPJ EXAME
document.getElementById('editExameCnpj').addEventListener('input', function (e) {
  let value = e.target.value;

  value = value.replace(/\D/g, '');

  value = value.replace(/^(\d{2})(\d)/, '$1.$2');
  value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
  value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
  value = value.replace(/(\d{4})(\d)/, '$1-$2');

  e.target.value = value;
});

// CAMPOS EM MAIÚSCULO
const camposMaiusculo = [
  "editCadNomeFantasia",
  "editCadRazaoSocial",
  "editCadRua",
  "editCadBairro",
  "editCadEstado",
  "editCadNovoSetor",
  "editCadNovoCargo",
  "editCadLabToxicologico",
  "editCadEstadoCredenciamento",
  "editCadCidadeCredenciamento",
  "editExameNomeFantasia",
  "editExameRazaoSocial",
  "editExameRua",
  "editExameBairro",
  "editExameEstado",
  "editExameNovaFuncao",
  "editExameNovoSetor",
  "editExameLabToxicologico",
  "editExameEstadoCredenciamento",
  "editExameCidadeCredenciamento"
];

camposMaiusculo.forEach(id => {
  const campo = document.getElementById(id);

  if (campo) {
    campo.addEventListener("input", function () {
      this.value = this.value.toUpperCase();
    });
  }
});

// MÁSCARA DE CNPJ CADASTRO
document.getElementById('editCadCnpj').addEventListener('input', function (e) {
  let value = e.target.value;

  value = value.replace(/\D/g, '');

  value = value.replace(/^(\d{2})(\d)/, '$1.$2');
  value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
  value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
  value = value.replace(/(\d{4})(\d)/, '$1-$2');

  e.target.value = value;
});

// FUNÇÃO PARA SALVAR EDIÇÃO - NOVO EXAME
async function salvarEdicaoExame() {
  const confirmar = await modalConfirm("Deseja salvar as alterações?");
  if (!confirmar) return;

  const usuarioLogado = getUsuario();

  const id = document.getElementById("editExameId").value;
  const tipoFaturamentoSelecionado = document.querySelector('input[name="exame_tipo_faturamento"]:checked')?.value;
  const selectSetorDestino = document.getElementById("editExameSetorDestino");
  const nomeSetorDestino = selectSetorDestino?.options[selectSetorDestino.selectedIndex]?.text || null;
  const selectFuncaoDestino = document.getElementById("editExameFuncaoDestino");
  let nomeFuncaoDestino = selectFuncaoDestino?.options[selectFuncaoDestino.selectedIndex]?.text || null;

  // PARA A FUNÇÃO NÃO VIR COM "Selecione..." COMO VALOR
  if (nomeFuncaoDestino === "Selecione...") {
    nomeFuncaoDestino = null;
  }

  const blocoClinicaExame = document.getElementById("blocoExameClinica");
  const clinicaExameVisivel = !blocoClinicaExame.classList.contains("d-none");

  const estadoClinica = document.getElementById("editExameEstadoClinica").value;
  const cidadeClinica = document.getElementById("editExameCidadeClinica").value;
  const selectClinica = document.getElementById("editExameNomeClinica");
  const nomeClinica = selectClinica.options[selectClinica.selectedIndex]?.text || null;

  const invalidos = ["", "Selecione..."];

  if (clinicaExameVisivel) {
    if (invalidos.includes(estadoClinica)) {
      notify.warning("Selecione o estado da clínica!");
      return;
    }
    if (invalidos.includes(cidadeClinica)) {
      notify.warning("Selecione a cidade da clínica!");
      return;
    }
    if (!nomeClinica || invalidos.includes(nomeClinica)) {
      notify.warning("Selecione a clínica!");
      return;
    }
  }

  const dados = {
    nome_fantasia: document.getElementById("editExameNomeFantasia").value,
    razao_social: document.getElementById("editExameRazaoSocial").value,
    cnpj: document.getElementById("editExameCnpj").value,
    cnae: document.getElementById("editExameCnae").value,
    cep: document.getElementById("editExameCep").value,
    rua: document.getElementById("editExameRua").value,
    numero: document.getElementById("editExameNumero").value,
    bairro: document.getElementById("editExameBairro").value,
    estado: document.getElementById("editExameEstado").value,
    tipo_faturamento: tipoFaturamentoSelecionado,
    email: document.getElementById("editExameEmail").value,
    funcao_destino: nomeFuncaoDestino,
    nome_nova_funcao: document.getElementById("editExameNovaFuncao").value,
    descricao_atividade: document.getElementById("editExameDescricaoAtividade").value,
    setor_destino: nomeSetorDestino,
    nome_novo_setor: document.getElementById("editExameNovoSetor").value,
    motivo_consulta: document.getElementById("editExameMotivoConsulta").value,
    nova_data_exame: dataParaFormatoBanco(document.getElementById("editExameNovaDataExame").value),
    cnh: document.getElementById("editExameCNH").value,
    vencimento_cnh: dataParaFormatoBanco(document.getElementById("editExameVencimentoCNH").value),
    lab_toxicologico: document.getElementById("editExameLabToxicologico").value,
    estado_clinica: clinicaExameVisivel ? estadoClinica : null,
    cidade_clinica: clinicaExameVisivel ? cidadeClinica : null,
    nome_clinica: clinicaExameVisivel ? nomeClinica : null,
    estado_credenciamento: document.getElementById("editExameEstadoCredenciamento").value,
    cidade_credenciamento: document.getElementById("editExameCidadeCredenciamento").value,
    observacao_credenciamento: document.getElementById("editExameObservacaoCredenciamento").value,
    observacao: document.getElementById("editExameObservacao").value,

    usuario_id: usuarioLogado.id
  };

  const setorEl = document.getElementById("editExameSetorDestino");
  const funcaoEl = document.getElementById("editExameFuncaoDestino");

  const setorSelecionado = setorEl.value?.trim();
  const funcaoSelecionada = funcaoEl.value?.trim();

  // regra MAIS SEGURA: só valida se setor foi escolhido
  const precisaValidarFuncao = !!setorSelecionado;

  // mas só se o select realmente está habilitado/ativo
  const funcaoAtiva = !funcaoEl.disabled && funcaoEl.offsetParent !== null;

  if (precisaValidarFuncao && funcaoAtiva && !funcaoSelecionada) {
    notify.warning("Selecione uma função para o setor escolhido!");
    return;
  }

  const res = await fetch(`/solicitacoes/novo-exame/${id}/editar`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });

  const resposta = await res.json();

  if (!res.ok) {
    notify.error(resposta.erro || "Erro ao salvar edição");
    return;
  }

  bootstrap.Modal
    .getInstance(document.getElementById("modalEditarExame"))
    .hide();

  carregarSolicitacoes();
}

// MÁSCARA DE CPF PRO FILTRO
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
  } else if (numerosAntesTraco.length > 2) {
    numerosFormatados = numerosAntesTraco.replace(/(\d{2})(\d{1,3})/, "$1.$2");
  }

  // MONTAR VALOR FINAL
  let finalValue = uf;
  if (numerosFormatados) finalValue += " " + numerosFormatados;
  if (ultimoDigito) finalValue += "-" + ultimoDigito;

  rgInput.value = finalValue;

  this.setCustomValidity("");
  this.classList.remove("is-invalid");
});

rgInput.addEventListener("blur", function () {
  if (!this.value.trim()) return;

  const resultado = validarRG(this.value);

  if (!resultado.valido) {
    this.setCustomValidity(resultado.msg);
    this.classList.add("is-invalid");
    this.reportValidity();
  } else {
    this.setCustomValidity("");
    this.classList.remove("is-invalid");
  }
});

// FUNÇÃO PARA VALIDAR O RG
function validarRG(valor) {
  const digitos = valor.slice(2).replace(/\D/g, "");

  if (digitos.length < 8) {
    return { valido: false, msg: "RG incompleto" };
  }

  return { valido: true, msg: "" };
}

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

// FUNÇÃO PARA CARREGAR OS PRESTADORES VINCULADOS À EMPRESA LOGADA
async function carregarPrestadores() {
  const codigoEmpresa = usuarioLogado?.cod_empresa;

  if (!codigoEmpresa) {
    console.warn("⚠️ Código da Empresa não encontrado");
    return;
  }

  try {
    await listarPrestadores(codigoEmpresa);
  } catch (erro) {
    console.error("❌ erro carregarPrestadores:", erro);
  }
}

// LISTAR OS PRESTADORES
async function listarPrestadores(codigoEmpresa) {
  const res = await fetch(`/api/prestadores/${codigoEmpresa}`);
  const prestadoresBase = await res.json();

  const detalhes = [];

  for (const p of prestadoresBase) {
    const prestador = await buscarDetalhesPrestador(codigoEmpresa, p.codigo);

    if (prestador && prestador.nivelClassificacao?.toUpperCase() === "PREFERENCIAL") {
      detalhes.push(prestador);
    }
  }

  prestadoresCache = detalhes;

  const estados = extrairEstados(prestadoresCache);

  popularSelectEstados(estados, "editCadEstadoClinica");
  popularSelectEstados(estados, "editExameEstadoClinica");
}

// PEGAR OS DETALHES DO PRESTADOR
async function buscarDetalhesPrestador(codigoEmpresa, codigo) {
  try {
    const url = `/api/prestador/${codigoEmpresa}/${codigo}`;

    const res = await fetch(url);

    if (!res.ok) {
      console.warn("❌ erro status:", res.status);
      return null;
    }

    const dados = await res.json();

    return {
      codigo,
      nome: dados.nomePrestador || dados.nome || "",
      cidade: dados.cidade || "",
      estado: dados.estado || "",
      nivelClassificacao: dados.nivelClassificacao || ""
    };

  } catch (err) {
    console.error("❌ erro fetch:", err);
    return null;
  }
}

// EXTRAÍR TODOS OS ESTADOS DAS CLÍNICAS
function extrairEstados(prestadores) {
  return [...new Set(
    prestadores
      .map(p => p.estado?.trim().toUpperCase())
      .filter(estado => estado)
  )].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// POPULAR O SELECT DE ESTADOS
function popularSelectEstados(estados, idEstado) {
  const select = document.getElementById(idEstado);

  if (!select) return;

  select.innerHTML = '<option value="">Selecione...</option>';

  estados.forEach(estado => {
    const opt = document.createElement("option");
    opt.value = estado;
    opt.textContent = estado;
    select.appendChild(opt);
  });
}

function configurarEventosClinica(ids) {
  const selectEstado = document.getElementById(ids.estado);
  const selectCidade = document.getElementById(ids.cidade);
  const selectClinica = document.getElementById(ids.clinica);

  if (!selectEstado || !selectCidade || !selectClinica) return;

  // ESTADO → CIDADE
  selectEstado.addEventListener("change", function () {
    selectCidade.innerHTML = '<option value="">Selecione...</option>';
    selectClinica.innerHTML = '<option value="">Selecione...</option>';

    if (!this.value) return;

    const cidadesUnicas = [...new Set(
      prestadoresCache
        .filter(p =>
          p.estado?.trim().toUpperCase() === this.value.trim().toUpperCase()
        )
        .map(p => p.cidade)
        .filter(Boolean)
    )];

    cidadesUnicas.forEach(cidade => {
      const opt = document.createElement("option");
      opt.value = cidade;
      opt.textContent = cidade;
      selectCidade.appendChild(opt);
    });
  });

  // CIDADE → CLÍNICA
  selectCidade.addEventListener("change", function () {
    const estado = selectEstado.value;

    selectClinica.innerHTML = '<option value="">Selecione...</option>';

    if (!estado || !this.value) return;

    const clinicas = prestadoresCache.filter(p =>
      p.estado?.trim().toUpperCase() === estado.trim().toUpperCase() &&
      p.cidade?.trim().toUpperCase() === this.value.trim().toUpperCase()
    );

    clinicas.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.codigo;
      opt.textContent = p.nome;
      selectClinica.appendChild(opt);
    });
  });
}