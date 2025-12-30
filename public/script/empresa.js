let empresas = [];
let empresaSelecionada = null;

// Carrega empresas do backend
async function carregarEmpresas() {
    try {
        const res = await fetch("http://localhost:3001/empresas");
        const data = await res.json();
        empresas = data.filter(e => e.ativo); // só ativas
    } catch (err) {
        console.error("Erro ao carregar empresas:", err);
    }
}

// Mostra lista de empresas
function mostrarEmpresas(lista) {
    const container = document.getElementById("empresaContainer");
    container.innerHTML = '';

    if (lista.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Nenhuma empresa encontrada.</p>';
        return;
    }

    lista.forEach(emp => {
        const card = document.createElement("div");
        card.className = "card-empresa";
        card.innerHTML = `
            <div class="title">${emp.nome}</div>
            <div class="content">
                <p>CNPJ: ${emp.cnpj || '-'}</p>
            </div>
        `;
        card.onclick = () => selecionarEmpresa(emp, card);
        container.appendChild(card);
    });
}

// Seleciona empresa e redireciona
function selecionarEmpresa(emp, cardElement) {
    empresaSelecionada = emp;
    document.querySelectorAll('.card-empresa').forEach(c => c.classList.remove('selected'));
    cardElement.classList.add('selected');

    window.location.href = `formulario.html?empresa=${emp.codigo}`;
}

// Pesquisa dinâmica: apenas pelo nome, startsWith
document.getElementById("searchInput").addEventListener("input", (e) => {
    const termo = e.target.value.toLowerCase().trim();

    if (termo === "") {
        return;
    }

    const filtradas = empresas.filter(emp =>
        emp.nome.toLowerCase().startsWith(termo)
    );

    mostrarEmpresas(filtradas);
});

carregarEmpresas();