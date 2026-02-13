// USUÁRIO LOGADO
const usuarioLogado = JSON.parse(localStorage.getItem("usuario"));

if (!usuarioLogado) {
  alert("Usuário não logado");
  window.location.href = "login.html";
}

// DADOS DA EMPRESA
const empresaCodigo = usuarioLogado.cod_empresa;
const nomeEmpresa = usuarioLogado.nome_empresa;

// CACHE
let prestadoresCache = [];

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
});

// INIT
document.addEventListener("DOMContentLoaded", async () => {
  preencherEmpresaUsuario();
  await carregarUnidades();
  await carregarSetores();
  await carregarCargos();
  preencherFuncionario();
  await carregarPrestadores();
});

// FUNÇÃO PARA PREENCHER O FORMULÁRIO COM OS DADOS ENCONTRADOS NO SOC
function preencherFuncionario() {
  const f = JSON.parse(localStorage.getItem("funcionario"));

  if (!f) {
    alert("Pesquise um funcionário primeiro");
    window.location.href = "solicitar-exame.html";
    return;
  }

  document.getElementById("nome").value = f.nome;
  document.getElementById("cpf").value = formatarCPF(f.cpf);
  document.getElementById("matricula").value = f.matricula || "NÃO POSSUI MATRÍCULA";

  // FORMATAR DATAS
  if (f.data_nascimento) {
    const [d, m, a] = f.data_nascimento.split("/");
    document.getElementById("data-nascimento").value = `${a}-${m}-${d}`;
  }

  if (f.data_admissao) {
    const [d, m, a] = f.data_admissao.split("/");
    document.getElementById("data_admissao").value = `${a}-${m}-${d}`;
  }

  document.getElementById("cpf").readOnly = true;

  setTimeout(() => {
    const unidadeSelect = document.getElementById("unidadeSelect");
    const setorSelect = document.getElementById("setorSelect");
    const cargoSelect = document.getElementById("cargoSelect");
    const funcaoAnterior = document.getElementById("funcao_anterior");

    unidadeSelect.value = f.cod_unidade;
    setorSelect.value = f.cod_setor;
    cargoSelect.value = f.cod_cargo;

    unidadeSelect.disabled = true;
    setorSelect.disabled = true;
    cargoSelect.disabled = true;

    funcaoAnterior.value = cargoSelect.options[cargoSelect.selectedIndex]?.text || "";
  }, 500);
}

// FUNÇÃO PARA FORMATAR CPF
function formatarCPF(cpf) {
  if (!cpf) return "";

  const numeros = cpf.replace(/\D/g, "");

  if (numeros.length !== 11) return cpf;

  return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// PREENCHER O CAMPO COM O NOME DA EMPRESA DO USUÁRIO LOGADO
function preencherEmpresaUsuario() {
  document.getElementById("empresaNomeView").value = usuarioLogado.nome_empresa;
  document.getElementById("empresaCodigoHidden").value = usuarioLogado.cod_empresa;
}

// MOSTRAR / OCULTAR TIPO RAC
const racSelect = document.getElementById("racSelect");
const divRacValeOpcoes = document.getElementById("divRacValeOpcoes");

racSelect.addEventListener("change", () => {
  if (racSelect.value === "FORMULARIO_RAC_VALE") {
    divRacValeOpcoes.classList.remove("d-none");
  } else {
    divRacValeOpcoes.classList.add("d-none");

    document.getElementById("racValeOpcao").value = "";
  }
});

// TORNAR OBRIGATÓRICO QUANDO A OPÇÃO SELECIONADA FOR VALE
const racValeOpcao = document.getElementById("racValeOpcao");

racSelect.addEventListener("change", () => {
  const isVale = racSelect.value === "FORMULARIO_RAC_VALE";

  divRacValeOpcoes.classList.toggle("d-none", !isVale);
  racValeOpcao.required = isVale;

  if (!isVale) {
    racValeOpcao.value = "";
  }
});

// NÃO PERMITIR DATAS MANUAIS COM MAIS DE 4 DÍGITOS NO ANO
document.addEventListener("DOMContentLoaded", function () {
  const inputDataExame = document.getElementById("data_exame");
  const inputVencimentoCNH = document.getElementById("vencimento_cnh");

  function limitarAno(input) {
    if (!input) return;

    input.addEventListener("input", function () {
      let valor = input.value;
      const partes = valor.split("-");

      if (partes[0]) {
        partes[0] = partes[0].slice(0, 4);
      }

      input.value = partes.join("-");
    });
  }

  limitarAno(inputDataExame);
  limitarAno(inputVencimentoCNH);
});

// LISTENER DOS CAMPOS DE DATA/HORA DO EXAME (SÓ PERMITIR MAIS DE 24H DA SOLICITAÇÃO)
const dataInput = document.getElementById("data_exame");

dataInput.addEventListener("blur", validarDataExame);

function validarDataExame() {
  const data = dataInput.value;
  if (!data) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataSelecionada = new Date(data + "T00:00:00");

  if (dataSelecionada <= hoje) {
    alert(
      "Atenção: o período para realização do exame deve ser, preferencialmente, no mínimo 24 horas da solicitação."
    );
  }
}

// MOSTRAR CAMPO DE ADD MAIS UNIDADES SE TIPO EXAME FOR 'PERIODICO', OU 'MUDANÇA FUNÇÃO' OU 'DEMISSIONAL'
document.addEventListener("DOMContentLoaded", () => {
  const tipoExame = document.getElementById("tipo_exame");
  const blocoMaisUnidades = document.getElementById("blocoSolicitarMaisUnidades");

  tipoExame.addEventListener("change", () => {
    const tiposPermitidos = ["PERIODICO", "MUDANCA_RISCOS_OCUPACIONAIS", "DEMISSIONAL"];

    if (tiposPermitidos.includes(tipoExame.value)) {
      blocoMaisUnidades.style.display = "block";
    } else {
      blocoMaisUnidades.style.display = "none";

      ativarUnidades(false);
    }
  });

  tipoExame.dispatchEvent(new Event("change"));
});

// FUNÇÃO PARA GERAR MAIS UNIDADES PRA SOLICITAR ASO
let contadorUnidades = 0;

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
  contadorUnidades++;

  const container = document.getElementById("unidadesContainer");
  const selectBase = document.getElementById("unidadeSelect");

  const options = Array.from(selectBase.options)
    .filter(opt => opt.value)
    .map(opt =>
      `<option value="${opt.value}"
          data-nome="${opt.dataset.nome}">
          ${opt.textContent}
        </option>`
    ).join("");

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
  const tipoExame = document.getElementById("tipo_exame");
  const cardMudancaFuncao = document.getElementById("cardMudancaFuncao");

  const funcaoAtual = document.getElementById("funcao_atual");
  const setorAtual = document.getElementById("setor_atual");

  const solicitarNovaFuncao = document.getElementById("solicitarNovaFuncao");
  const novaFuncaoWrapper = document.getElementById("novaFuncaoWrapper");
  const novaFuncao = document.getElementById("novaFuncao");

  const descricaoAtividade = document.getElementById("descricao_atividade");

  const solicitarNovoSetor = document.getElementById("solicitarNovoSetor");
  const novoSetorWrapper = document.getElementById("novoSetorWrapper");
  const novoSetor = document.getElementById("novoSetor");

  // MOSTRA / OCULTAR SEÇÃO DE MUDANÇA DE FUNÇÃO
  tipoExame.addEventListener("change", () => {
    if (tipoExame.value === "MUDANCA_RISCOS_OCUPACIONAIS") {
      cardMudancaFuncao.style.display = "block";

      funcaoAtual.required = true;
      setorAtual.required = true;
    } else {
      cardMudancaFuncao.style.display = "none";

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

// FUNÇÃO PARA CARREGAR O SELECT DAS UNIDADES
async function carregarUnidades() {
  const res = await fetch(`/unidades/${usuarioLogado.cod_empresa}`);

  const dados = await res.json();

  const select = document.getElementById("unidadeSelect");

  select.innerHTML = `<option value="">Selecione...</option>`;
  dados.forEach(u => {
    select.innerHTML += `<option value="${u.codigo}">${u.nome}</option>`;
  });
}

// FUNÇÃO PARA CARREGAR O SELECT DOS SETORES
async function carregarSetores() {
  const res = await fetch(`/setores/${usuarioLogado.cod_empresa}`);

  const dados = await res.json();

  const select = document.getElementById("setorSelect");
  const selectSetorAtual = document.getElementById("setor_atual");

  select.innerHTML = `<option value="">Selecione...</option>`;
  dados.forEach(s => {
    select.innerHTML += `<option value="${s.codigo}">${s.nome}</option>`;
  });

  selectSetorAtual.innerHTML = `<option value="">Selecione...</option>`;
  dados.forEach(c => {
    selectSetorAtual.innerHTML += `<option value="${c.codigo}">${c.nome}</option>`;
  });
}

// FUNÇÃO PARA CARREGAR O SELECT DOS CARGOS
async function carregarCargos() {
  const res = await fetch(`/cargos/${usuarioLogado.cod_empresa}`);
  const dados = await res.json();

  const selectCargo = document.getElementById("cargoSelect");
  const selectFuncaoAtual = document.getElementById("funcao_atual");

  selectCargo.innerHTML = `<option value="">Selecione...</option>`;
  selectFuncaoAtual.innerHTML = `<option value="">Selecione...</option>`;

  dados.forEach(c => {
    selectCargo.innerHTML += `<option value="${c.codigo}">${c.nome}</option>`;
    selectFuncaoAtual.innerHTML += `<option value="${c.codigo}">${c.nome}</option>`;
  });
}

// MOSTRAR / OCULTAR TEXTAREA DE MOTIVO DA CONSULTA E COLOCAR REQUIRED NO CAMPO
document.addEventListener("DOMContentLoaded", () => {
  const tipoExame = document.getElementById("tipo_exame");
  const cardMotivoConsulta = document.getElementById("cardMotivoConsulta");

  const textAreaMotivoConsulta = document.getElementById("motivo_consulta");

  // MOSTRA / OCULTAR TEXTAREA DE MOTIVO DA CONSULTA
  tipoExame.addEventListener("change", () => {
    if (tipoExame.value === "CONSULTA_ASSISTENCIAL") {
      cardMotivoConsulta.style.display = "block";

      textAreaMotivoConsulta.required = true;
    } else {
      cardMotivoConsulta.style.display = "none";

      textAreaMotivoConsulta.required = false;
    }
  });
});

// MOSTRAR / OCULTAR AVISO DE RETORNO AO TRABALHO
document.addEventListener("DOMContentLoaded", () => {
  const tipoExame = document.getElementById("tipo_exame");
  const cardRetornoTrabalho = document.getElementById("cardRetornoTrabalho");

  // MOSTRA / OCULTAR TEXTAREA DE MOTIVO DA CONSULTA
  tipoExame.addEventListener("change", () => {
    if (tipoExame.value === "RETORNO_TRABALHO") {
      cardRetornoTrabalho.style.display = "block";
    } else {
      cardRetornoTrabalho.style.display = "none";
    }
  });
});

// MOSTRAR SEÇÃO DE NOVO CREDENCIAMENTO
document.addEventListener("DOMContentLoaded", () => {
  const chkCredenciamento = document.getElementById("solicitarCredenciamento");

  const selectEstado = document.getElementById("estado_clinica");
  const selectCidade = document.getElementById("cidade_clinica");
  const selectClinica = document.getElementById("nome_clinica");

  const cardCredenciamento = document.getElementById("cardCredenciamento");
  const estadoCredenciamento = document.getElementById("estado_credenciamento");
  const cidadeCredenciamento = document.getElementById("cidade_credenciamento");

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

      cardCredenciamento.style.display = "block";
    }
    else {
      selectEstado.disabled = false;
      selectCidade.disabled = false;
      selectClinica.disabled = false;

      cardCredenciamento.style.display = "none";

      limparCampos();
    }
  });
});

// FUNÇÃO PARA CARREGAR OS PRESTADORES VINCULADOS À EMPRESA LOGADA
async function carregarPrestadores() {
  if (!empresaCodigo) return;

  const select = document.getElementById("nome_clinica");
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
    if (prestador) detalhes.push(prestador);
  }

  prestadoresCache = detalhes;

  console.table(
    prestadoresCache.map(p => ({
      codigo: p.codigo,
      estado: p.estado,
      cidade: p.cidade
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
      estado: dados.estado || ""
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
  const select = document.getElementById("estado_clinica");
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
document.getElementById("estado_clinica").addEventListener("change", function () {
  const estadoSelecionado = this.value;
  const selectCidade = document.getElementById("cidade_clinica");

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
document.getElementById("cidade_clinica").addEventListener("change", function () {
  const estadoSelecionado = document.getElementById("estado_clinica").value;
  const cidadeSelecionada = this.value;

  const selectClinica = document.getElementById("nome_clinica");
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
  const estadoSelect = document.getElementById("estado_clinica");
  const estadoCredenciamentoInput = document.getElementById("estado_credenciamento");

  const cidadeSelect = document.getElementById("cidade_clinica");
  const cidadeCredenciamentoInput = document.getElementById("cidade_credenciamento");

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

// CAMPO DE NOVA FUNÇÃO SEMPRE MAIÚSCULO
const inputNovaFuncao = document.getElementById("novaFuncao");

inputNovaFuncao.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE NOVO SETOR SEMPRE MAIÚSCULO
const inputNovoSetor = document.getElementById("novoSetor");

inputNovoSetor.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE NOME LABORATORIO SEMPRE MAIÚSCULO
const inputLaboratorioToxicologico = document.getElementById("lab_toxicologico");

inputLaboratorioToxicologico.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE ESTADO PARA CREDENCIAMENTO SEMPRE MAIÚSCULO
const inputEstadoCredenciamento = document.getElementById("estado_credenciamento");

inputEstadoCredenciamento.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

// CAMPO DE CIDADE PARA CREDENCIAMENTO SEMPRE MAIÚSCULO
const inputCidadeCredenciamento = document.getElementById("cidade_credenciamento");

inputCidadeCredenciamento.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
});

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
    destinatario = "wasidrf@outlook.com"; // EMAIL NICOLLY, PAULINA E RUBIA
    assunto = "Solicitação de criação de função/setor";

    mensagem = `
      Uma solicitação para criação de setor/cargo para Empresa: ${dados.nome_empresa} - Unidade: ${dados.nome_unidade} foi gerada no Portal Salubritá.
      
      Gentileza dar prosseguimento à solicitação.
    `;
  }

  // SOMENTE SE NÃO TIVER FUNÇÃO/SETOR
  else if (precisaCredenciamento) {
    destinatario = "fonsecadrf@outlook.com"; // EMAIL MARIA EDUARDA
    assunto = "Solicitação de credenciamento";

    mensagem = `
      Uma solicitação de credenciamento para Empresa: ${dados.nome_empresa} - Unidade: ${dados.nome_unidade} foi gerada no Portal Salubritá.
      
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

  const unidadeSelect = document.getElementById("unidadeSelect");
  const setorSelect = document.getElementById("setorSelect");
  const cargoSelect = document.getElementById("cargoSelect");
  const solicitarNovaFuncao = document.getElementById("solicitarNovaFuncao")?.checked === true;
  const solicitarNovoSetor = document.getElementById("solicitarNovoSetor")?.checked === true;
  const funcaoSelect = document.getElementById("funcao_atual");
  const setorAtualSelect = document.getElementById("setor_atual");
  const nomeNovaFuncao = document.getElementById("novaFuncao")?.value || null;
  const nomeNovoSetor = document.getElementById("novoSetor")?.value || null;
  const solicitarCredenciamento = document.getElementById("solicitarCredenciamento")?.checked === true;
  const clinicaSelect = document.getElementById("nome_clinica");
  const tiposRacSelecionados = Array.from(document.querySelectorAll('input[name="racValeOpcao"]:checked')).map(el => el.value);

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
    data_nascimento: document.getElementById("data-nascimento").value,
    cpf: document.getElementById("cpf").value,
    matricula: document.getElementById("matricula").value || null,
    data_admissao: document.getElementById("data_admissao").value,
    cod_empresa: usuarioLogado.cod_empresa,
    nome_empresa: document.getElementById("empresaNomeView").value,
    cod_unidade: unidadeSelect.value,
    nome_unidade: unidadeSelect.options[unidadeSelect.selectedIndex]?.text || null,
    cod_setor: setorSelect.value,
    nome_setor: setorSelect.options[setorSelect.selectedIndex]?.text || null,
    cod_cargo: cargoSelect.value,
    nome_cargo: cargoSelect.options[cargoSelect.selectedIndex]?.text || null,
    rac: document.getElementById("racSelect").value || null,
    tipos_rac: tiposRacSelecionados.length ? tiposRacSelecionados : null,
    tipo_exame: document.getElementById("tipo_exame").value,
    data_exame: document.getElementById("data_exame").value || null,
    unidades_extras: unidades,
    funcao_anterior: document.getElementById("funcao_anterior")?.value || null,
    funcao_atual: funcaoSelect.value ? funcaoSelect.options[funcaoSelect.selectedIndex].text : null,
    solicitar_nova_funcao: solicitarNovaFuncao,
    nome_nova_funcao: solicitarNovaFuncao ? nomeNovaFuncao : null,
    descricao_atividade: document.getElementById("descricao_atividade").value,
    setor_atual: setorAtualSelect.value ? setorAtualSelect.options[setorAtualSelect.selectedIndex].text : null,
    solicitar_novo_setor: solicitarNovoSetor,
    nome_novo_setor: solicitarNovoSetor ? nomeNovoSetor : null,
    motivo_consulta: document.getElementById("motivo_consulta").value || null,
    cnh: document.getElementById("cnh").value || null,
    vencimento_cnh: document.getElementById("vencimento_cnh").value || null,
    lab_toxicologico: document.getElementById("lab_toxicologico").value || null,
    solicitar_credenciamento: solicitarCredenciamento,
    observacao: document.getElementById("observacao").value || null,
    emails_extras: emailsExtras,

    usuario_id: usuarioLogado.id
  };

  if (solicitarCredenciamento) {
    dados.estado_credenciamento = document.getElementById("estado_credenciamento").value;
    dados.cidade_credenciamento = document.getElementById("cidade_credenciamento").value;
  } else {
    dados.estado_clinica = document.getElementById("estado_clinica").value;
    dados.cidade_clinica = document.getElementById("cidade_clinica").value;
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
  localStorage.removeItem("usuario");
  localStorage.removeItem("empresaCodigo");
  window.location.href = "login.html";
}