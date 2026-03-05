// USUÁRIO LOGADO
const usuarioLogado = JSON.parse(sessionStorage.getItem("usuario"));

if (!usuarioLogado) {
  alert("Sessão expirada. Faça login novamente.");
  window.location.href = "login.html";
}

// FUNCIONÁRIO PESQUISADO
const funcionarioAtual = JSON.parse(localStorage.getItem("funcionario"));

if (!funcionarioAtual) {
  alert("Pesquise um funcionário primeiro");
  window.location.href = "solicitar-exame.html";
}

// DADOS DA EMPRESA
const empresaCodigo = usuarioLogado.cod_empresa;
const nomeEmpresa = usuarioLogado.nome_empresa;

// CACHE
let prestadoresCache = [];
let unidadesCache = [];

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
    <div class="company-name">${usuarioLogado.nome_empresa}</div>
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
});

// INIT
document.addEventListener("DOMContentLoaded", async () => {
  preencherDadosFuncionarioSoc();
  await popularSelectUnidadeAtual();
  await carregarSetoresDaUnidade();
  await carregarCargosDoSetor();
  await carregarPrestadores();
});

// FUNÇÃO PARA PREENCHER O FORMULÁRIO COM OS DADOS ENCONTRADOS NO SOC
function preencherDadosFuncionarioSoc() {
  const f = funcionarioAtual;

  // DADOS PESSOAIS (SOC)
  document.getElementById("nome").value = f.nome;
  document.getElementById("cpf").value = formatarCPF(f.cpf);
  document.getElementById("matricula").value = f.matricula || "";

  if (f.data_nascimento) {
    const [d, m, a] = f.data_nascimento.split("/");
    document.getElementById("dataNascimento").value = `${a}-${m}-${d}`;
  }

  if (f.data_admissao) {
    const [d, m, a] = f.data_admissao.split("/");
    document.getElementById("dataAdmissao").value = `${a}-${m}-${d}`;
  }

  document.getElementById("cpf").readOnly = true;

  document.getElementById("empresaNome").value = usuarioLogado.nome_empresa;
  document.getElementById("empresaCodigo").value = funcionarioAtual.cod_empresa;

  preencherUnidadeFuncionario();
  preencherSetorFuncionario();
  preencherCargoFuncionario();
}

// FUNÇÃO PARA PREENCHER A UNIDADE DO FUNCIONÁRIO (SOC)
async function preencherUnidadeFuncionario() {
  const empresa = usuarioLogado.cod_empresa;
  const codUnidade = funcionarioAtual.cod_unidade;

  if (!empresa || !codUnidade) {
    console.warn("Empresa ou unidade inválida");
    return;
  }

  const res = await fetch(`/unidades/${empresa}`);
  unidadesCache = await res.json();

  console.table(unidadesCache);

  const unidade = unidadesCache.find(u => String(u.codigo) === String(codUnidade));

  if (!unidade) {
    console.warn("Unidade não encontrada:", codUnidade);
    return;
  }

  document.getElementById("unidadeNome").value = unidade.nome;
  document.getElementById("unidadeCodigo").value = codUnidade;
}

// FUNÇÃO PARA PREENCHER O SETOR DO FUNCIONÁRIO (SOC)
async function preencherSetorFuncionario() {
  const empresa = usuarioLogado.cod_empresa;
  const codSetor = funcionarioAtual.cod_setor;

  if (!empresa || !codSetor) return;

  const res = await fetch(`/setores/${empresa}`);
  const setores = await res.json();

  const setor = setores.find(s => String(s.codigo) === String(codSetor));

  document.getElementById("setorNome").value = setor.nome;
  document.getElementById("setorCodigo").value = codSetor;
}

// FUNÇÃO PARA PREENCHER O CARGO DO FUNCIONÁRIO (SOC)
async function preencherCargoFuncionario() {
  const empresa = usuarioLogado.cod_empresa;
  const codCargo = funcionarioAtual.cod_cargo;

  if (!empresa || !codCargo) return;

  const res = await fetch(`/cargos/${empresa}`);
  const cargos = await res.json();

  const cargo = cargos.find(c => String(c.codigo) === String(codCargo));

  if (!cargo) {
    console.warn("Cargo não encontrado para código:", codCargo);
    return;
  }

  document.getElementById("cargoNome").value = cargo.nome;
  document.getElementById("cargoCodigo").value = codCargo;
  document.getElementById("funcaoAnterior").value = cargo.nome;
}

// FUNÇÃO PARA POPULAR O SELECT DE UNIDADE ATUAL
async function popularSelectUnidadeAtual() {
  const empresa = usuarioLogado.cod_empresa;

  if (!empresa) return;

  const select = document.getElementById("unidadeDestinoSelect");

  try {
    // SE AINDA NÃO TIVER UNIDADES NO CACHE, BUSCA
    if (!unidadesCache || unidadesCache.length === 0) {
      const res = await fetch(`/unidades/${empresa}`);
      unidadesCache = await res.json();
    }

    select.innerHTML = `<option value="">Selecione...</option>`;

    unidadesCache.forEach(u => {
      const opt = document.createElement("option");

      opt.value = u.codigo;
      opt.textContent = u.nome;

      select.appendChild(opt);
    });

  } catch (erro) {
    console.error("Erro ao carregar unidades:", erro);
  }
}

// FUNÇÃO PARA PEGAR A UNIDADE QUE FOI SELECIONADA
function getUnidadeSelecionada() {
  const unidadeSelecionada = document.getElementById("unidadeDestinoSelect").value;

  if (unidadeSelecionada) {
    return unidadeSelecionada;
  }

  return funcionarioAtual.cod_unidade;
}

// QUANDO MUDAR A UNIDADE, LIMPA OS CAMPOS E RECARREGA OS SETORES
document.getElementById("unidadeDestinoSelect").addEventListener("change", () => {
  const selectSetor = document.getElementById("setorAtual");
  selectSetor.innerHTML = `<option value="">Selecione...</option>`;

  const selectFuncao = document.getElementById("funcaoAtual");
  selectFuncao.innerHTML = `<option value="">Selecione...</option>`;

  carregarSetoresDaUnidade();
});

// FUNÇÃO PARA CARREGAR OS SETORES DE UMA UNIDADE
async function carregarSetoresDaUnidade() {
  const empresa = usuarioLogado.cod_empresa;
  const unidade = getUnidadeSelecionada();

  if (!empresa || !unidade) {
    console.warn("Empresa ou unidade não definida", { empresa, unidade });
    return;
  }

  const res = await fetch(`/hierarquia/${empresa}/${unidade}`);
  const setores = await res.json();

  const selectSetor = document.getElementById("setorAtual");
  selectSetor.innerHTML = `<option value="">Selecione...</option>`;

  const unicos = new Map();

  setores.forEach(s => {
    if (s.codigoSetor && !unicos.has(s.codigoSetor)) {
      unicos.set(s.codigoSetor, s.nomeSetor);
    }
  });

  unicos.forEach((nome, codigo) => {
    const opt = document.createElement("option");
    opt.value = codigo;
    opt.textContent = nome;
    selectSetor.appendChild(opt);
  });
}

// FUNÇÃO PARA CARREGAR OS CARGOS DE UM SETOR SELECIONADO
document.getElementById("setorAtual").addEventListener("change", carregarCargosDoSetor);

async function carregarCargosDoSetor() {
  const empresa = usuarioLogado.cod_empresa;
  const unidade = getUnidadeSelecionada();

  const selectSetor = document.getElementById("setorAtual");
  const codSetor = selectSetor.value;

  const selectCargo = document.getElementById("funcaoAtual");

  selectCargo.innerHTML = `<option value="">Selecione...</option>`;

  try {
    const res = await fetch(`/hierarquia/${empresa}/${unidade}/${codSetor}`);
    const hierarquia = await res.json();

    hierarquia.forEach(item => {
      if (item.codigoCargo) {
        const opt = document.createElement("option");

        opt.value = item.codigoCargo;
        opt.textContent = item.nomeCargo;

        selectCargo.appendChild(opt);
      }
    });
  }
  catch (erro) {
    console.error("Erro ao carregar cargos:", erro);
  }
}

// FUNÇÃO PARA FORMATAR CPF
function formatarCPF(cpf) {
  if (!cpf) return "";

  const numeros = cpf.replace(/\D/g, "");

  if (numeros.length !== 11) return cpf;

  return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// MOSTRAR / OCULTAR TIPO RAC
const racCheckboxes = document.querySelectorAll('input[name="form_rac"]');
const divTipoRac = document.getElementById("divTipoRac");

racCheckboxes.forEach(cb => {
  cb.addEventListener("change", () => {
    // se algum checkbox selecionado for RAC Vale
    const racValeSelecionado = Array.from(racCheckboxes)
      .some(input => input.checked && input.value === "FORMULARIO_RAC_VALE");

    divTipoRac.classList.toggle("d-none", !racValeSelecionado);

    if (!racValeSelecionado) {
      // limpa seleção dos tipos RAC Vale
      document.querySelectorAll('input[name="tipo_rac"]').forEach(cb => cb.checked = false);
    }
  });
});

// LISTENER DOS CAMPOS DE DATA/HORA DO EXAME (SÓ PERMITIR MAIS DE 24H DA SOLICITAÇÃO)
const dataInput = document.getElementById("dataExame");

dataInput.addEventListener("blur", validarDataExame);

function validarDataExame() {
  const data = dataInput.value;
  if (!data) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataSelecionada = new Date(data + "T00:00:00");

  if (dataSelecionada <= hoje) {
    alert(
      "ATENÇÃO: o período para realização do exame deve ser, preferencialmente, no mínimo 24 horas da solicitação."
    );
  }
}

// MOSTRAR CAMPO DE ADD MAIS UNIDADES SE TIPO EXAME FOR 'PERIODICO', OU 'MUDANÇA FUNÇÃO' OU 'DEMISSIONAL'
document.addEventListener("DOMContentLoaded", () => {
  const tipoExame = document.getElementById("tipoExame");
  const blocoMaisUnidades = document.getElementById("blocoSolicitarMaisUnidades");

  if (!tipoExame || !blocoMaisUnidades) return;

  function verificarTipoExame() {

    const tiposPermitidos = [
      "PERIODICO",
      "MUDANCA_RISCOS_OCUPACIONAIS",
      "DEMISSIONAL"
    ];

    if (tiposPermitidos.includes(tipoExame.value)) {

      blocoMaisUnidades.style.display = "block";
    } else {
      blocoMaisUnidades.style.display = "none";

      ativarUnidades(false);
    }
  }
  tipoExame.addEventListener("change", verificarTipoExame);

  verificarTipoExame();
});

// FUNÇÃO PARA GERAR MAIS UNIDADES PRA SOLICITAR ASO
let contadorUnidades = 0;
const limiteUnidades = 5;

function ativarUnidades(ativar) {
  const container = document.getElementById("unidadesContainer");
  const btnAdd = document.getElementById("btnAddUnidade");
  const hidden = document.getElementById("solicitarMaisUnidades");

  if (ativar) {
    hidden.value = "true";
    container.classList.remove("d-none");
    btnAdd.classList.remove("d-none");

    if (contadorUnidades === 0) {
      adicionarUnidade();
    }
  } else {
    hidden.value = "false";
    container.classList.add("d-none");
    btnAdd.classList.add("d-none");
    container.innerHTML = "";
    contadorUnidades = 0;
  }
}

function adicionarUnidade() {
  if (contadorUnidades >= limiteUnidades) {
    alert("Você pode adicionar no máximo 5 unidades adicionais.");
    return;
  }

  contadorUnidades++;

  const container = document.getElementById("unidadesContainer");

  if (!unidadesCache || unidadesCache.length === 0) {
    alert("Nenhuma unidade disponível.");
    return;
  }

  const options = unidadesCache.map(u => `
      <option value="${u.codigo}" data-nome="${u.nome}">
          ${u.nome}
      </option>
  `).join("");

  container.insertAdjacentHTML("beforeend", `
    <div class="form-group mt-2 unidade-extra">
      <div class="input-wrapper">
        <div class="input-icon">
          <i class="fa-solid fa-building"></i>
        </div>
        <select class="form-control unidade-extra-select" required>
          <option value="" disabled selected>
            Selecione a unidade adicional ${contadorUnidades}
          </option>
          ${options}
        </select>
      </div>
    </div>
  `);
}

// MOSTRAR / OCULTAR SEÇÃO DE MUDANÇA DE FUNÇÃO E COLOCAR REQUIRED NOS CAMPOS
document.addEventListener("DOMContentLoaded", () => {
  const tipoExame = document.getElementById("tipoExame");
  const divMudancaFuncao = document.getElementById("divMudancaFuncao");

  const funcaoAtual = document.getElementById("funcaoAtual");
  const setorAtual = document.getElementById("setorAtual");

  const solicitarNovaFuncao = document.getElementById("solicitarNovaFuncao");
  const novaFuncaoWrapper = document.getElementById("novaFuncaoWrapper");
  const novaFuncao = document.getElementById("novaFuncao");

  const descricaoAtividade = document.getElementById("descricaoAtividade");

  const solicitarNovoSetor = document.getElementById("solicitarNovoSetor");
  const novoSetorWrapper = document.getElementById("novoSetorWrapper");
  const novoSetor = document.getElementById("novoSetor");

  // MOSTRA / OCULTAR SEÇÃO DE MUDANÇA DE FUNÇÃO
  tipoExame.addEventListener("change", () => {
    if (tipoExame.value === "MUDANCA_RISCOS_OCUPACIONAIS") {
      divMudancaFuncao.style.display = "block";

      funcaoAtual.required = true;
      setorAtual.required = true;
    } else {
      divMudancaFuncao.style.display = "none";

      funcaoAtual.required = false;
      setorAtual.required = false;

      solicitarNovaFuncao.checked = false;
      solicitarNovoSetor.checked = false;

      novaFuncaoWrapper.style.display = "none";
      novoSetorWrapper.style.display = "none";

      funcaoAtual.disabled = false;
      setorAtual.disabled = false;

      novaFuncao.required = false;
      novoSetor.required = false;

      novaFuncao.value = "";
      novoSetor.value = "";
    }
  });

  // MOSTAR INPUT DE NOVA FUNÇÃO E DESCRIÇÃO DE ATIVIDADE E COLOCAR REQUIRED
  solicitarNovaFuncao.addEventListener("change", function () {
    if (this.checked) {
      novaFuncaoWrapper.style.display = "block";

      funcaoAtual.value = "";
      funcaoAtual.disabled = true;
      funcaoAtual.required = false;

      novaFuncao.required = true;
      descricaoAtividade.required = true;
    } else {
      novaFuncaoWrapper.style.display = "none";

      funcaoAtual.disabled = false;
      funcaoAtual.required = true;

      novaFuncao.required = false;
      novaFuncao.value = "";

      descricaoAtividade.required = false;
    }
  });

  // MOSTRAR INPUT DE NOVO SETOR E COLOCAR REQUIRED
  solicitarNovoSetor.addEventListener("change", function () {
    if (this.checked) {
      novoSetorWrapper.style.display = "block";

      setorAtual.value = "";
      setorAtual.disabled = true;
      setorAtual.required = false;

      novoSetor.required = true;
    } else {
      novoSetorWrapper.style.display = "none";

      setorAtual.disabled = false;
      setorAtual.required = true;

      novoSetor.required = false;
      novoSetor.value = "";
    }
  });
});

// MOSTRAR / OCULTAR TEXTAREA DE MOTIVO DA CONSULTA E COLOCAR REQUIRED NO CAMPO
document.addEventListener("DOMContentLoaded", () => {
  const tipoExame = document.getElementById("tipoExame");
  const divMotivoConsulta = document.getElementById("divMotivoConsulta");

  const textAreaMotivoConsulta = document.getElementById("motivoConsulta");

  // MOSTRA / OCULTAR TEXTAREA DE MOTIVO DA CONSULTA
  tipoExame.addEventListener("change", () => {
    if (tipoExame.value === "CONSULTA_ASSISTENCIAL") {
      divMotivoConsulta.style.display = "block";

      textAreaMotivoConsulta.required = true;
    } else {
      divMotivoConsulta.style.display = "none";

      textAreaMotivoConsulta.required = false;
    }
  });
});

// MOSTRAR / OCULTAR AVISO DE RETORNO AO TRABALHO
document.addEventListener("DOMContentLoaded", () => {
  const tipoExame = document.getElementById("tipoExame");
  const divRetornoTrabalho = document.getElementById("divRetornoTrabalho");

  // MOSTRA / OCULTAR TEXTAREA DE MOTIVO DA CONSULTA
  tipoExame.addEventListener("change", () => {
    if (tipoExame.value === "RETORNO_TRABALHO") {
      divRetornoTrabalho.style.display = "block";
    } else {
      divRetornoTrabalho.style.display = "none";
    }
  });
});

// MOSTRAR SEÇÃO DE NOVO CREDENCIAMENTO
document.addEventListener("DOMContentLoaded", () => {
  const chkCredenciamento = document.getElementById("solicitarCredenciamento");

  const selectEstado = document.getElementById("estadoClinica");
  const selectCidade = document.getElementById("cidadeClinica");
  const selectClinica = document.getElementById("nomeClinica");

  const divCredenciamento = document.getElementById("divCredenciamento");
  const estadoCredenciamento = document.getElementById("estadoCredenciamento");
  const cidadeCredenciamento = document.getElementById("cidadeCredenciamento");

  if (!chkCredenciamento) return;

  function resetarSelect(select, texto = "Selecione...") {
    if (!select) return;
    select.innerHTML = `<option value="">${texto}</option>`;
    select.value = "";
  }

  function limparCampos() {
    estadoCredenciamento.value = "";
    cidadeCredenciamento.value = "";
  }

  chkCredenciamento.addEventListener("change", () => {
    if (chkCredenciamento.checked) {
      resetarSelect(selectEstado);
      resetarSelect(selectCidade);
      resetarSelect(selectClinica);

      selectEstado.disabled = true;
      selectCidade.disabled = true;
      selectClinica.disabled = true;

      divCredenciamento.style.display = "block";
    }
    else {
      selectEstado.disabled = false;
      selectCidade.disabled = false;
      selectClinica.disabled = false;

      divCredenciamento.style.display = "none";
      limparCampos();

      popularSelectEstados(extrairEstados(prestadoresCache));

      resetarSelect(selectCidade);
      resetarSelect(selectClinica);
    }
  });
});

// FUNÇÃO PARA CARREGAR OS PRESTADORES VINCULADOS À EMPRESA LOGADA
async function carregarPrestadores() {
  if (!empresaCodigo) return;

  const select = document.getElementById("nomeClinica");
  if (!select) return;

  try {
    await fetch(`/prestadores/${empresaCodigo}`);

    await listarPrestadores();

  } catch (err) {
    console.error("Erro ao carregar prestadores:", err);
  }
}

// FUNÇÃO PARA LISTAR ESSES PRESTADORES
async function listarPrestadores() {
  const res = await fetch(`/prestadores/${empresaCodigo}`);
  const prestadoresBase = await res.json();

  const detalhes = [];

  for (const p of prestadoresBase) {
    const prestador = await buscarDetalhesPrestador(p.codigo);

    if (prestador && prestador.nivelClassificacao?.toUpperCase() === "PREFERENCIAL") {
      detalhes.push(prestador);
    }
  }

  prestadoresCache = detalhes;

  console.table(
    prestadoresCache.map(p => ({
      codigo: p.codigo,
      estado: p.estado,
      cidade: p.cidade,
      nivel: p.nivelClassificacao
    }))
  );

  popularSelectEstados(extrairEstados(prestadoresCache));
}

// FUNÇÃO PARA PEGAR OS DETALHES DESSES PRESTADORES
async function buscarDetalhesPrestador(codigo) {
  try {
    const res = await fetch(`/prestador/${empresaCodigo}/${codigo}`);
    if (!res.ok) throw new Error();

    const dados = await res.json();

    return {
      codigo,
      nome: dados.nomePrestador || dados.nome || "",
      cidade: dados.cidade || "",
      estado: dados.estado || "",
      nivelClassificacao: dados.nivelClassificacao || ""
    };
  } catch {
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

// FUNÇÃO PARA POPULAR O SELECT DE ESTADOS
function popularSelectEstados(estados) {
  const select = document.getElementById("estadoClinica");
  if (!select) return;

  select.innerHTML = '<option value="">Selecione...</option>';

  estados.forEach(estado => {
    const opt = document.createElement("option");
    opt.value = estado;
    opt.textContent = estado;
    select.appendChild(opt);
  });
}

// QUANDO SELECIONAR O ESTADO, FILTRAR POR CIDADES
document.getElementById("estadoClinica").addEventListener("change", function () {
  const estadoSelecionado = this.value;
  const selectCidade = document.getElementById("cidadeClinica");

  selectCidade.innerHTML = '<option value="">Selecione...</option>';

  if (!estadoSelecionado) return;

  const cidadesUnicas = [...new Set(
    prestadoresCache
      .filter(p =>
        p.estado?.trim().toUpperCase() === estadoSelecionado?.trim().toUpperCase()
      )
      .map(p => p.cidade)
      .filter(cidade => cidade)
  )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  cidadesUnicas.forEach(cidade => {
    const opt = document.createElement("option");
    opt.value = cidade;
    opt.textContent = cidade;
    selectCidade.appendChild(opt);
  });
});

// QUANDO SELECIONAR A CIDADE, FILTRAR AS CLÍNICAS
document.getElementById("cidadeClinica").addEventListener("change", function () {
  const estadoSelecionado = document.getElementById("estadoClinica").value;
  const cidadeSelecionada = this.value;

  const selectClinica = document.getElementById("nomeClinica");
  selectClinica.innerHTML = '<option value="">Selecione...</option>';

  if (!estadoSelecionado || !cidadeSelecionada) return;

  const clinicasFiltradas = prestadoresCache
    .filter(p =>
      p.estado?.trim().toUpperCase() === estadoSelecionado?.trim().toUpperCase() &&
      p.cidade?.trim().toUpperCase() === cidadeSelecionada?.trim().toUpperCase()
    )
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  clinicasFiltradas.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.codigo;
    opt.textContent = p.nome;
    selectClinica.appendChild(opt);
  });
});

// COLOCAR REQUIRED NO CAMPO DE ESTADO CLÍNICA E CIDADE CLÍNICA PARA CREDENCIAMENTO
document.getElementById("solicitarCredenciamento").addEventListener("change", function () {
  const estadoSelect = document.getElementById("estadoClinica");
  const estadoCredenciamentoInput = document.getElementById("estadoCredenciamento");

  const cidadeSelect = document.getElementById("cidadeClinica");
  const cidadeCredenciamentoInput = document.getElementById("cidadeCredenciamento");

  if (this.checked) {
    estadoSelect.removeAttribute("required");
    cidadeSelect.removeAttribute("required");
    estadoSelect.value = "";
    cidadeSelect.value = "";

    estadoCredenciamentoInput.setAttribute("required", "required");
    cidadeCredenciamentoInput.setAttribute("required", "required");
  } else {
    estadoSelect.setAttribute("required", "required");
    cidadeSelect.setAttribute("required", "required");

    estadoCredenciamentoInput.removeAttribute("required");
    cidadeCredenciamentoInput.removeAttribute("required");
    estadoCredenciamentoInput.value = "";
    cidadeCredenciamentoInput.value = "";
  }
});

// FUNÇÃO PARA DEFINIR O STATUS INICIAL
function definirStatusInicial(s) {
  const precisaFuncaoSetor = s.solicitar_nova_funcao === true || s.solicitar_novo_setor === true;
  const precisaCredenciamento = s.solicitar_credenciamento === true;

  if (precisaFuncaoSetor) {
    return "PENDENTE_SC";
  }

  if (precisaCredenciamento) {
    return "PENDENTE_CREDENCIAMENTO";
  }

  return "PENDENTE";
}

// CHECKBOX DE NOVO SETOR TORNA OBRIGATORIO A CRIAÇÃO DE NOVO CARGO
document.addEventListener("DOMContentLoaded", () => {
  const chkNovoSetor = document.getElementById("solicitarNovoSetor");

  const selectFuncao = document.getElementById("funcaoAtual");

  function bloquearSelect(e) {
    if (chkNovoSetor.checked) {
      e.preventDefault();
      e.stopPropagation();
      alert("Para criação de novo setor é necessário criar nova função.");
      return false;
    }
  }

  // BLOQUEAR INTERAÇÃO
  selectFuncao.addEventListener("mousedown", bloquearSelect);
  selectFuncao.addEventListener("keydown", bloquearSelect);

  // LIMPAR O CAMPO DE CARGO SE ESTIVER SELECIONADO
  chkNovoSetor.addEventListener("change", () => {
    if (chkNovoSetor.checked) {
      selectFuncao.value = "";
    }
  });

  // VISUAL DE BLOQUEIO
  function atualizarVisual() {
    const bloqueado = chkNovoSetor.checked;
    selectFuncao.style.cursor = bloqueado ? "not-allowed" : "pointer";
  }

  chkNovoSetor.addEventListener("change", atualizarVisual);
  atualizarVisual();
});

// FUNÇÃO PARA ADICIONAR MAIS EMAIL PARA ENVIO DE ASO
let contadorEmails = 0;
const limiteEmails = 2;

function ativarEmails(valor) {

  const inputHidden = document.getElementById("enviarMaisEmails");
  const container = document.getElementById("emailsContainer");
  const btnAdd = document.getElementById("btnAddEmail");

  inputHidden.value = valor;

  if (valor) {
    container.classList.remove("d-none");
    btnAdd.classList.remove("d-none");

    if (contadorEmails === 0) {
      adicionarEmail();
    }

  } else {
    container.classList.add("d-none");
    btnAdd.classList.add("d-none");

    container.innerHTML = "";
    contadorEmails = 0;
  }
}

function adicionarEmail() {
  if (contadorEmails >= limiteEmails) {
    alert("Você pode adicionar no máximo 2 e-mails extras.");
    return;
  }

  contadorEmails++;

  const container = document.getElementById("emailsContainer");

  const div = document.createElement("div");
  div.classList.add("form-group", "mt-2");
  div.innerHTML = `
        <div class="input-wrapper">
            <div class="input-icon">
                <i class="fa-solid fa-envelope"></i>
            </div>
            <input type="email" name="emailsExtras[]" placeholder="Digite o e-mail adicional" required>
        </div>
    `;

  container.appendChild(div);
}

// FUNÇÃO PARA ENVIAR EMAIL NA HORA DA SOLICITAÇÃO
async function enviarEmailSolicitacao(dados) {
  let destinatario = null;
  let assunto = "";
  let mensagem = "";

  const precisaFuncaoSetor = dados.solicitar_nova_funcao === true || dados.solicitar_novo_setor === true;
  const precisaCredenciamento = dados.solicitar_credenciamento === true;

  // PRIORIDADE: FUNÇÃO / SETOR
  if (precisaFuncaoSetor) {
    destinatario = "nicolly.rocha@salubrita.com.br; paulina.oliveira@salubrita.com.br; rubia.costa@salubrita.com.br";
    //destinatario = "debora.fonseca@salubrita.com.br";
    assunto = "Solicitação de criação de setor/função";

    mensagem = `
      Uma solicitação para criação de setor/cargo para Empresa: ${dados.nome_empresa} foi gerada no Portal Salubritá.
      
      Gentileza dar prosseguimento à solicitação.
    `;
  }

  // SOMENTE SE NÃO TIVER FUNÇÃO/SETOR
  else if (precisaCredenciamento) {
    destinatario = "contratos@salubrita.com.br";
    //destinatario = "debora.fonseca@salubrita.com.br";
    assunto = "Solicitação de credenciamento";

    mensagem = `
      Uma solicitação de credenciamento para Empresa: ${dados.nome_empresa} foi gerada no Portal Salubritá.
      
      Gentileza dar prosseguimento à solicitação.
    `;
  }

  if (!destinatario) {
    return;
  }

  await fetch("/enviar-email-solicitacao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      destinatario,
      assunto,
      mensagem
    })
  });
}

// ENVIO DO FORMULÁRIO
document.getElementById("formCadastro").addEventListener("submit", async function (e) {
  e.preventDefault();

  const unidadeDestinoSelect = document.getElementById("unidadeDestinoSelect");
  const solicitarNovaFuncao = document.getElementById("solicitarNovaFuncao")?.checked === true;
  const solicitarNovoSetor = document.getElementById("solicitarNovoSetor")?.checked === true;
  const funcaoSelect = document.getElementById("funcaoAtual");
  const setorAtualSelect = document.getElementById("setorAtual");
  const nomeNovaFuncao = document.getElementById("novaFuncao")?.value || null;
  const nomeNovoSetor = document.getElementById("novoSetor")?.value || null;
  const solicitarCredenciamento = document.getElementById("solicitarCredenciamento")?.checked === true;
  const clinicaSelect = document.getElementById("nomeClinica");
  const racSelecionados = Array.from(document.querySelectorAll('input[name="form_rac"]:checked')).map(el => el.value);
  const tiposRacSelecionados = Array.from(document.querySelectorAll('input[name="tipo_rac"]:checked')).map(el => el.value);

  const unidades = Array.from(document.querySelectorAll(".unidade-extra-select"))
    .filter(select => select.value)
    .map(select => ({
      cod_unidade: select.value,
      nome_unidade: select.selectedOptions[0]?.dataset.nome || null
    }));

  const emailsExtras = Array.from(document.querySelectorAll('input[name="emailsExtras[]"]'))
    .map(input => input.value.trim())
    .filter(email => email !== "");

  const dados = {
    nome_funcionario: document.getElementById("nome").value,
    data_nascimento: document.getElementById("dataNascimento").value,
    cpf: document.getElementById("cpf").value,
    matricula: document.getElementById("matricula").value || null,
    data_admissao: document.getElementById("dataAdmissao").value,
    cod_empresa: usuarioLogado.cod_empresa,
    nome_empresa: document.getElementById("empresaNome").value,
    cod_unidade: document.getElementById("unidadeCodigo").value,
    nome_unidade: document.getElementById("unidadeNome").value,
    cod_setor: document.getElementById("setorCodigo").value,
    nome_setor: document.getElementById("setorNome").value,
    cod_cargo: document.getElementById("cargoCodigo").value,
    nome_cargo: document.getElementById("cargoNome").value,
    rac: racSelecionados.length ? racSelecionados : null,
    tipos_rac: tiposRacSelecionados.length ? tiposRacSelecionados : null,
    tipo_exame: document.getElementById("tipoExame").value,
    data_exame: document.getElementById("dataExame").value || null,
    unidades_extras: unidades,
    funcao_anterior: document.getElementById("funcaoAnterior").value,
    unidade_destino: unidadeDestinoSelect.value ? unidadeDestinoSelect.options[unidadeDestinoSelect.selectedIndex].text : null,
    funcao_atual: funcaoSelect.value ? funcaoSelect.options[funcaoSelect.selectedIndex].text : null,
    solicitar_nova_funcao: solicitarNovaFuncao,
    nome_nova_funcao: solicitarNovaFuncao ? nomeNovaFuncao : null,
    descricao_atividade: document.getElementById("descricaoAtividade").value,
    setor_atual: setorAtualSelect.value ? setorAtualSelect.options[setorAtualSelect.selectedIndex].text : null,
    solicitar_novo_setor: solicitarNovoSetor,
    nome_novo_setor: solicitarNovoSetor ? nomeNovoSetor : null,
    motivo_consulta: document.getElementById("motivoConsulta").value || null,
    cnh: document.getElementById("cnh").value || null,
    vencimento_cnh: document.getElementById("vencimentoCnh").value || null,
    lab_toxicologico: document.getElementById("labToxicologico").value || null,
    solicitar_credenciamento: solicitarCredenciamento,
    observacao: document.getElementById("observacao").value || null,
    emails_extras: emailsExtras,

    usuario_id: usuarioLogado.id
  };

  if (solicitarCredenciamento) {
    dados.estado_credenciamento = document.getElementById("estadoCredenciamento").value;
    dados.cidade_credenciamento = document.getElementById("cidadeCredenciamento").value;
  } else {
    dados.estado_clinica = document.getElementById("estadoClinica").value;
    dados.cidade_clinica = document.getElementById("cidadeClinica").value;
    dados.nome_clinica = clinicaSelect.options[clinicaSelect.selectedIndex]?.text || null;
  }

  const statusInicial = definirStatusInicial(dados);
  dados.status = statusInicial;

  try {
    const res = await fetch("/solicitar-exame", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });

    if (!res.ok) {
      throw new Error("Erro no envio");
    } else {
      alert("Solicitação enviada com sucesso!");

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }

    await enviarEmailSolicitacao(dados);

    document.getElementById("formCadastro").reset();
  } catch (erro) {
    console.error(erro);
    alert("Erro ao enviar solicitação");
  }
});

// FUNÇÃO DE LOGOUT
function logout() {
  sessionStorage.removeItem("usuario");
  sessionStorage.removeItem("empresaCodigo");
  window.location.href = "login.html";
}