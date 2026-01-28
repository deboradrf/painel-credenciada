let usuario = null;

const API = "http://localhost:3001";

// USUÁRIO LOGADO
const usuarioLogado = JSON.parse(localStorage.getItem("usuario"));

if (!usuarioLogado) {
  alert("Usuário não logado");
  window.location.href = "login.html";
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

// FUNÇÃO PARA BUSCAR CPF NO SOC DENTRO DA MESMA EMPRESA DO USUÁRIO LOGADO
async function buscarCPF() {
  const cpfInput = document.getElementById("cpfBusca");
  const resultado = document.getElementById("resultadoCPF");

  const cpf = cpfInput.value.replace(/\D/g, "");
  const empresaUsuario = usuarioLogado.cod_empresa;

  if (cpf.length !== 11) {
    resultado.innerHTML = `<div class="alert alert-warning">CPF inválido</div>`;
    return;
  }

  resultado.innerHTML = "🔎 Consultando funcionário no SOC...";

  try {
    const res = await fetch(
      `${API}/soc/funcionario-por-cpf/${cpf}/${empresaUsuario}`
    );

    const data = await res.json();

    // CPF NÃO EXISTE NA EMPRESA
    if (!data.existe) {
      resultado.innerHTML = `
        <div class="alerts-container mb-4">
          <div class="alert alert-danger">
            <i class="fa-solid fa-circle-check fa-lg" style="color: #F05252"></i>
            <p class="alert-text">Funcionário não encontrado. Solicite um novo cadastro</p>
          </div>
        </div>

        <div class="d-flex justify-content-center my-3">
          <button class="btn"
            onclick="window.location.href='formulario-novo-cadastro.html'">
            Cadastrar Funcionário
          </button>
        </div>
      `;
      return;
    }

    const f = data.funcionario;

    // CPF EXISTE MAS ESTÁ INATIVO
    if (f.situacao?.toLowerCase() === "inativo") {
      resultado.innerHTML = `
        <div class="alerts-container mb-2">
          <div class="alert alert-warning">
            <i class="fa-solid fa-circle-check fa-lg" style="color: #F1AE33"></i>
            <p class="alert-text">Funcionário encontrado, porém está INATIVO. Solicite um novo cadastro</p>
          </div>
        </div>

        <div class="row g-2">
          <div class="col-12">
            <div class="detail-item horizontal">
              <div class="detail-label">
                <span>Nome</span>
              </div>
              <div class="detail-value">
                ${f.nome}
              </div>
            </div>
          </div>

          <div class="col-12">
            <div class="detail-item horizontal">
              <div class="detail-label">
                <span>Matrícula eSocial</span>
              </div>
              <div class="detail-value">
                ${f.matricula || "-"}
              </div>
            </div>
          </div>

          <div class="col-12">
            <div class="detail-item horizontal">
              <div class="detail-label">
                <span>Data de Demissão</span>
              </div>
              <div class="detail-value">
                ${f.data_demissao || "-"}
              </div>
            </div>
          </div>

          <div class="col-12">
            <div class="detail-item horizontal">
              <div class="detail-label">
                <span>Situação</span>
              </div>
              <div class="detail-value">
                ${f.situacao}
              </div>
            </div>
          </div>
        </div>

        <div class="d-flex justify-content-center my-3">
          <button class="btn-cadastrar-funcionario"
            onclick="window.location.href='formulario-novo-cadastro.html'">
            Cadastrar Funcionário
          </button>
        </div>
      `;
      return;
    }

    // CPF EXISTE E ESTÁ ATIVO
    const funcionarioASO = {
      nome: f.nome,
      cpf: f.cpf,
      matricula: f.matricula,
      data_nascimento: f.data_nascimento,
      data_admissao: f.data_admissao,
      cod_unidade: f.unidade?.codigo,
      cod_setor: f.setor?.codigo,
      cod_cargo: f.cargo?.codigo
    };

    localStorage.setItem("funcionarioASO", JSON.stringify(funcionarioASO));

    resultado.innerHTML = `      
      <div class="alerts-container mb-2">
        <div class="alert alert-success">
          <i class="fa-solid fa-circle-check fa-lg" style="color: #53A5A6"></i>
          <p class="alert-text">Funcionário encontrado</p>
        </div>
      </div>
        
      <div class="row g-2">
        <div class="col-12">
          <div class="detail-item horizontal">
            <div class="detail-label">
              <span>Nome</span>
            </div>
            <div class="detail-value">
              ${f.nome}
            </div>
          </div>
        </div>

        <div class="col-12">
          <div class="detail-item horizontal">
            <div class="detail-label">
              <span>Matrícula eSocial</span>
            </div>
            <div class="detail-value">
              ${f.matricula || "-"}
            </div>
          </div>
        </div>

        <div class="col-12">
          <div class="detail-item horizontal">
            <div class="detail-label">
              <span>Data de Admissão</span>
            </div>
            <div class="detail-value">
              ${f.data_admissao || "-"}
            </div>
          </div>
        </div>

        <div class="col-12">
          <div class="detail-item horizontal">
            <div class="detail-label">
              <span>Situação</span>
            </div>
            <div class="detail-value">
              ${f.situacao}
            </div>
          </div>
        </div>
      </div>

      <div class="d-flex justify-content-center my-3">
        <button class="btn-solicitar-aso"
          onclick="window.location.href='formulario-solicitar-exames.html'">
          Solicitar exame para este funcionário
        </button>
      </div>
    `;

  } catch (err) {
    console.error(err);
    resultado.innerHTML = `<div class="alert alert-danger">Erro ao consultar CPF</div>`;
  }
}

// MÁSCARA DE CPF
const cpfInput = document.getElementById("cpfBusca");

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