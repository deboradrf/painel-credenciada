const perfis = {
  paulina: {
    nome: "Paulina",
    permissao: "engenharia"
  },
  nicolly: {
    nome: "Nicolly",
    permissao: "engenharia"
  },
  rubia: {
    nome: "Rúbia",
    permissao: "engenharia"
  },
  debora: {
    nome: "Débora",
    permissao: "adm"
  },
  jennifer: {
    nome: "Jennifer",
    permissao: "adm"
  },
  deivison: {
    nome: "Deivison",
    permissao: "adm"
  },
  isadora: {
    nome: "Isadora",
    permissao: "adm"
  },
  jose: {
    nome: "José",
    permissao: "adm"
  }
};

function entrar(permissao) {
  const perfilSelecionado = perfis[permissao];

  if (!perfilSelecionado) return;

  sessionStorage.setItem("usuarioLogado", JSON.stringify(perfilSelecionado));

  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btnGerenciarAcessos");

    const usuarioLogado = JSON.parse(sessionStorage.getItem("usuarioLogado"));

    if (!btn || !usuarioLogado) return;

    const permissao = usuarioLogado.permissao;

    if (permissao === "engenharia") {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";

        btn.addEventListener("click", (e) => {
            e.preventDefault();
        });
    }
    else {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
        btn.title = "";
    }
});