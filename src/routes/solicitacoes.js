const express = require("express");
const router = express.Router();
const pool = require("../../db/pool");

// FORMULÁRIO PARA NOVO CADASTRO
router.post("/novo-cadastro", async (req, res) => {
  const f = req.body;

  try {
    await pool.query("BEGIN");

    const { rows } = await pool.query(
      `
      INSERT INTO novo_cadastro (
        cod_empresa, nome_empresa, nome_funcionario, data_nascimento, sexo, estado_civil,
        doc_identidade, cpf, matricula, nao_possui_matricula, data_admissao, tipo_contratacao,
        cod_categoria, regime_trabalho, cod_unidade, nome_unidade, solicitar_nova_unidade,
        nome_fantasia, razao_social, cnpj, cnae, cep, rua, numero, bairro, estado,
        tipo_faturamento, email, cod_setor, nome_setor, solicitar_novo_setor, nome_novo_setor,
        cod_cargo, nome_cargo, solicitar_novo_cargo, nome_novo_cargo, descricao_atividade,
        rac, tipos_rac, tipo_exame, data_exame, unidades_extras, cnh, vencimento_cnh,
        lab_toxicologico, estado_clinica, cidade_clinica, nome_clinica, solicitar_credenciamento,
        estado_credenciamento, cidade_credenciamento, observacao_credenciamento, observacao,
        emails_extras )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,
              $24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,
              $45,$46,$47,$48,$49,$50,$51,$52,$53,$54)
      RETURNING id
      `,
      [
        f.cod_empresa, f.nome_empresa, f.nome_funcionario, f.data_nascimento, f.sexo, f.estado_civil,
        f.doc_identidade, f.cpf, f.matricula, f.nao_possui_matricula, f.data_admissao, f.tipo_contratacao,
        f.cod_categoria, f.regime_trabalho, f.cod_unidade, f.nome_unidade, f.solicitar_nova_unidade,
        f.nome_fantasia, f.razao_social, f.cnpj, f.cnae, f.cep, f.rua, f.numero, f.bairro, f.estado,
        f.tipo_faturamento, f.email, f.cod_setor, f.nome_setor, f.solicitar_novo_setor, f.nome_novo_setor,
        f.cod_cargo, f.nome_cargo, f.solicitar_novo_cargo, f.nome_novo_cargo, f.descricao_atividade,
        JSON.stringify(f.rac || []), JSON.stringify(f.tipos_rac || []), f.tipo_exame, f.data_exame,
        JSON.stringify(f.unidades_extras || []), f.cnh, f.vencimento_cnh, f.lab_toxicologico,
        f.estado_clinica, f.cidade_clinica, f.nome_clinica, f.solicitar_credenciamento, f.estado_credenciamento,
        f.cidade_credenciamento, f.observacao_credenciamento, f.observacao, JSON.stringify(f.emails_extras || []),
      ]
    );

    const funcionarioId = rows[0].id;

    await pool.query(
      `
      INSERT INTO solicitacoes_novo_cadastro
        (novo_cadastro_id, status, solicitado_por)
      VALUES ($1, $2, $3)
      `,
      [funcionarioId, f.status, f.usuario_id]
    );

    await pool.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ erro: "Erro ao cadastrar funcionário" });
  }
});

// DETALHES DA SOLICITAÇÃO DE NOVO CADASTRO
router.get("/solicitacoes/novo-cadastro/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(`
      SELECT
        sf.id AS solicitacao_id,
        f.*,
        sf.status,
        sf.tipo_consulta,
        sf.observacao_consulta,
        sf.motivo_reprovacao,
        sf.solicitado_em,
        sf.em_analise_por,
        u.nome AS solicitado_por_nome,
        u.email AS solicitado_por_email,
        ue.nome AS enviado_soc_por_nome,
        uc.nome AS cancelado_por_nome,
        ulock.nome AS em_analise_por_nome,
        arp.nome AS aprovado_por_nome,
        rrp.nome AS reprovado_por_nome,
        sf.aprovado_em,
        sf.reprovado_em,
        sf.enviado_soc_em,
        sf.cancelado_em
      FROM solicitacoes_novo_cadastro sf
      JOIN novo_cadastro f ON f.id = sf.novo_cadastro_id
      JOIN usuarios u ON u.id = sf.solicitado_por
      LEFT JOIN usuarios ue ON ue.id = sf.enviado_soc_por
      LEFT JOIN usuarios uc ON uc.id = sf.cancelado_por
      LEFT JOIN usuarios ulock ON ulock.id = sf.em_analise_por
      LEFT JOIN usuarios arp ON arp.id = sf.aprovado_por
      LEFT JOIN usuarios rrp ON rrp.id = sf.reprovado_por
      WHERE sf.id = $1
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({ erro: "Solicitação não encontrada" });
    }

    res.json({
      tipo: "NOVO_CADASTRO",
      dados: rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar detalhes do cadastro" });
  }
});

// FORMULÁRIO PARA SOLICITAR EXAMES
router.post("/solicitar-exame", async (req, res) => {
  const f = req.body;

  try {
    await pool.query("BEGIN");

    const { rows } = await pool.query(
      `
      INSERT INTO novo_exame (
        cod_empresa, nome_empresa, nome_funcionario, data_nascimento, cpf, matricula, data_admissao,
        cod_unidade, nome_unidade, cod_setor, nome_setor, cod_cargo, nome_cargo, rac, tipos_rac,
        tipo_exame, data_exame, unidades_extras, unidade_destino, solicitar_nova_unidade, nome_fantasia,
        razao_social, cnpj, cnae, cep, rua, numero, bairro, estado, tipo_faturamento, email,
        setor_destino, solicitar_novo_setor, nome_novo_setor, funcao_destino, solicitar_nova_funcao,
        nome_nova_funcao, descricao_atividade, motivo_consulta, cnh, vencimento_cnh, lab_toxicologico,
        estado_clinica, cidade_clinica, nome_clinica, solicitar_credenciamento, estado_credenciamento,
        cidade_credenciamento, observacao_credenciamento, observacao, emails_extras )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,
              $24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,
              $45,$46,$47,$48,$49,$50,$51)
      RETURNING id
      `,
      [
        f.cod_empresa, f.nome_empresa, f.nome_funcionario, f.data_nascimento, f.cpf, f.matricula,
        f.data_admissao, f.cod_unidade, f.nome_unidade, f.cod_setor, f.nome_setor, f.cod_cargo,
        f.nome_cargo, JSON.stringify(f.rac || []), JSON.stringify(f.tipos_rac || []), f.tipo_exame,
        f.data_exame, JSON.stringify(f.unidades_extras || []), f.unidade_destino, f.solicitar_nova_unidade,
        f.nome_fantasia, f.razao_social, f.cnpj, f.cnae, f.cep, f.rua, f.numero, f.bairro, f.estado,
        f.tipo_faturamento, f.email, f.setor_destino, f.solicitar_novo_setor, f.nome_novo_setor,
        f.funcao_destino, f.solicitar_nova_funcao, f.nome_nova_funcao, f.descricao_atividade,
        f.motivo_consulta, f.cnh, f.vencimento_cnh, f.lab_toxicologico, f.estado_clinica, f.cidade_clinica,
        f.nome_clinica, f.solicitar_credenciamento, f.estado_credenciamento, f.cidade_credenciamento,
        f.observacao_credenciamento, f.observacao, JSON.stringify(f.emails_extras || [])
      ]
    );

    const funcionarioId = rows[0].id;

    await pool.query(
      `
      INSERT INTO solicitacoes_novo_exame
        (novo_exame_id, status, solicitado_por)
      VALUES ($1, $2, $3)
      `,
      [funcionarioId, f.status, f.usuario_id]
    );

    await pool.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ erro: "Erro ao gerar solicitação de exame" });
  }
});

// DETALHES DA SOLICITAÇÃO DE NOVO EXAME
router.get("/solicitacoes/novo-exame/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(`
      SELECT
        sf.id AS solicitacao_id,
        f.*,
        sf.status,
        sf.tipo_consulta,
        sf.observacao_consulta,
        sf.motivo_reprovacao,
        sf.solicitado_em,
        sf.em_analise_por,
        u.nome AS solicitado_por_nome,
        u.email AS solicitado_por_email,
        uc.nome AS cancelado_por_nome,
        ulock.nome AS em_analise_por_nome,
        arp.nome AS aprovado_por_nome,
        rrp.nome AS reprovado_por_nome,
        sf.aprovado_em,
        sf.reprovado_em,
        sf.cancelado_em
      FROM solicitacoes_novo_exame sf
      JOIN novo_exame f ON f.id = sf.novo_exame_id
      JOIN usuarios u ON u.id = sf.solicitado_por
      LEFT JOIN usuarios uc ON uc.id = sf.cancelado_por
      LEFT JOIN usuarios ulock ON ulock.id = sf.em_analise_por
      LEFT JOIN usuarios arp ON arp.id = sf.aprovado_por
      LEFT JOIN usuarios rrp ON rrp.id = sf.reprovado_por
      WHERE sf.id = $1
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({ erro: "Solicitação não encontrada" });
    }

    res.json({
      tipo: "NOVO_EXAME",
      dados: rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar detalhes do exame" });
  }
});

// LISTAR SOLICITAÇÕES (novo cadastro e exame)
router.get("/solicitacoes", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM (
        SELECT
          s.id AS solicitacao_id,
          f.id AS novo_cadastro_id,
          CASE
            WHEN f.solicitar_credenciamento = true
              THEN f.cidade_credenciamento
            ELSE f.cidade_clinica
          END AS cidade,
          f.nome_empresa,
          f.nome_funcionario,
          f.cpf,
          s.status,
          s.solicitado_em,
          f.solicitar_novo_setor,
          f.solicitar_novo_cargo,
          f.solicitar_credenciamento,
          f.nome_unidade AS unidade_destino,
          f.nome_setor AS setor_destino,
          f.nome_cargo AS funcao_destino,
          f.nome_clinica,
          s.em_analise_por,
          ulock.nome AS em_analise_por_nome,
          'NOVO_CADASTRO' AS tipo
        FROM solicitacoes_novo_cadastro s
        JOIN novo_cadastro f ON f.id = s.novo_cadastro_id
        LEFT JOIN usuarios ulock ON ulock.id = s.em_analise_por

        UNION ALL

        SELECT
          s.id AS solicitacao_id,
          f.id AS novo_exame_id,
          CASE
            WHEN f.solicitar_credenciamento = true
              THEN f.cidade_credenciamento
            ELSE f.cidade_clinica
          END AS cidade,
          f.nome_empresa,
          f.nome_funcionario,
          f.cpf,
          s.status,
          s.solicitado_em,
          f.solicitar_nova_funcao,
          f.solicitar_novo_setor,
          f.solicitar_credenciamento,
          f.unidade_destino,
          f.setor_destino,
          f.funcao_destino,
          f.nome_clinica,
          s.em_analise_por,
          ulock.nome AS em_analise_por_nome,
          'NOVO_EXAME' AS tipo
        FROM solicitacoes_novo_exame s
        JOIN novo_exame f ON f.id = s.novo_exame_id
        LEFT JOIN usuarios ulock ON ulock.id = s.em_analise_por
      ) t
      ORDER BY t.solicitado_em DESC;
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar solicitações" });
  }
});

module.exports = router;