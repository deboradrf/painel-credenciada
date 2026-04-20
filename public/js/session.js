// CONTROLE GLOBAL DE SESSÃO

// FUNÇÃO PARA RESETAR A SESSÃO AO CARREGAR OU ATUALIZAR A PÁGINA
function resetarSessao() {
    const TEMPO_EXPIRACAO = 60 * 60 * 1000;

    const sessao = JSON.parse(sessionStorage.getItem("usuario"));
    
    if (sessao) {
        sessao.expiraEm = Date.now() + TEMPO_EXPIRACAO;
        sessionStorage.setItem("usuario", JSON.stringify(sessao));
    }
}

// Resetar imediatamente ao carregar a página
resetarSessao();

// Resetar também antes de atualizar ou sair da página
window.addEventListener("beforeunload", resetarSessao);

function iniciarCountdownSessao() {
    const sessao = JSON.parse(sessionStorage.getItem("usuario"));
    if (!sessao || !sessao.expiraEm) return;

    const countdownEl = document.getElementById("sessionCountdown");
    if (!countdownEl) return;

    function atualizar() {
        const tempoRestante = sessao.expiraEm - Date.now();
        if (tempoRestante <= 0) {
            logout(true);
            return;
        }

        const minutos = Math.floor(tempoRestante / 1000 / 60);
        const segundos = Math.floor((tempoRestante / 1000) % 60);

        countdownEl.textContent = `Sessão expira em ${minutos.toString().padStart(2,'0')}:${segundos.toString().padStart(2,'0')}`;
    }

    atualizar();
    setInterval(atualizar, 1000);
}

// Inicializa countdown quando a página carregar
document.addEventListener("DOMContentLoaded", iniciarCountdownSessao);

// USUÁRIO
function getUsuario() {
  const sessao = JSON.parse(sessionStorage.getItem("usuario"));

  if (!sessao) {
    logout(true);
    return null;
  }

  if (sessao.expiraEm && Date.now() > sessao.expiraEm) {
    logout(true);
    return null;
  }

  return sessao.usuario || sessao;
}

// CÓDIGO DA EMPRESA ATUAL
function getEmpresaCodigo() {
  const usuario = getUsuario();

  return (
    sessionStorage.getItem("empresaCodigo") ||
    usuario.cod_empresa
  );
}

// NOME DA EMPRESA ATUAL
function getEmpresaNome() {
  const usuario = getUsuario();

  return (
    sessionStorage.getItem("empresaNome") ||
    usuario.nome_empresa
  );
}

// UNIDADES DA EMPRESA ATUAL
function getEmpresaUnidades() {
  const usuario = getUsuario();

  const unidades =
    sessionStorage.getItem("empresaUnidades") ||
    JSON.stringify(usuario.unidades);

  return JSON.parse(unidades);
}

// TROCAR EMPRESA
function trocarEmpresa(cod, nome, unidades) {
  sessionStorage.setItem("empresaCodigo", cod);
  sessionStorage.setItem("empresaNome", nome);
  sessionStorage.setItem("empresaUnidades", JSON.stringify(unidades));

  sessionStorage.setItem("empresaTrocada", nome);

  location.reload();
}

// LOGOUT
async function logout(expirada = false) {
  sessionStorage.removeItem("usuario");
  sessionStorage.removeItem("empresaCodigo");
  sessionStorage.removeItem("empresaNome");
  sessionStorage.removeItem("empresaUnidades");
  sessionStorage.removeItem("usuarioLogado");

  if (expirada) {
    await modalConfirm("Sessão expirada. Faça login novamente.");
  }

  window.location.href = "login.html";
}

function logoutAutomatico() {
  const sessao = JSON.parse(sessionStorage.getItem("usuario"));
  if (!sessao || !sessao.expiraEm) return;

  const tempoRestante = sessao.expiraEm - Date.now();

  setTimeout(() => {
    logout(true);
  }, tempoRestante);
}

// Chame essa função assim que a página carregar
document.addEventListener("DOMContentLoaded", logoutAutomatico);