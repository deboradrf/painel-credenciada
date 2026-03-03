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
          <i class="fa-solid fa-circle-exclamation fa-lg" style="color: #F1AE33"></i>
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

    let funcionarios = [];

    if (Array.isArray(data.funcionarios)) {
      funcionarios = data.funcionarios;
    } else if (data.funcionario) {
      funcionarios = [data.funcionario];
    }

    // NÃO ENCONTROU NENHUM CADASTRO
    if (!data.existe || funcionarios.length === 0) {
      resultado.innerHTML = `
        <div class="alerts-container mb-4">
          <div class="alert alert-nao-encontrou">
            <i class="fa-solid fa-circle-xmark fa-lg" style="color: #F05252"></i>
            <p class="alert-text">
              Nenhum cadastro encontrado para este CPF
            </p>
          </div>
        </div>

        <div class="d-flex justify-content-center my-3">
          <button class="btn-cadastrar-funcionario"
             onclick="window.location.href='formulario-novo-cadastro.html'"> Cadastrar funcionário
          </button>
        </div>
      `;
      return;
    }

    // ENCONTROU ALGUM CADASTRO
    resultado.innerHTML = `
      <div class="alerts-container mb-3">
        <div class="alert alert-encontrou-ativo">
          <i class="fa-solid fa-circle-check fa-lg" style="color: #53A5A6"></i>
          <p class="alert-text">
            Foi encontrado ${funcionarios.length} cadastro(s) para este CPF
          </p>
        </div>
      </div>
      
      ${funcionarios.map((f) => `
        <div class="card text-center my-4">

          <div class="card-header d-flex justify-content-between align-items-center"">
            <div class="detail-value">
              ${f.nome}
            </div>
            <div class="ms-auto">
              <span class="${f.situacao?.toLowerCase() === "ativo" ? "badge badge-ativo" : "badge badge-inativo"}">
                ${f.situacao}
              </span>
            </div>
          </div>

          <div class="card-body">
            <div class="row g-2">
              <div class="col-12">
                <div class="detail-item horizontal">
                  <div class="detail-label">
                    <span>Unidade</span>
                  </div>
                  <div class="detail-value">
                    ${f.unidade?.nome || "-"}
                    </div>
                </div>
              </div>

              <div class="col-6">
                <div class="detail-item horizontal">
                  <div class="detail-label">
                    <span>Setor</span>
                  </div>
                  <div class="detail-value">
                    ${f.setor?.nome || "-"}
                  </div>
                </div>
              </div>

              <div class="col-6">
                <div class="detail-item horizontal">
                  <div class="detail-label">
                    <span>Cargo</span>
                  </div>
                  <div class="detail-value">
                    ${f.cargo?.nome || "-"}
                  </div>
                </div>
              </div>

              <div class="col-6">
                <div class="detail-item horizontal">
                  <div class="detail-label">
                    <span>Data de Admissão</span>
                  </div>
                  <div class="detail-value">
                    ${f.data_admissao || "-"}
                  </div>
                </div>
              </div>

              <div class="col-6">
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
                    <span>Matrícula eSocial</span>
                  </div>
                  <div class="detail-value">
                    ${f.matricula || "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="card-footer text-body-secondary">
            ${f.situacao?.toLowerCase() === "ativo" ? `
              <div class="d-flex justify-content-center my-3">
                <button class="btn-solicitar-exame"
                  onclick="salvarFuncionario(${JSON.stringify(f).replace(/"/g, '&quot;')}); window.location.href='formulario-solicitar-exame.html'">
                  Solicitar exame para este funcionário
                </button>
              </div>
            ` : `
                <small>
                  Não é possível solicitar exames para este funcionário. Realize um novo cadastro ou entre em contato para solicitar a reativação.
                </small>
              `}
          </div>
        </div>
      `).join("")}
    `;

  } catch (err) {
    console.error("❌ ERRO:", err);
    resultado.innerHTML = `
      <div class="alerts-container mb-4">
        <div class="alert alert-erro">
          <i class="fa-solid fa-circle-xmark fa-lg" style="color: #F05252"></i>
          <p class="alert-text">Erro ao consultar CPF. Tente novamente</p>
        </div>
      </div>
    `;
  }
}

// FUNÇÃO PARA SALVAR OS DADOS DO FUNCIONÁRIO SELECIONADO NO LOCALSTORAGE
function salvarFuncionario(f) {
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