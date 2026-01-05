async function carregarSolicitacoes() {
  const res = await fetch("http://localhost:3001/solicitacoes");
  const dados = await res.json();

  const tbody = document.querySelector("tbody");
  tbody.innerHTML = "";

  dados.forEach(s => {
    const tr = document.createElement("tr");
    
    const statusClass = s.status.toLowerCase();

    tr.innerHTML = `
      <td>${s.nome_empresa}</td>
      <td>${s.nome_funcionario}</td>
      <td>${s.cpf}</td>
      <td>${formatarData(s.solicitado_em)}</td>
      <td>
        <span class="status-pill ${statusClass}">
          ${s.status}
        </span>
      </td>
      <td class="actions">
        <button class="btn-outline" onclick="verDetalhes(${s.solicitacao_id})">
          Detalhes
        </button>
        <button class="btn-primary" onclick="enviarSOC(${s.solicitacao_id})">
          Enviar
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// FUNÇÃO PARA FORMATAR DATA
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

// FUNÇÃO PARA VER DETALHES DA SOLICITAÇÃO
async function verDetalhes(id) {
  solicitacaoAtualId = id;

  try {
    const res = await fetch(`http://localhost:3001/solicitacoes/${id}`);
    if (!res.ok) throw new Error("Erro ao buscar detalhes");

    const s = await res.json();

    // PREENCHER COM OS DADOS DO FORMULÁRIO
    document.getElementById("show_nome_funcionario").value = s.nome_funcionario;
    document.getElementById("show_data_nascimento").value = s.data_nascimento;
    document.getElementById("show_sexo").value = s.sexo;
    document.getElementById("show_estado_civil").value = s.estado_civil;
    document.getElementById("show_doc_identidade").value = s.doc_identidade;
    document.getElementById("show_cpf").value = s.cpf;
    document.getElementById("show_cnh").value = s.cnh;
    document.getElementById("show_vencimento_cnh").value = s.vencimento_cnh;
    document.getElementById("show_matricula").value = s.matricula;

    document.getElementById("det_nome_empresa").value = s.nome_empresa;
    document.getElementById("det_nome_unidade").value = s.nome_unidade;
    document.getElementById("det_nome_setor").value = s.nome_setor;
    document.getElementById("det_nome_cargo").value = s.nome_cargo;

    // ABRIR MODAL
    const modal = new bootstrap.Modal(
      document.getElementById("modalDetalhes")
    );
    modal.show();

  } catch (err) {
    console.error(err);
    alert("Erro ao carregar detalhes");
  }
}

// FUNÇÃO PARA ENVIAR AO SOC
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