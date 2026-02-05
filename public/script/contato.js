let usuarioLogado = null;

// DROPDOWN DO PERFIL
document.addEventListener("DOMContentLoaded", () => {
    usuarioLogado = JSON.parse(localStorage.getItem("usuario"));

    if (!usuarioLogado) {
        window.location.href = "login.html";
        return;
    }

    const cardsEmpresa = document.querySelectorAll(".card-empresa");
    const cardsCredenciada = document.querySelectorAll(".card-credenciada");

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
        cardsEmpresa.forEach(card => card.style.display = "none");
        cardsCredenciada.forEach(card => card.style.display = "flex");

        avatarIcon.classList.add("fa-hospital");
        avatarIconDropdown.classList.add("fa-hospital");

        avatarBtn.classList.add("credenciada");
        avatarDrop.classList.add("credenciada");
    }

    if (usuarioLogado.perfil === "EMPRESA") {
        cardsEmpresa.forEach(card => card.style.display = "flex");
        cardsCredenciada.forEach(card => card.style.display = "none");

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

// FUNÇÃO DE LOGOUT
function logout() {
    localStorage.removeItem("usuario");
    localStorage.removeItem("empresaCodigo");
    window.location.href = "login.html";
}