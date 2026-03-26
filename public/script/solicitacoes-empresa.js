let solicitacoes = [];

let paginaAtual = 1;
const itensPorPagina = 10;
let listaFiltradaAtual = [];

const usuarioLogado = getUsuario();
const nomeEmpresa = getEmpresaNome();

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

  carregarSolicitacoes();
});

function temFiltroAtivo(tipo, cpf, status) {
  return tipo || cpf || status;
}

// FUNÇÃO PARA APLICAR FILTROS
function aplicarFiltros() {
  const tipo = document.getElementById("filterTipo").value;
  const cpf = document.getElementById("filterCPF").value.trim();
  const status = document.getElementById("filterStatus").value;

  const filtroAtivo = temFiltroAtivo(tipo, cpf, status);

  const filtradas = solicitacoes.filter(s => {
    const matchTipo = !tipo || s.tipo === tipo;
    const matchCPF = !cpf || s.cpf.includes(cpf);
    const matchStatus = !status || s.status === status;

    // SE TEM QUALQUER FILTRO → IGNORA VISIBILIDADE
    if (filtroAtivo) {
      return matchTipo && matchCPF && matchStatus;
    }

    // SEM FILTRO → aplica regra padrão
    return matchTipo && matchCPF && matchStatus && deveExibir(s);
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

const statusConcluidos = ["APROVADO", "ENVIADO_SOC"];

function deveExibir(s) {
  // MARCADO → mostrar concluídos + cancelados
  if (mostrarConcluidos) {
    return (
      statusConcluidos.includes(s.status) ||
      s.status === "CANCELADO"
    );
  }

  // DESMARCADO → mostrar somente pendentes
  return (
    !statusConcluidos.includes(s.status) &&
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

      // // AÇÕES
      // let acoes = "Nenhuma ação a ser feita";

      // if (s.status === "PENDENTE_UNIDADE" || s.status === "PENDENTE_SC" || s.status === "PENDENTE_CREDENCIAMENTO" || s.status === "PENDENTE") {
      //   if (s.tipo === "NOVO_EXAME") {
      //     acoes = `
      //       <button onclick="cancelarSolicitacao(
      //         ${s.solicitacao_id},
      //         '${s.tipo}',
      //         ${usuarioLogado.id},
      //         '${s.status}',
      //         false,       // solicitarNovaUnidade
      //         ${s.solicitar_novo_setor},
      //         false,       // solicitarNovoCargo
      //         ${s.solicitar_nova_funcao}, // solicitarNovaFuncao
      //         ${s.solicitar_credenciamento} // solicitarCredenciamento
      //       )">Cancelar</button>
      //     `;
      //   } else {
      //     acoes = `
      //       <button onclick="cancelarSolicitacao(
      //         ${s.solicitacao_id},
      //         '${s.tipo}',
      //         ${usuarioLogado.id},
      //         '${s.status}',
      //         ${s.solicitar_nova_unidade}, // solicitarNovaUnidade
      //         ${s.solicitar_novo_setor},   // solicitarNovoSetor
      //         ${s.solicitar_novo_cargo},   // solicitarNovoCargo
      //         false,                        // solicitarNovaFuncao
      //         ${s.solicitar_credenciamento} // solicitarCredenciamento
      //       )">Cancelar</button>
      //     `;
      //   }
      // }

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
      else if (
        s.status === "PENDENTE_UNIDADE" ||
        s.status === "PENDENTE_SC" ||
        s.status === "PENDENTE_CREDENCIAMENTO" ||
        s.status === "PENDENTE"
      ) {
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

      // REPROVADO (também precisa ser +=)
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
  btnAnterior.innerHTML = "← Anterior";
  btnAnterior.classList.add("btn", "btn-sm", "mx-1", "btn-anterior");

  if (paginaAtual === 1) {
    btnAnterior.disabled = true;
  }

  btnAnterior.onclick = () => {
    if (paginaAtual > 1) {
      paginaAtual--;
      renderizarTabela(listaFiltradaAtual);
    }
  };

  container.appendChild(btnAnterior);

  // TEXTO DA PÁGINA ATUAL
  const info = document.createElement("small");
  info.innerText = `Página ${paginaAtual} de ${totalPaginas}`;

  container.appendChild(info);

  // BOTÃO PRÓXIMO
  const btnProximo = document.createElement("button");
  btnProximo.innerHTML = "Próximo →";
  btnProximo.classList.add("btn", "btn-sm", "mx-1", "btn-proximo");

  if (paginaAtual === totalPaginas) {
    btnProximo.disabled = true;
  }

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

        case "Reavaliado":
          return { icon: "fa-rotate fa-lg", color: "#F1AE33" };

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
    url = `/solicitacoes/novo-exame/${id}`;
  }

  if (tipo === "NOVO_CADASTRO") {
    url = `/solicitacoes/novo-cadastro/${id}`;
  }

  try {

    const response = await fetch(url);
    const data = await response.json();

    document.getElementById("obsConsulta").innerText =
      data.dados.observacao_consulta || "Nenhuma observação registrada.";

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
    const response = await fetch(`/solicitacoes/${tipo}/${id}/cancelar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioLogadoId })
    });

    if (!response.ok) throw new Error("Erro na comunicação com o servidor");

    const data = await response.json();

    if (data.sucesso) {
      if (precisaAviso) {
        notify.warning("Para esta solicitação, o cancelamento deve ser formalizado por e-mail");
      }
      else {
        notify.success("Solicitação cancelada com sucesso!");
      }

      carregarSolicitacoes();
    }
    else {
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
  const url = tipo === "NOVO_EXAME" ? `/solicitacoes/novo-exame/${id}` : `/solicitacoes/novo-cadastro/${id}`;

  const res = await fetch(url);

  if (!res.ok) {
    notify.error("Erro ao carregar dados para edição");
    return;
  }

  const { dados: s } = await res.json();

  if (tipo === "NOVO_EXAME") {
    preencherModalEditarExame(s);

    new bootstrap.Modal(document.getElementById("modalEditarExame")).show();
  }
  else {
    preencherModalEditarCadastro(s);

    new bootstrap.Modal(document.getElementById("modalEditarCadastro")).show();
  }
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
  document.getElementById("editCadRac").value = formatarRac(s.rac),
    document.getElementById("editCadTiposRac").value = formatarTiposRac(s.tipos_rac);
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
function preencherModalEditarExame(s) {
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
  document.getElementById("editExameObservacao").value = s.observacao;

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
    nome_novo_setor: document.getElementById("editCadNovoSetor").value,
    nome_novo_cargo: document.getElementById("editCadNovoCargo").value,
    descricao_atividade: document.getElementById("editCadDescricaoAtividade").value,
    data_exame: dataParaFormatoBanco(document.getElementById("editCadDataExame").value),
    cnh: document.getElementById("editCadCNH").value,
    vencimento_cnh: dataParaFormatoBanco(document.getElementById("editCadVencimentoCNH").value),
    lab_toxicologico: document.getElementById("editCadLabToxicologico").value,
    estado_credenciamento: document.getElementById("editCadEstadoCredenciamento").value,
    cidade_credenciamento: document.getElementById("editCadCidadeCredenciamento").value,
    observacao: document.getElementById("editCadObservacao").value,

    usuario_id: usuarioLogado.id
  };

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
    nome_nova_funcao: document.getElementById("editExameNovaFuncao").value || null,
    descricao_atividade: document.getElementById("editExameDescricaoAtividade").value,
    nome_novo_setor: document.getElementById("editExameNovoSetor").value || null,
    motivo_consulta: document.getElementById("editExameMotivoConsulta").value || null,
    data_exame: dataParaFormatoBanco(document.getElementById("editExameDataExame").value),
    cnh: document.getElementById("editExameCNH").value || null,
    vencimento_cnh: dataParaFormatoBanco(document.getElementById("editExameVencimentoCNH").value),
    lab_toxicologico: document.getElementById("editExameLabToxicologico").value || null,
    estado_credenciamento: document.getElementById("editExameEstadoCredenciamento").value || null,
    cidade_credenciamento: document.getElementById("editExameCidadeCredenciamento").value || null,
    observacao: document.getElementById("editExameObservacao").value || null,

    usuario_id: usuarioLogado.id
  };

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