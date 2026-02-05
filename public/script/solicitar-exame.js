let usuarioLogado = null;

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

// FUNÇÃO PARA BUSCAR CPF NO SOC DENTRO DA MESMA EMPRESA DO USUÁRIO LOGADO
async function buscarCPF() {
  const cpfInput = document.getElementById("cpfBusca");
  const resultado = document.getElementById("resultadoCPF");

  const cpf = cpfInput.value.replace(/\D/g, "");
  const empresaUsuario = usuarioLogado.cod_empresa;

  if (cpf.length !== 11) {
    resultado.innerHTML = `
      <div class="alerts-container mb-4">
        <div class="alert alert-invalido">
          <i class="fa-solid fa-circle-xmark fa-lg" style="color: #F1AE33"></i>
          <p class="alert-text">CPF inválido</p>
        </div>
      </div>
    `;
    return;
  }

  resultado.innerHTML = "🔎 Consultando funcionário no SOC...";

  try {
    const res = await fetch(`/soc/funcionario-por-cpf/${cpf}/${empresaUsuario}`);

    const data = await res.json();

    // CPF NÃO EXISTE NA EMPRESA
    if (!data.existe) {
      resultado.innerHTML = `
        <div class="alerts-container mb-4">
          <div class="alert alert-nao-encontrou">
            <i class="fa-solid fa-circle-xmark fa-lg" style="color: #F05252"></i>
            <p class="alert-text">Funcionário não encontrado. Solicite um novo cadastro</p>
          </div>
        </div>

        <div class="d-flex justify-content-center my-3">
          <button class="btn-cadastrar-funcionario"
            onclick="window.location.href='formulario-novo-cadastro.html'">
            Cadastrar funcionário
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
          <div class="alert alert-encontrou-inativo">
            <i class="fa-solid fa-circle-exclamation fa-lg" style="color: #F1AE33"></i>
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
          <button class="btn-cadastrar-funcionario-inativo"
            onclick="window.location.href='formulario-novo-cadastro.html'">
            Cadastrar funcionário
          </button>
        </div>
      `;
      return;
    }

    // CPF EXISTE E ESTÁ ATIVO
    const funcionario = {
      nome: f.nome,
      cpf: f.cpf,
      matricula: f.matricula,
      data_nascimento: f.data_nascimento,
      data_admissao: f.data_admissao,
      cod_unidade: f.unidade?.codigo,
      cod_setor: f.setor?.codigo,
      cod_cargo: f.cargo?.codigo
    };

    localStorage.setItem("funcionario", JSON.stringify(funcionario));

    resultado.innerHTML = `      
      <div class="alerts-container mb-2">
        <div class="alert alert-encontrou-ativo">
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
        <button class="btn-solicitar-exame"
          onclick="window.location.href='formulario-solicitar-exame.html'">
          Solicitar exame para este funcionário
        </button>
      </div>
    `;

  } catch (err) {
    console.error(err);
    resultado.innerHTML = `
      <div class="alerts-container mb-4">
        <div class="alert alert-erro">
          <i class="fa-solid fa-circle-xmark fa-lg" style="color: #F05252"></i>
          <p class="alert-text">Erro ao consultar CPF. Tente novamente</p>
        </div>
      </div>`;
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