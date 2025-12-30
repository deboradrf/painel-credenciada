const params = new URLSearchParams(window.location.search);
const empresaCodigo = params.get("empresa");

if (!empresaCodigo) {
  alert("Empresa não informada na URL");
}

// FUNÇÃO PARA CARREGAR NOME DA EMPRESA
async function carregarNomeEmpresa() {
  if (!empresaCodigo) return;

  try {
    const res = await fetch("http://localhost:3001/empresas");
    const empresas = await res.json();

    const empresaSelecionada = empresas.find(
      e => String(e.codigo) === String(empresaCodigo)
    );

    if (empresaSelecionada) {
      nomeEmpresa = empresaSelecionada.nome;
      console.log("empresaSelecionada:", empresaSelecionada);
    }
  } catch (err) {
    console.error("Erro ao carregar nome da empresa:", err);
  }
}

async function init() {
  await carregarNomeEmpresa();
  await carregarUnidades();
  await carregarCargos();
}

document.addEventListener("DOMContentLoaded", init);

// FUNÇÃO PARA CARREGAR UNIDADES
async function carregarUnidades() {
  if (!empresaCodigo) return;

  const res = await fetch(`http://localhost:3001/unidades/${empresaCodigo}`);
  const unidades = await res.json();

  const select = document.getElementById("unidadeSelect");
  select.innerHTML = '<option value="">Selecione...</option>';

  unidades.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.codigo;
    opt.textContent = u.ativo ? u.nome : `${u.nome} (inativa)`;
    opt.dataset.nome = u.nome;
    select.appendChild(opt);
  });
}

document.getElementById("unidadeSelect").addEventListener("change", function () {
  const unidadeCodigo = this.value;

  if (!unidadeCodigo) {
    document.getElementById("setorSelect").innerHTML =
      '<option value="">Selecione...</option>';
    return;
  }

  carregarSetores(unidadeCodigo);
});

// FUNÇÃO PARA CARREGAR SETORES
async function carregarSetores(unidadeCodigo) {
  const res = await fetch(`http://localhost:3001/setores/${empresaCodigo}/${unidadeCodigo}`);
  const setores = await res.json();

  const select = document.getElementById("setorSelect");
  select.innerHTML = '<option value="">Selecione...</option>';

  setores.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.codigo;
    opt.textContent = s.ativo && s.relacionamentoAtivo ? s.nome : `${s.nome} (inativo ou sem vínculo)`;
    opt.dataset.nome = s.nome;
    select.appendChild(opt);
  });
}

// FUNÇÃO PARA CARREGAR CARGOS
async function carregarCargos() {
  const res = await fetch(`http://localhost:3001/cargos/${empresaCodigo}`);
  const cargos = await res.json();

  const select = document.getElementById("cargoSelect");
  select.innerHTML = '<option value="">Selecione...</option>';

  cargos.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.codigo;
    opt.textContent = c.ativo ? c.nome : `${c.nome} (inativo)`;
    opt.dataset.nome = c.nome;
    select.appendChild(opt);
  });
}

// MAPEAMENTO PARA O CÓDIGO DE CONTRATAÇÃO
const codCategoriaMap = {
  CLT: "101",
  COOPERADO: "741",
  TERCEIRIZADO: "102",
  AUTONOMO: "701",
  TEMPORARIO: "106",
  PESSOA_JURIDICA: "",
  ESTAGIARIO: "901",
  MENOR_APRENDIZ: "103",
  ESTATUTARIO: "",
  COMISSIONADO_INTERNO: "",
  COMISSIONADO_EXTERNO: "",
  APOSENTADO: "",
  APOSENTADO_INATIVO_PREFEITURA: "",
  PENSIONISTA: "",
  SERVIDOR_PUBLICO_EFETIVO: "",
  EXTRANUMERARIO: "",
  AUTARQUICO: "",
  INATIVO: "",
  TITULO_PRECARIO: "",
  SERVIDOR_ADM_CENTRALIZADA_OU_DESCENTRALIZADA: ""
};

// ENVIO DO FORMULÁRIO
document.getElementById("formCadastro").addEventListener("submit", async function (e) {
  e.preventDefault();

  const unidadeSelect = document.getElementById("unidadeSelect");
  const setorSelect = document.getElementById("setorSelect");
  const cargoSelect = document.getElementById("cargoSelect");

  const tipoContratacaoValue = document.getElementById("tipo_contratacao").value;

  const dados = {
    nome_funcionario: document.getElementById("nome").value,
    data_nascimento: document.getElementById("data-nascimento").value,
    sexo: document.getElementById("sexo").value,
    estado_civil: document.getElementById("estado_civil").value,
    doc_identidade: document.getElementById("doc_identidade").value,
    cpf: document.getElementById("cpf").value,
    cnh: document.getElementById("cnh").value,
    vencimento_cnh: document.getElementById("vencimento_cnh").value,
    matricula: document.getElementById("matricula").value,
    data_admissao: document.getElementById("data_admissao").value,
    tipo_contratacao: tipoContratacaoValue,
    cod_categoria: codCategoriaMap[tipoContratacaoValue],
    regime_trabalho: document.getElementById("regime_trabalho").value,
    tipo_exame: document.getElementById("tipo_exame").value,
    cod_empresa: empresaCodigo,
    nome_empresa: nomeEmpresa,
    cod_unidade: unidadeSelect.value,
    nome_unidade: unidadeSelect.selectedOptions[0].dataset.nome,
    cod_setor: setorSelect.value,
    nome_setor: setorSelect.selectedOptions[0].dataset.nome,
    cod_cargo: cargoSelect.value,
    nome_cargo: cargoSelect.selectedOptions[0].dataset.nome
  };

  if (!dados.cod_unidade || !dados.cod_setor || !dados.cod_cargo) {
    alert("Selecione unidade, setor e cargo");
    return;
  }

  try {
    const resposta = await fetch("http://localhost:3001/funcionarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });

    const json = await resposta.json();

    document.getElementById("mensagem").innerHTML =
      "<div class='alert alert-success'>Cadastro enviado com sucesso!</div>";

    document.getElementById("formCadastro").reset();

  } catch (erro) {
    document.getElementById("mensagem").innerHTML =
      "<div class='alert alert-danger'>Erro ao enviar cadastro</div>";
  }
});