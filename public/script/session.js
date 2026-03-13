// CONTROLE GLOBAL DE SESSÃO

// USUÁRIO
function getUsuario() {
  const usuario = JSON.parse(sessionStorage.getItem("usuario"));

  if (!usuario) {
    alert("Sessão expirada. Faça login novamente.");
    window.location.href = "login.html";
    return null;
  }

  return usuario;
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

  location.reload();
}

// LOGOUT
function logout() {
  sessionStorage.removeItem("usuario");
  sessionStorage.removeItem("empresaCodigo");
  sessionStorage.removeItem("empresaNome");
  sessionStorage.removeItem("empresaUnidades");

  window.location.href = "login.html";
}