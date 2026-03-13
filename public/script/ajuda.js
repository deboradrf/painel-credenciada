const usuarioLogado = getUsuario();
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
      <span style="color: #F1AE33">Empresa Atual:</span> ${nomeEmpresa}
    </div>
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

  if (usuarioLogado.perfil === "ADMINISTRADOR") {
    avatarIcon.classList.add("fa-users-gear");
    avatarIconDropdown.classList.add("fa-users-gear");

    avatarBtn.classList.add("administrador");
    avatarDrop.classList.add("administrador");
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

document.addEventListener("DOMContentLoaded", () => {
  const rd1 = document.getElementById("rd-1");
  const rd2 = document.getElementById("rd-2");

  const empresaTab = document.getElementById("empresa");
  const credenciadaTab = document.getElementById("credenciada");

  function mostrarAba() {
    if (rd1.checked) {
      empresaTab.classList.add("show", "active");
      credenciadaTab.classList.remove("show", "active");
    } else if (rd2.checked) {
      credenciadaTab.classList.add("show", "active");
      empresaTab.classList.remove("show", "active");
    }
  }

  mostrarAba();

  rd1.addEventListener("change", mostrarAba);
  rd2.addEventListener("change", mostrarAba);
});