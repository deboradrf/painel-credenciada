let usuario = null;

const API = "http://localhost:3001";

const usuarioLogado = JSON.parse(localStorage.getItem("usuario"));

if (!usuarioLogado) {
  alert("Usuário não logado");
  window.location.href = "../pages/login.html";
}

// DROPDOWN DO PERFIL
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

// 🔥 INIT
document.addEventListener("DOMContentLoaded", async () => {
  preencherEmpresaUsuario();
  await carregarUnidades();
  await carregarSetores();
  await carregarCargos();
  preencherFuncionarioASO();
});

// ================= EMPRESA =================
function preencherEmpresaUsuario() {
  document.getElementById("empresaNomeView").value = usuarioLogado.nome_empresa;
  document.getElementById("empresaCodigoHidden").value = usuarioLogado.cod_empresa;
}

// ================= FUNCIONÁRIO =================
function preencherFuncionarioASO() {
  const f = JSON.parse(localStorage.getItem("funcionarioASO"));

  console.log("FUNCIONÁRIO ASO:", f);

  if (!f) {
    alert("Pesquise um funcionário primeiro");
    window.location.href = "solicitar-aso.html";
    return;
  }

  document.getElementById("nome").value = f.nome || "";
  document.getElementById("cpf").value = f.cpf || "";
  document.getElementById("matricula").value = f.matricula || "";

  // Datas DD/MM/YYYY → YYYY-MM-DD
  if (f.data_nascimento) {
    const [d, m, a] = f.data_nascimento.split("/");
    document.getElementById("data-nascimento").value = `${a}-${m}-${d}`;
  }

  if (f.data_admissao) {
    const [d, m, a] = f.data_admissao.split("/");
    document.getElementById("data_admissao").value = `${a}-${m}-${d}`;
  }

  document.getElementById("cpf").readOnly = true;

  // Espera selects carregarem
  setTimeout(() => {
    document.getElementById("unidadeSelect").value = f.cod_unidade || "";
    document.getElementById("setorSelect").value = f.cod_setor || "";
    document.getElementById("cargoSelect").value = f.cod_cargo || "";
  }, 500);
}

// ================= LOADERS =================
async function carregarUnidades() {
  const res = await fetch(`${API}/unidades/${usuarioLogado.cod_empresa}`);
  const dados = await res.json();
  const select = document.getElementById("unidadeSelect");

  select.innerHTML = `<option value="">Selecione...</option>`;
  dados.forEach(u => {
    select.innerHTML += `<option value="${u.codigo}">${u.nome}</option>`;
  });
}

async function carregarSetores() {
  const res = await fetch(`${API}/setores/${usuarioLogado.cod_empresa}`);
  const dados = await res.json();
  const select = document.getElementById("setorSelect");

  select.innerHTML = `<option value="">Selecione...</option>`;
  dados.forEach(s => {
    select.innerHTML += `<option value="${s.codigo}">${s.nome}</option>`;
  });
}

async function carregarCargos() {
  const res = await fetch(`${API}/cargos/${usuarioLogado.cod_empresa}`);
  const dados = await res.json();
  const select = document.getElementById("cargoSelect");

  select.innerHTML = `<option value="">Selecione...</option>`;
  dados.forEach(c => {
    select.innerHTML += `<option value="${c.codigo}">${c.nome}</option>`;
  });
}

// MOSTRAR / OCULTAR SEÇÃO
document.addEventListener("DOMContentLoaded", () => {
  const tipoExame = document.getElementById("tipo_exame");
  const cardToxicologico = document.getElementById("cardToxicologico");
  const cardMudancaFuncao = document.getElementById("cardMudancaFuncao");

  tipoExame.addEventListener("change", () => {
    // Esconde tudo primeiro
    cardToxicologico.style.display = "none";
    cardMudancaFuncao.style.display = "none";

    // Mostra conforme o tipo
    if (tipoExame.value === "TOXICOLOGICO") {
      cardToxicologico.style.display = "block";
    }

    if (tipoExame.value === "MUDANCA_RISCOS_OPERACIONAIS") {
      cardMudancaFuncao.style.display = "block";
    }
  });
});

// ENVIO DO FORMULÁRIO
document.getElementById("formCadastro").addEventListener("submit", async function (e) {
  e.preventDefault();

  const unidadeSelect = document.getElementById("unidadeSelect");
  const setorSelect = document.getElementById("setorSelect");
  const cargoSelect = document.getElementById("cargoSelect");

  const dados = {
    nome_funcionario: document.getElementById("nome").value,
    data_nascimento: document.getElementById("data-nascimento").value,
    cpf: document.getElementById("cpf").value,
    matricula: document.getElementById("matricula").value,
    data_admissao: document.getElementById("data_admissao").value,

    cod_empresa: usuarioLogado.cod_empresa,
    nome_empresa: document.getElementById("empresaNomeView").value,

    cod_unidade: unidadeSelect.value,
    nome_unidade: unidadeSelect.options[unidadeSelect.selectedIndex]?.text || null,

    cod_setor: setorSelect.value,
    nome_setor: setorSelect.options[setorSelect.selectedIndex]?.text || null,

    cod_cargo: cargoSelect.value,
    nome_cargo: cargoSelect.options[cargoSelect.selectedIndex]?.text || null,

    tipo_exame: document.getElementById("tipo_exame").value,

    cnh: document.getElementById("cnh").value || null,
    vencimento_cnh: document.getElementById("vencimento_cnh").value || null,

    funcao_anterior: document.getElementById("funcao_anterior")?.value || null,
    funcao_atual: document.getElementById("funcao_atual")?.value || null,
    setor_atual: document.getElementById("setor_atual")?.value || null,

    nome_clinica: document.getElementById("nome_clinica").value,
    cidade_clinica: document.getElementById("cidade_clinica").value,
    email_clinica: document.getElementById("email_clinica").value,
    telefone_clinica: document.getElementById("telefone_clinica").value,
    lab_toxicologico: document.getElementById("lab_toxicologico").value,

    usuario_id: usuarioLogado.id
  };

  try {
    const res = await fetch("http://localhost:3001/solicitar-aso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });

    if (!res.ok) throw new Error("Erro no envio");

    document.getElementById("mensagem").innerHTML =
      "<div class='alert alert-success'>Cadastro enviado com sucesso!</div>";

    document.getElementById("formCadastro").reset();

  } catch (erro) {
    console.error(erro);
    document.getElementById("mensagem").innerHTML =
      "<div class='alert alert-danger'>Erro ao enviar cadastro</div>";
  }
});

// FUNÇÃO DE LOGOUT
function logout() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("empresaCodigo");
  window.location.href = "login.html";
}