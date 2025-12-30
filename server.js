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

/* BANCO DE DADOS */
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "cadastro_funcionarios",
  password: "salubrita",
  port: 5432
});

/* SOC – SOAP */
const WSDL_URL =
  "https://ws1.soc.com.br/WSSoc/FuncionarioModelo2Ws?wsdl";

const SOC_USUARIO = "U3403088";
const SOC_TOKEN =
  "3e3c74848066fe9b39690a37c372a61816696e18";

/* SOC – EXPORTA DADOS */
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
  codigo: "211241",
  chave: "bc95fcdf593daa4ee4b7",
  tipoSaida: "xml"
};

const EXPORTA_CARGOS = {
  codigo: "211242",
  chave: "f148481826f0664d5958",
  tipoSaida: "xml"
};

const parser = new XMLParser({ ignoreAttributes: false });

/* TESTE */
app.get("/", (req, res) => {
  res.send("🚀 API Cadastro Funcionários rodando");
});

/* EXPORTA EMPRESAS */
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
      (Array.isArray(registros) ? registros : [registros]).map(e => ({
        codigo: e.CODIGO,
        nome: e.RAZAOSOCIAL,
        ativo: e.ATIVO == 1
      }))
    );
  } catch {
    res.status(500).json({ erro: "Erro empresas" });
  }
});

/* EXPORTA UNIDADES */
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
      (Array.isArray(registros) ? registros : [registros]).map(u => ({
        codigo: u.CODIGO,
        nome: u.NOME,
        ativo: u.ATIVO == 1
      }))
    );
  } catch {
    res.status(500).json({ erro: "Erro unidades" });
  }
});

/* EXPORTA SETORES */
app.get("/setores/:empresa/:unidade", async (req, res) => {
  try {
    const parametro = JSON.stringify({
      empresa: req.params.empresa,
      unidade: req.params.unidade,
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
      (Array.isArray(registros) ? registros : [registros]).map(s => ({
        codigo: s.CODIGO,
        nome: s.NOME,
        ativo: s.ATIVO == 1
      }))
    );
  } catch {
    res.status(500).json({ erro: "Erro setores" });
  }
});

/* EXPORTA CARGOS */
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
      (Array.isArray(registros) ? registros : [registros]).map(c => ({
        codigo: c.CODIGO,
        nome: c.NOME,
        ativo: c.ATIVO == 1
      }))
    );
  } catch {
    res.status(500).json({ erro: "Erro cargos" });
  }
});

/* CADASTRO FUNCIONÁRIO */
app.post("/funcionarios", async (req, res) => {
  console.log("📥 BODY RECEBIDO:", req.body);

  const f = req.body;

  await pool.query(
    `
    INSERT INTO funcionarios
      (cod_empresa, nome_empresa, nome_funcionario, data_nascimento,
      sexo, estado_civil, doc_identidade, cpf, cnh,
      vencimento_cnh, matricula, data_admissao, tipo_contratacao, cod_categoria,
      regime_trabalho, tipo_exame, cod_unidade, nome_unidade,
      cod_setor, nome_setor, cod_cargo, nome_cargo)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
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
      f.cnh,
      f.vencimento_cnh,
      f.matricula,
      f.data_admissao,
      f.tipo_contratacao,
      f.cod_categoria,
      f.regime_trabalho,
      f.tipo_exame,
      f.cod_unidade,
      f.nome_unidade,
      f.cod_setor,
      f.nome_setor,
      f.cod_cargo,
      f.nome_cargo
    ]
  );

  res.json({ sucesso: true });
});

/* LISTAR SOLICITAÇÕES */
app.get("/solicitacoes", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        id,
        nome_empresa,
        nome_funcionario,
        cpf,
        criado_em
      FROM funcionarios
      ORDER BY id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar solicitações" });
  }
});

/* ENVIO AO SOC */
app.post("/soc/funcionarios/:id/enviar", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      "SELECT * FROM funcionarios WHERE id = $1",
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

    const [result] =
      await client.importacaoFuncionarioAsync(dataBody);

    res.json({ sucesso: true, retornoSOC: result });

  } catch (err) {
    console.error("Erro SOC:", err);
    res.status(500).json({
      erro: "Erro ao enviar funcionário ao SOC",
      detalhe: err.message
    });
  }
});

app.listen(3001, () => {
  console.log("🚀 API rodando em http://localhost:3001");
});
