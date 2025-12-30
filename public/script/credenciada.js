async function carregarSolicitacoes() {
    const res = await fetch("http://localhost:3001/solicitacoes");
    const dados = await res.json();

    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    dados.forEach(s => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${s.nome_empresa}</td>
          <td>${s.nome_funcionario}</td>
          <td>${s.cpf}</td>
          <td>${formatarData(s.criado_em)}</td>
          <td>
            <span class="status-pill pendente">Pendente</span>
          </td>
          <td class="actions">
            <button class="btn-outline" onclick="verDetalhes(${s.id})">
              Detalhes
            </button>
            <button class="btn-primary" onclick="enviarSOC(${s.id})">
              Enviar
            </button>
          </td>
        `;

        tbody.appendChild(tr);
    });
}

function formatarData(data) {
    if (!data) return "-";

    return new Date(data).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function verDetalhes(id) {
    window.location.href = `/detalhes.html?id=${id}`;
}

async function enviarSOC(id) {
    if (!confirm("Deseja enviar este funcionário ao SOC?")) return;

    const res = await fetch(
        `http://localhost:3001/soc/funcionarios/${id}/enviar`,
        { method: "POST" }
    );

    if (res.ok) {
        alert("Enviado ao SOC com sucesso!");
        carregarSolicitacoes();
    } else {
        alert("Erro ao enviar ao SOC");
    }
}

document.addEventListener("DOMContentLoaded", carregarSolicitacoes);