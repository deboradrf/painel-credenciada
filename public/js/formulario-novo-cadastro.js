let prestadoresCache = [];

const usuarioLogado = getUsuario();
const codigoEmpresa = getEmpresaCodigo();
const nomeEmpresa = getEmpresaNome();
const unidadesEmpresa = getEmpresaUnidades();

// DROPDOWN DO PERFIL
document.addEventListener("DOMContentLoaded", () => {
  // PREENCHE O CAMPO DE EMPRESA NO FORMULÁRIO
  document.getElementById("empresaNomeView").value = nomeEmpresa;
  document.getElementById("empresaCodigoHidden").value = codigoEmpresa;

  const avatarIcon = document.getElementById("avatarIcon");
  const avatarIconDropdown = document.getElementById("avatarIconDropdown");

  const userNameDropdown = document.getElementById("userNameDropdown");
  const dropdownUserExtra = document.getElementById("dropdownUserExtra");

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
  await carregarUnidades();
  await carregarPrestadores();
});

// CAMPO DE NOME SEMPRE MAIÚSCULO E SEM CARACTERES ESPECIAIS
const nomeInput = document.getElementById("nome");

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

// MÁSCARA DE RG
const rgInput = document.getElementById("docIdentidade");

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

// MÁSCARA DE CPF
const cpfInput = document.getElementById("cpf");

cpfInput.addEventListener("input", function () {
  let value = this.value.replace(/\D/g, "");

  if (value.length > 11) value = value.slice(0, 11);

  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  this.value = value;

  this.setCustomValidity("");
  this.classList.remove("is-invalid");
});

cpfInput.addEventListener("blur", function () {
  const cpfLimpo = this.value.replace(/\D/g, "");

  if (cpfLimpo === "") return;

  if (!validarCPF(this.value)) {
    this.setCustomValidity("CPF inválido ou incompleto");
    this.classList.add("is-invalid");
    this.reportValidity();
  } else {
    this.setCustomValidity("");
    this.classList.remove("is-invalid");
  }
});

// FUNÇÃO PARA VALIDAR O CPF
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, "");

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[10])) return false;

  return true;
}

// CAMPOS EM MAIÚSCULO
const camposMaiusculo = [
  "nomeFantasia",
  "razaoSocial",
  "rua",
  "bairro",
  "estado",
  "novoSetor",
  "novoCargo",
  "labToxicologico",
  "estadoCredenciamento",
  "cidadeCredenciamento"
];

camposMaiusculo.forEach(id => {
  const campo = document.getElementById(id);

  if (campo) {
    campo.addEventListener("input", function () {
      this.value = this.value.toUpperCase();
    });
  }
});

// FUNÇÃO PARA CARREGAR UNIDADES DA EMPRESA FILTRANDO PELO USUÁRIO LOGADO
async function carregarUnidades() {
  const select = document.getElementById("unidadeSelect");

  if (!codigoEmpresa) return;

  try {
    const res = await fetch(`/api/unidades/${codigoEmpresa}`);
    const unidadesBackend = await res.json();

    let unidadesParaMostrar = [];

    const possuiTodas = unidadesEmpresa.some(u => u.cod_unidade === "TODAS");

    if (possuiTodas) {
      unidadesParaMostrar = unidadesBackend;
    }
    else {
      const codUnidadesUsuario = unidadesEmpresa.map(u => String(u.cod_unidade));

      unidadesParaMostrar = unidadesBackend.filter(u =>
        codUnidadesUsuario.includes(String(u.codigo))
      );
    }

    select.innerHTML = '<option value="">Selecione...</option>';

    unidadesParaMostrar.forEach(u => {
      const opt = document.createElement("option");

      opt.value = u.codigo;
      opt.textContent = u.ativo ? u.nome : `${u.nome} (inativo)`;
      opt.dataset.nome = u.nome;

      select.appendChild(opt);
    });

  } catch (erro) {
    console.error(erro);
  }
}

// LISTENER NO SELECT DE UNIDADE
document.getElementById("unidadeSelect").addEventListener("change", async function () {
  const codUnidade = this.value;
  const selectSetor = document.getElementById("setorSelect");

  selectSetor.innerHTML = '<option value="">Selecione...</option>';

  if (!codUnidade) return;

  try {
    const res = await fetch(`/api/hierarquia/${codigoEmpresa}/${codUnidade}`);
    const setores = await res.json();

    setores
      .forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.codigoSetor;
        opt.textContent = s.nomeSetor;
        opt.dataset.nome = s.nomeSetor;
        selectSetor.appendChild(opt);
      });

  } catch (erro) {
    console.error(erro);
  }
});

// LISTENER NO SELECT DE SETOR
document.getElementById("setorSelect").addEventListener("change", async function () {
  const codSetor = this.value;
  const codUnidade = document.getElementById("unidadeSelect").value;
  const selectCargo = document.getElementById("cargoSelect");

  selectCargo.innerHTML = '<option value="">Selecione...</option>';

  if (!codSetor || !codUnidade) return;

  try {
    const res = await fetch(`/api/hierarquia/${codigoEmpresa}/${codUnidade}/${codSetor}`);

    const cargos = await res.json();

    cargos.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.codigoCargo;
      opt.textContent = c.nomeCargo;
      opt.dataset.nome = c.nomeCargo;
      selectCargo.appendChild(opt);
    });

  } catch (erro) {
    console.error(erro);
  }
});

// MOSTRAR / OCULTAR SEÇÃO DE NOVA UNIDADE E DEFINIR REQUIRED NOS CAMPOS
document.addEventListener("DOMContentLoaded", () => {
  const chkNovaUnidade = document.getElementById("solicitarNovaUnidade");
  const unidadeSelect = document.getElementById("unidadeSelect");
  const divNovaUnidade = document.getElementById("divNovaUnidade");

  const camposNovaUnidade = [
    "nomeFantasia",
    "razaoSocial",
    "cnpj",
    "cnae",
    "cep",
    "rua",
    "numero",
    "bairro",
    "estado",
    "email"
  ].map(id => document.getElementById(id));

  const radiosTipoFaturamento = document.querySelectorAll('input[name="tipoFaturamento"]');

  if (!chkNovaUnidade || !unidadeSelect || !divNovaUnidade) return;

  function atualizarNovaUnidade() {
    if (chkNovaUnidade.checked) {
      // MOSTRAR DIV DE NOVA UNIDADE
      divNovaUnidade.style.display = "block";

      // BLOQUEAR O SELECT DE UNIDADE
      unidadeSelect.value = "";
      unidadeSelect.disabled = true;
      unidadeSelect.removeAttribute("required");
      unidadeSelect.style.cursor = "not-allowed";

      // MARCAR CAMPOS DA NOVA UNIDADE COMO REQUIRED
      camposNovaUnidade.forEach(campo => {
        if (campo) campo.required = true;
      });

      radiosTipoFaturamento.forEach(radio => radio.required = true);

    } else {
      // OCULTAR DIV DE NOVA UNIDADE
      divNovaUnidade.style.display = "none";

      // DESBLOQUEAR SELECT DE UNIDADE
      unidadeSelect.disabled = false;
      unidadeSelect.setAttribute("required", "required");
      unidadeSelect.style.cursor = "pointer";

      // REMOVER REQUIRED DOS CAMPOS DE NOVA UNIDADE
      camposNovaUnidade.forEach(campo => {
        if (campo) {
          campo.required = false;
          campo.value = "";
        }
      });

      radiosTipoFaturamento.forEach(radio => {
        radio.required = false;
        radio.checked = false;
      });
    }
  }

  chkNovaUnidade.addEventListener("change", atualizarNovaUnidade);

  atualizarNovaUnidade();
});

// MÁSCARA DE CNPJ
document.getElementById('cnpj').addEventListener('input', function (e) {
  let value = e.target.value;

  value = value.replace(/\D/g, '');

  value = value.replace(/^(\d{2})(\d)/, '$1.$2');
  value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
  value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
  value = value.replace(/(\d{4})(\d)/, '$1-$2');

  e.target.value = value;
});

// CHECKBOX DE NOVA UNIDADE TORNA OBRIGATORIO A CRIAÇÃO DE NOVO SETOR/CARGO
document.addEventListener("DOMContentLoaded", () => {
  const chkNovaUnidade = document.getElementById("solicitarNovaUnidade");

  const selectSetor = document.getElementById("setorSelect");
  const selectCargo = document.getElementById("cargoSelect");

  function bloquearSelect(e) {
    if (chkNovaUnidade.checked) {
      e.preventDefault();
      e.stopPropagation();
      notify.warning("Para criação de nova unidade é necessário criar novo setor e cargo");
      return false;
    }
  }

  // BLOQUEAR INTERAÇÕES
  selectSetor.addEventListener("mousedown", bloquearSelect);
  selectCargo.addEventListener("mousedown", bloquearSelect);
  selectSetor.addEventListener("keydown", bloquearSelect);
  selectCargo.addEventListener("keydown", bloquearSelect);

  // LIMPAR OS CAMPOS DE SETOR E CARGO SE ESTIVER SELECIONADOS
  chkNovaUnidade.addEventListener("change", () => {
    if (chkNovaUnidade.checked) {
      selectSetor.value = "";
      selectCargo.value = "";
    }
  });

  // VISUAL DE BLOQUEIO
  function atualizarVisual() {
    const bloqueado = chkNovaUnidade.checked;
    selectSetor.style.cursor = bloqueado ? "not-allowed" : "pointer";
    selectCargo.style.cursor = bloqueado ? "not-allowed" : "pointer";
  }

  chkNovaUnidade.addEventListener("change", atualizarVisual);
  atualizarVisual();
});

const inputCep = document.getElementById("cep");

inputCep.addEventListener("input", function () {

  let valor = this.value.replace(/\D/g, "");

  if (valor.length > 5) {
    valor = valor.slice(0, 5) + "-" + valor.slice(5, 8);
  }

  this.value = valor;
});

// MOSTRAR / OCULTAR SEÇÃO DE NOVO SETOR E DEFINIR REQUIRED NO CAMPO
document.addEventListener("DOMContentLoaded", () => {
  const chkSolicitarNovoSetor = document.getElementById("solicitarNovoSetor");
  const wrapperNovoSetor = document.getElementById("novoSetorWrapper");
  const selectSetor = document.getElementById("setorSelect");
  const novoSetor = document.getElementById("novoSetor");

  if (!chkSolicitarNovoSetor || !selectSetor || !wrapperNovoSetor) return;

  function atualizarNovoSetor() {
    if (chkSolicitarNovoSetor.checked) {
      // MOSTRAR DIV DO NOVO SETOR
      wrapperNovoSetor.style.display = "block";

      // BLOQUEAR SELECT DE SETOR
      selectSetor.value = "";
      selectSetor.disabled = true;
      selectSetor.removeAttribute("required");
      selectSetor.style.cursor = "not-allowed";

      // CAMPO NOVO SETOR OBRIGATÓRIO
      if (novoSetor) novoSetor.required = true;

    } else {
      // OCULTAR DIV DO NOVO SETOR
      wrapperNovoSetor.style.display = "none";

      // DESBLOQUEAR SELECT DE SETOR
      selectSetor.disabled = false;
      selectSetor.setAttribute("required", "required");
      selectSetor.style.cursor = "pointer";

      // CAMPO NOVO SETOR NÃO OBRIGATÓRIO
      if (novoSetor) {
        novoSetor.required = false;
        novoSetor.value = "";
      }
    }
  }
  chkSolicitarNovoSetor.addEventListener("change", atualizarNovoSetor);

  atualizarNovoSetor();
});

// CHECKBOX DE NOVO SETOR TORNA OBRIGATORIO A CRIAÇÃO DE NOVO CARGO
document.addEventListener("DOMContentLoaded", () => {
  const chkNovoSetor = document.getElementById("solicitarNovoSetor");

  const selectCargo = document.getElementById("cargoSelect");

  function bloquearSelect(e) {
    if (chkNovoSetor.checked) {
      e.preventDefault();
      e.stopPropagation();
      notify.warning("Para criação de novo setor é necessário criar novo cargo");
      return false;
    }
  }

  // BLOQUEAR INTERAÇÃO
  selectCargo.addEventListener("mousedown", bloquearSelect);
  selectCargo.addEventListener("keydown", bloquearSelect);

  // LIMPAR O CAMPO DE CARGO SE ESTIVER SELECIONADO
  chkNovoSetor.addEventListener("change", () => {
    if (chkNovoSetor.checked) {
      selectCargo.value = "";
    }
  });

  // VISUAL DE BLOQUEIO
  function atualizarVisual() {
    const bloqueado = chkNovoSetor.checked;
    selectCargo.style.cursor = bloqueado ? "not-allowed" : "pointer";
  }

  chkNovoSetor.addEventListener("change", atualizarVisual);
  atualizarVisual();
});

// MOSTRAR / OCULTAR SEÇÃO DE NOVO CARGO E DESCRIÇÃO DE ATIVIDADE E DEFINIR REQUIRED NOS CAMPOS
document.addEventListener("DOMContentLoaded", () => {
  const chkSolicitarNovoCargo = document.getElementById("solicitarNovoCargo");
  const wrapperNovoCargo = document.getElementById("novoCargoWrapper");
  const wrapperDescricaoAtividade = document.getElementById("descricaoAtividadeWrapper");
  const selectCargo = document.getElementById("cargoSelect");
  const novoCargo = document.getElementById("novoCargo");
  const descricaoAtividade = document.getElementById("descricaoAtividade");

  if (!chkSolicitarNovoCargo || !selectCargo || !wrapperNovoCargo || !wrapperDescricaoAtividade) return;

  function atualizarNovoCargo() {
    if (chkSolicitarNovoCargo.checked) {
      // MOSTRAR DIVS
      wrapperNovoCargo.style.display = "block";
      wrapperDescricaoAtividade.style.display = "block";

      // BLOQUEAR SELECT DE CARGO
      selectCargo.value = "";
      selectCargo.disabled = true;
      selectCargo.removeAttribute("required");
      selectCargo.style.cursor = "not-allowed";

      // CAMPOS OBRIGATÓRIOS
      if (novoCargo) novoCargo.required = true;
      if (descricaoAtividade) descricaoAtividade.required = true;

    } else {
      // OCULTAR DIVS
      wrapperNovoCargo.style.display = "none";
      wrapperDescricaoAtividade.style.display = "none";

      // DESBLOQUEAR SELECT DE CARGO
      selectCargo.disabled = false;
      selectCargo.setAttribute("required", "required");
      selectCargo.style.cursor = "pointer";

      // CAMPOS NÃO OBRIGATÓRIOS
      if (novoCargo) {
        novoCargo.required = false;
        novoCargo.value = "";
      }
      if (descricaoAtividade) {
        descricaoAtividade.required = false;
        descricaoAtividade.value = "";
      }
    }
  }

  chkSolicitarNovoCargo.addEventListener("change", atualizarNovoCargo);

  atualizarNovoCargo();
});

// MOSTRAR / OCULTAR TIPO RAC
const racCheckboxes = document.querySelectorAll('input[name="formRac"]');
const divRacValeOpcoes = document.getElementById("divRacValeOpcoes");

racCheckboxes.forEach(cb => {
  cb.addEventListener("change", () => {
    // se algum checkbox selecionado for RAC Vale
    const racValeSelecionado = Array.from(racCheckboxes)
      .some(input => input.checked && input.value === "FORMULARIO_RAC_VALE");

    divRacValeOpcoes.classList.toggle("d-none", !racValeSelecionado);

    if (!racValeSelecionado) {
      // limpa seleção dos tipos RAC Vale
      document.querySelectorAll('input[name="racValeOpcao"]').forEach(cb => cb.checked = false);
    }
  });
});

// LISTENER DOS CAMPOS DE DATA/HORA DO EXAME (SÓ PERMITIR MAIS DE 24H DA SOLICITAÇÃO)
const dataInput = document.getElementById("dataExame");

dataInput.addEventListener("blur", validarDataHoraExame);

function validarDataHoraExame() {
  const data = dataInput.value;
  if (!data) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataSelecionada = new Date(data + "T00:00:00");

  if (dataSelecionada <= hoje) {
    notify.warning("O período para realização do exame deve ser de no mínimo 24 horas da solicitação");
  }
}

// FUNÇÃO PARA GERAR MAIS UNIDADES PRA SOLICITAR ASO
let contadorUnidades = 0;
const limiteUnidades = 10;

function ativarUnidades(ativar) {
  const container = document.getElementById("unidadesContainer");
  const hidden = document.getElementById("solicitarMaisUnidades");

  if (ativar) {
    hidden.value = "true";
    container.classList.remove("d-none");

    if (contadorUnidades === 0) {
      adicionarUnidade();
    }
  } else {
    hidden.value = "false";
    container.classList.add("d-none");
    container.innerHTML = "";
    contadorUnidades = 0;
  }
}

function adicionarUnidade() {
  if (contadorUnidades >= limiteUnidades) {
    notify.warning("Máximo de 10 unidades permitido");
    return;
  }

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
    <div class="form-group mt-2 unidade-extra d-flex align-items-center gap-2">
      <div class="input-wrapper flex-grow-1">
        <div class="input-icon">
          <i class="fa-solid fa-building"></i>
        </div>
        <select class="form-control unidade-extra-select" required>
          <option value="" disabled selected>
            Selecione a unidade adicional
          </option>
          ${options}
        </select>
      </div>

      <button type="button" class="btn-add" onclick="adicionarUnidade()">
        <i class="fa-solid fa-plus"></i>
      </button>

      <button type="button" class="btn-remove" onclick="removerUnidade(this)">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `);
}

function removerUnidade(btn) {
  btn.closest(".unidade-extra").remove();
  contadorUnidades--;
}

// FUNÇÃO PARA CARREGAR OS PRESTADORES VINCULADOS À EMPRESA LOGADA
async function carregarPrestadores() {
  if (!codigoEmpresa) return;

  const select = document.getElementById("nomeClinica");
  if (!select) return;

  try {
    await listarPrestadores();

  } catch (erro) {
    console.error(erro);
  }
}

// LISTAR OS PRESTADORES
async function listarPrestadores() {
  const res = await fetch(`/api/prestadores/${codigoEmpresa}/detalhes`);
  prestadoresCache = await res.json();

  popularSelectEstados(extrairEstados(prestadoresCache));
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
    opt.dataset.nome = p.nome;
    selectClinica.appendChild(opt);
  });
});

// MOSTRAR / OCULTAR SEÇÃO DE NOVO CREDENCIAMENTO
document.addEventListener("DOMContentLoaded", () => {
  const chkCredenciamento = document.getElementById("solicitarCredenciamento");

  const selectEstado = document.getElementById("estadoClinica");
  const selectCidade = document.getElementById("cidadeClinica");
  const selectClinica = document.getElementById("nomeClinica");

  const cardCredenciamento = document.getElementById("cardCredenciamento");
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

      cardCredenciamento.style.display = "block";
    }
    else {
      selectEstado.disabled = false;
      selectCidade.disabled = false;
      selectClinica.disabled = false;

      cardCredenciamento.style.display = "none";
      limparCampos();

      popularSelectEstados(extrairEstados(prestadoresCache));

      resetarSelect(selectCidade);
      resetarSelect(selectClinica);
    }
  });
});

// CHECKBOX DE NÃO POSSUI MATRICULA
document.addEventListener("DOMContentLoaded", () => {
  const chkNaoPossuiMatricula = document.getElementById("naoPossuiMatricula");
  const inputMatricula = document.getElementById("matricula");

  if (!chkNaoPossuiMatricula || !inputMatricula) return;

  chkNaoPossuiMatricula.addEventListener("change", () => {
    if (chkNaoPossuiMatricula.checked) {
      inputMatricula.value = "";
      inputMatricula.disabled = true;
      inputMatricula.removeAttribute("required");
    }
    else {
      inputMatricula.disabled = false;
      inputMatricula.setAttribute("required", "required");
    }
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

// FUNÇÃO PARA ADICIONAR MAIS EMAILS PARA ENVIO DE ASO
let contadorEmails = 0;
const limiteEmails = 2;

function ativarEmails(valor) {
  const inputHidden = document.getElementById("enviarMaisEmails");
  const container = document.getElementById("emailsContainer");

  inputHidden.value = valor;

  if (valor) {
    container.classList.remove("d-none");

    if (contadorEmails === 0) {
      adicionarEmail();
    }

  } else {
    container.classList.add("d-none");

    container.innerHTML = "";
    contadorEmails = 0;
  }
}

function adicionarEmail() {
  if (contadorEmails >= limiteEmails) {
    notify.warning("Máximo de 2 e-mails permitido");
    return;
  }

  contadorEmails++;

  const container = document.getElementById("emailsContainer");

  const div = document.createElement("div");
  div.classList.add("form-group", "mt-2", "d-flex", "align-items-center", "gap-2", "email-extra");

  div.innerHTML = `
        <div class="input-wrapper flex-grow-1">
            <div class="input-icon">
                <i class="fa-solid fa-envelope"></i>
            </div>
            <input type="email" name="emailsExtras[]" placeholder="Digite o e-mail adicional" required>
        </div>

        <button type="button" class="btn-add" onclick="adicionarEmail()">
            <i class="fa-solid fa-plus"></i>
        </button>

        <button type="button" class="btn-remove" onclick="removerEmail(this)">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;

  container.appendChild(div);
}

function removerEmail(btn) {
  btn.closest(".email-extra").remove();
  contadorEmails--;
}

// MAPA DAS CATEGORIAS DO ESOCIAL
const codCategoriaMap = {
  CLT: "101",
  COOPERADO: "741",
  TERCERIZADO: "701",
  AUTONOMO: "701",
  TEMPORARIO: "106",
  PESSOA_JURIDICA: "701",
  ESTAGIARIO: "901",
  MENOR_APRENDIZ: "103"
};

// ENVIO DO FORMULÁRIO
document.getElementById("formCadastro").addEventListener("submit", async function (e) {
  e.preventDefault();

  const unidadeSelect = document.getElementById("unidadeSelect");
  const solicitarNovaUnidade = document.getElementById("solicitarNovaUnidade")?.checked === true;
  const nomeFantasia = document.getElementById("nomeFantasia")?.value || null;
  const razaoSocial = document.getElementById("razaoSocial")?.value || null;
  const cnpj = document.getElementById("cnpj")?.value || null;
  const cnae = document.getElementById("cnae")?.value || null;
  const cep = document.getElementById("cep")?.value || null;
  const rua = document.getElementById("rua")?.value || null;
  const numero = document.getElementById("numero")?.value || null;
  const bairro = document.getElementById("bairro")?.value || null;
  const estado = document.getElementById("estado")?.value || null;
  const email = document.getElementById("email")?.value || null;
  const tipoFaturamento = document.querySelector('input[name="tipoFaturamento"]:checked')?.value || null;
  const setorSelect = document.getElementById("setorSelect");
  const cargoSelect = document.getElementById("cargoSelect");
  const tipoContratacaoValue = document.getElementById("tipoContratacao").value;
  const naoPossuiMatricula = document.getElementById("naoPossuiMatricula")?.checked === true;
  const solicitarNovoSetor = document.getElementById("solicitarNovoSetor")?.checked === true;
  const solicitarNovoCargo = document.getElementById("solicitarNovoCargo")?.checked === true;
  const nomeNovoSetor = document.getElementById("novoSetor")?.value || null;
  const nomeNovoCargo = document.getElementById("novoCargo")?.value || null;
  const racSelecionados = Array.from(document.querySelectorAll('input[name="formRac"]:checked')).map(el => el.value);
  const tiposRacSelecionados = Array.from(document.querySelectorAll('input[name="racValeOpcao"]:checked')).map(el => el.value);
  const solicitarCredenciamento = document.getElementById("solicitarCredenciamento")?.checked === true;

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
    sexo: document.getElementById("sexo").value,
    estado_civil: document.getElementById("estadoCivil").value,
    doc_identidade: document.getElementById("docIdentidade").value || null,
    cpf: document.getElementById("cpf").value,
    matricula: naoPossuiMatricula ? null : document.getElementById("matricula").value,
    nao_possui_matricula: naoPossuiMatricula,
    data_admissao: document.getElementById("dataAdmissao").value,
    tipo_contratacao: tipoContratacaoValue,
    cod_categoria: codCategoriaMap[tipoContratacaoValue],
    regime_trabalho: document.getElementById("regimeTrabalho").value,
    cod_empresa: codigoEmpresa,
    nome_empresa: nomeEmpresa,
    cod_unidade: solicitarNovaUnidade ? null : unidadeSelect.value,
    nome_unidade: solicitarNovaUnidade ? null : unidadeSelect.selectedOptions[0].dataset.nome,
    solicitar_nova_unidade: solicitarNovaUnidade,
    nome_fantasia: solicitarNovaUnidade ? nomeFantasia : null,
    razao_social: solicitarNovaUnidade ? razaoSocial : null,
    cnpj: solicitarNovaUnidade ? cnpj : null,
    cnae: solicitarNovaUnidade ? cnae : null,
    cep: solicitarNovaUnidade ? cep : null,
    rua: solicitarNovaUnidade ? rua : null,
    numero: solicitarNovaUnidade ? numero : null,
    bairro: solicitarNovaUnidade ? bairro : null,
    estado: solicitarNovaUnidade ? estado : null,
    tipo_faturamento: solicitarNovaUnidade ? tipoFaturamento : null,
    email: solicitarNovaUnidade ? email : null,
    cod_setor: solicitarNovoSetor ? null : setorSelect.value,
    nome_setor: solicitarNovoSetor ? null : setorSelect.selectedOptions[0].dataset.nome,
    solicitar_novo_setor: solicitarNovoSetor,
    nome_novo_setor: solicitarNovoSetor ? nomeNovoSetor : null,
    cod_cargo: solicitarNovoCargo ? null : cargoSelect.value,
    nome_cargo: solicitarNovoCargo ? null : cargoSelect.selectedOptions[0].dataset.nome,
    solicitar_novo_cargo: solicitarNovoCargo,
    nome_novo_cargo: solicitarNovoCargo ? nomeNovoCargo : null,
    descricao_atividade: document.getElementById("descricaoAtividade").value,
    rac: racSelecionados.length ? racSelecionados : null,
    tipos_rac: tiposRacSelecionados.length ? tiposRacSelecionados : null,
    tipo_exame: document.getElementById("tipoExame").value,
    data_exame: document.getElementById("dataExame").value || null,
    unidades_extras: unidades,
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
    dados.observacao_credenciamento = document.getElementById("observacaoCredenciamento").value;
  }
  else {
    dados.estado_clinica = document.getElementById("estadoClinica").value;
    dados.cidade_clinica = document.getElementById("cidadeClinica").value;

    const clinicaSelect = document.getElementById("nomeClinica");

    dados.cod_clinica = clinicaSelect.value;
    dados.nome_clinica = clinicaSelect.selectedOptions[0]?.dataset.nome || null;
  }

  const statusInicial = definirStatusInicial(dados);
  dados.status = statusInicial;

  try {
    const res = await fetch("/api/novo-cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });

    if (!res.ok) {
      throw new Error("Erro no envio");
    }
    else {
      notify.success("Solicitação enviada com sucesso!");

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

      setTimeout(() => {
        window.location.href = "/pages/index.html";
      }, 3000);
    }

    await enviarEmailSolicitacao(dados);

    document.getElementById("formCadastro").reset();
  } catch (erro) {
    console.error(erro);
  }
});

// FUNÇÃO PARA ENVIO DE EMAIL NA HORA DA SOLICITAÇÃO
async function enviarEmailSolicitacao(dados) {
  let tipoSolicitacao = "";
  let assunto = "";

  if (dados.solicitar_nova_unidade === true) {
    tipoSolicitacao = "UNIDADE";
    assunto = "Solicitação de Criação de Unidade";
  }

  else if (dados.solicitar_novo_setor === true || dados.solicitar_novo_cargo === true) {
    tipoSolicitacao = "SETOR_CARGO";
    assunto = "Solicitação de Criação de Setor/Cargo";
  }

  else if (dados.solicitar_credenciamento === true) {
    tipoSolicitacao = "CREDENCIAMENTO";
    assunto = "Solicitação de Credenciamento";
  }

  const mensagem = `
    Uma solicitação para a Empresa: ${dados.nome_empresa} foi gerada no Portal Salubritá.
    
    Gentileza dar prosseguimento à solicitação.
  `;

  await fetch("/enviar-email-solicitacao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tipoSolicitacao,
      assunto,
      mensagem,
      codigo_empresa: dados.cod_empresa
    })
  });
}

// FUNÇÃO PARA DEFINIR OS STATUS INICIAIS DAS SOLICITAÇÕES
function definirStatusInicial(s) {
  const precisaUnidade = s.solicitar_nova_unidade === true;
  const precisaSetorCargo = s.solicitar_novo_setor === true || s.solicitar_novo_cargo === true;
  const precisaCredenciamento = s.solicitar_credenciamento === true;

  if (precisaUnidade) {
    return "PENDENTE_UNIDADE";
  }

  if (precisaSetorCargo) {
    return "PENDENTE_SC";
  }

  if (precisaCredenciamento) {
    return "PENDENTE_CREDENCIAMENTO";
  }

  return "PENDENTE";
}