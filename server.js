const pool = require("./db/pool");
const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const iconv = require("iconv-lite");
const soap = require("soap");

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

// ✅ SERVIR ARQUIVOS ESTÁTICOS
app.use(express.static(path.join(__dirname, "public")));

// SOC – SOAP
const WSDL_URL = "https://ws1.soc.com.br/WSSoc/FuncionarioModelo2Ws?wsdl";
const SOC_USUARIO = "U3403088";
const SOC_TOKEN = "3e3c74848066fe9b39690a37c372a61816696e18";

// SOC – EXPORTA DADOS
const SOC_EXPORTA_URL = "https://ws1.soc.com.br/WebSoc/exportadados";

const EXPORTA_EMPRESAS = {
  empresa: "412429",
  codigo: "211215",
  chave: "23749732f8f23c6b480a",
  tipoSaida: "xml"
};

const EXPORTA_UNIDADES = {
  codigo: "211234",
  chave: "dcae35a7621badc2d93b",
  tipoSaida: "xml"
};

const EXPORTA_SETORES = {
  codigo: "211373",
  chave: "a8becfc0b392392557a3",
  tipoSaida: "xml"
};

const EXPORTA_CARGOS = {
  codigo: "211242",
  chave: "f148481826f0664d5958",
  tipoSaida: "xml"
};

const EXPORTA_FUNCIONARIOS = {
  empresa: "412429",
  codigo: "211477",
  chave: "2849e76b01bbb08b3467",
  tipoSaida: "json"
};

const EXPORTA_PRESTADORES = {
  empresa: "412429",
  codigo: "211713",
  chave: "edc76dff447196a109fe",
  tipoSaida: "xml",
  codigoPrestador: ""
};

const EXPORTA_DETALHES_PRESTADOR = {
  empresa: "412429",
  codigo: "211707",
  chave: "d7e76b1761998e246d37",
  tipoSaida: "json"
}

const parser = new XMLParser({ ignoreAttributes: false });

// ROTA PRINCIPAL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/pages/index.html"));
});

// TESTE API
app.get("/api/status", (req, res) => {
  res.json({ ok: true });
});

// EXPORTA DADOS - TODAS EMPRESAS - (apenas ativos)
app.get("/empresas", async (req, res) => {
  try {
    const parametro = JSON.stringify(EXPORTA_EMPRESAS);

    const response = await axios.get(SOC_EXPORTA_URL, {
      params: { parametro },
      responseType: "arraybuffer"
    });

    let xml = iconv.decode(response.data, "ISO-8859-1");
    xml = xml.replace(/&(?!(amp|lt|gt|quot|apos);)/g, "&amp;");

    const json = parser.parse(xml);
    const registros = json?.root?.record || [];

    res.json(
      (Array.isArray(registros) ? registros : [registros])
        .filter(e => e.ATIVO == 1)
        .map(e => ({
          codigo: e.CODIGO,
          nome: e.RAZAOSOCIAL,
          ativo: true
        }))
    );
  } catch {
    res.status(500).json({ erro: "Erro empresas" });
  }
});

// EXPORTA DADOS - UNIDADES DE UMA EMPRESA - (apenas ativos)
app.get("/unidades/:empresa", async (req, res) => {
  try {
    const parametro = JSON.stringify({
      empresa: req.params.empresa,
      ...EXPORTA_UNIDADES
    });

    const response = await axios.get(SOC_EXPORTA_URL, {
      params: { parametro },
      responseType: "arraybuffer"
    });

    let xml = iconv.decode(response.data, "ISO-8859-1");
    xml = xml.replace(/&(?!(amp|lt|gt|quot|apos);)/g, "&amp;");

    const json = parser.parse(xml);
    const registros = json?.root?.record || [];

    res.json(
      (Array.isArray(registros) ? registros : [registros])
        .filter(u => u.ATIVO == 1)
        .map(u => ({
          codigo: u.CODIGO,
          nome: u.NOME,
          ativo: true
        }))
    );
  } catch {
    res.status(500).json({ erro: "Erro unidades" });
  }
});

// EXPORTA DADOS - SETORES DE UMA EMPRESA - (apenas ativos)
app.get("/setores/:empresa", async (req, res) => {
  try {
    const parametro = JSON.stringify({
      empresa: req.params.empresa,
      ...EXPORTA_SETORES
    });

    const response = await axios.get(SOC_EXPORTA_URL, {
      params: { parametro },
      responseType: "arraybuffer"
    });

    let xml = iconv.decode(response.data, "ISO-8859-1");
    xml = xml.replace(/&(?!(amp|lt|gt|quot|apos);)/g, "&amp;");

    const json = parser.parse(xml);
    const registros = json?.root?.record || [];

    res.json(
      (Array.isArray(registros) ? registros : [registros])
        .filter(s => s.ATIVO == 1)
        .map(s => ({
          codigo: s.CODIGO,
          nome: s.NOME,
          ativo: true
        }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro setores da empresa" });
  }
});

// EXPORTA DADOS - CARGOS DE UMA EMPRESA - (apenas ativos)
app.get("/cargos/:empresa", async (req, res) => {
  try {
    const parametro = JSON.stringify({
      empresa: req.params.empresa,
      ...EXPORTA_CARGOS
    });

    const response = await axios.get(SOC_EXPORTA_URL, {
      params: { parametro },
      responseType: "arraybuffer"
    });

    let xml = iconv.decode(response.data, "ISO-8859-1");
    xml = xml.replace(/&(?!(amp|lt|gt|quot|apos);)/g, "&amp;");

    const json = parser.parse(xml);
    const registros = json?.root?.record || [];

    res.json(
      (Array.isArray(registros) ? registros : [registros])
        .filter(c => c.ATIVO == 1)
        .map(c => ({
          codigo: c.CODIGO,
          nome: c.NOME,
          ativo: true
        }))
    );
  } catch {
    res.status(500).json({ erro: "Erro cargos" });
  }
});

// EXPORTA DADOS - PRESTADORES POR EMPRESA - (apenas ativos)
app.get("/prestadores/:empresa", async (req, res) => {
  try {
    const parametro = JSON.stringify({
      empresa: req.params.empresa,
      ...EXPORTA_PRESTADORES,
      codigoDaEmpresa: req.params.empresa,
      empresaTrabalho: req.params.empresa
    });

    const response = await axios.get(SOC_EXPORTA_URL, {
      params: { parametro },
      responseType: "arraybuffer"
    });

    let xml = iconv.decode(response.data, "ISO-8859-1");
    xml = xml.replace(/&(?!(amp|lt|gt|quot|apos);)/g, "&amp;");

    const parser = new XMLParser({ ignoreAttributes: false });
    const json = parser.parse(xml);

    const registros = json?.root?.record
      ? Array.isArray(json.root.record)
        ? json.root.record
        : [json.root.record]
      : [];

    // APENAS PRESTADORES ATIVOS
    const prestadores = registros
      .filter(p => p.statusPrestador === "Ativo")
      .map(p => ({
        codigo: p.codigoPrestador,
        nome: p.nomePrestador,
        cnpj: p.cnpjPrestador,
        cpf: p.cpfPrestador,
        status: p.statusPrestador
      }));

    res.json(prestadores);

  } catch (err) {
    console.error("Erro ao buscar prestadores:", err);
    res.status(500).json({ erro: "Erro ao buscar prestadores" });
  }
  /*http://localhost:3001/prestadores/2046368*/
});

// EXPORTA DADOS - DETALHES DO PRESTADOR - (filtrado pelo codigo)
app.get("/prestador/:empresa/:codigoPrestador", async (req, res) => {
  try {
    const { codigoPrestador } = req.params;

    const parametro = JSON.stringify({
      ...EXPORTA_DETALHES_PRESTADOR,
      codigoPrestador
    });

    const payload = new URLSearchParams({ parametro });

    const socResponse = await axios.post(
      "https://ws1.soc.com.br/WebSoc/exportadados",
      payload,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        responseType: "arraybuffer"
      }
    );

    const decoded = iconv.decode(socResponse.data, "ISO-8859-1");

    const data = JSON.parse(decoded);

    const lista = Array.isArray(data) ? data : [];

    const prestador = lista.find(
      p => String(p.codigoPrestador) === String(codigoPrestador)
    );

    if (!prestador) {
      return res.status(404).json({
        erro: "Prestador não encontrado"
      });
    }

    res.json(prestador);

  } catch (err) {
    console.error("Erro SOC:", err.response?.data || err.message);
    res.status(500).json({ erro: "Erro ao consultar SOC" });
  }
});

// ROTA DE CADASTRO DE USUÁRIO
app.post("/cadastro", async (req, res) => {
  try {
    const { nome, cpf, email, senha, perfil, cod_empresa, nome_empresa, cod_unidade, nome_unidade } = req.body;

    await pool.query(
      ` INSERT INTO usuarios
        (nome, cpf, email, senha, perfil, cod_empresa, nome_empresa, cod_unidade, nome_unidade)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      [nome, cpf, email, senha, perfil, cod_empresa, nome_empresa, cod_unidade, nome_unidade]
    );

    res.json({ sucesso: true });
  }
  catch (err) {
    if (err.code === "23505") {

      if (err.constraint === "usuarios_email_key") {
        return res.status(400).json({ erro: "Email já cadastrado" });
      }

      if (err.constraint === "usuarios_cpf_key") {
        return res.status(400).json({ erro: "CPF já cadastrado" });
      }

      return res.status(400).json({ erro: "Dados já cadastrados" });
    }

    console.error(err);
    res.status(500).json({ erro: "Erro ao cadastrar usuário" });
  }
});

// ROTA DE LOGIN DE USUÁRIO
app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    const { rows } = await pool.query(
      `
      SELECT
        id,
        nome,
        email,
        perfil,
        cod_empresa,
        nome_empresa,
        cod_unidade,
        nome_unidade
      FROM usuarios
      WHERE email = $1
        AND senha = $2
      `,
      [email, senha]
    );

    if (!rows.length) {
      return res.status(401).json({ erro: "Email ou senha inválidos" });
    }

    res.json(rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro no login" });
  }
});

// FORMULÁRIO PARA SOLICITAR NOVO CADASTRO
app.post("/novo-cadastro", async (req, res) => {
  const f = req.body;

  try {
    await pool.query("BEGIN");

    const { rows } = await pool.query(
      `
      INSERT INTO novo_cadastro (
        cod_empresa,
        nome_empresa,
        nome_funcionario,
        data_nascimento,
        sexo,
        estado_civil,
        doc_identidade,
        cpf,
        matricula,
        nao_possui_matricula,
        data_admissao,
        tipo_contratacao,
        cod_categoria,
        regime_trabalho,
        cod_unidade,
        nome_unidade,
        cod_setor,
        nome_setor,
        solicitar_novo_setor,
        nome_novo_setor,
        cod_cargo,
        nome_cargo,
        solicitar_novo_cargo,
        nome_novo_cargo,
        rac,
        tipo_rac,
        tipo_exame,
        cnh,
        vencimento_cnh,
        lab_toxicologico,
        estado_clinica,
        cidade_clinica,
        nome_clinica,
        solicitar_credenciamento,
        estado_credenciamento,
        cidade_credenciamento,
        observacao)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37)
      RETURNING id
      `,
      [
        f.cod_empresa,
        f.nome_empresa,
        f.nome_funcionario,
        f.data_nascimento,
        f.sexo,
        f.estado_civil,
        f.doc_identidade,
        f.cpf,
        f.matricula,
        f.nao_possui_matricula,
        f.data_admissao,
        f.tipo_contratacao,
        f.cod_categoria,
        f.regime_trabalho,
        f.cod_unidade,
        f.nome_unidade,
        f.cod_setor,
        f.nome_setor,
        f.solicitar_novo_setor,
        f.nome_novo_setor,
        f.cod_cargo,
        f.nome_cargo,
        f.solicitar_novo_cargo,
        f.nome_novo_cargo,
        f.rac,
        f.tipo_rac,
        f.tipo_exame,
        f.cnh,
        f.vencimento_cnh,
        f.lab_toxicologico,
        f.estado_clinica,
        f.cidade_clinica,
        f.nome_clinica,
        f.solicitar_credenciamento,
        f.estado_credenciamento,
        f.cidade_credenciamento,
        f.observacao
      ]
    );

    const funcionarioId = rows[0].id;

    await pool.query(
      `
      INSERT INTO solicitacoes_novo_cadastro
        (novo_cadastro_id, solicitado_por)
      VALUES ($1, $2)
      `,
      [funcionarioId, f.usuario_id]
    );

    await pool.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ erro: "Erro ao cadastrar funcionário" });
  }
});

// FORMULÁRIO PARA SOLICITAR EXAMES
app.post("/solicitar-exame", async (req, res) => {
  const f = req.body;

  try {
    await pool.query("BEGIN");

    const { rows } = await pool.query(
      `
      INSERT INTO novo_exame (
        cod_empresa,
        nome_empresa,
        nome_funcionario,
        data_nascimento,
        cpf,
        matricula,
        data_admissao,
        cod_unidade,
        nome_unidade,
        cod_setor,
        nome_setor,
        cod_cargo,
        nome_cargo,
        rac,
        tipo_rac,
        tipo_exame,
        data_exame,
        hora_exame,
        funcao_anterior,
        funcao_atual,
        solicitar_nova_funcao,
        nome_nova_funcao,
        setor_atual,
        solicitar_novo_setor,
        nome_novo_setor,
        motivo_consulta,
        cnh,
        vencimento_cnh,
        lab_toxicologico,
        estado_clinica,
        cidade_clinica,
        nome_clinica,
        solicitar_credenciamento,
        estado_credenciamento,
        cidade_credenciamento,
        observacao
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36)
      RETURNING id
      `,
      [
        f.cod_empresa,
        f.nome_empresa,
        f.nome_funcionario,
        f.data_nascimento,
        f.cpf,
        f.matricula,
        f.data_admissao,
        f.cod_unidade,
        f.nome_unidade,
        f.cod_setor,
        f.nome_setor,
        f.cod_cargo,
        f.nome_cargo,
        f.rac,
        f.tipo_rac,
        f.tipo_exame,
        f.data_exame,
        f.hora_exame,
        f.funcao_anterior,
        f.funcao_atual,
        f.solicitar_nova_funcao,
        f.nome_nova_funcao,
        f.setor_atual,
        f.solicitar_novo_setor,
        f.nome_novo_setor,
        f.motivo_consulta,
        f.cnh,
        f.vencimento_cnh,
        f.lab_toxicologico,
        f.estado_clinica,
        f.cidade_clinica,
        f.nome_clinica,
        f.solicitar_credenciamento,
        f.estado_credenciamento,
        f.cidade_credenciamento,
        f.observacao
      ]
    );

    const funcionarioId = rows[0].id;

    await pool.query(
      `
      INSERT INTO solicitacoes_novo_exame (novo_exame_id, solicitado_por)
      VALUES ($1,$2)
      `,
      [funcionarioId, f.usuario_id]
    );

    await pool.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ erro: "Erro ao gerar solicitação de exame" });
  }
});

// LISTAR SOLICITAÇÕES (novo cadastro e exame)
app.get("/solicitacoes", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM (
        SELECT
          s.id AS solicitacao_id,
          f.id AS novo_cadastro_id,
          f.nome_empresa,
          f.nome_funcionario,
          f.cpf,
          s.status,
          s.solicitado_em,
          f.solicitar_novo_setor,
          f.solicitar_novo_cargo,
          f.solicitar_credenciamento,
          'NOVO_CADASTRO' AS tipo
        FROM solicitacoes_novo_cadastro s
        JOIN novo_cadastro f ON f.id = s.novo_cadastro_id

        UNION ALL

        SELECT
          s.id AS solicitacao_id,
          f.id AS novo_exame_id,
          f.nome_empresa,
          f.nome_funcionario,
          f.cpf,
          s.status,
          s.solicitado_em,
          f.solicitar_nova_funcao,
          f.solicitar_novo_setor,
          f.solicitar_credenciamento,
          'NOVO_EXAME' AS tipo
        FROM solicitacoes_novo_exame s
        JOIN novo_exame f ON f.id = s.novo_exame_id
      ) t
      ORDER BY t.solicitado_em DESC;
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar solicitações" });
  }
});

// DETALHES DA SOLICITAÇÃO - NOVO CADASTRO
app.get("/solicitacoes/novo-cadastro/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(`
      SELECT
        sf.id AS solicitacao_id,
        f.*,
        sf.status,
        sf.motivo_reprovacao,
        sf.retorno_soc_erro,
        sf.solicitado_em,
        u.nome AS solicitado_por_nome,
        ua.nome AS analisado_por_nome,
        ue.nome AS enviado_soc_por_nome,
        uc.nome AS cancelado_por_nome,
        sf.analisado_em,
        sf.enviado_soc_em,
        sf.cancelado_em
      FROM solicitacoes_novo_cadastro sf
      JOIN novo_cadastro f ON f.id = sf.novo_cadastro_id
      JOIN usuarios u ON u.id = sf.solicitado_por
      LEFT JOIN usuarios ua ON ua.id = sf.analisado_por
      LEFT JOIN usuarios ue ON ue.id = sf.enviado_soc_por
      LEFT JOIN usuarios uc ON uc.id = sf.cancelado_por
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

// DETALHES DA SOLICITAÇÃO - NOVO EXAME
app.get("/solicitacoes/novo-exame/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(`
      SELECT
        sf.id AS solicitacao_id,
        f.*,
        sf.status,
        sf.motivo_reprovacao,
        sf.solicitado_em,
        u.nome AS solicitado_por_nome,
        ua.nome AS analisado_por_nome,
        uc.nome AS cancelado_por_nome,
        sf.analisado_em,
        sf.cancelado_em 
      FROM solicitacoes_novo_exame sf
      JOIN novo_exame f ON f.id = sf.novo_exame_id
      JOIN usuarios u ON u.id = sf.solicitado_por
      LEFT JOIN usuarios ua ON ua.id = sf.analisado_por
      LEFT JOIN usuarios uc ON uc.id = sf.cancelado_por
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

// APROVAR / REPROVAR SOLICITAÇÃO
app.post("/solicitacoes/:tipo/:id/analisar", async (req, res) => {
  const { tipo, id } = req.params;
  const { status, motivo, usuario_id } = req.body;

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
    await pool.query(
      `
      UPDATE ${tabela}
      SET
        status = $1,
        motivo_reprovacao = $2,
        analisado_por = $3,
        analisado_em = NOW()
      WHERE id = $4
      `,
      [
        status,
        status === "REPROVADO" ? motivo : null,
        usuario_id,
        id
      ]
    );

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

// SOLICITAÇÕES DO USUÁRIO LOGADO - novo cadastro e novo exame
app.get("/solicitacoes-empresa/:usuarioId", async (req, res) => {
  const { usuarioId } = req.params;

  try {
    const { rows } = await pool.query(`
      SELECT
        s.id              AS solicitacao_id,
        f.id              AS novo_cadastro_id,
        f.nome_funcionario,
        f.cpf,
        s.status,
        s.solicitado_em,
        s.motivo_reprovacao,
        s.analisado_em,
        u.nome            AS analisado_por_nome,
        'NOVO_CADASTRO'    AS tipo
      FROM solicitacoes_novo_cadastro s
      JOIN novo_cadastro f ON f.id = s.novo_cadastro_id
      LEFT JOIN usuarios u ON u.id = s.analisado_por
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
        s.analisado_em,
        u.nome AS analisado_por_nome,
        'NOVO_EXAME' AS tipo
      FROM solicitacoes_novo_exame s
      JOIN novo_exame f ON f.id = s.novo_exame_id
      LEFT JOIN usuarios u ON u.id = s.analisado_por
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
        regime_trabalho = $10,
        nome_empresa = $11,
        nome_unidade = $12,
        nome_setor = $13,
        nome_cargo = $14,
        rac = $15,
        tipo_rac = $16,
        tipo_exame = $17,
        cnh = $18,
        vencimento_cnh = $19,
        lab_toxicologico = $20,
        estado_clinica = $21,
        cidade_clinica = $22,
        nome_clinica = $23,
        estado_credenciamento = $24,
        cidade_credenciamento = $25,
        observacao = $26
      WHERE id = (
        SELECT novo_cadastro_id
        FROM solicitacoes_novo_cadastro
        WHERE id = $27
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
      f.regime_trabalho,
      f.nome_empresa,
      f.nome_unidade,
      f.nome_setor,
      f.nome_cargo,
      f.rac,
      f.tipo_rac,
      f.tipo_exame,
      f.cnh,
      f.vencimento_cnh || null,
      f.lab_toxicologico,
      f.estado_clinica,
      f.cidade_clinica,
      f.nome_clinica,
      f.estado_credenciamento,
      f.cidade_credenciamento,
      f.observacao,

      id
    ]);

    await pool.query(`
      UPDATE solicitacoes_novo_cadastro
      SET
        status = 'PENDENTE_REAVALIACAO',
        analisado_por = NULL,
        analisado_em = NULL
      WHERE id = $1
    `, [id]);

    await pool.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ erro: "Erro ao editar cadastro" });
  }
});

// EDITAR SOMENTE SETOR E CARGO DE UMA SOLICITAÇÃO DE CADASTRO
app.put("/solicitacoes/novo-cadastro/:id/editar-setor-cargo", async (req, res) => {
  const { id } = req.params; // id da solicitação
  const { cod_setor, nome_setor, cod_cargo, nome_cargo } = req.body;

  try {
    await pool.query("BEGIN");

    // Pega o funcionário e as flags na tabela novo_cadastro via solicitação
    const { rows } = await pool.query(`
      SELECT nc.id AS novo_cadastro_id, nc.solicitar_novo_setor, nc.solicitar_novo_cargo
      FROM solicitacoes_novo_cadastro s
      JOIN novo_cadastro nc ON nc.id = s.novo_cadastro_id
      WHERE s.id = $1
    `, [id]);

    if (rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ erro: "Solicitação não encontrada" });
    }

    const { novo_cadastro_id, solicitar_novo_setor, solicitar_novo_cargo } = rows[0];
    const updates = [];
    const values = [];

    if (solicitar_novo_setor) {
      updates.push(`cod_setor = $${updates.length + 1}`);
      values.push(cod_setor);

      updates.push(`nome_setor = $${updates.length + 1}`);
      values.push(nome_setor);
    }

    if (solicitar_novo_cargo) {
      updates.push(`cod_cargo = $${updates.length + 1}`);
      values.push(cod_cargo);

      updates.push(`nome_cargo = $${updates.length + 1}`);
      values.push(nome_cargo);
    }

    if (updates.length > 0) {
      const sql = `
        UPDATE novo_cadastro
        SET ${updates.join(", ")}
        WHERE id = $${updates.length + 1}
      `;
      values.push(novo_cadastro_id);

      await pool.query(sql, values);
    }

    await pool.query("COMMIT");
    res.json({ sucesso: true });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ erro: "Erro ao editar setor/cargo" });
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
        nome_funcionario = $1,
        data_nascimento = $2,
        cpf = $3,
        matricula = $4,
        data_admissao = $5,
        nome_empresa = $6,
        nome_unidade = $7,
        nome_setor = $8,
        nome_cargo = $9,
        rac = $10,
        tipo_rac = $11,
        tipo_exame = $12,
        data_exame = $13,
        hora_exame = $14,
        funcao_anterior = $15,
        funcao_atual = $16,
        nome_nova_funcao = $17,
        setor_atual = $18,
        nome_novo_setor = $19,
        motivo_consulta = $20,
        cnh = $21,
        vencimento_cnh = $22,
        lab_toxicologico = $23,
        estado_clinica = $24,
        nome_clinica = $25,
        cidade_clinica = $26,
        estado_credenciamento = $27,
        cidade_credenciamento = $28,
        observacao = $29
      WHERE id = (
        SELECT novo_exame_id
        FROM solicitacoes_novo_exame
        WHERE id = $30
      )
    `, [
      f.nome_funcionario,
      f.data_nascimento,
      f.cpf,
      f.matricula,
      f.data_admissao,
      f.nome_empresa,
      f.nome_unidade,
      f.nome_setor,
      f.nome_cargo,
      f.rac,
      f.tipo_rac,
      f.tipo_exame,
      f.data_exame,
      f.hora_exame,
      f.funcao_anterior,
      f.funcao_atual,
      f.nome_nova_funcao,
      f.setor_atual,
      f.nome_novo_setor,
      f.motivo_consulta,
      f.cnh,
      f.vencimento_cnh || null,
      f.lab_toxicologico,
      f.estado_clinica,
      f.cidade_clinica,
      f.nome_clinica,
      f.estado_credenciamento,
      f.cidade_credenciamento,
      f.observacao,

      id
    ]);

    await pool.query(`
      UPDATE solicitacoes_novo_exame
      SET
        status = 'PENDENTE_REAVALIACAO',
        analisado_por = NULL,
        analisado_em = NULL
      WHERE id = $1
    `, [id]);

    await pool.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ erro: "Erro ao editar exame" });
  }
});

function interpretarRetornoSOC(retorno) {
  if (!retorno) {
    return {
      tipo: "INCONSISTENCIA",
      mensagem: "SOC não retornou resposta válida"
    };
  }

  if (retorno.encontrouErro === true) {
    return {
      tipo: "INCONSISTENCIA",
      mensagem: retorno.descricaoErro || "Erro de inconsistência retornado pelo SOC"
    };
  }

  if (
    retorno.encontrouFuncionario === true &&
    retorno.incluiuFuncionario === false
  ) {
    return {
      tipo: "CPF_DUPLICADO",
      mensagem: "CPF já existente no SOC"
    };
  }

  if (retorno.incluiuFuncionario !== true) {
    return {
      tipo: "INCONSISTENCIA",
      mensagem: "SOC não confirmou a inclusão do funcionário"
    };
  }

  return {
    tipo: "SUCESSO",
    mensagem: null
  };
}

// ENVIO AO SOC
app.post("/soc/funcionarios/:id/enviar", async (req, res) => {
  try {
    const { id } = req.params;
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

    const client = await soap.createClientAsync(WSDL_URL);

    const wsSecurity = new soap.WSSecurity(
      SOC_USUARIO,
      SOC_TOKEN,
      { passwordType: "PasswordDigest", hasTimeStamp: true }
    );

    client.setSecurity(wsSecurity);

    const dataBody = {
      Funcionario: {
        criarFuncionario: true,

        identificacaoWsVo: {
          chaveAcesso: SOC_TOKEN,
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
          chaveProcuraFuncionario: "CPF"
        },

        unidadeWsVo: {
          nome: f.nome_unidade,
          tipoBusca: "NOME"
        },

        setorWsVo: {
          nome: f.nome_setor,
          tipoBusca: "NOME"
        },

        cargoWsVo: {
          nome: f.nome_cargo,
          tipoBusca: "NOME"
        }
      }
    };

    const [result] = await client.importacaoFuncionarioAsync(dataBody);
    const retorno = result?.FuncionarioRetorno;

    const resultadoSOC = interpretarRetornoSOC(retorno);

    // ❌ ERRO DE NEGÓCIO (CPF duplicado etc)
    if (resultadoSOC.tipo !== "SUCESSO") {
      await pool.query(
        `
        UPDATE solicitacoes_novo_cadastro
        SET status = 'ERRO_SOC',
            retorno_soc_erro = $1
        WHERE id = $2
        `,
        [resultadoSOC.mensagem, id]
      );

      return res.status(400).json({
        erro: "Falha no envio ao SOC",
        detalhe: resultadoSOC.mensagem
      });
    }

    // ✅ SUCESSO
    await pool.query(
      `
      UPDATE solicitacoes_novo_cadastro
      SET
        status = 'ENVIADO_SOC',
        retorno_soc_erro = NULL,
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
    // ❌ ERRO TÉCNICO (SOAP, DB, JS)
    await pool.query(
      `
      UPDATE solicitacoes_novo_cadastro
      SET status = 'ERRO_SOC',
          retorno_soc_erro = $1
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

// VERIFICAR FUNCIONÁRIO NO SOC POR CPF DENTRO DA EMPRESA LOGADA (EXPORTA DADOS)
app.get("/soc/funcionario-por-cpf/:cpf/:empresaUsuario", async (req, res) => {
  try {
    const cpf = req.params.cpf.replace(/\D/g, "");
    const empresaUsuario = String(req.params.empresaUsuario);

    const parametro = JSON.stringify({
      ...EXPORTA_FUNCIONARIOS,
      empresaTrabalho: empresaUsuario, // EMPRESA LOGADA
      cpf
    });

    const response = await axios.get(SOC_EXPORTA_URL, {
      params: { parametro },
      responseType: "arraybuffer"
    });

    const decoded = iconv.decode(response.data, "ISO-8859-1");
    const parsed = JSON.parse(decoded);

    const registros = Array.isArray(parsed) ? parsed : [parsed];

    if (!registros.length || !registros[0] || !registros[0].CPFFUNCIONARIO) {
      return res.json({ existe: false });
    }

    const f = registros[0];

    return res.json({
      existe: true,
      funcionario: {
        codigo_empresa: f.CODIGOEMPRESA,
        nome_empresa: f.NOMEEMPRESA,

        nome: f.NOME,
        cpf: f.CPFFUNCIONARIO,
        matricula: f.MATRICULAFUNCIONARIO,
        situacao: f.SITUACAO,

        data_nascimento: f.DATA_NASCIMENTO,
        data_admissao: f.DATA_ADMISSAO,
        data_demissao: f.DATA_DEMISSAO || null,

        unidade: {
          codigo: f.CODIGOUNIDADE,
          nome: f.NOMEUNIDADE
        },

        setor: {
          codigo: f.CODIGOSETOR,
          nome: f.NOMESETOR
        },

        cargo: {
          codigo: f.CODIGOCARGO,
          nome: f.NOMECARGO,
          cbo: f.CBOCARGO
        }
      }
    });

  } catch (err) {
    console.error("Erro exporta funcionário:", err);
    res.status(500).json({
      erro: "Erro ao consultar funcionário no SOC",
      detalhe: err.message
    });
  }
});

// BUSCAR DADOS DO USUÁRIO PRA TELA DE PERFIL
app.get("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT id, nome, cpf, email, senha, perfil, cod_empresa, nome_empresa, cod_unidade, nome_unidade
       FROM usuarios
       WHERE id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar usuário" });
  }
});

// ATUALIZAR PERFIL (EMAIL E SENHA)
app.put("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: "Email e senha são obrigatórios" });
  }

  try {
    await pool.query(
      `
      UPDATE usuarios
      SET email = $1,
          senha = $2
      WHERE id = $3
      `,
      [email, senha, id]
    );

    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar perfil" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
