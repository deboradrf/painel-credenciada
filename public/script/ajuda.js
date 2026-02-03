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

  // Inicial
  mostrarAba();

  // Quando mudar radio
  rd1.addEventListener("change", mostrarAba);
  rd2.addEventListener("change", mostrarAba);
});

// LÓGICA PRA MOSTRAR OS CARDS ADICIONAIS DAS PERGUNTAS
const toggleQuestions = document.querySelectorAll('.toggle-question');

toggleQuestions.forEach(toggle => {
  toggle.addEventListener('click', () => {
    const type = toggle.dataset.type;
    const parentCard = toggle.closest('.flow-card');

    if (!parentCard) return;

    // Remove cards já criados desse tipo
    const existingCards = document.querySelectorAll(`.flow-card[data-type="${type}"]`);
    if (existingCards.length > 0) {
      existingCards.forEach(card => {
        const prev = card.previousElementSibling;
        if (prev && prev.classList.contains('flow-arrow')) prev.remove();
        card.remove();
      });
      return;
    }

    let items = [];

    if (type === "create-setor-cargo") {
      items = [
        { text: "Aguardar criação pela engenharia", icon: "fa-solid fa-hourglass-half" },
        { text: "Editar selecionando o cargo/setor criado", icon: "fa-solid fa-pen-to-square" },
        { text: "Aprovação", icon: "fa-solid fa-check" }
      ];
    }

    if (type === "correcao") {
      items = [
        { text: "Reprovação", icon: "fa-solid fa-circle-xmark" },
        { text: "Aguardar correção pela empresa", icon: "fa-solid fa-hourglass-half" }
      ];
    }

    let referenceNode = parentCard;

    items.forEach(item => {
      // seta ↓
      const arrow = document.createElement('i');
      arrow.className = 'fa-solid fa-arrow-right flow-arrow';
      referenceNode.insertAdjacentElement('afterend', arrow);

      // card
      const card = document.createElement('div');
      card.className = 'flow-card';
      card.dataset.type = type;
      card.innerHTML = `
        <i class="${item.icon}"></i>
        <h6>${item.text}</h6>
      `;

      arrow.insertAdjacentElement('afterend', card);
      referenceNode = card;
    });
  });
});

const socToggle = document.querySelector('.toggle-question[data-type="erro-soc"]');

socToggle.addEventListener('click', () => {
  const parentCard = socToggle.closest('.flow-card');
  if (!parentCard) return;

  const existing = document.querySelector('.soc-options-card');
  if (existing) {
    const prev = existing.previousElementSibling;
    if (prev && prev.classList.contains('flow-arrow')) prev.remove();
    existing.remove();

    document.querySelectorAll('.soc-result-card').forEach(c => c.remove());
    document.querySelectorAll('.flow-arrow').forEach(a => a.remove());
    return;
  }

  parentCard.insertAdjacentHTML('afterend', `
    <i class="fa-solid fa-arrow-right flow-arrow"></i>
    <div class="flow-card soc-options-card">
      <div class="soc-option" data-result="duplicado">CPF duplicado</div>
      <div class="soc-option" data-result="invalido">CPF inválido</div>
      <div class="soc-option" data-result="inconsistencia">Inconsistência SOC</div>
    </div>
  `);
});

// Função para lidar com cliques nas opções
document.addEventListener('click', (e) => {
  if (!e.target.classList.contains('soc-option')) return;

  const option = e.target.dataset.result;

  e.target.parentElement
    .querySelectorAll('.soc-option')
    .forEach(opt => opt.classList.remove('selected'));
  e.target.classList.add('selected');

  document.querySelectorAll('.soc-result-card').forEach(c => c.remove());
  document.querySelectorAll('.flow-arrow').forEach(a => a.remove());

  let items = [];

  if (option === 'duplicado') items = [
    { text: "Contatar empresa", icon: "fa-solid fa-phone" },
    { text: "Cancelar solicitação", icon: "fa-solid fa-circle-minus" }
  ];

  if (option === 'invalido') items = [
    { text: "Reprovação", icon: "fa-solid fa-circle-xmark" },
    { text: "Aguardar correção pela empresa", icon: "fa-solid fa-hourglass-half" },
    { text: "Reenviar SOC", icon: "fa-solid fa-paper-plane" }
  ];

  if (option === 'inconsistencia') items = [
    { text: "Tentar novamente mais tarde", icon: "fa-solid fa-arrows-rotate" }
  ];

  let referenceNode = e.target.closest('.flow-card');

  items.forEach(item => {
    const arrow = document.createElement('i');
    arrow.className = 'fa-solid fa-arrow-right flow-arrow';
    referenceNode.insertAdjacentElement('afterend', arrow);

    const card = document.createElement('div');
    card.className = 'flow-card soc-result-card';
    card.innerHTML = `
      <i class="${item.icon}"></i>
      <h6>${item.text}</h6>
    `;

    arrow.insertAdjacentElement('afterend', card);
    referenceNode = card;
  });
});

// FUNÇÃO DE LOGOUT
function logout() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("empresaCodigo");
  window.location.href = "login.html";
}