let solicitacoes = [];
let tipoSolicitacaoAtual = null;
let solicitacaoAtualId = null;
let hierarquiaAtual = null;

let paginaAtual = 1;
const itensPorPagina = 20;
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
    document.getElementById("filterEmpresa").value = "";
    document.getElementById("filterCPF").value = "";
    document.getElementById("filterCidade").value = "";
    document.getElementById("filterStatus").value = "";
    document.getElementById("checkMostrarTudo").checked = false;

    aplicarFiltros();
  });

  carregarSolicitacoes();
});

// BOTAO PARA ATUALIZAR PAGINA
document.getElementById("btnAtualizar").addEventListener("click", () => { location.reload(); });

// FUNÇÃO PARA CARREGAR SOLICITAÇÕES E RENDERIZAR A TABELA
async function carregarSolicitacoes() {
  const res = await fetch("/api/solicitacoes");

  solicitacoes = await res.json();

  solicitacoes.sort((a, b) => {
    return new Date(a.solicitado_em) - new Date(b.solicitado_em);
  });

  aplicarFiltros();
}

// FUNÇÃO PARA FORMATAR DATA E HORA DAS SOLICITAÇÕES
function formatarDataHoraSolicitacoes(data) {
  if (!data) return "-";

  const d = new Date(data);

  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();

  const horas = String(d.getHours()).padStart(2, "0");
  const minutos = String(d.getMinutes()).padStart(2, "0");

  return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
}

// FUNÇÃO PARA APLICAR FILTROS
function aplicarFiltros() {
  const empresa = document.getElementById("filterEmpresa").value.toLowerCase();
  const cpf = document.getElementById("filterCPF").value.trim();
  const cidade = document.getElementById("filterCidade").value.toLowerCase();
  const status = document.getElementById("filterStatus").value;

  const normalizar = (t) =>
    (t || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const cidadeFiltro = normalizar(cidade);

  const filtradas = solicitacoes.filter(s => {
    const matchEmpresa = !empresa || (s.nome_empresa && s.nome_empresa.toLowerCase().includes(empresa));
    const matchCPF = !cpf || s.cpf.includes(cpf);
    const matchCidade =
      !cidadeFiltro ||
      [s.cidade_clinica, s.cidade_credenciamento, s.cidade]
        .some(c => normalizar(c).includes(cidadeFiltro));
    const matchStatus = !status || s.status === status;

    const statusAtivo = !!status;

    const outrosFiltrosAtivos = empresa || cpf || cidade;

    const ignorarVisibilidade = statusAtivo && outrosFiltrosAtivos;

    const matchVisibilidade = ignorarVisibilidade ? true : deveExibir(s);

    return matchEmpresa && matchCPF && matchCidade && matchStatus && matchVisibilidade;
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

// FUNÇÃO PARA RENDERIZAR TABELA COM AS SOLICITAÇÕES
async function renderizarTabela(lista) {
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
      const tr = document.createElement("tr");

      const status = (s.status || "PENDENTE").toUpperCase();
      const statusClass = status.toLowerCase();

      const podeEnviarSOC = (s.tipo === "NOVO_CADASTRO" && s.status === "APROVADO") || s.status === "ERRO_SOC";

      const estaEmAnalise = s.em_analise_por && s.em_analise_por !== usuarioLogado.id;

      let iconeTipo = "";

      if (s.tipo === "NOVO_CADASTRO") {
        iconeTipo = `
        <i class="fa-solid fa-user-plus fa-lg" style="color: #F1AE33"></i>
      `;
      }

      if (s.tipo === "NOVO_EXAME") {
        iconeTipo = `
        <i class="fa-solid fa-file-circle-plus fa-lg" style="color: #F1AE33"></i>
      `;
      }

      tr.innerHTML = `
        <td>${iconeTipo}</td>
        <td class="col-data">${formatarDataHoraSolicitacoes(s.solicitado_em)}</td>
        <td class="col-empresa">${s.nome_empresa}</td>
        <td class="col-funcionario">${(s.nome_funcionario).toUpperCase()}</td>
        <td>${s.cpf}</td>
        <td>${(s.cidade).toUpperCase()}</td>
        <td>
          <span class="status-pill ${statusClass}">${s.status}</span>
        </td>
        <td class="actions">
          <div class="actions-wrapper">
            ${estaEmAnalise
            ? `
                <small style="opacity:0.6;">
                  Em análise por ${s.em_analise_por_nome?.split(' ')[0]}
                </small>
                `
            : `
                <button onclick="verDetalhes(${s.solicitacao_id}, '${s.tipo}')">
                  Analisar
                </button>

                <button onclick="abrirHistorico(${s.solicitacao_id}, '${s.tipo}')">
                  Histórico
                </button>

                ${podeEnviarSOC
                ? `
                    <button type="button" onclick="enviarSOC(${s.solicitacao_id})">
                      Enviar SOC
                    </button>
                  `
                : ""
                }

                ${["PENDENTE_UNIDADE", "PENDENTE_SC", "PENDENTE_CREDENCIAMENTO", "PENDENTE", "PENDENTE_REAVALIACAO"].includes(s.status)
                ? `
                    <button onclick="cancelarSolicitacao(${s.solicitacao_id}, '${s.tipo}', ${usuarioLogado.id})">
                      Cancelar
                    </button>
                    `
                : ""
                }
              `
            }
            </div>
          </td>
        `;

      tbody.appendChild(tr);
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

// LIBERAR O LOCK AO ATUALIZAR A PAGINA
window.addEventListener("beforeunload", function () {
  if (solicitacaoAtualId && tipoSolicitacaoAtual) {
    navigator.sendBeacon(
      `/solicitacoes/${tipoSolicitacaoAtual}/${solicitacaoAtualId}/finalizar-analise`,
      new Blob(
        [JSON.stringify({ usuario_id: usuarioLogado.id })],
        { type: "application/json" }
      )
    );
  }
});

// FUNÇÃO PARA VER DETALHES
async function verDetalhes(id, tipo) {
  solicitacaoAtualId = id;
  tipoSolicitacaoAtual = tipo;

  try {
    // INICIAR LOCK PARA SOLICITAÇÃO EM ANÁLISE
    const lockRes = await fetch(`/solicitacoes/${tipo}/${id}/iniciar-analise`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuarioLogado.id })
      }
    );

    const lockData = await lockRes.json();

    if (!lockRes.ok || !lockData.sucesso) {
      notify.error(lockData.erro || "Esta solicitação já está em análise");
      return;
    }

    const url =
      tipo === "NOVO_EXAME"
        ? `/api/solicitacoes/novo-exame/${id}`
        : `/api/solicitacoes/novo-cadastro/${id}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error();

    const { dados } = await res.json();

    preencherModal(dados, tipo);

    const modalId =
      tipo === "NOVO_EXAME"
        ? "modalDetalhesNovoExame"
        : "modalDetalhesNovoCadastro";

    const modalElement = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    // QUANDO MODAL ABRIR
    modalElement.addEventListener(
      "shown.bs.modal",
      () => {
        const textarea = getObservacaoConsultaAtual();
        if (textarea) textarea.value = dados.observacao_consulta || "";

        marcarTipoConsultaSalvo(dados.tipo_consulta, tipo);
      },
      { once: true }
    );

    // LIBERAR LOCK QUANDO MODAL FECHAR
    modalElement.addEventListener(
      "hidden.bs.modal",
      async () => {
        await fetch(`/solicitacoes/${tipo}/${id}/finalizar-analise`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario_id: usuarioLogado.id })
          }
        );

        solicitacaoAtualId = null;
        tipoSolicitacaoAtual = null;
      },
      { once: true }
    );
  } catch (erro) {
    console.error(erro);
  }
}

// FUNÇÃO PARA PREENCHER O MODAL
async function preencherModal(s, tipo) {
  window.statusAtualSolicitacao = s.status;
  window.empresaAtual = s.cod_empresa;
  window.unidadeAtual = s.cod_unidade;

  const tipoFaturamento = s.tipo_faturamento;

  let emails = s.solicitado_por_email;

  if (s.emails_extras && s.emails_extras.length > 0) {
    emails += "; " + s.emails_extras.join("; ");
  }

  if (tipo === "NOVO_CADASTRO") {
    window.flagsSolicitacao = {
      solicitar_novo_setor: s.solicitar_novo_setor,
      solicitar_novo_cargo: s.solicitar_novo_cargo,
      solicitar_credenciamento: s.solicitar_credenciamento,
    };

    // INFERIR ETAPA ANTERIOR
    if (s.status === "PENDENTE_REAVALIACAO") {
      const precisaUnidade = s.solicitar_nova_unidade && !s.cod_unidade;
      const precisaSC = (s.solicitar_novo_setor && !s.cod_setor) || (s.solicitar_novo_cargo && !s.cod_cargo);
      const precisaCredenciamento = s.solicitar_credenciamento && !s.nome_clinica;

      if (precisaUnidade) {
        window.etapaAnteriorReavaliacao = "PENDENTE_UNIDADE";
      } else if (precisaSC) {
        window.etapaAnteriorReavaliacao = "PENDENTE_SC";
      } else if (precisaCredenciamento) {
        window.etapaAnteriorReavaliacao = "PENDENTE_CREDENCIAMENTO";
      } else {
        window.etapaAnteriorReavaliacao = null;
      }
    } else {
      window.etapaAnteriorReavaliacao = null;
    }

    document.getElementById("cadastro_solicitacao_id").innerHTML = `${s.solicitacao_id}`;

    document.getElementById("cadastro_solicitado_por_email").innerText = emails;

    document.getElementById("cadastro_nome_funcionario").innerText = s.nome_funcionario;
    document.getElementById("cadastro_data_nascimento").innerText = formatarData(s.data_nascimento);
    document.getElementById("cadastro_sexo").innerText = s.sexo;
    document.getElementById("cadastro_estado_civil").innerText = s.estado_civil;
    document.getElementById("cadastro_doc_identidade").innerText = s.doc_identidade || "-";
    document.getElementById("cadastro_cpf").innerText = s.cpf;
    document.getElementById("cadastro_matricula").innerText = s.matricula || "NÃO POSSUI MATRÍCULA";
    document.getElementById("cadastro_data_admissao").innerText = formatarData(s.data_admissao);
    document.getElementById("cadastro_tipo_contratacao").innerText = s.tipo_contratacao;
    document.getElementById("cadastro_regime_trabalho").innerText = s.regime_trabalho;
    document.getElementById("cadastro_nome_empresa").innerText = s.nome_empresa;
    document.getElementById("cadastro_nome_unidade").innerText = s.nome_unidade;
    document.getElementById("cadastro_nome_fantasia").innerText = s.nome_fantasia;
    document.getElementById("cadastro_razao_social").innerText = s.razao_social;
    document.getElementById("cadastro_cnpj").innerText = s.cnpj;
    document.getElementById("cadastro_cnae").innerText = s.cnae;
    document.getElementById("cadastro_cep").innerText = s.cep;
    document.getElementById("cadastro_rua").innerText = s.rua;
    document.getElementById("cadastro_numero").innerText = s.numero;
    document.getElementById("cadastro_bairro").innerText = s.bairro;
    document.getElementById("cadastro_estado").innerText = s.estado;

    if (tipoFaturamento === "JUNTO") {
      document.getElementById("faturamento_junto").checked = true;
    } else if (tipoFaturamento === "SEPARADO") {
      document.getElementById("faturamento_separado").checked = true;
    }

    document.getElementById("cadastro_email").innerText = s.email;
    document.getElementById("cadastro_nome_setor").innerText = s.nome_setor || "-";
    document.getElementById("cadastro_novo_setor").innerText = s.nome_novo_setor;
    document.getElementById("cadastro_nome_cargo").innerText = s.nome_cargo || "-";
    document.getElementById("cadastro_novo_cargo").innerText = s.nome_novo_cargo;
    document.getElementById("cadastro_descricao_atividade").innerText = s.descricao_atividade;
    document.getElementById("cadastro_rac").innerText = formatarRac(s.rac) || "-";
    document.getElementById("cadastro_tipos_rac").innerText = formatarTiposRac(s.tipos_rac);
    document.getElementById("cadastro_tipo_exame").innerText = s.tipo_exame;
    document.getElementById("cadastro_data_exame").innerText = formatarData(s.data_exame);
    document.getElementById("cadastro_nova_data_exame").innerText = formatarData(s.nova_data_exame);
    preencherMaisUnidades(s);
    document.getElementById("cadastro_cnh").innerText = s.cnh || "-";
    document.getElementById("cadastro_vencimento_cnh").innerText = formatarData(s.vencimento_cnh) || "-";
    document.getElementById("cadastro_lab_toxicologico").innerText = s.lab_toxicologico || "-";
    document.getElementById("cadastro_estado_clinica").innerText = s.estado_clinica;
    document.getElementById("cadastro_cidade_clinica").innerText = s.cidade_clinica;
    document.getElementById("cadastro_nome_clinica").innerText = s.nome_clinica;
    document.getElementById("cadastro_estado_credenciamento").innerText = s.estado_credenciamento;
    document.getElementById("cadastro_cidade_credenciamento").innerText = s.cidade_credenciamento;
    document.getElementById("cadastro_observacao_credenciamento").innerText = s.observacao_credenciamento || "-";
    document.getElementById("cadastro_observacao").innerText = s.observacao || "-";

    // MOSTRAR / ESCONDER BLOCO DE NOVA UNIDADE
    const blocoNovaUnidade = [
      "divNomeFantasia",
      "divRazaoSocial",
      "divCnpj",
      "divCnae",
      "divCep",
      "divRua",
      "divNumero",
      "divBairro",
      "divEstado",
      "divFaturamentoJunto",
      "divFaturamentoSeparado",
      "divEmail"
    ];

    blocoNovaUnidade.forEach(id => {
      const el = document.getElementById(id);
      el.classList.toggle("d-none", !s.solicitar_nova_unidade);
    });

    // TRANSFORMAR O CAMPO DE UNIDADE EM SELECT CASO PRECISE CRIAR UMA NOVA
    const spanUnidade = document.getElementById("cadastro_nome_unidade");
    const selectUnidade = document.getElementById("unidadeSelect");

    if (s.solicitar_nova_unidade === true) {
      spanUnidade.style.display = "none";
      selectUnidade.style.display = "block";

      carregarUnidades(s.cod_empresa, s.nome_unidade);
    } else {
      spanUnidade.style.display = "block";
      selectUnidade.style.display = "none";
    }

    // MOSTRAR / ESCONDER BLOCO DE NOVO SETOR / NOVO CARGO / DESCRIÇÃO ATIVIDADE
    const blocoNovoSetor = document.getElementById("blocoCadNovoSetor");
    const blocoNovoCargo = document.getElementById("blocoCadNovoCargo");
    const blocoDescricaoAtividade = document.getElementById("blocoCadDescricaoAtividade");

    if (s.solicitar_novo_setor === true) {
      blocoNovoSetor.classList.remove("d-none");
    } else {
      blocoNovoSetor.classList.add("d-none");
    }

    if (s.solicitar_novo_cargo === true) {
      blocoNovoCargo.classList.remove("d-none");
    } else {
      blocoNovoCargo.classList.add("d-none");
    }

    if (s.solicitar_novo_cargo === true) {
      blocoDescricaoAtividade.classList.remove("d-none");
    } else {
      blocoDescricaoAtividade.classList.add("d-none");
    }

    // OCULTAR CAMPO DE NOVA DATA EXAME SE ESTIVER VAZIA
    const blocoNovaData = document.getElementById("divNovaData");

    if (!s.nova_data_exame) {
      blocoNovaData.classList.add("d-none");
    } else {
      blocoNovaData.classList.remove("d-none");
    }

    // TRANSFORMAR O CAMPO DE SETOR DO FUNCIONÁRIO EM SELECT CASO PRECISE CRIAR UM NOVO PARA SER SELECIONADO APÓS CRIADO 
    const spanSetor = document.getElementById("cadastro_nome_setor");
    const selectSetor = document.getElementById("setorSelect");

    if (s.solicitar_novo_setor) {
      spanSetor.style.display = "none";
      selectSetor.style.display = "block";

      // POPULAR O SELECT COM OS SETORES DA UNIDADE DA EMPRESA DA SOLICITAÇÃO
      carregarSetores(s.cod_empresa, s.cod_unidade, s.nome_setor, "setorSelect");
    } else {
      spanSetor.style.display = "block";
      selectSetor.style.display = "none";
    }

    // TRANSFORMAR O CAMPO DE CARGO DO FUNCIONÁRIO EM SELECT CASO PRECISE CRIAR UM NOVO PARA SER SELECIONADO APÓS CRIADO
    const spanCargo = document.getElementById("cadastro_nome_cargo");
    const selectCargo = document.getElementById("cargoSelect");

    if (s.solicitar_novo_cargo) {
      spanCargo.style.display = "none";
      selectCargo.style.display = "block";

      if (s.cod_setor) {
        carregarCargosDoSetorSelecionado(s.cod_empresa, s.cod_unidade, s.cod_setor, s.nome_cargo, "cargoSelect");
      }

    } else {
      spanCargo.style.display = "block";
      selectCargo.style.display = "none";
    }

    // MOSTRAR / ESCONDER BLOCO DE NOVO CREDENCIAMENTO
    const blocoEstadoClinica = document.getElementById("divEstadoClinica");
    const blocoCidadeClinica = document.getElementById("divCidadeClinica");
    const blocoNomeClinica = document.getElementById("divNomeClinica");

    const blocoEstadoCredenciamento = document.getElementById("divEstadoCredenciamento");
    const blocoCidadeCredenciamento = document.getElementById("divCidadeCredenciamento");
    const blocoObservacaoCredenciamento = document.getElementById("divObservacaoCredenciamento");

    if (s.solicitar_credenciamento === true) {
      blocoEstadoClinica.classList.add("d-none");
      blocoCidadeClinica.classList.add("d-none");

      // MOSTRA CAMPOS DE CREDENCIAMENTO
      blocoEstadoCredenciamento.classList.remove("d-none");
      blocoCidadeCredenciamento.classList.remove("d-none");
      blocoNomeClinica.classList.remove("d-none");
      blocoObservacaoCredenciamento.classList.remove("d-none");

      document.getElementById("cadastro_estado_credenciamento").innerText = s.estado_credenciamento || "-";
      document.getElementById("cadastro_cidade_credenciamento").innerText = s.cidade_credenciamento || "-";
      document.getElementById("cadastro_observacao_credenciamento").innerText = s.observacao_credenciamento || "-";
    } else {
      blocoEstadoClinica.classList.remove("d-none");
      blocoCidadeClinica.classList.remove("d-none");
      blocoNomeClinica.classList.remove("d-none");

      // ESCONDE CREDENCIAMENTO
      blocoEstadoCredenciamento.classList.add("d-none");
      blocoCidadeCredenciamento.classList.add("d-none");
      blocoObservacaoCredenciamento.classList.add("d-none");

      document.getElementById("cadastro_estado_clinica").innerText = s.estado_clinica || "-";
      document.getElementById("cadastro_cidade_clinica").innerText = s.cidade_clinica || "-";
    }

    // TRANSFORMAR O CAMPO DE NOME DA CLINICA EM SELECT CASO PRECISE CRIAR UM NOVO CREDENCIAMENTO PARA SER SELECIONADO APÓS CRIADO
    const spanClinica = document.getElementById("cadastro_nome_clinica");
    const selectClinica = document.getElementById("clinicaSelect");

    if (s.solicitar_credenciamento === true) {
      spanClinica.style.display = "none";

      selectClinica.classList.remove("d-none");
      selectClinica.style.display = "block";

      carregarPrestadoresPreferenciais(
        s.cod_empresa,
        "clinicaSelect",
        spanClinica.innerText
      );
    } else {
      spanClinica.style.display = "block";

      selectClinica.classList.add("d-none");
      selectClinica.style.display = "none";
    }
  }

  if (tipo === "NOVO_EXAME") {
    window.flagsSolicitacao = {
      solicitar_novo_setor: s.solicitar_novo_setor,
      solicitar_nova_funcao: s.solicitar_nova_funcao,
      solicitar_credenciamento: s.solicitar_credenciamento,
    };

    // INFERIR ETAPA ANTERIOR PELOS CAMPOS AINDA NULOS + FLAGS
    if (s.status === "PENDENTE_REAVALIACAO") {
      const precisaUnidade = s.solicitar_nova_unidade && !s.unidade_destino;
      const precisaSC = (s.solicitar_nova_funcao && !s.funcao_destino) || (s.solicitar_novo_setor && !s.setor_destino);
      const precisaCredenciamento = s.solicitar_credenciamento && !s.nome_clinica;

      if (precisaUnidade) {
        window.etapaAnteriorReavaliacao = "PENDENTE_UNIDADE";
      } else if (precisaSC) {
        window.etapaAnteriorReavaliacao = "PENDENTE_SC";
      } else if (precisaCredenciamento) {
        window.etapaAnteriorReavaliacao = "PENDENTE_CREDENCIAMENTO";
      } else {
        window.etapaAnteriorReavaliacao = null;
      }
    } else {
      window.etapaAnteriorReavaliacao = null;
    }

    document.getElementById("exame_solicitacao_id").innerHTML = `${s.solicitacao_id}`;

    document.getElementById("exame_solicitado_por_email").innerText = emails;

    document.getElementById("exame_nome_funcionario").innerText = s.nome_funcionario;
    document.getElementById("exame_data_nascimento").innerText = formatarData(s.data_nascimento);
    document.getElementById("exame_cpf").innerText = s.cpf;
    document.getElementById("exame_matricula").innerText = s.matricula || "NÃO POSSUI MATRÍCULA";
    document.getElementById("exame_data_admissao").innerText = formatarData(s.data_admissao);
    document.getElementById("exame_nome_empresa").innerText = s.nome_empresa;
    document.getElementById("exame_nome_unidade").innerText = s.nome_unidade;
    document.getElementById("exame_nome_setor").innerText = s.nome_setor;
    document.getElementById("exame_nome_cargo").innerText = s.nome_cargo;
    document.getElementById("exame_rac").innerText = formatarRac(s.rac) || "-";
    document.getElementById("exame_tipos_rac").innerText = formatarTiposRac(s.tipos_rac);
    document.getElementById("exame_tipo_exame").innerText = formatarTipoExame(s.tipo_exame);
    document.getElementById("exame_data_exame").innerText = formatarData(s.data_exame);
    document.getElementById("exame_nova_data_exame").innerText = formatarData(s.nova_data_exame);
    preencherMaisUnidadesExame(s);
    document.getElementById("exame_unidade_destino").innerText = s.unidade_destino || "-";
    document.getElementById("exame_nome_fantasia").innerText = s.nome_fantasia;
    document.getElementById("exame_razao_social").innerText = s.razao_social;
    document.getElementById("exame_cnpj").innerText = s.cnpj;
    document.getElementById("exame_cnae").innerText = s.cnae;
    document.getElementById("exame_cep").innerText = s.cep;
    document.getElementById("exame_rua").innerText = s.rua;
    document.getElementById("exame_numero").innerText = s.numero;
    document.getElementById("exame_bairro").innerText = s.bairro;
    document.getElementById("exame_estado").innerText = s.estado;

    if (tipoFaturamento === "JUNTO") {
      document.getElementById("exame_faturamento_junto").checked = true;
    } else if (tipoFaturamento === "SEPARADO") {
      document.getElementById("exame_faturamento_separado").checked = true;
    }

    document.getElementById("exame_email").innerText = s.email;
    document.getElementById("exameFuncaoDestino").innerText = s.funcao_destino;
    document.getElementById("exameNovaFuncao").innerText = s.nome_nova_funcao;
    document.getElementById("exame_descricao_atividade").innerText = s.descricao_atividade;
    document.getElementById("exameSetorDestino").innerText = s.setor_destino;
    document.getElementById("exameNovoSetor").innerText = s.nome_novo_setor;
    document.getElementById("exame_motivo_consulta").innerText = s.motivo_consulta;
    document.getElementById("exame_cnh").innerText = s.cnh || "-";
    document.getElementById("exame_vencimento_cnh").innerText = formatarData(s.vencimento_cnh) || "-";
    document.getElementById("exame_lab_toxicologico").innerText = s.lab_toxicologico || "-";
    document.getElementById("exame_estado_clinica").innerText = s.estado_clinica;
    document.getElementById("exame_cidade_clinica").innerText = s.cidade_clinica;
    document.getElementById("exame_nome_clinica").innerText = s.nome_clinica;
    document.getElementById("exame_estado_credenciamento").innerText = s.estado_credenciamento;
    document.getElementById("exame_cidade_credenciamento").innerText = s.cidade_credenciamento;
    document.getElementById("exame_observacao_credenciamento").innerText = s.observacao_credenciamento || "-";
    document.getElementById("exame_observacao").innerText = s.observacao || "-";

    // MOSTRAR / ESCONDER BLOCO DE NOVA UNIDADE
    const blocoNovaUnidade = [
      "divExameNomeFantasia",
      "divExameRazaoSocial",
      "divExameCnpj",
      "divExameCnae",
      "divExameCep",
      "divExameRua",
      "divExameNumero",
      "divExameBairro",
      "divExameEstado",
      "divExameFaturamentoJunto",
      "divExameFaturamentoSeparado",
      "divExameEmail"
    ];

    blocoNovaUnidade.forEach(id => {
      const el = document.getElementById(id);
      el.classList.toggle("d-none", !s.solicitar_nova_unidade);
    });

    // OCULTAR CAMPO DE NOVA DATA EXAME SE ESTIVER VAZIA
    const blocoNovaData = document.getElementById("divExameNovaData");

    if (!s.nova_data_exame) {
      blocoNovaData.classList.add("d-none");
    } else {
      blocoNovaData.classList.remove("d-none");
    }

    // MOSTRAR / OCULTAR SEÇÃO DE MUDANÇA DE RISCOS OCUPACIONAIS
    const divUnidadeDestino = document.getElementById("divExameUnidadeDestino");

    // ESCONDER UNIDADE DESTINO SE NÃO EXISTIR
    if ((!s.unidade_destino || s.unidade_destino.trim() === "") && !s.solicitar_nova_unidade) {
      divUnidadeDestino?.classList.add("d-none");
    } else {
      divUnidadeDestino?.classList.remove("d-none");
    }

    const blocosMudancaRisco = [
      "blocoExameSetorDestino",
      "blocoExameNovoSetor",
      "blocoFuncaoDestino",
      "blocoExameNovaFuncao",
      "blocoExameDescricaoAtividade"
    ];

    if (s.tipo_exame === "MUDANCA_RISCOS_OCUPACIONAIS") {
      // MOSTRAR TUDO
      blocosMudancaRisco.forEach(id => { document.getElementById(id)?.classList.remove("d-none"); });

      document.getElementById("exameSetorDestino").innerText = s.setor_destino || "-";
      document.getElementById("exameNovoSetor").innerText = s.nome_novo_setor || "-";
      document.getElementById("exameFuncaoDestino").innerText = s.funcao_destino || "-";
      document.getElementById("exameNovaFuncao").innerText = s.nome_nova_funcao || "-";
      document.getElementById("exame_descricao_atividade").innerText = s.descricao_atividade || "-";

      // ESCONDER UNIDADE DESTINO SE NÃO FOI SOLICITADO
      if (!s.solicitar_nova_unidade) {
        document.getElementById("blocoExameNovoSetor")?.classList.add("d-none");
      } else {
        document.getElementById("blocoExameNovoSetor")?.classList.remove("d-none");
      }

      if ((!s.unidade_destino || s.unidade_destino.trim() === "") && !s.solicitar_nova_unidade) {
        divUnidadeDestino?.classList.add("d-none");
      } else {
        divUnidadeDestino?.classList.remove("d-none");
      }

      // ESCONDER NOVO SETOR SE NÃO FOI SOLICITADO
      if (!s.solicitar_novo_setor) {
        document.getElementById("blocoExameNovoSetor")?.classList.add("d-none");
      } else {
        document.getElementById("blocoExameNovoSetor")?.classList.remove("d-none");
      }

      // ESCONDER NOVA FUNÇÃO SE NÃO FOI SOLICITADO
      if (s.solicitar_nova_funcao === false && s.solicitar_novo_setor === false) {
        document.getElementById("blocoExameNovoSetor")?.classList.add("d-none");
        document.getElementById("blocoExameNovaFuncao")?.classList.add("d-none");
        document.getElementById("blocoExameDescricaoAtividade")?.classList.add("d-none");
      }

    } else {
      // ESCONDER TUDO
      blocosMudancaRisco.forEach(id => { document.getElementById(id)?.classList.add("d-none"); });
    }

    // 🔵 RESETAR UNIDADE DESTINO AO ABRIR A SOLICITAÇÃO
    if (!s.unidade_destino || s.unidade_destino.trim() === "") {
      window.unidadeDestinoCodigo = null;
    }

    // salvar unidade original da solicitação
    window.codUnidadeSolicitacao = s.cod_unidade;

    // TRANSFORMAR O CAMPO DE UNIDADE DESTINO EM SELECT CASO PRECISE CRIAR UMA NOVA UNIDADE PARA SER SELECIONADA APÓS CRIADA
    const spanUnidadeDestino = document.getElementById("exame_unidade_destino");
    const selectUnidadeDestino = document.getElementById("unidadeDestinoSelect");

    if (s.solicitar_nova_unidade === true) {

      spanUnidadeDestino.style.display = "none";

      selectUnidadeDestino.classList.remove("d-none");
      selectUnidadeDestino.style.display = "block";

      carregarUnidadesNovoExame(s.cod_empresa, s.unidade_destino);

    } else {

      spanUnidadeDestino.style.display = "block";

      selectUnidadeDestino.classList.add("d-none");
      selectUnidadeDestino.style.display = "none";

    }

    if (s.unidade_destino && s.setor_destino) {
      const codigoUnidade = await obterCodigoUnidadePorNome(
        s.cod_empresa,
        s.unidade_destino
      );

      window.unidadeDestinoCodigo = codigoUnidade;

      const codigoSetor = await obterCodigoSetorPorNome(
        s.cod_empresa,
        codigoUnidade,
        s.setor_destino
      );

      if (codigoSetor) {

        await carregarCargosDoSetorSelecionado(
          s.cod_empresa,
          codigoUnidade,
          codigoSetor,
          s.funcao_destino || "",
          "exameFuncaoDestinoSelect"
        );

      } else {
        console.warn("SETOR NÃO ENCONTRADO NA UNIDADE");
      }
    }

    // TRANSFORMAR O CAMPO DE SETOR DESTINO EM SELECT CASO PRECISE CRIAR UM NOVO PARA SER SELECIONADO APÓS CRIADO 
    const spanSetorDestino = document.getElementById("exameSetorDestino");
    const selectSetorDestino = document.getElementById("exameSetorDestinoSelect");

    if (s.solicitar_novo_setor) {
      spanSetorDestino.style.display = "none";
      selectSetorDestino.style.display = "block";

      // POPULAR O SELECT COM OS SETORES DA UNIDADE DA EMPRESA DA SOLICITAÇÃO
      let unidadeParaBuscar = s.cod_unidade;

      if (s.unidade_destino && s.unidade_destino.trim() !== "") {

        unidadeParaBuscar = await obterCodigoUnidadePorNome(
          s.cod_empresa,
          s.unidade_destino
        );

        window.unidadeDestinoCodigo = unidadeParaBuscar;
      }

      carregarSetores(
        s.cod_empresa,
        unidadeParaBuscar,
        s.setor_destino,
        "exameSetorDestinoSelect"
      );
    } else {
      spanSetorDestino.style.display = "block";
      selectSetorDestino.style.display = "none";
    }

    // TRANSFORMAR O CAMPO DE FUNÇÃO DESTINO EM SELECT CASO PRECISE CRIAR UM NOVO PARA SER SELECIONADO APÓS CRIADO 
    const spanFuncaoDestino = document.getElementById("exameFuncaoDestino");
    const selectFuncaoDestino = document.getElementById("exameFuncaoDestinoSelect");

    if (s.solicitar_nova_funcao === true) {

      spanFuncaoDestino.style.display = "none";
      selectFuncaoDestino.style.display = "block";

      let codigoSetor = null;

      // Se o setor atual já veio preenchido, busca o código dele
      if (s.setor_destino && s.setor_destino.trim() !== "") {
        codigoSetor = await obterCodigoSetorPorNome(
          s.cod_empresa,
          window.unidadeDestinoCodigo,
          s.setor_destino
        );
      }

      // Carrega os cargos do setor encontrado (ou do setor default se codigoSetor for null)
      if (codigoSetor) {
        await carregarCargosDoSetorSelecionado(
          s.cod_empresa,
          window.unidadeDestinoCodigo,
          codigoSetor,
          s.funcao_destino,
          "exameFuncaoDestinoSelect"
        );
      }

    } else {
      spanFuncaoDestino.style.display = "block";
      selectFuncaoDestino.style.display = "none";
    }

    // TRANSFORMAR O CAMPO DE NOME DA CLINICA EM SELECT CASO PRECISE CRIAR UM NOVO CREDENCIAMENTO PARA SER SELECIONADO APÓS CRIADO
    const spanClinica = document.getElementById("exame_nome_clinica");
    const selectClinica = document.getElementById("clinicaExameSelect");

    if (s.solicitar_credenciamento === true) {
      spanClinica.style.display = "none";

      selectClinica.classList.remove("d-none");
      selectClinica.style.display = "block";

      carregarPrestadoresPreferenciais(
        s.cod_empresa,
        "clinicaExameSelect",
        spanClinica.innerText
      );

    } else {
      spanClinica.style.display = "block";

      selectClinica.classList.add("d-none");
      selectClinica.style.display = "none";
    }

    // MOSTRAR / ESCONDER TEXTAREA DE MOTIVO DA CONSULTA
    const blocoMotivoConsulta = document.getElementById("divMotivoConsulta");

    if (s.tipo_exame === "CONSULTA_ASSISTENCIAL") {
      blocoMotivoConsulta.classList.remove("d-none");
    } else {
      blocoMotivoConsulta.classList.add("d-none");
    }

    // MOSTRAR / ESCONDER BLOCO DE NOVO CREDENCIAMENTO
    const blocoEstadoClinica = document.getElementById("divExameEstadoClinica");
    const blocoCidadeClinica = document.getElementById("divExameCidadeClinica");
    const blocoNomeClinica = document.getElementById("divExameNomeClinica");

    const blocoEstadoCredenciamento = document.getElementById("divExameEstadoCredenciamento");
    const blocoCidadeCredenciamento = document.getElementById("divExameCidadeCredenciamento");
    const blocoObservacaoCredenciamento = document.getElementById("divExameObservacaoCredenciamento");

    if (s.solicitar_credenciamento === true) {
      blocoEstadoClinica.classList.add("d-none");
      blocoCidadeClinica.classList.add("d-none");

      // MOSTRA CAMPOS DE CREDENCIAMENTO
      blocoEstadoCredenciamento.classList.remove("d-none");
      blocoCidadeCredenciamento.classList.remove("d-none");
      blocoNomeClinica.classList.remove("d-none");
      blocoObservacaoCredenciamento.classList.remove("d-none");

      document.getElementById("exame_estado_credenciamento").innerText = s.estado_credenciamento || "-";
      document.getElementById("exame_cidade_credenciamento").innerText = s.cidade_credenciamento || "-";
      document.getElementById("exame_observacao_credenciamento").innerText = s.observacao_credenciamento || "-";
    } else {
      blocoEstadoClinica.classList.remove("d-none");
      blocoCidadeClinica.classList.remove("d-none");
      blocoNomeClinica.classList.remove("d-none");

      // ESCONDE CREDENCIAMENTO
      blocoEstadoCredenciamento.classList.add("d-none");
      blocoCidadeCredenciamento.classList.add("d-none");
      blocoObservacaoCredenciamento.classList.add("d-none");

      document.getElementById("exame_estado_clinica").innerText = s.estado_clinica || "-";
      document.getElementById("exame_cidade_clinica").innerText = s.cidade_clinica || "-";
    }
  }

  // REGRA PARA MOSTRAR/OCULTAR BOTÃO DE SALVAR E APROVAR
  const botoesSalvar = document.querySelectorAll(".btn-salvar");
  const botoesAprovar = document.querySelectorAll(".btn-aprovar");

  botoesSalvar.forEach(btn => btn.style.display = "none");
  botoesAprovar.forEach(btn => btn.style.display = "none");

  const temEdicao = s.solicitar_nova_unidade || s.solicitar_novo_setor || s.solicitar_novo_cargo || s.solicitar_nova_funcao || s.solicitar_credenciamento;

  // NO PENDENTE_REAVALIACAO, só mostra salvar se tiver etapa anterior identificada
  const reavaliacaoPrecisaSalvar = s.status === "PENDENTE_REAVALIACAO" &&
    temEdicao &&
    window.etapaAnteriorReavaliacao !== null &&
    window.etapaAnteriorReavaliacao !== undefined;

  if (s.status === "PENDENTE_UNIDADE" || s.status === "PENDENTE_SC" ||
    s.status === "PENDENTE_CREDENCIAMENTO" || reavaliacaoPrecisaSalvar) {
    botoesSalvar.forEach(btn => btn.style.display = "inline-flex");
  }

  if (s.status === "PENDENTE" || s.status === "PENDENTE_AGENDAMENTO" ||
    (s.status === "PENDENTE_REAVALIACAO" && !reavaliacaoPrecisaSalvar)) {
    botoesAprovar.forEach(btn => btn.style.display = "inline-flex");
  }

  // REGRA PARA MOSTRAR/OCULTAR BOTÃO DE REPROVAR E MOTIVO REPROVAÇÃO
  const botoesReprovar = document.querySelectorAll(".btn-reprovar");
  const blocosMotivoReprovacao = document.querySelectorAll(".div-motivo-reprovacao");

  if (s.status === 'APROVADO' || s.status === "ENVIADO_SOC" || s.status === "CANCELADO") {
    botoesReprovar.forEach(btn => { btn.style.display = 'none'; });
    blocosMotivoReprovacao.forEach(bloco => { bloco.style.display = 'none'; });

  } else {
    botoesReprovar.forEach(btn => { btn.style.display = 'inline-block'; });
    blocosMotivoReprovacao.forEach(bloco => { bloco.style.display = 'inline-block'; });
  }

  // MOSTRAR MOTIVO DE REPROVAÇÃO NA REAVALIAÇÃO
  const textareaMotivo =
    tipo === "NOVO_EXAME"
      ? document.getElementById("motivoReprovacaoExame")
      : document.getElementById("motivoReprovacaoCadastro");

  if (s.status === "PENDENTE_REAVALIACAO" || s.status === "REPROVADO") {
    textareaMotivo.value = s.motivo_reprovacao || "";
  } else {
    textareaMotivo.value = "";
  }
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

async function obterCodigoUnidadePorNome(codEmpresa, nomeUnidade) {
  const res = await fetch(`/api/unidades/${codEmpresa}`);
  const unidades = await res.json();

  const unidade = unidades.find(u =>
    u.nome.trim().toLowerCase() === nomeUnidade.trim().toLowerCase()
  );

  return unidade ? unidade.codigo : null;
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

// FORMATAR CPF
document.getElementById("filterCPF").addEventListener("input", function () {
  let value = this.value.replace(/\D/g, "");

  if (value.length > 11) value = value.slice(0, 11);

  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  this.value = value;
});

// FUNÇÃO PARA MOSTRAR EMAILS EXTRAS
function preencherEmailsExtras(cadastro) {
  const container = document.getElementById("cadastro_emails_extras");
  const bloco = document.getElementById("bloco_emails_extras");

  container.innerHTML = "";

  if (Array.isArray(cadastro.emails_extras) && cadastro.emails_extras.length > 0) {

    cadastro.emails_extras.forEach(email => {
      const div = document.createElement("div");
      div.classList.add("mb-1");
      div.innerText = email;
      container.appendChild(div);
    });

    bloco?.classList.remove("d-none");

  } else {
    bloco?.classList.add("d-none");
  }
}

// FUNÇÃO PARA POPULAR O SELECT DE UNIDADES NO MODAL (NOVO CADASTRO)
async function carregarUnidades(empresaCodigo, selecionadoNome = "") {
  if (!empresaCodigo) return;

  const select = document.getElementById("unidadeSelect");
  select.innerHTML = '<option value="">-</option>';

  try {
    const res = await fetch(`/api/unidades/${empresaCodigo}`);
    const unidades = await res.json();

    unidades.forEach(u => {
      const opt = document.createElement("option");
      opt.value = u.codigo;
      opt.textContent = u.nome;

      if (u.nome === selecionadoNome) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (erro) {
    console.error(erro);
  }
}

// FUNÇÃO PARA POPULAR O SELECT DE UNIDADES NO MODAL
async function carregarUnidadesNovoExame(empresaCodigo, unidadeSelecionada = "") {
  if (!empresaCodigo) return;

  const select = document.getElementById("unidadeDestinoSelect");
  select.innerHTML = '<option value="">-</option>';

  try {
    const res = await fetch(`/api/unidades/${empresaCodigo}`);
    const unidades = await res.json();

    unidades.forEach(u => {
      const opt = document.createElement("option");
      opt.value = u.codigo;
      opt.textContent = u.nome;

      if (u.nome === unidadeSelecionada) {
        opt.selected = true;
      }

      select.appendChild(opt);
    });

  } catch (erro) {
    console.error(erro);
  }
}

// BUSCAR CODIGO DO SETOR PELO NOME CASO ESSE CAMPO JÁ VENHA PREENCHIDO
async function obterCodigoSetorPorNome(codEmpresa, codUnidade, nomeSetor) {
  const res = await fetch(`/api/hierarquia/${codEmpresa}/${codUnidade}`);

  const setores = await res.json();

  const setor = setores.find(s =>
    (s.nomeSetor || "").trim().toLowerCase() ===
    nomeSetor.trim().toLowerCase()
  );

  return setor ? setor.codigoSetor : null;
}

// FUNÇÃO PARA CARREGAR OS SETORES DA UNIDADE DA EMPRESA DA SOLICITAÇÃO NO SELECT
async function carregarSetores(empresaCodigo, unidadeCodigo, setorSelecionado = "", selectId = "") {
  const select = document.getElementById(selectId);

  select.innerHTML = '<option value="">-</option>';

  try {
    const res = await fetch(`/api/hierarquia/${empresaCodigo}/${unidadeCodigo}`);
    const data = await res.json();

    hierarquiaAtual = data;

    hierarquiaAtual.forEach(setor => {
      const option = document.createElement("option");

      option.value = setor.codigoSetor;
      option.textContent = setor.nomeSetor;

      if (setor.nomeSetor === setorSelecionado)
        option.selected = true;

      select.appendChild(option);
    });
  }
  catch (erro) {
    console.error(erro);
  }
}

// LISTENER DE SELECIONAR O SETOR (NOVO CADASTRO)
document.getElementById("setorSelect").addEventListener("change", function () {
  const setorCodigo = this.value;

  if (!setorCodigo) return;

  carregarCargosDoSetorSelecionado(
    window.empresaAtual,
    window.unidadeAtual,
    setorCodigo,
    "",
    "cargoSelect"
  );
});

// FUNÇÃO PARA CARREGAR OS CARGOS DOS SETORES DA UNIDADE DA SOLICITAÇÃO NO SELECT
async function carregarCargosDoSetorSelecionado(
  empresaCodigo,
  unidadeCodigo,
  setorCodigo,
  cargoSelecionado = "",
  selectId = "cargoSelect"
) {

  const selectCargo = document.getElementById(selectId);

  if (!selectCargo) {
    return;
  }

  selectCargo.innerHTML = '<option value="">-</option>';

  try {
    const response = await fetch(`/api/hierarquia/${empresaCodigo}/${unidadeCodigo}/${setorCodigo}`);

    const cargos = await response.json();

    cargos.forEach(cargo => {

      const option = document.createElement("option");

      option.value = cargo.codigoCargo;
      option.textContent = cargo.nomeCargo;

      if (cargo.nomeCargo === cargoSelecionado)
        option.selected = true;

      selectCargo.appendChild(option);
    });
  } catch (erro) {
    console.error(erro);
  }
}

// LISTENER DE SELECIONAR O SETOR DESTINO (NOVO EXAME)
document.getElementById("exameSetorDestinoSelect").addEventListener("change", function () {
  const setorCodigo = this.value;

  if (!setorCodigo) return;

  // usa unidade destino se existir, senão usa unidade da solicitação
  let unidadeCodigo = window.unidadeDestinoCodigo || window.codUnidadeSolicitacao;

  carregarCargosDoSetorSelecionado(
    window.empresaAtual,
    unidadeCodigo,
    setorCodigo,
    "",
    "exameFuncaoDestinoSelect"
  );
});

// FUNÇÃO PARA POPULAR O SELECT DE FUNÇÃO ATUAL NO MODAL DE NOVO EXAME
// async function carregarFuncao(empresaCodigo, selecionadoNome = "") {
//   if (!empresaCodigo) return;

//   const selectFuncaoDestino = document.getElementById("exameFuncaoDestinoSelect");
//   selectFuncaoDestino.innerHTML = '<option value="">-</option>';

//   try {
//     const res = await fetch(`/api/cargos/${empresaCodigo}`);
//     const funcoes = await res.json();

//     funcoes.forEach(c => {
//       const opt = document.createElement("option");
//       opt.value = c.codigo;
//       opt.textContent = c.nome;

//       if (c.nome === selecionadoNome) opt.selected = true;
//       selectFuncaoDestino.appendChild(opt);
//     });
//   } catch (erro) {
//     console.error(erro);
//   }
// }

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
  if (!Array.isArray(tipos) || tipos.length === 0) return "-";

  return tipos
    .map(t => t.replace("RAC_", "RAC "))
    .join(", ");
}

// FUNÇÃO PARA MOSTRAR AS UNIDADES ADICIONAIS CASO TENHA
function preencherMaisUnidades(cadastro) {
  const container = document.getElementById("cadastro_mais_unidades");
  const bloco = document.getElementById("bloco_mais_unidades");

  container.innerHTML = "";

  if (Array.isArray(cadastro.unidades_extras) && cadastro.unidades_extras.length > 0) {

    cadastro.unidades_extras.forEach(u => {
      const div = document.createElement("div");
      div.classList.add("mb-1");
      div.innerText = `${u.nome_unidade}`;
      container.appendChild(div);
    });

    bloco?.classList.remove("d-none");

  } else {
    bloco?.classList.add("d-none");
  }
}

// BLOCO PARA MOSTRAR AS UNIDADES EXTRAS
function preencherMaisUnidadesExame(exame) {
  const container = document.getElementById("exame_mais_unidades");
  const bloco = document.getElementById("bloco_exame_mais_unidades");

  container.innerHTML = "";

  if (Array.isArray(exame.unidades_extras) && exame.unidades_extras.length > 0) {

    exame.unidades_extras.forEach(u => {
      const div = document.createElement("div");
      div.innerText = `${u.nome_unidade}`;
      container.appendChild(div);
    });

    bloco.classList.remove("d-none");

  } else {
    
    bloco.classList.add("d-none");
  }
}

// FUNÇÃO PARA CARREGAR AS CLÍNICAS COM CLASSIFICAÇÃO 'PREFERENCIAL' E POPULAR O SELECT
async function carregarPrestadoresPreferenciais(codEmpresa, selectId, clinicaSelecionada = "") {
  if (!codEmpresa) return;

  const select = document.getElementById(selectId);
  if (!select) return;

  const res = await fetch(`/api/prestadores/${codEmpresa}`);
  const prestadores = await res.json();

  select.innerHTML = '<option value="">-</option>';

  for (const p of prestadores) {
    try {
      const detalheRes = await fetch(`/api/prestador/${codEmpresa}/${p.codigo}`);

      if (!detalheRes.ok) {
        console.warn("Erro ao buscar detalhe:", p.codigo);
        continue;
      }

      const detalhe = await detalheRes.json();

      if (!detalhe.nivelClassificacao || detalhe.nivelClassificacao.toUpperCase() !== "PREFERENCIAL") continue;

      const option = document.createElement("option");
      option.value = p.codigo;
      option.textContent = p.nome;

      if (p.nome === clinicaSelecionada)
        option.selected = true;

      select.appendChild(option);
    } catch (erro) {
      console.error(erro);
    }
  }
}

// LISTENER QUANDO SELECIONA O RADIO DE PENDENTE AGENDAMENTO
document.querySelectorAll('input[name="statusConsulta"]').forEach(radio => {
  radio.addEventListener("change", async function () {

    if (this.value !== "PENDENTE_AGENDAMENTO")
      return;

    const confirmar = await modalConfirm("Deseja alterar o status desta solicitação para PENDENTE_AGENDAMENTO?");

    if (!confirmar) {
      this.checked = false;
      return;
    }

    await atualizarStatusParaPendenteAgendamento();
  });
});

// FUNÇÃO PARA ATUALIZAR O STATUS PARA PENDENTE_AGENDAMENTO
async function atualizarStatusParaPendenteAgendamento() {
  if (!solicitacaoAtualId || !tipoSolicitacaoAtual) {
    notify.error("Solicitação não identificada");
    return;
  }

  try {
    const res = await fetch(
      `/solicitacoes/${tipoSolicitacaoAtual}/${solicitacaoAtualId}/status`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PENDENTE_AGENDAMENTO",
          usuario_id: usuarioLogado.id
        })
      }
    );

    const data = await res.json();

    if (!res.ok || !data.sucesso) {
      notify.error(data.erro || "Erro ao atualizar status");
      return;
    }

    const modalAberto = document.querySelector(".modal.show");

    if (modalAberto) {
      const modalInstance = bootstrap.Modal.getInstance(modalAberto);
      modalInstance.hide();
    }

    document
      .querySelectorAll('input[name="statusConsulta"]')
      .forEach(radio => {
        if (radio.value === "PENDENTE_AGENDAMENTO") {
          radio.checked = false;
        }
      });

    carregarSolicitacoes();
  } catch (erro) {
    console.error(erro);
  }
}

// FUNÇÃO PARA PEGAR OS DADOS DO CAMPO DE OBSERVAÇÃO CONSULTA
function getObservacaoConsultaAtual() {
  const isExame = document
    .getElementById("modalDetalhesNovoExame")
    ?.classList.contains("show");

  if (isExame) {
    return document.querySelector("#divObsConsultaExame:not(.d-none) textarea");
  } else {
    return document.querySelector("#divObsConsultaCadastro:not(.d-none) textarea");
  }
}

// FUNÇÃO PARA PREENCHER O CAMPO COM A OBSERVAÇÃO CONSULTA SALVA
function preencherObservacaoConsulta(s) {
  const textarea = document.getElementById("obsConsultaExame");

  if (!textarea) return;

  textarea.value = s.observacao_consulta || "";
}

// SALVAR O TIPO DE CONSULTA SELECIONADO
function getTipoConsultaSelecionado() {
  const isExame = document.getElementById("modalDetalhesNovoExame")?.classList.contains("show");

  const name = isExame
    ? "tipoConsultaExame"
    : "tipoConsultaCadastro";

  const checked = document.querySelector(
    `input[name="${name}"]:checked`
  );

  return checked ? checked.value : null;
}

// MOSTRAR NO MODAL O TIPO DE CONSULTA SALVO
function marcarTipoConsultaSalvo(valor, tipo) {
  const name =
    tipo === "NOVO_EXAME"
      ? "tipoConsultaExame"
      : "tipoConsultaCadastro";

  const radios = document.querySelectorAll(`input[name="${name}"]`);

  radios.forEach(radio => {
    radio.checked = false;

    if (radio.value === valor) {
      radio.checked = true;
    }
  });
}

// FUNÇÃO PARA EDIÇÃO DAS SOLICITAÇÕES DE CADASTRO
function pegarDadosEdicaoCadastro(statusAtual) {
  let payload = {};

  if (statusAtual === "PENDENTE_REAVALIACAO") {
    const etapaAnterior = window.etapaAnteriorReavaliacao;

    if (etapaAnterior === "PENDENTE_UNIDADE") {
      payload = { ...payload, ...edicaoUnidade("PENDENTE_UNIDADE") };
    } else if (etapaAnterior === "PENDENTE_SC") {
      payload = { ...payload, ...edicaoSetorCargo("PENDENTE_SC") };
    } else if (etapaAnterior === "PENDENTE_CREDENCIAMENTO") {
      payload = { ...payload, ...edicaoCredenciamento("PENDENTE_CREDENCIAMENTO") };
    }

    return payload;
  }

  payload = {
    ...payload,
    ...edicaoUnidade(statusAtual),
    ...edicaoSetorCargo(statusAtual),
    ...edicaoCredenciamento(statusAtual),
  };

  return payload;
}

function edicaoUnidade(statusAtual) {
  const payload = {};

  if (statusAtual === "PENDENTE_UNIDADE" || statusAtual === "PENDENTE_REAVALIACAO") {
    const select = document.getElementById("unidadeSelect");

    if (select && select.style.display !== "none" && select.value) {
      const opt = select.options[select.selectedIndex];
      payload.cod_unidade = select.value;
      payload.nome_unidade = opt.textContent;
    }
  }

  return payload;
}

function edicaoSetorCargo(statusAtual) {
  const payload = {};

  if (statusAtual !== "PENDENTE_SC" && statusAtual !== "PENDENTE_REAVALIACAO") return payload;

  const selectSetor = document.getElementById("setorSelect");
  if (selectSetor && selectSetor.style.display !== "none" && selectSetor.value) {
    const opt = selectSetor.options[selectSetor.selectedIndex];
    payload.cod_setor = selectSetor.value;
    payload.nome_setor = opt.textContent;
  }

  const selectCargo = document.getElementById("cargoSelect");
  if (selectCargo && selectCargo.style.display !== "none" && selectCargo.value) {
    const opt = selectCargo.options[selectCargo.selectedIndex];
    payload.cod_cargo = selectCargo.value;
    payload.nome_cargo = opt.textContent;
  }

  return payload;
}

function edicaoCredenciamento(statusAtual) {
  const payload = {};

  if (statusAtual !== "PENDENTE_CREDENCIAMENTO" && statusAtual !== "PENDENTE_REAVALIACAO") return payload;

  const select = document.getElementById("clinicaSelect");

  if (select && select.style.display !== "none" && select.value) {
    const opt = select.options[select.selectedIndex];
    payload.cod_clinica = select.value;
    payload.nome_clinica = opt.textContent;
  }

  return payload;
}

async function salvarEdicaoCadastro() {
  if (!solicitacaoAtualId) {
    notify.error("ID da solicitação não encontrado");
    return;
  }

  const statusAtual = window.statusAtualSolicitacao;
  const flags = window.flagsSolicitacao || {};
  const etapaAnterior = window.etapaAnteriorReavaliacao;

  // VALIDAÇÕES
  if (statusAtual === "PENDENTE_UNIDADE") {
    const select = document.getElementById("unidadeSelect");
    if (!select || !select.value) {
      notify.warning("Selecione a unidade antes de salvar");
      return;
    }
  }

  if (statusAtual === "PENDENTE_SC") {
    if (flags.solicitar_novo_setor) {
      const select = document.getElementById("setorSelect");
      if (!select || !select.value) {
        notify.warning("Selecione o setor antes de salvar");
        return;
      }
    }

    if (flags.solicitar_novo_cargo) {
      const select = document.getElementById("cargoSelect");
      if (!select || !select.value) {
        notify.warning("Selecione o cargo antes de salvar");
        return;
      }
    }
  }

  if (statusAtual === "PENDENTE_CREDENCIAMENTO") {
    const select = document.getElementById("clinicaSelect");
    if (!select || !select.value) {
      notify.warning("Selecione a clínica antes de salvar");
      return;
    }
  }

  if (statusAtual === "PENDENTE_REAVALIACAO") {
    if (etapaAnterior === "PENDENTE_UNIDADE") {
      const select = document.getElementById("unidadeSelect");
      if (!select || !select.value) {
        notify.warning("Selecione a unidade antes de salvar");
        return;
      }
    }

    if (etapaAnterior === "PENDENTE_SC") {
      if (flags.solicitar_novo_setor) {
        const select = document.getElementById("setorSelect");
        if (!select || !select.value) {
          notify.warning("Selecione o setor antes de salvar");
          return;
        }
      }

      if (flags.solicitar_novo_cargo) {
        const select = document.getElementById("cargoSelect");
        if (!select || !select.value) {
          notify.warning("Selecione o cargo antes de salvar");
          return;
        }
      }
    }

    if (etapaAnterior === "PENDENTE_CREDENCIAMENTO") {
      const select = document.getElementById("clinicaSelect");
      if (!select || !select.value) {
        notify.warning("Selecione a clínica antes de salvar");
        return;
      }
    }
  }

  const dadosEdicao = pegarDadosEdicaoCadastro(statusAtual);

  let endpoint = "";

  if (dadosEdicao.cod_unidade) {
    endpoint = `/solicitacoes/novo-cadastro/${solicitacaoAtualId}/salvar-unidade`;
  } else if (dadosEdicao.cod_setor || dadosEdicao.cod_cargo) {
    endpoint = `/solicitacoes/novo-cadastro/${solicitacaoAtualId}/salvar-sc`;
  } else if (dadosEdicao.cod_clinica) {
    endpoint = `/solicitacoes/novo-cadastro/${solicitacaoAtualId}/salvar-credenciamento`;
  }

  if (!endpoint) {
    notify.warning("Nenhuma alteração para salvar");
    return;
  }

  try {
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dadosEdicao)
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error(txt);

      return;
    }

    notify.success("Salvo com sucesso!");
    bootstrap.Modal.getInstance(document.querySelector(".modal.show")).hide();
    carregarSolicitacoes();

  } catch (erro) {
    console.error(erro);
  }
}

// FUNÇÃO PARA EDIÇÃO DAS SOLICITAÇÕES DE EXAME
function pegarDadosEdicaoExame(statusAtual) {
  let payload = {};

  // NO PENDENTE_REAVALIACAO, coleta APENAS os dados da etapa correta
  if (statusAtual === "PENDENTE_REAVALIACAO") {
    const etapaAnterior = window.etapaAnteriorReavaliacao;

    if (etapaAnterior === "PENDENTE_UNIDADE") {
      payload = { ...payload, ...edicaoExameUnidade("PENDENTE_UNIDADE") };
    } else if (etapaAnterior === "PENDENTE_SC") {
      payload = { ...payload, ...edicaoFuncaoSetor("PENDENTE_SC") };
    } else if (etapaAnterior === "PENDENTE_CREDENCIAMENTO") {
      payload = { ...payload, ...edicaoExameCredenciamento("PENDENTE_CREDENCIAMENTO") };
    }

    return payload;
  }

  // NOS OUTROS STATUS, comportamento normal
  payload = {
    ...payload,
    ...edicaoExameUnidade(statusAtual),
    ...edicaoFuncaoSetor(statusAtual),
    ...edicaoExameCredenciamento(statusAtual),
  };

  return payload;
}

function edicaoExameUnidade(statusAtual) {
  const payload = {};

  if (statusAtual === "PENDENTE_UNIDADE" || statusAtual === "PENDENTE_REAVALIACAO") {
    const select = document.getElementById("unidadeDestinoSelect");

    if (select && select.style.display !== "none" && select.value) {
      const opt = select.options[select.selectedIndex];
      payload.unidade_destino = opt.textContent;
    }
  }

  return payload;
}

function edicaoFuncaoSetor(statusAtual) {
  const payload = {};

  if (statusAtual !== "PENDENTE_SC" && statusAtual !== "PENDENTE_REAVALIACAO")
    return payload;

  const selectFuncaoDestino = document.getElementById("exameFuncaoDestinoSelect");
  if (selectFuncaoDestino && selectFuncaoDestino.style.display !== "none" && selectFuncaoDestino.value) {
    const opt = selectFuncaoDestino.options[selectFuncaoDestino.selectedIndex];
    payload.cod_funcao = selectFuncaoDestino.value;
    payload.funcao_destino = opt.textContent;
  }

  const selectSetorDestino = document.getElementById("exameSetorDestinoSelect");
  if (selectSetorDestino && selectSetorDestino.style.display !== "none" && selectSetorDestino.value) {
    const opt = selectSetorDestino.options[selectSetorDestino.selectedIndex];
    payload.cod_setor = selectSetorDestino.value;
    payload.setor_destino = opt.textContent;
  }

  return payload;
}

function edicaoExameCredenciamento(statusAtual) {
  const payload = {};

  if (
    statusAtual !== "PENDENTE_CREDENCIAMENTO" &&
    statusAtual !== "PENDENTE_REAVALIACAO"
  ) return payload;

  const select = document.getElementById("clinicaExameSelect");

  if (select && select.style.display !== "none" && select.value) {
    const opt = select.options[select.selectedIndex];
    payload.cod_clinica = select.value;
    payload.nome_clinica = opt.textContent;
  }

  return payload;
}

async function salvarEdicaoExame() {
  if (!solicitacaoAtualId) {
    notify.error("ID da solicitação não encontrado");
    return;
  }

  const statusAtual = window.statusAtualSolicitacao;
  const flags = window.flagsSolicitacao || {};
  const etapaAnterior = window.etapaAnteriorReavaliacao;

  // VALIDAÇÃO
  if (statusAtual === "PENDENTE_UNIDADE") {
    const select = document.getElementById("unidadeDestinoSelect");
    if (!select || !select.value) {
      notify.warning("Selecione a unidade antes de salvar");
      return;
    }
  }

  if (statusAtual === "PENDENTE_SC") {
    if (flags.solicitar_novo_setor) {
      const select = document.getElementById("exameSetorDestinoSelect");
      if (!select || !select.value) {
        notify.warning("Selecione o setor antes de salvar");
        return;
      }
    }

    if (flags.solicitar_nova_funcao) {
      const select = document.getElementById("exameFuncaoDestinoSelect");
      if (!select || !select.value) {
        notify.warning("Selecione a função antes de salvar");
        return;
      }
    }
  }

  if (statusAtual === "PENDENTE_CREDENCIAMENTO") {
    const select = document.getElementById("clinicaExameSelect");
    if (!select || !select.value) {
      notify.warning("Selecione a clínica antes de salvar");
      return;
    }
  }

  if (statusAtual === "PENDENTE_REAVALIACAO") {
    if (etapaAnterior === "PENDENTE_UNIDADE") {
      const select = document.getElementById("unidadeDestinoSelect");
      if (!select || !select.value) {
        notify.warning("Selecione a unidade antes de salvar");
        return;
      }
    }
    if (etapaAnterior === "PENDENTE_SC") {
      if (flags.solicitar_novo_setor) {
        const select = document.getElementById("exameSetorDestinoSelect");
        if (!select || !select.value) {
          notify.warning("Selecione o setor antes de salvar");
          return;
        }
      }

      if (flags.solicitar_nova_funcao) {
        const select = document.getElementById("exameFuncaoDestinoSelect");
        if (!select || !select.value) {
          notify.warning("Selecione a função antes de salvar");
          return;
        }
      }
    }
    if (etapaAnterior === "PENDENTE_CREDENCIAMENTO") {
      const select = document.getElementById("clinicaExameSelect");
      if (!select || !select.value) {
        notify.warning("Selecione a clínica antes de salvar");
        return;
      }
    }
  }

  const dadosEdicao = pegarDadosEdicaoExame(statusAtual);

  let endpoint = "";

  if (dadosEdicao.unidade_destino) {
    endpoint = `/solicitacoes/novo-exame/${solicitacaoAtualId}/salvar-unidade`;
  } else if (dadosEdicao.funcao_destino || dadosEdicao.setor_destino) {
    endpoint = `/solicitacoes/novo-exame/${solicitacaoAtualId}/salvar-sc`;
  } else if (dadosEdicao.cod_clinica) {
    endpoint = `/solicitacoes/novo-exame/${solicitacaoAtualId}/salvar-credenciamento`;
  }

  if (!endpoint) {
    notify.warning("Nenhuma alteração para salvar");
    return;
  }

  try {
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dadosEdicao)
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error(txt);

      notify.error("Erro ao salvar (ver console)");
      return;
    }

    notify.success("Salvo com sucesso!");
    bootstrap.Modal.getInstance(document.querySelector(".modal.show")).hide();
    carregarSolicitacoes();
  } catch (erro) {
    console.error(erro);
  }
}

// FUNÇÃO PARA APROVAR / REPROVAR SOLICITAÇÃO
async function analisarSolicitacao(status, btn) {
  const isExame = document.getElementById("modalDetalhesNovoExame").classList.contains("show");
  const tipo = isExame ? "NOVO_EXAME" : "NOVO_CADASTRO";

  if (status === "APROVADO") {
    const tipoConsulta = getTipoConsultaSelecionado();
    const observacaoConsulta = getObservacaoConsultaAtual();

    if (!tipoConsulta) {
      notify.warning("Selecione o tipo da consulta");
      return;
    }

    if (tipoConsulta === "PENDENTE_AGENDAMENTO") {
      notify.error("Não é possível aprovar com consulta pendente de agendamento");
      return;
    }

    if (!observacaoConsulta || !observacaoConsulta.value.trim()) {
      notify.warning("Informe a observação da consulta");
      observacaoConsulta?.focus();
      return;
    }
  }

  const motivoInput = isExame
    ? document.getElementById("motivoReprovacaoExame")
    : document.getElementById("motivoReprovacaoCadastro");

  const motivo = motivoInput.value;

  if (status === "REPROVADO" && !motivo.trim()) {
    notify.warning("Informe o motivo da reprovação");
    return;
  }

  const res = await fetch(`/solicitacoes/${tipo}/${solicitacaoAtualId}/analisar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      motivo,
      usuario_id: usuarioLogado.id,
      tipo_consulta: getTipoConsultaSelecionado(),
      observacao_consulta: getObservacaoConsultaAtual()?.value || null
    })
  });

  if (res.ok) {
    notify.success("Solicitação analisada com sucesso!");
    bootstrap.Modal.getInstance(document.querySelector(".modal.show")).hide();
    motivoInput.value = "";
    carregarSolicitacoes();
  } else {
    notify.error("Erro ao analisar solicitação");
  }
}

// FUNÇÃO PARA CANCELAR SOLICITAÇÃO PENDENTE
async function cancelarSolicitacao(id, tipo, usuarioLogadoId) {
  const confirmar = await modalConfirm("Tem certeza que deseja cancelar esta solicitação?");
  if (!confirmar) return;

  try {
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
    }
    else {
      notify.error(data.erro || "Não foi possível cancelar a solicitação");
    }
  } catch (erro) {
    console.error(erro);
  }
}

// FUNÇÃO PARA ENVIAR AO SOC
async function enviarSOC(id) {
  const confirmar = await modalConfirm("Deseja enviar este funcionário ao SOC?");
  if (!confirmar) return;

  try {
    const res = await fetch(`/soc/funcionarios/${id}/enviar`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuarioLogado.id })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      notify.error(data.detalhe || "Erro ao enviar para o SOC");
      return;
    }

    notify.success("Enviado ao SOC com sucesso");
    await carregarSolicitacoes();

  } catch (erro) {
    console.error(erro);
  }
}