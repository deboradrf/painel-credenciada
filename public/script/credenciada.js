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
        <td colspan="12" class="text-muted text-center">
          Nenhuma solicitação encontrada
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach(s => {
    const tr = document.createElement("tr");
    const statusClass = s.status.toLowerCase();

    let iconeTipo = "";

    if (s.tipo === "NOVO_CADASTRO") {
      iconeTipo = `
      <i class="fa-solid fa-user-plus fa-lg" style="color: #F1AE33"></i>
    `;
    }

    if (s.tipo === "ASO") {
      iconeTipo = `
      <i class="fa-solid fa-file-circle-plus fa-lg" style="color: #F1AE33"></i>
    `;
    }

    const bloqueiaEnvioSOC = (s.solicitar_novo_setor === true || s.solicitar_novo_cargo === true) && s.status !== "APROVADO";

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
            <i class="fa-solid fa-magnifying-glass"></i> 
          </button>

          ${s.tipo === "NOVO_CADASTRO" ? `
            <button type="button" onclick="enviarSOC(${s.solicitacao_id})"
              ${bloqueiaEnvioSOC ? "disabled" : ""}>
              <i class="fa-regular fa-paper-plane"></i>
            </button>
          ` : ""}
        </div>
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

// FUNÇÃO PARA POPULAR O SELECT DE SETORES NO MODAL
async function carregarSetores(empresaCodigo, selecionadoNome = "") {
  if (!empresaCodigo) return;

  const select = document.getElementById("setorSelect");
  select.innerHTML = '<option value="">-</option>';

  try {
    const res = await fetch(`http://localhost:3001/setores/${empresaCodigo}`);
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

// FUNÇÃO PARA POPULAR O SELECT DE CARGOS NO MODAL
async function carregarCargos(empresaCodigo, selecionadoNome = "") {
  if (!empresaCodigo) return;

  const select = document.getElementById("cargoSelect");
  select.innerHTML = '<option value="">-</option>';

  try {
    const res = await fetch(`http://localhost:3001/cargos/${empresaCodigo}`);
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

// função para pegar os valores selecionados do modal de cargo e setor
function pegarDadosEdicaoCadastro() {
  const setorSelect = document.getElementById("setorSelect");
  const cargoSelect = document.getElementById("cargoSelect");

  return {
    cod_setor: setorSelect.value || null,
    nome_setor: setorSelect.options[setorSelect.selectedIndex]?.text || null,
    cod_cargo: cargoSelect.value || null,
    nome_cargo: cargoSelect.options[cargoSelect.selectedIndex]?.text || null
  };
}

// FUNÇÃO PARA PREENCHER O MODAL
function preencherModal(s, tipo) {
  if (tipo === "NOVO_CADASTRO") {
    document.getElementById("cadastro_nome_funcionario").innerText = s.nome_funcionario || "-";
    document.getElementById("cadastro_data_nascimento").innerText = formatarData(s.data_nascimento) || "-";
    document.getElementById("cadastro_sexo").innerText = s.sexo || "-";
    document.getElementById("cadastro_estado_civil").innerText = s.estado_civil || "-";
    document.getElementById("cadastro_doc_identidade").innerText = s.doc_identidade || "-";
    document.getElementById("cadastro_cpf").innerText = s.cpf || "-";
    document.getElementById("cadastro_matricula").innerText = s.matricula || "NÃO POSSUI MATRÍCULA";
    document.getElementById("cadastro_data_admissao").innerText = formatarData(s.data_admissao) || "-";
    document.getElementById("cadastro_tipo_contratacao").innerText = s.tipo_contratacao || "-";
    document.getElementById("cadastro_regime_trabalho").innerText = s.regime_trabalho || "-";
    document.getElementById("cadastro_nome_empresa").innerText = s.nome_empresa || "-";
    document.getElementById("cadastro_nome_unidade").innerText = s.nome_unidade || "-";
    document.getElementById("cadastro_nome_setor").innerText = s.nome_setor || "-";
    document.getElementById("cadastro_novo_setor").innerText = s.nome_novo_setor || "-";
    document.getElementById("cadastro_nome_cargo").innerText = s.nome_cargo || "-";
    document.getElementById("cadastro_novo_cargo").innerText = s.nome_novo_cargo || "-";
    document.getElementById("cadastro_tipo_exame").innerText = s.tipo_exame || "-";
    document.getElementById("cadastro_cnh").innerText = s.cnh || "-";
    document.getElementById("cadastro_vencimento_cnh").innerText = formatarData(s.vencimento_cnh) || "-";
    document.getElementById("cadastro_lab_toxicologico").innerText = s.lab_toxicologico || "-";
    document.getElementById("cadastro_nome_clinica").innerText = s.nome_clinica || "-";
    document.getElementById("cadastro_cidade_clinica").innerText = s.cidade_clinica || "-";
    document.getElementById("cadastro_observacao").innerText = s.observacao || "-";

    // MOSTRAR / ESCONDER BLOCO DE NOVO SETOR / NOVO CARGO
    const blocoNovoSetor = document.getElementById("divNovoSetor");
    const blocoNovoCargo = document.getElementById("divNovoCargo");

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

    // TRANSFORMAR O CAMPO DE SETOR DO FUNCIONÁRIO EM SELECT CASO PRECISE CRIAR UM NOVO
    // PARA SER SELECIONADO APÓS CRIADO 
    const spanSetor = document.getElementById("cadastro_nome_setor");
    const selectSetor = document.getElementById("setorSelect");

    if (s.solicitar_novo_setor) {
      spanSetor.style.display = "none";
      selectSetor.style.display = "block";

      // POPULAR O SELECT COM TODOS OS SETORES DA EMPRESA DA SOLICITAÇÃO
      carregarSetores(s.cod_empresa, spanSetor.innerText);
    } else {
      spanSetor.style.display = "block";
      selectSetor.style.display = "none";
    }

    // TRANSFORMAR O CAMPO DE CARGO DO FUNCIONÁRIO EM SELECT CASO PRECISE CRIAR UM NOVO
    // PARA SER SELECIONADO APÓS CRIADO
    const spanCargo = document.getElementById("cadastro_nome_cargo");
    const selectCargo = document.getElementById("cargoSelect");

    if (s.solicitar_novo_cargo) {
      spanCargo.style.display = "none";
      selectCargo.style.display = "block";

      // Popula select com todos os cargos da empresa da solicitação
      carregarCargos(s.cod_empresa, spanCargo.innerText);
    } else {
      spanCargo.style.display = "block";
      selectCargo.style.display = "none";
    }

    // MOSTRAR / ESCONDER BLOCO DE NOVO CREDENCIAMENTO
    const blocoClinica = document.getElementById("blocoCadClinica");
    const blocoCredenciamento = document.getElementById("blocoCadCredenciamento");

    if (s.solicitar_credenciamento === true) {
      blocoClinica.classList.add("d-none");
      blocoCredenciamento.classList.remove("d-none");

      document.getElementById("cadastro_estado_credenciamento").innerText = s.estado_credenciamento;
      document.getElementById("cadastro_cidade_credenciamento").innerText = s.cidade_credenciamento;

    } else {
      blocoClinica.classList.remove("d-none");
      blocoCredenciamento.classList.add("d-none");

      document.getElementById("cadastro_estado_clinica").innerText = s.estado_clinica;
      document.getElementById("cadastro_cidade_clinica").innerText = s.cidade_clinica;
      document.getElementById("cadastro_nome_clinica").innerText = s.nome_clinica;
    }
  }

  if (tipo === "ASO") {
    document.getElementById("aso_nome_funcionario").innerText = s.nome_funcionario || "-";
    document.getElementById("aso_data_nascimento").innerText = formatarData(s.data_nascimento) || "-";
    document.getElementById("aso_cpf").innerText = s.cpf || "-";
    document.getElementById("aso_matricula").innerText = s.matricula || "NÃO POSSUI MATRÍCULA";
    document.getElementById("aso_data_admissao").innerText = formatarData(s.data_admissao) || "-";
    document.getElementById("aso_nome_empresa").innerText = s.nome_empresa || "-";
    document.getElementById("aso_nome_unidade").innerText = s.nome_unidade || "-";
    document.getElementById("aso_nome_setor").innerText = s.nome_setor || "-";
    document.getElementById("aso_nome_cargo").innerText = s.nome_cargo || "-";
    document.getElementById("aso_tipo_exame").innerText = s.tipo_exame || "-";
    document.getElementById("aso_funcao_anterior").innerText = s.funcao_anterior || "-";
    document.getElementById("aso_funcao_atual").innerText = s.funcao_atual || "-";
    document.getElementById("aso_nova_funcao").innerText = s.nome_nova_funcao || "-";
    document.getElementById("aso_setor_atual").innerText = s.setor_atual || "-";
    document.getElementById("aso_novo_setor").innerText = s.nome_novo_setor || "-";
    document.getElementById("aso_cnh").innerText = s.cnh || "-";
    document.getElementById("aso_vencimento_cnh").innerText = formatarData(s.vencimento_cnh) || "-";
    document.getElementById("aso_lab_toxicologico").innerText = s.lab_toxicologico || "-";
    document.getElementById("aso_estado_clinica").innerText = s.estado_clinica || "-";
    document.getElementById("aso_cidade_clinica").innerText = s.cidade_clinica || "-";
    document.getElementById("aso_nome_clinica").innerText = s.nome_clinica || "-";
    document.getElementById("aso_estado_credenciamento").innerText = s.estado_credenciamento || "-";
    document.getElementById("aso_cidade_credenciamento").innerText = s.cidade_credenciamento || "-";
    document.getElementById("aso_observacao").innerText = s.observacao || "-";

    // MOSTRAR / OCULTAR SEÇÃO DE MUDANÇA DE RISCOS OCUPACIONAIS
    const blocoFuncaoAnterior = document.getElementById("divFuncaoAnterior");
    const blocoFuncaoAtual = document.getElementById("divFuncaoAtual");
    const blocoNovaFuncao = document.getElementById("divNovaFuncao");
    const blocoSetorAtual = document.getElementById("divSetorAtual");
    const blocoNovoSetor = document.getElementById("divAsoNovoSetor");

    // OCULTAR CAMPOS DE FUNÇÃO E SETOR QUANDO NÃO FOR MUDANÇA DE RISCOS OCUPACIONAIS
    if (s.tipo_exame !== "MUDANCA_RISCOS_OCUPACIONAIS") {
      blocoFuncaoAnterior.classList.add("d-none");
      blocoFuncaoAtual.classList.add("d-none");
      blocoNovaFuncao.classList.add("d-none");
      blocoSetorAtual.classList.add("d-none");
      blocoNovoSetor.classList.add("d-none");
    } else {
      // MOSTRAR OS BLOCOS DE FUNÇÃO E SETOR
      blocoFuncaoAnterior.classList.remove("d-none");
      blocoFuncaoAtual.classList.remove("d-none");
      blocoSetorAtual.classList.remove("d-none");

      // SE FOR SOLICITAR CRIAÇÃO DE NOVA FUNÇÃO, MOSTRAR CAMPO
      if (s.solicitar_nova_funcao === true) {
        blocoFuncaoAtual.classList.add("d-none");
        blocoNovaFuncao.classList.remove("d-none");

        document.getElementById("aso_funcao_atual").innerText = "";
        document.getElementById("aso_nova_funcao").innerText = s.nome_nova_funcao || "-";
      } else {
        blocoFuncaoAtual.classList.remove("d-none");
        blocoNovaFuncao.classList.add("d-none");

        document.getElementById("aso_funcao_atual").innerText = s.funcao_atual || "-";
      }

      // SE FOR SOLICITAR CRIAÇÃO DE NOVO SETOR, MOSTRAR CAMPO
      if (s.solicitar_novo_setor === true) {
        blocoSetorAtual.classList.add("d-none");
        blocoNovoSetor.classList.remove("d-none");

        document.getElementById("aso_setor_atual").innerText = "";
        document.getElementById("aso_novo_setor").innerText = s.nome_novo_setor || "-";
      } else {
        blocoSetorAtual.classList.remove("d-none");
        blocoNovoSetor.classList.add("d-none");

        document.getElementById("aso_setor_atual").innerText = s.setor_atual || "-";
      }
    }

    // MOSTRAR / ESCONDER SEÇÃO DE NOVO CREDENCIAMENTO
    const blocoClinica = document.getElementById("blocoAsoClinica");
    const blocoCredenciamento = document.getElementById("blocoAsoCredenciamento");

    if (s.solicitar_credenciamento === true) {
      blocoClinica.classList.add("d-none");
      blocoCredenciamento.classList.remove("d-none");

      document.getElementById("aso_estado_credenciamento").innerText = s.estado_credenciamento;
      document.getElementById("aso_cidade_credenciamento").innerText = s.cidade_credenciamento;

    } else {
      blocoClinica.classList.remove("d-none");
      blocoCredenciamento.classList.add("d-none");

      document.getElementById("aso_estado_clinica").innerText = s.estado_clinica;
      document.getElementById("aso_cidade_clinica").innerText = s.cidade_clinica;
      document.getElementById("aso_nome_clinica").innerText = s.nome_clinica;
    }
  }

  // MOSTRAR MOTIVO DE REPROVAÇÃO NA REAVALIAÇÃO
  const textareaMotivo =
    tipo === "ASO"
      ? document.getElementById("motivoReprovacaoASO")
      : document.getElementById("motivoReprovacaoCadastro");

  if (s.status === "PENDENTE_REAVALIACAO" || s.status === "REPROVADO") {
    textareaMotivo.value = s.motivo_reprovacao || "";
  } else {
    textareaMotivo.value = "";
  }

  // STATUS
  const alertStatus =
    tipo === "ASO"
      ? document.getElementById("linha_aprovacao_aso")
      : document.getElementById("linha_aprovacao_cadastro");

  alertStatus.style.display = "none";
  alertStatus.innerHTML = "";

  if (s.status === "ERRO_SOC" && s.retorno_soc_erro) {
    alertStatus.style.display = "block";
    alertStatus.innerHTML = `
      <div class="alerts-container mb-2">
        <div class="alert alert-danger">
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
        <div class="alert alert-success">
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
        <div class="alert alert-danger">
          <i class="fa-solid fa-circle-xmark fa-lg" style="color: #DC3545"></i>
          <p class="alert-text">
            Reprovado por ${s.analisado_por_nome} em ${formatarDataHora(s.analisado_em)}
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

// FUNÇÃO PARA ENVIAR AO SOC
async function enviarSOC(id) {
  if (!confirm("Deseja enviar este funcionário ao SOC?")) return;

  try {
    const res = await fetch(
      `http://localhost:3001/soc/funcionarios/${id}/enviar`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuarioLogado.id })
      }
    );

    await carregarSolicitacoes();

    if (!res.ok) {
      alert("Erro ao enviar para o SOC");
      return;
    }

    alert("Enviado ao SOC com sucesso");

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

  // Se for NOVO_CADASTRO, atualiza setor/cargo antes de aprovar
  if (!isASO) {
    const selectSetor = document.getElementById("setorSelect");
    const selectCargo = document.getElementById("cargoSelect");

    const solicitarNovoSetor = selectSetor && selectSetor.style.display !== "none";
    const solicitarNovoCargo = selectCargo && selectCargo.style.display !== "none";

    if (solicitarNovoSetor || solicitarNovoCargo) {
      const dadosEdicao = pegarDadosEdicaoCadastro(); // ✅ pega os dados
      await fetch(`http://localhost:3001/solicitacoes/cadastro/${solicitacaoAtualId}/editar-setor-cargo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosEdicao)
      });
    }
  }

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