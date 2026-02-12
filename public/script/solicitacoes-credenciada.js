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

// BOTAO PARA ATUALIZAR PAGINA
document.getElementById("btnAtualizar").addEventListener("click", () => {location.reload();});

// FUNÇÃO PARA CARREGAR SOLICITAÇÕES E RENDERIZAR A TABELA
async function carregarSolicitacoes() {
  const res = await fetch("/solicitacoes");

  solicitacoes = await res.json();

  solicitacoes.sort((a, b) => {
    return new Date(a.solicitado_em) - new Date(b.solicitado_em);
  });

  renderizarTabela(solicitacoes);
}

// FUNÇÃO PARA RENDERIZAR TABELA COM AS SOLICITAÇÕES
function renderizarTabela(lista) {
  const tbody = document.querySelector("tbody");
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
    const tr = document.createElement("tr");
    const status = (s.status || "PENDENTE").toUpperCase();
    const statusClass = status.toLowerCase();

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

    const podeEnviarSOC = s.tipo === "NOVO_CADASTRO" && s.status === "APROVADO";

    tr.innerHTML = `
      <td>${iconeTipo}</td>
      <td>${formatarDataHora(s.solicitado_em)}</td>
      <td>${s.nome_empresa}</td>
      <td>${s.nome_funcionario}</td>
      <td>${s.cpf}</td>
      <td>
        <span class="status-pill ${statusClass}">${s.status}</span>
      </td>
      <td class="actions">
        <div class="actions-wrapper">
          <button onclick="verDetalhes(${s.solicitacao_id}, '${s.tipo}')">
            Analisar 
          </button>

          ${podeEnviarSOC ? `
            <button type="button" onclick="enviarSOC(${s.solicitacao_id})">
              Enviar SOC
            </button>
          ` : ""}

          ${["PENDENTE_UNIDADE", "PENDENTE_SC", "PENDENTE_CREDENCIAMENTO"].includes(s.status)
        ? `
              <button onclick="cancelarSolicitacao(${s.solicitacao_id}, '${s.tipo}', ${usuarioLogado.id})">
                Cancelar
              </button>
            ` : ""
      }
        </div>
      </td>
    `;

    tbody.appendChild(tr);
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
      body: JSON.stringify({ usuario_id: usuarioLogadoId })
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

// FUNÇÃO PARA APLICAR FILTROS
function aplicarFiltros() {
  const tipo = document.getElementById("filterTipo").value;
  const empresa = document.getElementById("filterEmpresa").value.toLowerCase();
  const cpf = document.getElementById("filterCPF").value;
  const status = document.getElementById("filterStatus").value;

  const filtradas = solicitacoes.filter(s => {
    const matchTipo = !tipo || s.tipo === tipo;
    const matchEmpresa = !empresa || (s.nome_empresa && s.nome_empresa.toLowerCase().includes(empresa));
    const matchCPF = !cpf || s.cpf.includes(cpf);
    const matchStatus = !status || s.status === status;

    return matchTipo && matchEmpresa && matchCPF && matchStatus;
  });

  renderizarTabela(filtradas);
}

// FUNÇÃO PARA VER DETALHES
async function verDetalhes(id, tipo) {
  solicitacaoAtualId = id;

  try {
    const url =
      tipo === "NOVO_EXAME"
        ? `/solicitacoes/novo-exame/${id}`
        : `/solicitacoes/novo-cadastro/${id}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error();

    const { dados } = await res.json();

    preencherModal(dados, tipo);

    const modalId =
      tipo === "NOVO_EXAME"
        ? "modalDetalhesNovoExame"
        : "modalDetalhesNovoCadastro";

    new bootstrap.Modal(
      document.getElementById(modalId)
    ).show();

  } catch (err) {
    console.error(err);
    alert("Erro ao carregar detalhes");
  }
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
      div.innerText = `${u.cod_unidade} - ${u.nome_unidade}`;
      container.appendChild(div);
    });

    bloco?.classList.remove("d-none");

  } else {
    bloco?.classList.add("d-none");
  }
}

// FUNÇÃO PARA POPULAR O SELECT DE SETOR DO FUNCIONÁRIO NO MODAL DE NOVO CADASTRO
async function carregarSetoresSolicitacaoCadastro(empresaCodigo, selecionadoNome = "") {
  if (!empresaCodigo) return;

  const select = document.getElementById("setorSelect");
  select.innerHTML = '<option value="">-</option>';

  try {
    const res = await fetch(`/setores/${empresaCodigo}`);
    const setores = await res.json();

    setores.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.codigo;
      opt.textContent = s.nome;

      if (s.nome === selecionadoNome) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Erro ao carregar setores:", err);
  }
}

// FUNÇÃO PARA POPULAR O SELECT DE SETOR ATUAL NO MODAL DE NOVO EXAME
async function carregarSetoresSolicitacaoExame(empresaCodigo, selecionadoNome = "") {
  if (!empresaCodigo) return;

  const select = document.getElementById("setorAtualSelect");
  select.innerHTML = '<option value="">-</option>';

  try {
    const res = await fetch(`/setores/${empresaCodigo}`);
    const setores = await res.json();

    setores.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.codigo;
      opt.textContent = s.nome;

      if (s.nome === selecionadoNome) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Erro ao carregar setores:", err);
  }
}

// FUNÇÃO PARA POPULAR O SELECT DE CARGOS NO MODAL DE NOVO CADASTRO
async function carregarCargos(empresaCodigo, selecionadoNome = "") {
  if (!empresaCodigo) return;

  const select = document.getElementById("cargoSelect");
  select.innerHTML = '<option value="">-</option>';

  try {
    const res = await fetch(`/cargos/${empresaCodigo}`);
    const cargos = await res.json();

    cargos.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.codigo;
      opt.textContent = c.nome;

      if (c.nome === selecionadoNome) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Erro ao carregar cargos:", err);
  }
}

// FUNÇÃO PARA POPULAR O SELECT DE FUNÇÃO ATUAL NO MODAL DE NOVO EXAME
async function carregarFuncao(empresaCodigo, selecionadoNome = "") {
  if (!empresaCodigo) return;

  const select = document.getElementById("funcaoAtualSelect");
  select.innerHTML = '<option value="">-</option>';

  try {
    const res = await fetch(`/cargos/${empresaCodigo}`);
    const cargos = await res.json();

    cargos.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.codigo;
      opt.textContent = c.nome;

      if (c.nome === selecionadoNome) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Erro ao carregar cargos:", err);
  }
}

// FUNÇÃO PARA POPULAR O SELECT DE UNIDADES NO MODAL
async function carregarUnidades(empresaCodigo, selecionadoNome = "") {
  if (!empresaCodigo) return;

  const select = document.getElementById("unidadeSelect");
  select.innerHTML = '<option value="">-</option>';

  try {
    const res = await fetch(`/unidades/${empresaCodigo}`);
    const unidades = await res.json();

    unidades.forEach(u => {
      const opt = document.createElement("option");
      opt.value = u.codigo;
      opt.textContent = u.nome;

      if (u.nome === selecionadoNome) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Erro ao carregar unidades:", err);
  }
}

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


function preencherMaisUnidadesExame(exame) {
  const container = document.getElementById("exame_mais_unidades");
  const bloco = document.getElementById("bloco_exame_mais_unidades");

  container.innerHTML = "";

  if (Array.isArray(exame.unidades_extras) && exame.unidades_extras.length > 0) {

    exame.unidades_extras.forEach(u => {
      const div = document.createElement("div");
      div.classList.add("mb-1");
      div.innerText = u.nome_unidade;
      container.appendChild(div);
    });

    bloco?.classList.remove("d-none");

  } else {
    bloco?.classList.add("d-none");
  }
}

// FUNÇÃO PARA FORMATAR OS TIPOS DE RAC
function formatarTiposRac(tipos) {
  if (!Array.isArray(tipos) || tipos.length === 0) return "-";

  return tipos
    .map(t => t.replace("RAC_", "RAC "))
    .join(", ");
}

// FUNÇÃO PARA EDIÇÃO DA SOLICITAÇÃO DE CADASTRO
function pegarDadosEdicaoCadastro(statusAtual) {
  let payload = {};

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

  if (
    statusAtual !== "PENDENTE_CREDENCIAMENTO" &&
    statusAtual !== "PENDENTE_REAVALIACAO"
  ) return payload;

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
    alert("ID da solicitação não encontrado");
    return;
  }

  const statusAtual = window.statusAtualSolicitacao;
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
    alert("Nenhum alteração para salvar.");
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
      alert("Erro ao salvar (ver console)");
      return;
    }

    alert("Salvo com sucesso");
    bootstrap.Modal.getInstance(document.querySelector(".modal.show")).hide();
    carregarSolicitacoes();

  } catch (err) {
    console.error(err);
    alert("Erro de comunicação com o servidor");
  }
}

// FUNÇÃO PARA CARREGAR AS CLÍNICAS E POPULAR O SELECT
async function carregarClinicas(codEmpresa, clinicaSelecionada) {
  console.log("Empresa recebida na função:", codEmpresa);

  if (!codEmpresa) return;

  const select = document.getElementById("clinicaSelect");
  if (!select) return;

  const res = await fetch(`/prestadores/${codEmpresa}`);
  const clinicas = await res.json();

  select.innerHTML = '<option value="">-</option>';

  clinicas.forEach(c => {
    const option = document.createElement("option");
    option.value = c.nome;
    option.textContent = c.nome;

    if (c.nome === clinicaSelecionada) {
      option.selected = true;
    }

    select.appendChild(option);
  });
}

// FUNÇÃO PARA CARREGAR AS CLÍNICAS E POPULAR O SELECT
async function carregarClinicasExame(codEmpresa, clinicaSelecionada) {
  console.log("Empresa recebida na função:", codEmpresa);

  if (!codEmpresa) return;

  const select = document.getElementById("clinicaExameSelect");
  if (!select) return;

  const res = await fetch(`/prestadores/${codEmpresa}`);
  const clinicas = await res.json();

  select.innerHTML = '<option value="">-</option>';

  clinicas.forEach(c => {
    const option = document.createElement("option");
    option.value = c.nome;
    option.textContent = c.nome;

    if (c.nome === clinicaSelecionada) {
      option.selected = true;
    }

    select.appendChild(option);
  });
}

// FUNÇÃO PARA PREENCHER O MODAL
function preencherModal(s, tipo) {
  window.statusAtualSolicitacao = s.status;

  const tipoFaturamento = s.tipo_faturamento;

  let emails = s.solicitado_por_email;

  if (s.emails_extras && s.emails_extras.length > 0) {
    emails += "; " + s.emails_extras.join("; ");
  }

  if (tipo === "NOVO_CADASTRO") {
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
    document.getElementById("cadastro_rac").innerText = s.rac || "-";
    document.getElementById("cadastro_tipos_rac").innerText = formatarTiposRac(s.tipos_rac);
    document.getElementById("cadastro_tipo_exame").innerText = s.tipo_exame;
    document.getElementById("cadastro_data_exame").innerText = formatarData(s.data_exame);
    preencherMaisUnidades(s);
    document.getElementById("cadastro_cnh").innerText = s.cnh || "-";
    document.getElementById("cadastro_vencimento_cnh").innerText = formatarData(s.vencimento_cnh) || "-";
    document.getElementById("cadastro_lab_toxicologico").innerText = s.lab_toxicologico || "-";
    document.getElementById("cadastro_estado_clinica").innerText = s.estado_clinica;
    document.getElementById("cadastro_cidade_clinica").innerText = s.cidade_clinica;
    document.getElementById("cadastro_nome_clinica").innerText = s.nome_clinica;
    document.getElementById("cadastro_estado_credenciamento").innerText = s.estado_credenciamento;
    document.getElementById("cadastro_cidade_credenciamento").innerText = s.cidade_credenciamento;
    document.getElementById("cadastro_observacao").innerText = s.observacao || "-";

    const btnSalvar = document.getElementById("btn-salvar");
    const btnAprovar = document.getElementById("btn-aprovar");

    // ESCONDER TUDO POR PADRÃO
    if (btnSalvar) btnSalvar.style.display = "none";
    if (btnAprovar) btnAprovar.style.display = "none";

    // MOSTRAR CONFORME STATUS
    if (s.status === "PENDENTE_UNIDADE" || s.status === "PENDENTE_SC" || s.status === "PENDENTE_CREDENCIAMENTO" || s.status === "PENDENTE_REAVALIACAO") {
      if (btnSalvar) btnSalvar.style.display = "inline-flex";
    }

    if (s.status === "PENDENTE") {
      if (btnAprovar) btnAprovar.style.display = "inline-flex";
    }

    const btnReprovar = document.getElementById('btn-reprovar');
    const blocoMotivoReprovacao = document.getElementById('divCadMotivoReprovacao');

    if (s.status === 'APROVADO' || s.status === "ENVIADO_SOC") {
        btnReprovar.style.display = 'none';
        blocoMotivoReprovacao.style.display = 'none';
    } else {
        btnReprovar.style.display = 'inline-block';
        blocoMotivoReprovacao.style.display = 'inline-block';
    }

    // MOSTRAR / ESCONDER BLOCO DE NOVA UNIDADE
    const blocoNomeFantasia = document.getElementById("divNomeFantasia");
    const blocoRazaoSocial = document.getElementById("divRazaoSocial");
    const blocoCnpj = document.getElementById("divCnpj");
    const blocoCnae = document.getElementById("divCnae");
    const blocoCep = document.getElementById("divCep");
    const blocoRua = document.getElementById("divRua");
    const blocoNumero = document.getElementById("divNumero");
    const blocoBairro = document.getElementById("divBairro");
    const blocoEstado = document.getElementById("divEstado");
    const blocoFaturamentoJunto = document.getElementById("divFaturamentoJunto");
    const blocoFaturamentoSeparado = document.getElementById("divFaturamentoSeparado");
    const blocoEmail = document.getElementById("divEmail");

    if (s.solicitar_nova_unidade === true) {
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
    } else {
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
    const blocoNovoSetor = document.getElementById("divNovoSetor");
    const blocoNovoCargo = document.getElementById("divNovoCargo");
    const blocoDescricaoAtividade = document.getElementById("divDescricaoAtividade");

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

    // TRANSFORMAR O CAMPO DE SETOR DO FUNCIONÁRIO EM SELECT CASO PRECISE CRIAR UM NOVO PARA SER SELECIONADO APÓS CRIADO 
    const spanSetor = document.getElementById("cadastro_nome_setor");
    const selectSetor = document.getElementById("setorSelect");

    if (s.solicitar_novo_setor) {
      spanSetor.style.display = "none";
      selectSetor.style.display = "block";

      // POPULAR O SELECT COM TODOS OS SETORES DA EMPRESA DA SOLICITAÇÃO
      carregarSetoresSolicitacaoCadastro(s.cod_empresa, spanSetor.innerText);
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

      // POPULAR O SELECT COM TODOS OS CARGOS DA EMPRESA DA SOLICITAÇÃO
      carregarCargos(s.cod_empresa, spanCargo.innerText);
    } else {
      spanCargo.style.display = "block";
      selectCargo.style.display = "none";
    }

    // MOSTRAR / ESCONDER BLOCO DE MAIS UNIDADES
    const blocoMaisUnidades = document.getElementById("bloco_mais_unidades");

    if (blocoMaisUnidades) {
      if (s.solicitar_mais_unidades && Array.isArray(s.mais_unidades) && s.mais_unidades.length > 0) {
        blocoMaisUnidades.classList.remove("d-none");
      }
      else {
        blocoMaisUnidades.classList.add("d-none");
      }
    }

    // MOSTRAR / ESCONDER BLOCO DE NOVO CREDENCIAMENTO
    const blocoEstadoClinica = document.getElementById("divEstadoClinica");
    const blocoCidadeClinica = document.getElementById("divCidadeClinica");
    const blocoNomeClinica = document.getElementById("divNomeClinica");

    const blocoEstadoCredenciamento = document.getElementById("divEstadoCredenciamento");
    const blocoCidadeCredenciamento = document.getElementById("divCidadeCredenciamento");

    if (s.solicitar_credenciamento === true) {
      blocoEstadoClinica.classList.add("d-none");
      blocoCidadeClinica.classList.add("d-none");

      // MOSTRA CAMPOS DE CREDENCIAMENTO
      blocoEstadoCredenciamento.classList.remove("d-none");
      blocoCidadeCredenciamento.classList.remove("d-none");
      blocoNomeClinica.classList.remove("d-none");

      document.getElementById("cadastro_estado_credenciamento").innerText = s.estado_credenciamento || "-";
      document.getElementById("cadastro_cidade_credenciamento").innerText = s.cidade_credenciamento || "-";
    } else {
      blocoEstadoClinica.classList.remove("d-none");
      blocoCidadeClinica.classList.remove("d-none");
      blocoNomeClinica.classList.remove("d-none");

      // ESCONDE CREDENCIAMENTO
      blocoEstadoCredenciamento.classList.add("d-none");
      blocoCidadeCredenciamento.classList.add("d-none");

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

      carregarClinicas(s.cod_empresa, spanClinica.innerText);

    } else {
      spanClinica.style.display = "block";

      selectClinica.classList.add("d-none");
      selectClinica.style.display = "none";
    }
  }

  if (tipo === "NOVO_EXAME") {
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
    document.getElementById("exame_rac").innerText = s.rac || "-";
    document.getElementById("exame_tipos_rac").innerText = formatarTiposRac(s.tipos_rac);
    document.getElementById("exame_tipo_exame").innerText = s.tipo_exame;
    document.getElementById("exame_data_exame").innerText = formatarData(s.data_exame);
    preencherMaisUnidadesExame(s);
    document.getElementById("exame_funcao_anterior").innerText = s.funcao_anterior;
    document.getElementById("exame_funcao_atual").innerText = s.funcao_atual;
    document.getElementById("exame_nova_funcao").innerText = s.nome_nova_funcao;
    document.getElementById("exame_descricao_atividade").innerText = s.descricao_atividade;
    document.getElementById("exame_setor_atual").innerText = s.setor_atual;
    document.getElementById("exame_novo_setor").innerText = s.nome_novo_setor;
    document.getElementById("exame_motivo_consulta").innerText = s.motivo_consulta;
    document.getElementById("exame_cnh").innerText = s.cnh || "-";
    document.getElementById("exame_vencimento_cnh").innerText = formatarData(s.vencimento_cnh) || "-";
    document.getElementById("exame_lab_toxicologico").innerText = s.lab_toxicologico || "-";
    document.getElementById("exame_estado_clinica").innerText = s.estado_clinica;
    document.getElementById("exame_cidade_clinica").innerText = s.cidade_clinica;
    document.getElementById("exame_nome_clinica").innerText = s.nome_clinica;
    document.getElementById("exame_estado_credenciamento").innerText = s.estado_credenciamento;
    document.getElementById("exame_cidade_credenciamento").innerText = s.cidade_credenciamento;
    document.getElementById("exame_observacao").innerText = s.observacao || "-";

    // MOSTRAR / OCULTAR SEÇÃO DE MUDANÇA DE RISCOS OCUPACIONAIS
    const blocoFuncaoAnterior = document.getElementById("divFuncaoAnterior");
    const blocoFuncaoAtual = document.getElementById("divFuncaoAtual");
    const blocoNovaFuncao = document.getElementById("divNovaFuncao");
    const blocoDescricaoAtividade = document.getElementById("divExameDescricaoAtividade");
    const blocoSetorAtual = document.getElementById("divSetorAtual");
    const blocoNovoSetor = document.getElementById("divExameNovoSetor");

    // ESCONDER POR PADRÃO
    [blocoFuncaoAnterior, blocoFuncaoAtual, blocoNovaFuncao, blocoDescricaoAtividade, blocoSetorAtual, blocoNovoSetor].forEach(el => el?.classList.add("d-none"));

    if (s.tipo_exame === "MUDANCA_RISCOS_OCUPACIONAIS") {

      if (s.solicitar_nova_funcao === true) {
        blocoFuncaoAnterior?.classList.remove("d-none");
        blocoFuncaoAtual?.classList.remove("d-none");
        blocoNovaFuncao?.classList.remove("d-none");
        blocoDescricaoAtividade?.classList.remove("d-none");

        document.getElementById("exame_funcao_anterior").innerText = s.funcao_anterior || "-";
        document.getElementById("exame_funcao_atual").innerText = s.funcao_atual || "-";
        document.getElementById("exame_nova_funcao").innerText = s.nome_nova_funcao || "-";
        document.getElementById("exame_descricao_atividade").innerText = s.descricao_atividade || "-";
      }

      if (s.solicitar_novo_setor === true) {
        blocoSetorAtual?.classList.remove("d-none");
        blocoNovoSetor?.classList.remove("d-none");

        document.getElementById("exame_setor_atual").innerText = s.setor_atual || "-";
        document.getElementById("exame_novo_setor").innerText = s.nome_novo_setor || "-";
      }
    }

    // MOSTRAR / OCULTAR BOTÕES DE SALVAR E APROVAR
    const btnSalvar = document.getElementById("btn-salvar-exame");
    const btnAprovar = document.getElementById("btn-aprovar-exame");

    // ESCONDER TUDO POR PADRÃO
    if (btnSalvar) btnSalvar.style.display = "none";
    if (btnAprovar) btnAprovar.style.display = "none";

    // MOSTRAR CONFORME STATUS
    if (s.status === "PENDENTE_SC" || s.status === "PENDENTE_CREDENCIAMENTO" || s.status === "PENDENTE_REAVALIACAO") {
      if (btnSalvar) btnSalvar.style.display = "inline-flex";
    }

    if (s.status === "PENDENTE") {
      if (btnAprovar) btnAprovar.style.display = "inline-flex";
    }

    const btnReprovar = document.getElementById('btn-reprovar-exame');
    const blocoMotivoReprovacao = document.getElementById('divExameMotivoReprovacao');

    if (s.status === 'APROVADO') {
        btnReprovar.style.display = 'none';
        blocoMotivoReprovacao.style.display = 'none';
    } else {
        btnReprovar.style.display = 'inline-block';
        blocoMotivoReprovacao.style.display = 'inline-block';
    }

    // TRANSFORMAR O CAMPO DE SETOR ATUAL EM SELECT CASO PRECISE CRIAR UM NOVO PARA SER SELECIONADO APÓS CRIADO 
    const spanSetor = document.getElementById("exame_setor_atual");
    const selectSetor = document.getElementById("setorAtualSelect");

    if (s.solicitar_novo_setor) {
      spanSetor.style.display = "none";
      selectSetor.style.display = "block";

      // POPULAR O SELECT COM TODOS OS SETORES DA EMPRESA DA SOLICITAÇÃO
      carregarSetoresSolicitacaoExame(s.cod_empresa, spanSetor.innerText);
    } else {
      spanSetor.style.display = "block";
      selectSetor.style.display = "none";
    }

    // TRANSFORMAR O CAMPO DE SETOR ATUAL EM SELECT CASO PRECISE CRIAR UM NOVO PARA SER SELECIONADO APÓS CRIADO 
    const spanFuncao = document.getElementById("exame_funcao_atual");
    const selectFuncao = document.getElementById("funcaoAtualSelect");

    if (s.solicitar_novo_setor) {
      spanFuncao.style.display = "none";
      selectFuncao.style.display = "block";

      // POPULAR O SELECT COM TODOS OS SETORES DA EMPRESA DA SOLICITAÇÃO
      carregarFuncao(s.cod_empresa, spanFuncao.innerText);
    } else {
      spanFuncao.style.display = "block";
      selectFuncao.style.display = "none";
    }

    // TRANSFORMAR O CAMPO DE NOME DA CLINICA EM SELECT CASO PRECISE CRIAR UM NOVO CREDENCIAMENTO PARA SER SELECIONADO APÓS CRIADO
    const spanClinica = document.getElementById("exame_nome_clinica");
    const selectClinica = document.getElementById("clinicaExameSelect");

    if (s.solicitar_credenciamento === true) {
      spanClinica.style.display = "none";

      selectClinica.classList.remove("d-none");
      selectClinica.style.display = "block";

      carregarClinicasExame(s.cod_empresa, spanClinica.innerText);

    } else {
      spanClinica.style.display = "block";

      selectClinica.classList.add("d-none");
      selectClinica.style.display = "none";
    }

    // MOSTRAR / ESCONDER BLOCO DE MAIS UNIDADES
    const blocoExameMaisUnidades = document.getElementById("bloco_exame_mais_unidades");

    if (blocoExameMaisUnidades) {
      if (s.solicitar_mais_unidades && Array.isArray(s.mais_unidades) && s.mais_unidades.length > 0) {
        blocoExameMaisUnidades.classList.remove("d-none");
      }
      else {
        blocoExameMaisUnidades.classList.add("d-none");
      }
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

    if (s.solicitar_credenciamento === true) {
      blocoEstadoClinica.classList.add("d-none");
      blocoCidadeClinica.classList.add("d-none");

      // MOSTRA CAMPOS DE CREDENCIAMENTO
      blocoEstadoCredenciamento.classList.remove("d-none");
      blocoCidadeCredenciamento.classList.remove("d-none");
      blocoNomeClinica.classList.remove("d-none");

      document.getElementById("exame_estado_credenciamento").innerText = s.estado_credenciamento || "-";
      document.getElementById("exame_cidade_credenciamento").innerText = s.cidade_credenciamento || "-";
    } else {
      blocoEstadoClinica.classList.remove("d-none");
      blocoCidadeClinica.classList.remove("d-none");
      blocoNomeClinica.classList.remove("d-none");

      // ESCONDE CREDENCIAMENTO
      blocoEstadoCredenciamento.classList.add("d-none");
      blocoCidadeCredenciamento.classList.add("d-none");

      document.getElementById("exame_estado_clinica").innerText = s.estado_clinica || "-";
      document.getElementById("exame_cidade_clinica").innerText = s.cidade_clinica || "-";
    }
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

  // STATUS
  const alertStatus =
    tipo === "NOVO_EXAME"
      ? document.getElementById("linha_aprovacao_exame")
      : document.getElementById("linha_aprovacao_cadastro");

  alertStatus.style.display = "none";
  alertStatus.innerHTML = "";

  if (s.status === "ERRO_SOC" && s.retorno_soc_erro) {
    alertStatus.style.display = "block";
    alertStatus.innerHTML = `
      <div class="alerts-container mb-2">
        <div class="alert alert-erro">
          <i class="fa-solid fa-circle-check fa-lg" style="color: #F05252"></i>
          <p class="alert-text">
            Erro retornado pelo SOC: ${s.retorno_soc_erro}
          </p>
        </div>
      </div>
    `;
    return;
  }

  // APROVADO
  if (s.status === "APROVADO") {
    alertStatus.style.display = "block";
    alertStatus.innerHTML = `
      <div class="alerts-container mb-2">
        <div class="alert alert-aprovado">
          <i class="fa-solid fa-circle-check fa-lg" style="color: #53A5A6"></i>
          <p class="alert-text">
            Aprovado por ${s.analisado_por_nome} em ${formatarDataHora(s.analisado_em)}
          </p>
        </div>
      </div>
    `;
    return;
  }

  // REPROVADO
  if (s.status === "REPROVADO") {
    alertStatus.style.display = "block";
    alertStatus.innerHTML = `
      <div class="alerts-container mb-2">
        <div class="alert alert-reprovado">
          <i class="fa-solid fa-circle-xmark fa-lg" style="color: #DC3545"></i>
          <p class="alert-text">
            Reprovado por ${s.analisado_por_nome} em ${formatarDataHora(s.analisado_em)}
          </p>
        </div>
      </div>
    `;
    return;
  }

  // CANCELADO
  if (s.status === "CANCELADO") {
    alertStatus.style.display = "block";
    alertStatus.innerHTML = `
      <div class="alerts-container mb-2">
        <div class="alert alert-cancelado">
          <i class="fa-solid fa-ban fa-lg" style="color: #6C757D"></i>
          <p class="alert-text">
            Cancelado por ${s.cancelado_por_nome} em ${formatarDataHora(s.cancelado_em)}
          </p>
        </div>
      </div>
    `;
    return;
  }

  // ENVIADO SOC
  if (s.status === "ENVIADO_SOC") {
    alertStatus.style.display = "block";
    alertStatus.innerHTML = `
      <div class="alerts-container mb-2">
        <div class="alert alert-enviado">
          <i class="fa-solid fa-paper-plane fa-lg" style="color: #88A6BB"></i>
          <p class="alert-text">
            Enviado ao SOC por ${s.enviado_soc_por_nome} em ${formatarDataHora(s.enviado_soc_em)}
          </p>
        </div>
      </div>
    `;
    return;
  }
}

// FUNÇÃO PARA EDIÇÃO DA SOLICITAÇÃO DE EXAMES
function pegarDadosEdicaoExame(statusAtual) {
  let payload = {};

  payload = {
    ...payload,
    ...edicaoFuncaoSetor(statusAtual),
    ...edicaoExameCredenciamento(statusAtual),
  };

  return payload;
}

function edicaoFuncaoSetor(statusAtual) {
  const payload = {};

  if (statusAtual !== "PENDENTE_SC" && statusAtual !== "PENDENTE_REAVALIACAO")
    return payload;

  const selectFuncao = document.getElementById("funcaoAtualSelect");
  if (selectFuncao && selectFuncao.style.display !== "none" && selectFuncao.value) {
    const opt = selectFuncao.options[selectFuncao.selectedIndex];
    payload.cod_funcao = selectFuncao.value;
    payload.funcao_atual = opt.textContent;
  }

  const selectSetor = document.getElementById("setorAtualSelect");
  if (selectSetor && selectSetor.style.display !== "none" && selectSetor.value) {
    const opt = selectSetor.options[selectSetor.selectedIndex];
    payload.cod_setor = selectSetor.value;
    payload.setor_atual = opt.textContent;
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
    alert("ID da solicitação não encontrado");
    return;
  }

  const statusAtual = window.statusAtualSolicitacao;
  const dadosEdicao = pegarDadosEdicaoExame(statusAtual);

  let endpoint = "";

  if (dadosEdicao.funcao_atual || dadosEdicao.setor_atual) {
    endpoint = `/solicitacoes/novo-exame/${solicitacaoAtualId}/salvar-sc`;
  } else if (dadosEdicao.cod_clinica) {
    endpoint = `/solicitacoes/novo-exame/${solicitacaoAtualId}/salvar-credenciamento`;
  }

  if (!endpoint) {
    alert("Nenhum alteração para salvar.");
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
      alert("Erro ao salvar (ver console)");
      return;
    }

    alert("Salvo com sucesso");
    bootstrap.Modal.getInstance(document.querySelector(".modal.show")).hide();
    carregarSolicitacoes();

  } catch (err) {
    console.error(err);
    alert("Erro de comunicação com o servidor");
  }
}

// FUNÇÃO PARA ENVIAR AO SOC
async function enviarSOC(id) {
  if (!confirm("Deseja enviar este funcionário ao SOC?")) return;

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
      alert(data.detalhe || "Erro ao enviar para o SOC");
      return;
    }

    alert("Enviado ao SOC com sucesso");
    await carregarSolicitacoes();

  } catch (err) {
    alert("Falha de comunicação com o servidor");
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

// FUNÇÃO PARA FORMATAR DATA E HORA DAS SOLICITAÇÕES
function formatarDataHora(data) {
  if (!data) return "-";

  const d = new Date(data);

  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();

  const horas = String(d.getHours()).padStart(2, "0");
  const minutos = String(d.getMinutes()).padStart(2, "0");

  return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
}

// FUNÇÃO PARA APROVAR / REPROVAR SOLICITAÇÃO
async function analisarSolicitacao(status) {
  const isExame = document.getElementById("modalDetalhesNovoExame").classList.contains("show");
  const tipo = isExame ? "NOVO_EXAME" : "NOVO_CADASTRO";

  const motivoInput = isExame
    ? document.getElementById("motivoReprovacaoExame")
    : document.getElementById("motivoReprovacaoCadastro");

  const motivo = motivoInput.value;

  if (status === "REPROVADO" && !motivo.trim()) {
    alert("Informe o motivo da reprovação");
    return;
  }

  const res = await fetch(
    `/solicitacoes/${tipo}/${solicitacaoAtualId}/analisar`,
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

// FUNÇÃO DE LOGOUT
function logout() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("empresaCodigo");
  window.location.href = "login.html";
}