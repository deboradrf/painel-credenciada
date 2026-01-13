const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const iconv = require("iconv-lite");

const soap = require("soap");
const CryptoJS = require("crypto-js");

const app = express();
app.use(cors());
app.use(express.json());

// BANCO DE DADOS
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "cadastro_funcionarios",
  password: "salubrita",
  port: 5432
});

// SOC – SOAP
const WSDL_URL =
  "https://ws1.soc.com.br/WSSoc/FuncionarioModelo2Ws?wsdl";

const SOC_USUARIO = "U3403088";
const SOC_TOKEN =
  "3e3c74848066fe9b39690a37c372a61816696e18";

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

const parser = new XMLParser({ ignoreAttributes: false });

// TESTE
app.get("/", (req, res) => {
  res.send("🚀 API Cadastro Funcionários rodando");
});

// EXPORTA EMPRESAS
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

// EXPORTA UNIDADES
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

// EXPORTA SETORES
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
        .filter(s => s.ATIVO == 1) // ✅ setores ativos da empresa
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

// EXPORTA CARGOS
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
        .filter(c => c.ATIVO == 1) // ✅ só precisa estar ativo
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

// CADASTRO DE USUÁRIOS 
app.post("/cadastro", async (req, res) => {
  try {
    const {
      nome,
      cpf,
      email,
      senha,
      perfil,
      cod_empresa,
      nome_empresa,
      cod_unidade,
      nome_unidade
    } = req.body;

    if (!nome || !cpf | !email || !senha || !perfil) {
      return res.status(400).json({ erro: "Dados obrigatórios ausentes" });
    }

    if (!cod_empresa || !cod_unidade) {
      return res.status(400).json({
        erro: "Empresa e unidade são obrigatórias"
      });
    }

    const { rowCount } = await pool.query(
      `
      INSERT INTO usuarios
        (nome, cpf, email, senha, perfil, cod_empresa, nome_empresa, cod_unidade, nome_unidade)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      [
        nome,
        cpf,
        email,
        senha,
        perfil,
        cod_empresa,
        nome_empresa,
        cod_unidade,
        nome_unidade
      ]
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

// LOGIN DE USUÁRIO
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

// FORMULÁRIO DE NOVO CADASTRO
app.post("/novo-cadastro", async (req, res) => {
  const f = req.body;

  try {
    await pool.query("BEGIN");

    const { rows } = await pool.query(
      `
      INSERT INTO novo_cadastro
        (cod_empresa, nome_empresa, nome_funcionario, data_nascimento,
        sexo, estado_civil, doc_identidade, cpf, matricula, data_admissao,
        tipo_contratacao, cod_categoria, regime_trabalho, cod_unidade, nome_unidade,
        cod_setor, nome_setor, cod_cargo, nome_cargo, tipo_exame, nome_clinica, cidade_clinica, email_clinica, 
        telefone_clinica, lab_toxicologico)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,
      $23,$24,$25)
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
        f.data_admissao,
        f.tipo_contratacao,
        f.cod_categoria,
        f.regime_trabalho,
        f.cod_unidade,
        f.nome_unidade,
        f.cod_setor,
        f.nome_setor,
        f.cod_cargo,
        f.nome_cargo,
        f.tipo_exame,
        f.nome_clinica,
        f.cidade_clinica,
        f.email_clinica,
        f.telefone_clinica,
        f.lab_toxicologico
      ]
    );

    const funcionarioId = rows[0].id;

    await pool.query(
      `
      INSERT INTO solicitacoes_novo_cadastro
        (funcionario_id, solicitado_por)
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

// LISTAR SOLICITAÇÕES (novo cadastro e aso)
app.get("/solicitacoes", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      -- 🔹 NOVO CADASTRO
      SELECT
        s.id              AS solicitacao_id,
        f.id              AS funcionario_id,
        f.nome_empresa,
        f.nome_funcionario,
        f.cpf,
        s.status,
        s.solicitado_em,
        'NOVO_CADASTRO'    AS tipo
      FROM solicitacoes_novo_cadastro s
      JOIN novo_cadastro f ON f.id = s.funcionario_id

      UNION ALL

      -- 🔹 ASO
      SELECT
        s.id              AS solicitacao_id,
        f.id              AS funcionario_id,
        f.nome_empresa,
        f.nome_funcionario,
        f.cpf,
        s.status,
        s.solicitado_em,
        'ASO'              AS tipo
      FROM solicitacoes_aso s
      JOIN novo_aso f ON f.id = s.funcionario_id

      ORDER BY solicitado_em DESC
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
        sf.solicitado_em,
        u.nome AS solicitado_por_nome,
        ua.nome AS analisado_por_nome,
        sf.analisado_em
      FROM solicitacoes_novo_cadastro sf
      JOIN novo_cadastro f ON f.id = sf.funcionario_id
      JOIN usuarios u ON u.id = sf.solicitado_por
      LEFT JOIN usuarios ua ON ua.id = sf.analisado_por
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

// DETALHES DA SOLICITAÇÃO - ASO
app.get("/solicitacoes/aso/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(`
      SELECT
        sf.id AS solicitacao_id,
        f.*,
        sf.status,
        sf.solicitado_em,
        u.nome AS solicitado_por_nome,
        ua.nome AS analisado_por_nome,
        sf.analisado_em
      FROM solicitacoes_aso sf
      JOIN novo_aso f ON f.id = sf.funcionario_id
      JOIN usuarios u ON u.id = sf.solicitado_por
      LEFT JOIN usuarios ua ON ua.id = sf.analisado_por
      WHERE sf.id = $1
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({ erro: "Solicitação não encontrada" });
    }

    res.json({
      tipo: "ASO",
      dados: rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar detalhes do ASO" });
  }
});

// APROVAR / REPROVAR SOLICITAÇÃO
app.put("/solicitacoes/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, usuario_id, motivo } = req.body;

  if (status === "REPROVADO" && (!motivo || !motivo.trim())) {
    return res.status(400).json({
      erro: "Motivo da reprovação é obrigatório"
    });
  }

  try {
    await pool.query(`
      UPDATE solicitacoes_novo_cadastro
      SET status = $1,
          analisado_por = $2,
          analisado_em = NOW(),
          motivo_reprovacao = $3
      WHERE id = $4
    `, [
      status,
      usuario_id,
      status === "REPROVADO" ? motivo : null,
      id
    ]);

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar status" });
  }
});

// SOLICITAÇÕES DO USUÁRIO LOGADO - novo cadastro e aso
app.get("/minhas-solicitacoes/:usuarioId", async (req, res) => {
  const { usuarioId } = req.params;

  try {
    const { rows } = await pool.query(`
      -- 🔹 NOVO CADASTRO
      SELECT
        s.id              AS solicitacao_id,
        f.id              AS funcionario_id,
        f.nome_funcionario,
        f.cpf,
        s.status,
        s.solicitado_em,
        s.motivo_reprovacao,
        s.analisado_em,
        u.nome            AS analisado_por_nome,
        'NOVO_CADASTRO'    AS tipo
      FROM solicitacoes_novo_cadastro s
      JOIN novo_cadastro f ON f.id = s.funcionario_id
      LEFT JOIN usuarios u ON u.id = s.analisado_por
      WHERE s.solicitado_por = $1

      UNION ALL

      -- 🔹 ASO
      SELECT
        s.id              AS solicitacao_id,
        f.id              AS funcionario_id,
        f.nome_funcionario,
        f.cpf,
        s.status,
        s.solicitado_em,
        s.motivo_reprovacao,
        s.analisado_em,
        u.nome            AS analisado_por_nome,
        'ASO'              AS tipo
      FROM solicitacoes_aso s
      JOIN novo_aso f ON f.id = s.funcionario_id
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

// EDITAR SOLICITAÇÃO REPROVADA
app.put("/solicitacoes/:id/editar", async (req, res) => {
  const { id } = req.params;
  const f = req.body;

  try {
    await pool.query("BEGIN");

    // 1️⃣ Atualiza dados do funcionário
    await pool.query(`
      UPDATE novo_cadastro SET
        nome_funcionario = $1,
        data_nascimento = $2,
        sexo = $3,
        estado_civil = $4,
        cpf = $5,
        matricula = $6,
        data_admissao = $7,
        tipo_contratacao = $8,
        cod_categoria = $9,
        regime_trabalho = $10,
        tipo_exame = $11,
        cod_setor = $12,
        nome_setor = $13,
        cod_cargo = $14,
        nome_cargo = $15
      WHERE id = (
        SELECT funcionario_id
        FROM solicitacoes_novo_cadastro
        WHERE id = $16
      )
    `, [
      f.nome_funcionario,
      f.data_nascimento,
      f.sexo,
      f.estado_civil,
      f.cpf,
      f.matricula,
      f.data_admissao,
      f.tipo_contratacao,
      f.cod_categoria,
      f.regime_trabalho,
      f.tipo_exame,
      f.cod_setor,
      f.nome_setor,
      f.cod_cargo,
      f.nome_cargo,
      id
    ]);

    // 2️⃣ Atualiza status da solicitação
    await pool.query(`
      UPDATE solicitacoes_novo_cadastro
      SET status = 'PENDENTE_REAVALIACAO',
          analisado_por = NULL,
          analisado_em = NULL
      WHERE id = $1
    `, [id]);

    await pool.query("COMMIT");
    res.json({ sucesso: true });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar edição" });
  }
});

// ENVIO AO SOC
app.post("/soc/funcionarios/:id/enviar", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `
      SELECT f.*
      FROM solicitacoes_novo_cadastro sf
      JOIN novo_cadastro f ON f.id = sf.funcionario_id
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
          matricula: f.matricula,
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

    const { status } = await pool.query(
      `SELECT status FROM solicitacoes_novo_cadastro WHERE id = $1`,
      [id]
    ).then(r => r.rows[0]);

    if (status !== "APROVADO") {
      return res.status(400).json({
        erro: "Apenas solicitações aprovadas podem ser enviadas ao SOC"
      });
    }

    const [result] =
      await client.importacaoFuncionarioAsync(dataBody);

    await pool.query(
      `
      UPDATE solicitacoes_novo_cadastro
      SET status = 'ENVIADO_SOC',
          enviado_soc_por = $1,
          enviado_soc_em = NOW()
      WHERE id = $2
      `,
      [req.body.usuario_id, id]
    );

    res.json({ sucesso: true, retornoSOC: result });

  } catch (err) {
    console.error("Erro SOC:", err);
    res.status(500).json({
      erro: "Erro ao enviar funcionário ao SOC",
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
      cpf,
      situacaoFuncionario: "S" // SOMENTE ATIVO
    });

    const response = await axios.get(SOC_EXPORTA_URL, {
      params: { parametro }
    });

    const registros = Array.isArray(response.data)
      ? response.data
      : [response.data];

    if (!registros.length) {
      return res.json({ existe: false });
    }

    const f = registros[0];

    return res.json({
      existe: true,
      funcionario: {
        codigo_empresa: f.CODIGOEMPRESA,
        nome_empresa: f.NOMEEMPRESA,

        cod_funcionario: f.CODIGO,
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
        },

        endereco: {
          logradouro: f.ENDERECO,
          numero: f.NUMEROENDERECO,
          bairro: f.BAIRRO,
          uf: f.UF
        },

        contato: {
          email_corporativo: f.EMAILCORPORATIVO,
          email_pessoal: f.EMAILPESSOAL,
          celular: f.TELEFONECELULAR
        },

        data_cadastro: f.DATACADASTRO
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

// DEBUG PARA VER O DADO DO FUNCIONARIO PESQUISADO
app.get("/soc/debug-funcionario-completo/:cpf/:empresa", async (req, res) => {
  const cpf = req.params.cpf.replace(/\D/g, "");

  const parametro = JSON.stringify({
    ...EXPORTA_FUNCIONARIOS,
    empresaTrabalho: req.params.empresa,
    cpf
  });

  const response = await axios.get(SOC_EXPORTA_URL, {
    params: { parametro }
  });

  res.json(response.data);
  //http://localhost:3001/soc/debug-funcionario-completo/06909315650/1961619
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

// FORMULÁRIO DE SOLICITAÇÃO DE ASO
app.post("/solicitar-aso", async (req, res) => {
  const f = req.body;

  try {
    await pool.query("BEGIN");

    const { rows } = await pool.query(
      `
      INSERT INTO novo_aso (
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
        tipo_exame,
        cnh,
        vencimento_cnh,
        funcao_anterior,
        funcao_atual,
        setor_atual,
        nome_clinica,
        cidade_clinica,
        email_clinica,
        telefone_clinica,
        lab_toxicologico
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
      )
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
        f.tipo_exame,
        f.cnh,
        f.vencimento_cnh,
        f.funcao_anterior,
        f.funcao_atual,
        f.setor_atual,
        f.nome_clinica,
        f.cidade_clinica,
        f.email_clinica,
        f.telefone_clinica,
        f.lab_toxicologico
      ]
    );

    const funcionarioId = rows[0].id;

    await pool.query(
      `
      INSERT INTO solicitacoes_aso (
        funcionario_id, solicitado_por
      )
      VALUES ($1,$2)
      `,
      [funcionarioId, f.usuario_id]
    );

    await pool.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ erro: "Erro ao gerar solicitação de ASO" });
  }
});

app.listen(3001, () => {
  console.log("🚀 API rodando em http://localhost:3001");
});
