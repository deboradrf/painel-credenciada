const usuarioLogado = getUsuario();
const codigoEmpresa = getEmpresaCodigo();
const nomeEmpresa = getEmpresaNome();

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

// FUNÇÃO PARA BUSCAR CPF NO SOC DENTRO DA MESMA EMPRESA DO USUÁRIO LOGADO
async function buscarCPF() {
  const cpfInput = document.getElementById("cpfBusca");
  const resultado = document.getElementById("resultadoCPF");

  const cpf = cpfInput.value.replace(/\D/g, "");
  const empresaUsuario = getEmpresaCodigo();

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

  try {
    const res = await fetch(`/api/buscar-cadastro/${cpf}/${empresaUsuario}`);
    const data = await res.json();

    let funcionarios = [];

    if (Array.isArray(data.funcionarios)) {
      funcionarios = data.funcionarios;
    } else if (data.funcionario) {
      funcionarios = [data.funcionario];
    }

    // MAPA DE EMPRESAS BLOQUEADAS
    const empresasBloqueadas = {
      "1478760": true,
      "427755": true,
      "1631807": true,
      "1934538": true,
      "1990616": true,
      "1583990": true,
      "1941936": true,
      "1940507": true,
      "2075521": true,
      "1669275": true,
      "1618703": true,
      "2046293": true,
      "1452450": true,
      "1963847": true,
      "751836": true,
    };

    // NÃO ENCONTROU NENHUM CADASTRO
    if (!data.existe || funcionarios.length === 0) {
      const isEmpresaBloqueada = empresasBloqueadas[empresaUsuario];

      resultado.innerHTML = `
        <div class="alerts-container mb-3">
          <div class="alert alert-nao-encontrou">
            <i class="fa-solid fa-circle-xmark fa-lg" style="color: #F05252"></i>
            <p class="alert-text">
              Nenhum cadastro encontrado para este CPF.
            </p>
          </div>
        </div>

        ${(!isEmpresaBloqueada) ? `
          <div class="d-flex justify-content-center my-3">
            <button class="btn-cadastrar-funcionario"
              onclick="window.location.href='formulario-novo-cadastro.html'">
              <i class="fa-solid fa-user-plus" style="color: #88A6BB"></i>
              Solicitar cadastro
            </button>
          </div>
        ` : ``}
      `;
      return;
    }

    // ENCONTROU ALGUM CADASTRO
    resultado.innerHTML = `
      <div class="alerts-container mb-3">
        <div class="alert alert-encontrou-ativo">
          <i class="fa-solid fa-circle-check fa-lg" style="color: #53A5A6"></i>
          <p class="alert-text">
            Foi encontrado ${funcionarios.length} cadastro(s) para este CPF.
          </p>
        </div>
      </div>
      
      ${funcionarios.map((f) => {
      const situacao = f.situacao?.toLowerCase();

      return `
        <div class="funcionario-card shadow-sm text-center my-4">
          <div class="card-header mb-3">
            <div class="detail-value">
              <i class="fa-solid fa-user" style="color: #88A6BB"></i>
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
                    ${f.unidade?.nome}
                    </div>
                </div>
              </div>

              <div class="col-12">
                <div class="detail-item horizontal">
                  <div class="detail-label">
                    <span>Setor</span>
                  </div>
                  <div class="detail-value">
                    ${f.setor?.nome}
                  </div>
                </div>
              </div>

              <div class="col-12">
                <div class="detail-item horizontal">
                  <div class="detail-label">
                    <span>Cargo</span>
                  </div>
                  <div class="detail-value">
                    ${f.cargo?.nome}
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

          <div class="card-footer text-body-secondary mt-4">
            ${situacao === "ativo" || situacao === "pendente"
          ? `
                <div class="d-flex justify-content-center">
                  <button class="btn-solicitar-exame"
                    onclick="salvarFuncionario(${JSON.stringify(f).replace(/"/g, '&quot;')}); window.location.href='formulario-solicitar-exame.html'">
                    <i class="fa-solid fa-file-circle-plus" style="color: #88A6BB"></i>
                    Solicitar exame para este funcionário
                  </button>
                </div> `
          : ` <small>Não é possível solicitar exame para este funcionário</small> `
        }
          </div>
        </div>
      `}).join("")}
    `;

  } catch (erro) {
    console.error(erro);

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