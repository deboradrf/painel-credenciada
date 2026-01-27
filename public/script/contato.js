let usuario = null;

// DROPDOWN DO PERFIL
document.addEventListener("DOMContentLoaded", () => {
    usuario = JSON.parse(localStorage.getItem("usuario"));

    if (!usuario) {
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

    function getPrimeiroNomeESobrenome(nomeCompleto) {
        if (!nomeCompleto) return "";

        const partes = nomeCompleto.trim().split(" ");

        return partes.length >= 2
            ? `${partes[0]} ${partes[1]}`
            : partes[0];
    }

    // NOME
    const nomeFormatado = getPrimeiroNomeESobrenome(usuario.nome);
    userNameDropdown.innerText = nomeFormatado;

    // EMPRESA E UNIDADE
    dropdownUserExtra.innerHTML = `
        <div class="company-name">${usuario.nome_empresa}</div>
        <div class="unit-name">${usuario.nome_unidade}</div>
    `;

    // LÓGICA DOS PERFIS DE ACESSO
    if (usuario.perfil === "CREDENCIADA") {
        cardsEmpresa.forEach(card => card.style.display = "none");
        cardsCredenciada.forEach(card => card.style.display = "flex");

        avatarIcon.classList.add("fa-hospital");
        avatarIconDropdown.classList.add("fa-hospital");

        avatarBtn.classList.add("credenciada");
        avatarDrop.classList.add("credenciada");
    }

    if (usuario.perfil === "EMPRESA") {
        cardsEmpresa.forEach(card => card.style.display = "flex");
        cardsCredenciada.forEach(card => card.style.display = "none");

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