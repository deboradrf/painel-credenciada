const pool = require("./src/config/database");
const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const iconv = require("iconv-lite");
const soap = require("soap");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const app = express();

// MIDDLEWARES
app.use(cors());
app.use(express.json());

// ARQUIVOS ESTÁTICOS
app.use(express.static(path.join(__dirname, "public")));

// ROTA PRINCIPAL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/pages/login.html"));
});

// TESTE API
app.get("/api/status", (req, res) => {
  res.json({ ok: true });
});

// ROTA AUTH
const authRoutes = require("./src/routes/autenticacao");
app.use("/api", authRoutes);

// ROTA USUÁRIOS
const usuarioRoutes = require("./src/routes/usuario");
app.use("/api", usuarioRoutes);

// ROTA SOC
const socRoutes = require("./src/routes/soc");
app.use("/api", socRoutes);

// ROTA SOLICITAÇÕES
const solicitacoesRoutes = require("./src/routes/solicitacoes");
app.use("/api", solicitacoesRoutes);

// SOC – SOAP
const socExportaFuncionarioModelo2 = process.env.SOC_EXPORTA_FUNCIONARIOMODELO2;
const socUsuario = process.env.SOC_USUARIO;
const socToken = process.env.SOC_TOKEN;

// ROTA DE LOGIN DE USUÁRIO
// app.post("/login", async (req, res) => {
//   try {
//     const { usuario, senha } = req.body;

//     const result = await pool.query(
//       `
//       SELECT
//         id,
//         nome,
//         email,
//         cpf,
//         senha,
//         perfil,
//         cod_empresa,
//         nome_empresa,
//         unidades
//       FROM usuarios
//       WHERE (cpf = $1)
//       `,
//       [usuario]
//     );

//     if (!result.rows.length) {
//       return res.status(401).json({ erro: "Usuário ou senha inválidos" });
//     }

//     const user = result.rows[0];

//     // COMPARAÇÃO COM BCRYPT
//     const senhaValida = await bcrypt.compare(senha, user.senha);

//     if (!senhaValida) {
//       return res.status(401).json({ erro: "Usuário ou senha inválidos" });
//     }

//     // REMOVE A SENHA ANTES DE ENVIAR
//     delete user.senha;

//     const empresasExtras = await pool.query(
//       `
//         SELECT cod_empresa, nome_empresa, unidades
//         FROM usuarios_empresas
//         WHERE usuario_id = $1
//       `,
//       [user.id]
//     );

//     res.json({
//       ...user,
//       empresas_extras: empresasExtras.rows
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ erro: "Erro no login" });
//   }
// });

// ROTA PARA ATUALIZAR A UNIDADE DE UMA SOLICITAÇÃO DE NOVO CADASTRO
app.put("/solicitacoes/novo-cadastro/:id/salvar-unidade", async (req, res) => {
  const { id } = req.params;
  const { cod_unidade, nome_unidade } = req.body;

  if (!cod_unidade || !nome_unidade) {
    return res.status(400).json({ erro: "Unidade inválida" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        UPDATE novo_cadastro
        SET cod_unidade = $1,
            nome_unidade = $2
        WHERE id = (
          SELECT novo_cadastro_id
          FROM solicitacoes_novo_cadastro
          WHERE id = $3
        )
      `,
      [cod_unidade, nome_unidade, id]
    );

    const result = await client.query(
      `
        UPDATE solicitacoes_novo_cadastro
        SET status = 'PENDENTE_SC'
        WHERE id = $1
        RETURNING status
      `,
      [id]
    );

    // PEGAR OS DADOS DA SOLICITAÇÃO
    const dados = await client.query(
      `
        SELECT
          nc.nome_empresa,
          nc.nome_unidade,
          nc.cod_empresa
        FROM solicitacoes_novo_cadastro s
        JOIN novo_cadastro nc ON nc.id = s.novo_cadastro_id
        WHERE s.id = $1
      `,
      [id]
    );

    dadosSolicitacao = dados.rows[0];

    await client.query("COMMIT");

    res.json({
      sucesso: true,
      status_novo: result.rows[0].status
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ erro: "Erro ao salvar unidade" });

  } finally {
    client.release();
  }

  // ENVIAR EMAIL PARA CRIAÇÃO DE SETOR/CARGO
  try {
    await enviarEmailSetorCargo(dadosSolicitacao);
  } catch (err) {
    console.error("Erro ao enviar email SC:", err.message);
  }
});

// ROTA PARA ATUALIZAR O SETOR/CARGO DE UMA SOLICITAÇÃO DE NOVO CADASTRO
app.put("/solicitacoes/novo-cadastro/:id/salvar-sc", async (req, res) => {
  const { id } = req.params;

  const { cod_setor, nome_setor, cod_cargo, nome_cargo } = req.body;

  const client = await pool.connect();

  let proximoStatus = null;
  let dadosSolicitacao = null;

  try {
    await client.query("BEGIN");

    const check = await client.query(
      `
        SELECT
          s.status,
          nc.solicitar_novo_setor,
          nc.solicitar_novo_cargo,
          nc.solicitar_credenciamento
        FROM solicitacoes_novo_cadastro s
        JOIN novo_cadastro nc ON nc.id = s.novo_cadastro_id
        WHERE s.id = $1
      `, [id]);

    if (!check.rows.length) {
      return res.status(404).json({ erro: "Solicitação não encontrada" });
    }

    const { status, solicitar_novo_setor, solicitar_novo_cargo, solicitar_credenciamento } = check.rows[0];

    if (status !== "PENDENTE_SC" && status !== "PENDENTE_REAVALIACAO") {
      return res.status(400).json({
        erro: "Solicitação não está em PENDENTE_SC ou PENDENTE_REAVALIACAO"
      });
    }

    if (!solicitar_novo_setor && !solicitar_novo_cargo) {
      return res.status(400).json({
        erro: "Solicitação não requer setor nem cargo"
      });
    }

    // ATUALIZA SETOR
    if (solicitar_novo_setor) {
      if (!cod_setor || !nome_setor) {
        return res.status(400).json({
          erro: "Setor obrigatório para esta solicitação"
        });
      }

      await client.query(
        `
        UPDATE novo_cadastro
        SET cod_setor = $1,
            nome_setor = $2
        WHERE id = (
          SELECT novo_cadastro_id
          FROM solicitacoes_novo_cadastro
          WHERE id = $3
        )
        `,
        [cod_setor, nome_setor, id]
      );
    }

    // ATUALIZA CARGO
    if (solicitar_novo_cargo) {
      if (!cod_cargo || !nome_cargo) {
        return res.status(400).json({
          erro: "Cargo obrigatório para esta solicitação"
        });
      }

      await client.query(
        `
        UPDATE novo_cadastro
        SET cod_cargo = $1,
            nome_cargo = $2
        WHERE id = (
          SELECT novo_cadastro_id
          FROM solicitacoes_novo_cadastro
          WHERE id = $3
        )
        `,
        [cod_cargo, nome_cargo, id]
      );
    }

    // VERIFICA SE PRECISA DE CREDENCIAMENTO
    proximoStatus = solicitar_credenciamento ? "PENDENTE_CREDENCIAMENTO" : "PENDENTE";

    const result = await client.query(
      `
      UPDATE solicitacoes_novo_cadastro
      SET status = $1
      WHERE id = $2
      RETURNING status
      `,
      [proximoStatus, id]
    );

    // PEGAR OS DADOS DA SOLICITAÇÃO
    const dados = await client.query(
      `
      SELECT
        nc.nome_empresa,
        nc.nome_unidade
      FROM solicitacoes_novo_cadastro s
      JOIN novo_cadastro nc ON nc.id = s.novo_cadastro_id
      WHERE s.id = $1
      `,
      [id]
    );

    dadosSolicitacao = dados.rows[0];

    await client.query("COMMIT");

    res.json({
      sucesso: true,
      status_novo: result.rows[0].status
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ erro: "Erro ao salvar SC" });

  } finally {
    // ENVIAR EMAIL SE NECESSÁRIO CREDENCIAMENTO
    if (proximoStatus === "PENDENTE_CREDENCIAMENTO") {
      try {
        await enviarEmailCredenciamento(dadosSolicitacao);
      } catch (err) {
        console.error("Erro ao enviar email de credenciamento:", err.message);
      }
    }
    client.release();
  }
});

// ROTA PARA ATUALIZAR O NOME DA CLÍNICA DE UMA SOLICITAÇÃO DE NOVO CADASTRO
app.put("/solicitacoes/novo-cadastro/:id/salvar-credenciamento", async (req, res) => {
  const { id } = req.params;
  const { cod_clinica, nome_clinica } = req.body;

  if (!cod_clinica || !nome_clinica) {
    return res.status(400).json({ erro: "Clínica inválida" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      UPDATE novo_cadastro
      SET nome_clinica = $1
      WHERE id = (
        SELECT novo_cadastro_id
        FROM solicitacoes_novo_cadastro
        WHERE id = $2
      )
      `,
      [nome_clinica, id]
    );

    const result = await client.query(
      `
      UPDATE solicitacoes_novo_cadastro
      SET status = 'PENDENTE'
      WHERE id = $1
      RETURNING status
      `,
      [id]
    );

    await client.query("COMMIT");

    res.json({
      sucesso: true,
      status_novo: result.rows[0].status
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar credenciamento" });

  } finally {
    client.release();
  }
});

// ROTA PARA ATUALIZAR A UNIDADE DE UMA SOLICITAÇÃO DE NOVO EXAME
app.put("/solicitacoes/novo-exame/:id/salvar-unidade", async (req, res) => {
  const { id } = req.params;
  const { unidade_destino } = req.body;

  if (!unidade_destino) {
    return res.status(400).json({ erro: "Unidade inválida" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      UPDATE novo_exame
      SET unidade_destino = $1
      WHERE id = (
        SELECT novo_exame_id
        FROM solicitacoes_novo_exame
        WHERE id = $2
      )
      `,
      [unidade_destino, id]
    );

    const result = await client.query(
      `
      UPDATE solicitacoes_novo_exame
      SET status = 'PENDENTE_SC'
      WHERE id = $1
      RETURNING status
      `,
      [id]
    );

    // PEGAR OS DADOS DA SOLICITAÇÃO
    const dados = await client.query(
      `
      SELECT
        nc.nome_empresa,
        nc.unidade_destino,
        nc.cod_empresa
      FROM solicitacoes_novo_exame s
      JOIN novo_exame nc ON nc.id = s.novo_exame_id
      WHERE s.id = $1
      `,
      [id]
    );

    dadosSolicitacao = dados.rows[0];

    await client.query("COMMIT");

    res.json({
      sucesso: true,
      status_novo: result.rows[0].status
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ erro: "Erro ao salvar unidade" });

  } finally {
    client.release();
  }

  // ENVIAR EMAIL PARA CRIAÇÃO DE SETOR/FUNÇÃO
  try {
    await enviarEmailSetorFuncao(dadosSolicitacao);
  } catch (err) {
    console.error("Erro ao enviar email SC:", err.message);
  }
});

// ROTA PARA ATUALIZAR A FUNÇÃO/SETOR DE UMA SOLICITAÇÃO DE NOVO EXAME
app.put("/solicitacoes/novo-exame/:id/salvar-sc", async (req, res) => {
  const { id } = req.params;

  const { funcao_destino, setor_destino } = req.body;

  const client = await pool.connect();

  let proximoStatus = null;
  let dadosSolicitacao = null;

  try {
    await client.query("BEGIN");

    const check = await client.query(
      `
      SELECT
        s.status,
        nc.solicitar_nova_funcao,
        nc.solicitar_novo_setor,
        nc.solicitar_credenciamento
      FROM solicitacoes_novo_exame s
      JOIN novo_exame nc ON nc.id = s.novo_exame_id
      WHERE s.id = $1
    `, [id]);

    if (!check.rows.length) {
      return res.status(404).json({ erro: "Solicitação não encontrada" });
    }

    const { status, solicitar_nova_funcao, solicitar_novo_setor, solicitar_credenciamento } = check.rows[0];

    if (status !== "PENDENTE_SC" && status !== "PENDENTE_REAVALIACAO") {
      return res.status(400).json({
        erro: "Solicitação não está em PENDENTE_SC ou PENDENTE_REAVALIACAO"
      });
    }

    if (!solicitar_nova_funcao && !solicitar_novo_setor) {
      return res.status(400).json({
        erro: "Solicitação não requer função nem setor"
      });
    }

    // ATUALIZA FUNÇÃO
    if (solicitar_nova_funcao) {
      if (!funcao_destino) {
        return res.status(400).json({
          erro: "Função obrigatória para esta solicitação"
        });
      }

      await client.query(
        `
        UPDATE novo_exame
        SET funcao_destino = $1
        WHERE id = (
          SELECT novo_exame_id
          FROM solicitacoes_novo_exame
          WHERE id = $2
        )
        `,
        [funcao_destino, id]
      );
    }

    // ATUALIZA SETOR
    if (solicitar_novo_setor) {
      if (!setor_destino) {
        return res.status(400).json({
          erro: "Setor obrigatório para esta solicitação"
        });
      }

      await client.query(
        `
        UPDATE novo_exame
        SET setor_destino = $1
        WHERE id = (
          SELECT novo_exame_id
          FROM solicitacoes_novo_exame
          WHERE id = $2
        )
        `,
        [setor_destino, id]
      );
    }

    // VERIFICA SE PRECISA DE CREDENCIAMENTO
    proximoStatus = solicitar_credenciamento ? "PENDENTE_CREDENCIAMENTO" : "PENDENTE";

    const result = await client.query(
      `
      UPDATE solicitacoes_novo_exame
      SET status = $1
      WHERE id = $2
      RETURNING status
      `,
      [proximoStatus, id]
    );

    // PEGAR OS DADOS DA SOLICITAÇÃO
    const dados = await client.query(
      `
      SELECT
        nc.nome_empresa,
        nc.nome_unidade
      FROM solicitacoes_novo_exame s
      JOIN novo_exame nc ON nc.id = s.novo_exame_id
      WHERE s.id = $1
      `,
      [id]
    );

    dadosSolicitacao = dados.rows[0];

    await client.query("COMMIT");

    res.json({
      sucesso: true,
      status_novo: result.rows[0].status
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ erro: "Erro ao salvar SC" });

  } finally {
    // ENVIAR EMAIL SE NECESSÁRIO CREDENCIAMENTO
    if (proximoStatus === "PENDENTE_CREDENCIAMENTO") {
      try {
        await enviarEmailCredenciamento(dadosSolicitacao);
      } catch (err) {
        console.error("Erro ao enviar email de credenciamento:", err.message);
      }
    }
    client.release();
  }
});

// ROTA PARA ATUALIZAR O NOME DA CLÍNICA DE UMA SOLICITAÇÃO DE NOVO EXAME
app.put("/solicitacoes/novo-exame/:id/salvar-credenciamento", async (req, res) => {
  const { id } = req.params;
  const { cod_clinica, nome_clinica } = req.body;

  if (!cod_clinica || !nome_clinica) {
    return res.status(400).json({ erro: "Clínica inválida" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      UPDATE novo_exame
      SET nome_clinica = $1
      WHERE id = (
        SELECT novo_exame_id
        FROM solicitacoes_novo_exame
        WHERE id = $2
      )
      `,
      [nome_clinica, id]
    );

    const result = await client.query(
      `
      UPDATE solicitacoes_novo_exame
      SET status = 'PENDENTE'
      WHERE id = $1
      RETURNING status
      `,
      [id]
    );

    await client.query("COMMIT");

    res.json({
      sucesso: true,
      status_novo: result.rows[0].status
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar credenciamento" });

  } finally {
    client.release();
  }
});

// APROVAR / REPROVAR SOLICITAÇÃO
app.post("/solicitacoes/:tipo/:id/analisar", async (req, res) => {
  const { tipo, id } = req.params;
  const { status, motivo, usuario_id, tipo_consulta, observacao_consulta } = req.body;

  if (!["APROVADO", "REPROVADO"].includes(status)) {
    return res.status(400).json({ erro: "Status inválido" });
  }

  if (status === "REPROVADO" && (!motivo || !motivo.trim())) {
    return res.status(400).json({
      erro: "Motivo da reprovação é obrigatório"
    });
  }

  const tabela =
    tipo === "NOVO_EXAME"
      ? "solicitacoes_novo_exame"
      : "solicitacoes_novo_cadastro";

  try {
    let camposExtras = "";
    let valoresExtras = [];

    if (status === "REPROVADO") {
      camposExtras = "reprovado_por = $3, reprovado_em = NOW()";
      valoresExtras = [usuario_id];
    } else if (status === "APROVADO") {
      camposExtras = "aprovado_por = $3, aprovado_em = NOW()";
      valoresExtras = [usuario_id];
    }

    await pool.query(
      `
      UPDATE ${tabela}
      SET
        status = $1,
        motivo_reprovacao = COALESCE($2, motivo_reprovacao),
        ${camposExtras},
        tipo_consulta = $4,
        observacao_consulta = $5
      WHERE id = $6
      `,
      [
        status,
        status === "REPROVADO" ? motivo : null,
        ...valoresExtras,
        tipo_consulta || null,
        observacao_consulta || null,
        id
      ]
    );

    // ENVIAR E-MAIL PARA PESSOA DA SOLICITAÇÃO QUANDO FOR REPROVADO
    if (status === "REPROVADO") {
      const resultado = await pool.query(
        `
        SELECT u.email
        FROM ${tabela} s
        JOIN usuarios u ON u.id = s.solicitado_por
        WHERE s.id = $1
        `,
        [id]
      );

      if (resultado.rows.length > 0) {
        const { email } = resultado.rows[0];
        await enviarEmailReprovacao(email, motivo);
      }
    }

    // ENVIAR E-MAIL PARA PESSOAS DA SOLICITAÇÃO QUANDO FOR ARPROVADO E TIVER O CAMPO
    // DE OBSERVAÇÃO DA CONSULTA
    if (status === "APROVADO" && observacao_consulta && observacao_consulta.trim()) {
      const { rows } = await pool.query(
        `
          SELECT 
            u.email,
            f.nome_funcionario
          FROM ${tabela} s
          JOIN usuarios u ON u.id = s.solicitado_por
          JOIN ${tipo === "NOVO_EXAME" ? "novo_exame" : "novo_cadastro"
        } f ON f.id = ${tipo === "NOVO_EXAME" ? "s.novo_exame_id" : "s.novo_cadastro_id"}
          WHERE s.id = $1
        `,
        [id]
      );

      if (rows.length) {
        const { email, nome_funcionario } = rows[0];

        try {
          await enviarEmailObservacaoConsulta({
            email,
            nomeFuncionario: nome_funcionario,
            observacao: observacao_consulta
          });
        } catch (e) {
          console.error("Erro ao enviar email de observação:", e.message);
        }
      }
    }
    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao analisar solicitação" });
  }
});

// CANCELAR SOLICITAÇÃO
app.post("/solicitacoes/:tipo/:id/cancelar", async (req, res) => {
  const { tipo, id } = req.params;
  const { usuario_id } = req.body;

  if (!["NOVO_EXAME", "NOVO_CADASTRO"].includes(tipo)) {
    return res.status(400).json({ erro: "Tipo de solicitação inválido" });
  }

  const tabela =
    tipo === "NOVO_EXAME"
      ? "solicitacoes_novo_exame"
      : "solicitacoes_novo_cadastro";

  try {
    await pool.query(
      `
      UPDATE ${tabela}
      SET
        status = $1,
        cancelado_por = $2,
        cancelado_em = NOW()
      WHERE id = $3
      `,
      ["CANCELADO", usuario_id, id]
    );

    res.json({ sucesso: true, message: "Solicitação cancelada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao cancelar solicitação" });
  }
});

// ROTA DE HISTORICO DAS SOLICITACOES
app.get("/solicitacoes/:tipo/:id/historico", async (req, res) => {
  const { tipo, id } = req.params;

  const tabela =
    tipo === "NOVO_EXAME"
      ? "solicitacoes_novo_exame"
      : "solicitacoes_novo_cadastro";

  try {
    let joins = `
      LEFT JOIN usuarios u_solicitado ON u_solicitado.id = s.solicitado_por
      LEFT JOIN usuarios u_cancelado ON u_cancelado.id = s.cancelado_por
      LEFT JOIN usuarios u_aprovado ON u_aprovado.id = s.aprovado_por
      LEFT JOIN usuarios u_reprovado ON u_reprovado.id = s.reprovado_por
      LEFT JOIN usuarios u_editado ON u_editado.id = s.editado_por
    `;

    if (tipo !== "NOVO_EXAME") {
      joins += `
        LEFT JOIN usuarios u_soc ON u_soc.id = s.enviado_soc_por
      `;
    }

    const { rows } = await pool.query(`
      SELECT s.*, 
        u_solicitado.nome AS solicitado_nome,
        u_cancelado.nome AS cancelado_nome,
        u_aprovado.nome AS aprovado_nome,
        u_reprovado.nome AS reprovado_nome,
        u_editado.nome AS editado_nome
        ${tipo !== "NOVO_EXAME" ? ", u_soc.nome AS soc_nome" : ""}
      FROM ${tabela} s
      ${joins}
      WHERE s.id = $1
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({ erro: "Solicitação não encontrada" });
    }

    const s = rows[0];
    const historico = [];

    if (s.solicitado_em) {
      historico.push({ etapa: "Solicitado", usuario: s.solicitado_nome, data: s.solicitado_em });
    }
    if (s.editado_em) {
      historico.push({ etapa: "Editado", usuario: s.editado_nome, data: s.editado_em });
    }
    if (s.aprovado_em) {
      historico.push({ etapa: "Aprovado", usuario: s.aprovado_nome, data: s.aprovado_em });
    }
    if (s.reprovado_em) {
      historico.push({ etapa: "Reprovado", usuario: s.reprovado_nome, data: s.reprovado_em, motivo: s.motivo_reprovacao });
    }
    if (tipo !== "NOVO_EXAME" && s.enviado_soc_em) {
      historico.push({ etapa: "Enviado ao SOC", usuario: s.soc_nome, data: s.enviado_soc_em, erro: s.erro_soc });
    }
    if (s.cancelado_em) {
      historico.push({ etapa: "Cancelado", usuario: s.cancelado_nome, data: s.cancelado_em });
    }

    res.json(historico);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar histórico" });
  }
});

// SOLICITAÇÕES DA EMPRESA - novo cadastro e novo exame
app.get("/solicitacoes-empresa/:usuarioId", async (req, res) => {
  const { usuarioId } = req.params;

  try {
    const { rows } = await pool.query(`
      SELECT
        s.id AS solicitacao_id,
        f.id AS novo_cadastro_id,
        f.nome_funcionario,
        f.cpf,
        s.status,
        s.solicitado_em,
        s.motivo_reprovacao,
        'NOVO_CADASTRO' AS tipo
      FROM solicitacoes_novo_cadastro s
      JOIN novo_cadastro f ON f.id = s.novo_cadastro_id
      WHERE s.solicitado_por = $1

      UNION ALL

      SELECT
        s.id AS solicitacao_id,
        f.id AS novo_exame_id,
        f.nome_funcionario,
        f.cpf,
        s.status,
        s.solicitado_em,
        s.motivo_reprovacao,
        'NOVO_EXAME' AS tipo
      FROM solicitacoes_novo_exame s
      JOIN novo_exame f ON f.id = s.novo_exame_id
      WHERE s.solicitado_por = $1

      ORDER BY solicitado_em DESC
    `, [usuarioId]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar minhas solicitações" });
  }
});

// EDITAR SOLICITAÇÃO - NOVO CADASTRO
app.put("/solicitacoes/novo-cadastro/:id/editar", async (req, res) => {
  const { id } = req.params;
  const f = req.body;

  try {
    await pool.query("BEGIN");

    await pool.query(`
      UPDATE novo_cadastro
      SET
        nome_funcionario = $1,
        data_nascimento = $2,
        sexo = $3,
        estado_civil = $4,
        doc_identidade = $5,
        cpf = $6,
        matricula = $7,
        data_admissao = $8,
        tipo_contratacao = $9,
        cod_categoria = $10,
        regime_trabalho = $11,
        nome_fantasia = $12,
        razao_social = $13,
        cnpj = $14,
        cnae = $15,
        cep = $16,
        rua = $17,
        numero = $18,
        bairro = $19,
        estado = $20,
        tipo_faturamento = $21,
        email = $22,
        cod_setor = $23,
        nome_setor = $24,
        nome_novo_setor = $25,
        cod_cargo = $26,
        nome_cargo = $27,
        nome_novo_cargo = $28,
        descricao_atividade = $29,
        nova_data_exame = $30,
        cnh = $31,
        vencimento_cnh = $32,
        lab_toxicologico = $33,
        estado_clinica = $34,
        cidade_clinica = $35,
        nome_clinica = $36,
        estado_credenciamento = $37,
        cidade_credenciamento = $38,
        observacao_credenciamento = $39,
        observacao = $40
      WHERE id = (
        SELECT novo_cadastro_id
        FROM solicitacoes_novo_cadastro
        WHERE id = $41
      )
    `, [
      f.nome_funcionario,
      f.data_nascimento,
      f.sexo,
      f.estado_civil,
      f.doc_identidade,
      f.cpf,
      f.matricula,
      f.data_admissao,
      f.tipo_contratacao,
      f.cod_categoria,
      f.regime_trabalho,
      f.nome_fantasia,
      f.razao_social,
      f.cnpj,
      f.cnae,
      f.cep,
      f.rua,
      f.numero,
      f.bairro,
      f.estado,
      f.tipo_faturamento,
      f.email,
      f.cod_setor,
      f.nome_setor,
      f.nome_novo_setor,
      f.cod_cargo,
      f.nome_cargo,
      f.nome_novo_cargo,
      f.descricao_atividade,
      f.nova_data_exame,
      f.cnh,
      f.vencimento_cnh || null,
      f.lab_toxicologico,
      f.estado_clinica,
      f.cidade_clinica,
      f.nome_clinica,
      f.estado_credenciamento,
      f.cidade_credenciamento,
      f.observacao_credenciamento,
      f.observacao,

      id
    ]);

    await pool.query(`
      UPDATE solicitacoes_novo_cadastro
      SET
        status = 'PENDENTE_REAVALIACAO',
        editado_por = $2,
        editado_em = NOW()
      WHERE id = $1
    `, [id, f.usuario_id]);

    await pool.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ erro: "Erro ao editar cadastro" });
  }
});

// EDITAR SOLICITAÇÃO - NOVO EXAME
app.put("/solicitacoes/novo-exame/:id/editar", async (req, res) => {
  const { id } = req.params;
  const f = req.body;

  try {
    await pool.query("BEGIN");

    await pool.query(`
      UPDATE novo_exame
      SET
        nome_fantasia = $1,
        razao_social = $2,
        cnpj = $3,
        cnae = $4,
        cep = $5,
        rua = $6,
        numero = $7,
        bairro = $8,
        estado = $9,
        tipo_faturamento = $10,
        email = $11,
        funcao_destino = $12,
        nome_nova_funcao = $13,
        descricao_atividade = $14,
        setor_destino = $15,
        nome_novo_setor = $16,
        motivo_consulta = $17,
        nova_data_exame = $18,
        cnh = $19,
        vencimento_cnh = $20,
        lab_toxicologico = $21,
        estado_clinica = $22,
        cidade_clinica = $23,
        nome_clinica = $24,
        estado_credenciamento = $25,
        cidade_credenciamento = $26,
        observacao_credenciamento = $27,
        observacao = $28
      WHERE id = (
        SELECT novo_exame_id
        FROM solicitacoes_novo_exame
        WHERE id = $29
      )
    `, [
      f.nome_fantasia,
      f.razao_social,
      f.cnpj,
      f.cnae,
      f.cep,
      f.rua,
      f.numero,
      f.bairro,
      f.estado,
      f.tipo_faturamento,
      f.email,
      f.funcao_destino,
      f.nome_nova_funcao,
      f.descricao_atividade,
      f.setor_destino,
      f.nome_novo_setor,
      f.motivo_consulta,
      f.nova_data_exame,
      f.cnh,
      f.vencimento_cnh || null,
      f.lab_toxicologico,
      f.estado_clinica,
      f.cidade_clinica,
      f.nome_clinica,
      f.estado_credenciamento,
      f.cidade_credenciamento,
      f.observacao_credenciamento,
      f.observacao,

      id
    ]);

    await pool.query(`
      UPDATE solicitacoes_novo_exame
      SET
        status = 'PENDENTE_REAVALIACAO',
        editado_por = $2,
        editado_em = NOW()
      WHERE id = $1
    `, [id, f.usuario_id]);

    await pool.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ erro: "Erro ao editar exame" });
  }
});

// ROTA PARA ADICIONAR O RESPONSÁVEL DA EMPRESA
app.post("/empresa/responsavel", async (req, res) => {
  const { id, nome, emails, alteradoPor } = req.body;

  try {
    const existe = await pool.query(
      "SELECT * FROM responsavel_empresa WHERE cod_empresa = $1",
      [id]
    );

    if (!emails || emails.length === 0) {
      await pool.query(
        "DELETE FROM responsavel_empresa WHERE cod_empresa = $1",
        [id]
      );

      // 👇 UPSERT (não duplica)
      await pool.query(
        `INSERT INTO log_responsavel_empresa (item_id, alterado_por)
         VALUES ($1, $2)
         ON CONFLICT (item_id)
         DO UPDATE SET
           alterado_por = EXCLUDED.alterado_por,
           data_alteracao = CURRENT_TIMESTAMP`,
        [id, alteradoPor]
      );

      return res.sendStatus(200);
    }

    if (existe.rows.length > 0) {
      await pool.query(
        "UPDATE responsavel_empresa SET emails = $1, nome_empresa = $2 WHERE cod_empresa = $3",
        [JSON.stringify(emails), nome, id]
      );
    } else {
      await pool.query(
        "INSERT INTO responsavel_empresa (cod_empresa, nome_empresa, emails) VALUES ($1, $2, $3)",
        [id, nome, JSON.stringify(emails)]
      );
    }

    // 👇 UPSERT (não duplica)
    await pool.query(
      `INSERT INTO log_responsavel_empresa (item_id, alterado_por)
       VALUES ($1, $2)
       ON CONFLICT (item_id)
       DO UPDATE SET
         alterado_por = EXCLUDED.alterado_por,
         data_alteracao = CURRENT_TIMESTAMP`,
      [id, alteradoPor]
    );

    res.sendStatus(200);

  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// ROTA PARA BUSCAR O LOG
app.get("/log-responsavel-empresa/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT alterado_por, data_alteracao
       FROM log_responsavel_empresa
       WHERE item_id = $1
       ORDER BY data_alteracao DESC
       LIMIT 1`,
      [id]
    );

    res.json(result.rows[0] || null);

  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.get("/empresa/:codigo/responsavel", async (req, res) => {
  const { codigo } = req.params;

  try {
    const result = await pool.query(
      "SELECT emails, nome_empresa FROM responsavel_empresa WHERE cod_empresa = $1",
      [codigo]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

function interpretarRetornoSOC(retorno) {
  if (!retorno) {
    return {
      tipo: "INCONSISTENCIA",
      mensagem: "SOC não retornou resposta válida"
    };
  }

  // ❌ erro real do SOC
  if (retorno.encontrouErro === true) {
    return {
      tipo: "INCONSISTENCIA",
      mensagem: retorno.descricaoErro || "Erro de inconsistência retornado pelo SOC"
    };
  }

  // ✅ SUCESSO (CRIAÇÃO OU ATUALIZAÇÃO)
  if (
    retorno.incluiuFuncionario === true ||
    retorno.atualizouFuncionario === true
  ) {
    return {
      tipo: "SUCESSO",
      mensagem: null
    };
  }

  // ⚠️ CPF duplicado (SÓ PARA CRIAÇÃO)
  if (
    retorno.encontrouFuncionario === true &&
    retorno.incluiuFuncionario === false &&
    retorno.atualizouFuncionario === false
  ) {
    return {
      tipo: "CPF_DUPLICADO",
      mensagem: "CPF já existente no SOC"
    };
  }

  // ❌ fallback
  return {
    tipo: "INCONSISTENCIA",
    mensagem: "SOC não confirmou a operação"
  };
}

// ROTA PARA ATUALIZAR O STATUS PARA PENDENTE_AGENDAMENTO
app.put("/solicitacoes/:tipo/:id/status", async (req, res) => {
  const { tipo, id } = req.params;
  const { status, usuario_id } = req.body;

  if (!status) {
    return res.status(400).json({ erro: "Status obrigatório" });
  }

  const tabela =
    tipo === "NOVO_EXAME"
      ? "solicitacoes_novo_exame"
      : "solicitacoes_novo_cadastro";

  try {
    let result;

    if (status === "PENDENTE_AGENDAMENTO") {
      result = await pool.query(
        `UPDATE ${tabela}
         SET status = $1
         WHERE id = $2
         RETURNING status`,
        [status, id]
      );
    }

    if (!result.rows.length) {
      return res.status(404).json({ erro: "Solicitação não encontrada" });
    }

    res.json({
      sucesso: true,
      status_novo: result.rows[0].status
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar status" });
  }
});

function parseRG(doc) {
  if (!doc || !doc.trim()) return {};

  const partes = doc.trim().split(" ").filter(Boolean);

  if (partes.length >= 2) {
    const uf = partes[0];
    const numero = partes.slice(1).join(" ");

    return {
      ...(numero && { rg: numero.trim() }),
      ...(uf && { rgUf: uf.trim() })
    };
  }

  return {
    rg: doc.trim()
  };
}

// ENVIO AO SOC
app.post("/enviar-cadastro-soc/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ erro: "Usuário não informado" });
    }

    const { rows } = await pool.query(
      `
      SELECT f.*
      FROM solicitacoes_novo_cadastro sf
      JOIN novo_cadastro f ON f.id = sf.novo_cadastro_id
      WHERE sf.id = $1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ erro: "Funcionário não encontrado" });
    }

    const f = rows[0];

    const data = new Date(f.data_nascimento);
    const dataNascimento =
      `${String(data.getDate()).padStart(2, "0")}/` +
      `${String(data.getMonth() + 1).padStart(2, "0")}/` +
      data.getFullYear();

    const dataAdm = new Date(f.data_admissao);
    const dataAdmissao =
      `${String(dataAdm.getDate()).padStart(2, "0")}/` +
      `${String(dataAdm.getMonth() + 1).padStart(2, "0")}/` +
      dataAdm.getFullYear();

    const cpf = f.cpf.replace(/\D/g, "");

    const dadosRG = parseRG(f.doc_identidade);

    const dadosRGValidos = dadosRG.rg
      ? {
        rg: dadosRG.rg,
        ...(dadosRG.rgUf && { rgUf: dadosRG.rgUf })
      }
      : {};

    const client = await soap.createClientAsync(socExportaFuncionarioModelo2);

    const wsSecurity = new soap.WSSecurity(
      socUsuario,
      socToken,
      { passwordType: "PasswordDigest", hasTimeStamp: true }
    );

    client.setSecurity(wsSecurity);

    const dataBody = {
      Funcionario: {
        criarFuncionario: true,
        atualizarFuncionario: false,

        identificacaoWsVo: {
          chaveAcesso: socToken,
          codigoEmpresaPrincipal: "412429",
          codigoResponsavel: "198591",
          codigoUsuario: "3403088",
          homologacao: false
        },

        funcionarioWsVo: {
          codigoEmpresa: f.cod_empresa,
          tipoBuscaEmpresa: "CODIGO_SOC",

          cpf,
          nomeFuncionario: f.nome_funcionario,
          ...dadosRGValidos,
          dataNascimento,
          sexo: f.sexo,
          estadoCivil: f.estado_civil,

          ...(f.nao_possui_matricula || !f.matricula || !String(f.matricula).trim()
            ? { naoPossuiMatricula: true }
            : { matricula: String(f.matricula).trim() }
          ),

          dataAdmissao,
          tipoContratacao: f.tipo_contratacao,
          codigoCategoriaESocial: f.cod_categoria,
          regimeTrabalho: f.regime_trabalho,

          situacao: "ATIVO",
          chaveProcuraFuncionario: "CPF_ATIVO"
        },

        unidadeWsVo: {
          codigo: f.cod_unidade,
          tipoBusca: "CODIGO"
        },

        setorWsVo: {
          codigo: f.cod_setor,
          tipoBusca: "CODIGO"
        },

        cargoWsVo: {
          codigo: f.cod_cargo,
          tipoBusca: "CODIGO"
        }
      }
    };

    const [result] = await client.importacaoFuncionarioAsync(dataBody);
    const retorno = result?.FuncionarioRetorno;

    const resultadoSOC = interpretarRetornoSOC(retorno);

    // ERRO DE NEGÓCIO (CPF duplicado etc)
    if (resultadoSOC.tipo !== "SUCESSO") {
      await pool.query(
        `
        UPDATE solicitacoes_novo_cadastro
        SET status = 'ERRO_SOC',
          erro_soc = $1
        WHERE id = $2
        `,
        [resultadoSOC.mensagem, id]
      );

      return res.status(400).json({
        erro: "Falha no envio ao SOC",
        detalhe: resultadoSOC.mensagem
      });
    }

    // SUCESSO
    await pool.query(
      `
      UPDATE solicitacoes_novo_cadastro
      SET
        status = 'ENVIADO_SOC',
        erro_soc = NULL,
        enviado_soc_por = $1,
        enviado_soc_em = NOW()
      WHERE id = $2
      `,
      [usuario_id, id]
    );

    return res.json({
      sucesso: true,
      retornoSOC: retorno
    });

  } catch (err) {
    // ERRO TÉCNICO (SOAP, DB, JS)
    await pool.query(
      `
      UPDATE solicitacoes_novo_cadastro
      SET status = 'ERRO_SOC',
        erro_soc = $1
      WHERE id = $2
      `,
      [err.message, id]
    );

    return res.status(500).json({
      erro: "Erro técnico ao enviar funcionário ao SOC",
      detalhe: err.message
    });
  }
});

app.put("/inativar-cadastro-soc", async (req, res) => {
  try {
    const { cpf, cod_empresa } = req.body;

    if (!cpf || !cod_empresa) {
      return res.status(400).json({ erro: "CPF ou empresa não informado" });
    }

    const cpfLimpo = cpf.replace(/\D/g, "");

    const client = await soap.createClientAsync(socExportaFuncionarioModelo2);

    const wsSecurity = new soap.WSSecurity(
      socUsuario,
      socToken,
      { passwordType: "PasswordDigest", hasTimeStamp: true }
    );

    client.setSecurity(wsSecurity);

    const dataBody = {
      Funcionario: {
        criarFuncionario: false,
        atualizarFuncionario: true,

        identificacaoWsVo: {
          chaveAcesso: socToken,
          codigoEmpresaPrincipal: "412429",
          codigoResponsavel: "198591",
          codigoUsuario: "3403088",
          homologacao: false
        },

        funcionarioWsVo: {
          cpf: cpfLimpo,
          codigoEmpresa: cod_empresa,
          tipoBuscaEmpresa: "CODIGO_SOC",

          situacao: "INATIVO",
          chaveProcuraFuncionario: "CPF_ATIVO"
        }
      }
    };

    const [result] = await client.importacaoFuncionarioAsync(dataBody);
    const retorno = result?.FuncionarioRetorno;

    const resultadoSOC = interpretarRetornoSOC(retorno);

    if (resultadoSOC.tipo !== "SUCESSO") {
      return res.status(400).json({
        erro: "Falha ao inativar no SOC",
        detalhe: resultadoSOC.mensagem
      });
    }

    return res.json({
      sucesso: true,
      mensagem: "Funcionário inativado com sucesso",
      retornoSOC: retorno
    });

  } catch (err) {
    console.error("❌ ERRO GERAL:", err);

    return res.status(500).json({
      erro: "Erro técnico ao inativar funcionário",
      detalhe: err.message
    });
  }
});

// INICIAR ANÁLISE DE UMA SOLICITAÇÃO
app.post("/solicitacoes/:tipo/:id/iniciar-analise", async (req, res) => {
  const { tipo, id } = req.params;
  const { usuario_id } = req.body;

  if (!usuario_id) {
    return res.status(400).json({ erro: "Usuário não informado" });
  }

  const tabela =
    tipo === "NOVO_EXAME"
      ? "solicitacoes_novo_exame"
      : "solicitacoes_novo_cadastro";

  try {
    const { rows } = await pool.query(
      `
      SELECT 
        s.em_analise_por,
        u.nome AS nome_usuario
      FROM ${tabela} s
      LEFT JOIN usuarios u ON u.id = s.em_analise_por
      WHERE s.id = $1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ erro: "Solicitação não encontrada" });
    }

    const solicitacao = rows[0];

    // 🚫 Já está em análise por outro usuário
    if (
      solicitacao.em_analise_por &&
      solicitacao.em_analise_por !== usuario_id
    ) {
      return res.status(409).json({
        erro: `Em análise por ${solicitacao.nome_usuario}`
      });
    }

    // 🔐 Cria / renova lock
    await pool.query(
      `
      UPDATE ${tabela}
      SET em_analise_por = $1
      WHERE id = $2
      `,
      [usuario_id, id]
    );

    res.json({ sucesso: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao iniciar análise" });
  }
});

// FINALIZAR ANÁLISE DE UMA SOLICITAÇÃO
app.post("/solicitacoes/:tipo/:id/finalizar-analise", async (req, res) => {
  const { tipo, id } = req.params;
  const { usuario_id } = req.body;

  const tabela =
    tipo === "NOVO_EXAME"
      ? "solicitacoes_novo_exame"
      : "solicitacoes_novo_cadastro";

  try {
    await pool.query(
      `
      UPDATE ${tabela}
      SET em_analise_por = NULL
      WHERE id = $1
        AND em_analise_por = $2
      `,
      [id, usuario_id]
    );

    res.json({ sucesso: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao finalizar análise" });
  }
});

// ROTA PARA MOSTRAR AS PERMISSÕES DE ACESSO DO USUÁRIO (EMPRESAS E UNIDADES)
app.get("/permissoes/:usuarioId", async (req, res) => {
  try {
    const { usuarioId } = req.params;

    // Pega a empresa principal do usuário
    const { rows: principalRows } = await pool.query(
      `
      SELECT
        cod_empresa,
        nome_empresa,
        unidades
      FROM usuarios
      WHERE id = $1
      `,
      [usuarioId]
    );

    if (principalRows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const principal = principalRows[0];

    // Pega as empresas adicionais na tabela usuarios_empresas
    const { rows: adicionaisRows } = await pool.query(
      `
      SELECT cod_empresa, nome_empresa, unidades
      FROM usuarios_empresas
      WHERE usuario_id = $1
      `,
      [usuarioId]
    );

    // Monta o array de empresas
    const empresas = [
      {
        cod_empresa: principal.cod_empresa,
        nome_empresa: principal.nome_empresa,
        unidades: principal.unidades || []
      },
      ...adicionaisRows.map(e => ({
        cod_empresa: e.cod_empresa,
        nome_empresa: e.nome_empresa,
        unidades: e.unidades || []
      }))
    ];

    res.json({ empresas });

  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao buscar permissões" });
  }
});

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

// ROTA PARA ENVIAR E-MAIL NA HORA DA SOLICITAÇÃO
app.post("/enviar-email-solicitacao", async (req, res) => {
  const isDev = process.env.NODE_ENV === "development";

  const { tipoSolicitacao, assunto, mensagem, codigo_empresa } = req.body;

  try {
    let destinoFinal = "";
    let copia = "";

    if (tipoSolicitacao === "UNIDADE") {
      destinoFinal = isDev
        ? "debora.fonseca@salubrita.com.br"
        : "clientes@salubrita.com.br";
    }
    // SETOR / CARGO → buscar na tabela
    else if (tipoSolicitacao === "SETOR_CARGO") {
      const result = await pool.query(
        "SELECT emails FROM responsavel_empresa WHERE cod_empresa = $1",
        [codigo_empresa]
      );

      let emailsArray = result.rows[0]?.emails || [];

      if (typeof emailsArray === "string") {
        emailsArray = JSON.parse(emailsArray);
      }

      if (!Array.isArray(emailsArray) || emailsArray.length === 0) {
        throw new Error("Nenhum email encontrado para essa empresa");
      }

      destinoFinal = emailsArray.join(", ");

      copia = isDev
        ? "debora.fonseca@salubrita.com.br, fonsecadrf@outlook.com"
        : "nicolly.rocha@salubrita.com.br, paulina.oliveira@salubrita.com.br, rubia.costa@salubrita.com.br";
    }
    else if (tipoSolicitacao === "CREDENCIAMENTO") {
      destinoFinal = isDev
        ? "debora.fonseca@salubrita.com.br"
        : "contratos@salubrita.com.br";
    }
    else {
      return res.json({
        ok: true,
        enviado: false
      });
    }

    await transporter.sendMail({
      from: "Portal Salubritá <naoresponda@salubrita.com.br>",
      to: destinoFinal,
      subject: assunto,
      cc: copia || undefined,
      text: mensagem
    });

    res.json({
      ok: true,
      enviado: true
    });

  } catch (err) {
    console.error("Erro nodemailer:", err.message);
    res.status(500).json({
      erro: "Falha ao enviar e-mail",
      detalhe: err.message
    });
  }
});

// FUNÇÃO PARA ENVIAR E-MAIL DEPOIS DA CRIAÇÃO DE UNIDADE - NOVO EXAME
async function enviarEmailSetorFuncao(dados) {
  const isDev = process.env.NODE_ENV === "development";

  try {
    const result = await pool.query(
      "SELECT emails FROM responsavel_empresa WHERE cod_empresa = $1",
      [dados.cod_empresa]
    );

    const emailsArray = result.rows[0]?.emails || [];

    if (!Array.isArray(emailsArray) || emailsArray.length === 0) {
      throw new Error("Nenhum email encontrado para essa empresa");
    }

    const destino = emailsArray.join(", ");

    const copia = isDev
      ? "debora.fonseca@salubrita.com.br, fonsecadrf@outlook.com"
      : "nicolly.rocha@salubrita.com.br, paulina.oliveira@salubrita.com.br, rubia.costa@salubrita.com.br";

    await transporter.sendMail({
      from: "Portal Salubritá <naoresponda@salubrita.com.br>",
      to: destino,
      cc: copia,
      subject: "Solicitação de Criação de Setor/Função",
      text: `
        Uma solicitação para a Empresa: ${dados.nome_empresa} foi gerada no Portal Salubritá.
    
        Gentileza dar prosseguimento à solicitação.
      `
    });

  } catch (erro) {
    console.error("Erro ao enviar email");
  }
}

// FUNÇÃO PARA ENVIAR E-MAIL DEPOIS DA CRIAÇÃO DE UNIDADE - NOVO CADASTRO
async function enviarEmailSetorCargo(dados) {
  const isDev = process.env.NODE_ENV === "development";

  try {
    const result = await pool.query(
      "SELECT emails FROM responsavel_empresa WHERE cod_empresa = $1",
      [dados.cod_empresa]
    );

    const emailsArray = result.rows[0]?.emails || [];

    if (!Array.isArray(emailsArray) || emailsArray.length === 0) {
      throw new Error("Nenhum email encontrado para essa empresa");
    }

    const destino = emailsArray.join(", ");

    const copia = isDev
      ? "debora.fonseca@salubrita.com.br, fonsecadrf@outlook.com"
      : "nicolly.rocha@salubrita.com.br, paulina.oliveira@salubrita.com.br, rubia.costa@salubrita.com.br";

    await transporter.sendMail({
      from: "Portal Salubritá <naoresponda@salubrita.com.br>",
      to: destino,
      cc: copia,
      subject: "Solicitação de Criação de Setor/Cargo",
      text: `
        Uma solicitação para a Empresa: ${dados.nome_empresa} foi gerada no Portal Salubritá.
      
        Gentileza dar prosseguimento à solicitação.
      `
    });
  } catch (erro) {
    console.error("Erro ao enviar email");
  }
}

// FUNÇÃO PARA ENVIAR E-MAIL DEPOIS DA CRIAÇÃO DE SETOR/CARGO/FUNÇÃO
async function enviarEmailCredenciamento(dados) {
  const isDev = process.env.NODE_ENV === "development";

  const destino = isDev
    ? "debora.fonseca@salubrita.com.br"
    : "contratos@salubrita.com.br";

  await transporter.sendMail({
    from: "Portal Salubritá <naoresponda@salubrita.com.br>",
    to: destino,
    subject: "Solicitação de Credenciamento",
    text: `
      Uma solicitação para a Empresa: ${dados.nome_empresa} foi gerada no Portal Salubritá.
    
      Gentileza dar prosseguimento à solicitação.
    `
  });
}

// FUNÇÃO PRA ENVIAR E-MAIL PRA PESSOA DA SOLICITAÇÃO QUANDO FOR REPROVADA
async function enviarEmailReprovacao(email, motivo) {
  await transporter.sendMail({
    from: "Portal Salubritá <naoresponda@salubrita.com.br>",
    to: email,
    subject: "Solicitação Reprovada",
    text:
      `
      Sua solicitação foi reprovada pelo seguinte motivo:

      "${motivo}"

      Ela permanecerá pendente até que as correções necessárias sejam realizadas.

      Gentileza acessar o Portal Salubritá para revisar e editar as informações.
    `
  });
}

// FUNÇÃO PRA ENVIAR E-MAIL PRA PESSOA DA SOLICITAÇÃO QUANDO FOR APROVADO E TIVER OBSERVAÇÃO
// SOBRE A CONSULTA
async function enviarEmailObservacaoConsulta({ email, nomeFuncionario, observacao }) {
  await transporter.sendMail({
    from: "Portal Salubritá <naoresponda@salubrita.com.br>",
    to: email,
    subject: "Consulta Agendada",
    html: `
      <p>A solicitação referente a novo cadastro/novo exame do(a) colaborador(a): ${nomeFuncionario} foi aprovada.</p>

      <p>Observação da consulta:</p>

      "${observacao.replace(/\n/g, "<br>")}"
    `
  });
}

const PORT = process.env.NODE_ENV === 'development'
  ? 3000
  : (process.env.PORT || 3003);

const HOST = process.env.NODE_ENV === 'development'
  ? "0.0.0.0"
  : "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em ${HOST}:${PORT}`);
});