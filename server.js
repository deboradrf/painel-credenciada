const pool = require("./db/pool");
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

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

// ROTA PRINCIPAL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/pages/login.html"));
});

// TESTE API
app.get("/api/status", (req, res) => {
  res.json({ ok: true });
});

// SOC – SOAP
const SOC_EXPORTA_FUNCIONARIOMODELO2 = "https://ws1.soc.com.br/WSSoc/FuncionarioModelo2Ws?wsdl";
const SOC_USUARIO = process.env.SOC_USUARIO;
const SOC_TOKEN = process.env.SOC_TOKEN;

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

const EXPORTA_HIERARQUIA = {
  codigo: "212432",
  chave: "854125036a13e406b5dc",
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

const parser = new XMLParser({
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false
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

// EXPORTA DADOS - UNIDADES DE UMA EMPRESA
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

// EXPORTA DADOS - SETORES DA UNIDADE
app.get("/hierarquia/:empresa/:unidade", async (req, res) => {
  try {
    const { empresa, unidade } = req.params;

    const parametro = JSON.stringify({
      ...EXPORTA_HIERARQUIA,
      empresa,
      empresaTrabalho: empresa
    });

    const response = await axios.get(SOC_EXPORTA_URL, {
      params: { parametro },
      responseType: "arraybuffer"
    });

    let xml = iconv.decode(response.data, "ISO-8859-1");
    xml = xml.replace(/&(?!(amp|lt|gt|quot|apos);)/g, "&amp;");

    const json = parser.parse(xml);
    const registros = json?.root?.record || [];

    const setoresMap = new Map();

    (Array.isArray(registros) ? registros : [registros])
      .filter(r =>
        String(r.CODIGOUNIDADE) === String(unidade) &&
        r.ATIVOSETOR === "Sim" &&
        r.HIERARQUIAATIVA === "Sim"
      )
      .forEach(r => {
        if (!setoresMap.has(r.CODIGOSETOR)) {
          setoresMap.set(r.CODIGOSETOR, {
            codigoSetor: r.CODIGOSETOR,
            nomeSetor: r.NOMESETOR
          });
        }
      });

    const setores = Array.from(setoresMap.values());

    res.json(setores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar hierarquia" });
  }
});

// EXPORTA DADOS - CARGOS DO SETOR DA UNIDADE
app.get("/hierarquia/:empresa/:unidade/:setor", async (req, res) => {
  try {
    const { empresa, unidade, setor } = req.params;

    const parametro = JSON.stringify({
      ...EXPORTA_HIERARQUIA,
      empresa,
      empresaTrabalho: empresa
    });

    const response = await axios.get(SOC_EXPORTA_URL, {
      params: { parametro },
      responseType: "arraybuffer"
    });

    let xml = iconv.decode(response.data, "ISO-8859-1");
    xml = xml.replace(/&(?!(amp|lt|gt|quot|apos);)/g, "&amp;");

    const json = parser.parse(xml);
    const registros = json?.root?.record || [];

    const cargosMap = new Map();

    (Array.isArray(registros) ? registros : [registros])
      .filter(r =>
        String(r.CODIGOUNIDADE) === String(unidade) &&
        String(r.CODIGOSETOR) === String(setor) &&
        r.ATIVOCARGO === "Sim" &&
        r.HIERARQUIAATIVA === "Sim"
      )
      .forEach(r => {
        if (!cargosMap.has(r.CODIGOCARGO)) {
          cargosMap.set(r.CODIGOCARGO, {
            codigoCargo: r.CODIGOCARGO,
            nomeCargo: r.NOMECARGO
          });
        }
      });

    const cargos = Array.from(cargosMap.values()).sort((a, b) =>
      a.nomeCargo.localeCompare(b.nomeCargo, "pt-BR")
    );

    res.json(cargos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar cargos do setor" });
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

    // APENAS PRESTADORES ATIVOS (EXCLUIR PRESTADOR REAVALIADO)
    const prestadores = registros
      .filter(p =>
        p.statusPrestador === "Ativo" &&
        p.nomePrestador?.trim().toUpperCase() !== "REAVALIADO"
      )
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

    // 🔎 verifica se o retorno parece JSON
    if (!decoded.trim().startsWith("[") && !decoded.trim().startsWith("{")) {

      console.warn("SOC retornou texto:", decoded);

      return res.status(500).json({
        erro: "SOC retornou resposta inválida",
        detalhe: decoded
      });

    }

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

    res.status(500).json({
      erro: "Erro ao consultar SOC"
    });
  }
});

// ROTA DE CADASTRO DE USUÁRIO
app.post("/cadastro", async (req, res) => {
  try {
    const { nome, cpf, email, senha, perfil, cod_empresa, nome_empresa, unidades } = req.body;

    // CRIPTOGRAFAR SENHA
    const senhaHash = await bcrypt.hash(senha, 10);

    await pool.query(
      `INSERT INTO usuarios
       (nome, cpf, email, senha, perfil, cod_empresa, nome_empresa, unidades)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        nome,
        cpf,
        email,
        senhaHash,
        perfil,
        cod_empresa || null,
        nome_empresa || null,
        JSON.stringify(unidades || [])
      ]
    );

    res.json({ sucesso: true });

  } catch (err) {

    if (err.code === "23505") {
      return res.status(400).json({ erro: "CPF já cadastrado" });
    }

    console.error(err);
    res.status(500).json({ erro: "Erro ao cadastrar usuário" });
  }
});

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

// LOGIN COMPATÍVEL COM CADASTRO ANTIGO E NOVO (dps que todo mundo alterar a senha, mudar pro
// cod de login acima)
app.post("/login", async (req, res) => {
  try {
    const { usuario, senha } = req.body;

    const result = await pool.query(
      `
      SELECT
        id,
        nome,
        email,
        cpf,
        senha,
        perfil,
        cod_empresa,
        nome_empresa,
        unidades
      FROM usuarios
      WHERE cpf = $1
      `,
      [usuario]
    );

    if (!result.rows.length) {
      return res.status(401).json({ erro: "Usuário ou senha inválidos" });
    }

    const user = result.rows[0];

    let senhaValida = false;

    // 🔥 DETECTA SE É BCRYPT OU TEXTO
    if (user.senha.startsWith("$2b$")) {
      // senha criptografada
      senhaValida = await bcrypt.compare(senha, user.senha);
    } else {
      // senha antiga (texto puro)
      senhaValida = senha === user.senha;

      // 🔥 BONUS: já atualiza pra bcrypt automaticamente
      if (senhaValida) {
        const novaHash = await bcrypt.hash(senha, 10);

        await pool.query(
          "UPDATE usuarios SET senha = $1 WHERE id = $2",
          [novaHash, user.id]
        );
      }
    }

    if (!senhaValida) {
      return res.status(401).json({ erro: "Usuário ou senha inválidos" });
    }

    delete user.senha;

    const empresasExtras = await pool.query(
      `
      SELECT cod_empresa, nome_empresa, unidades
      FROM usuarios_empresas
      WHERE usuario_id = $1
      `,
      [user.id]
    );

    res.json({
      ...user,
      empresas_extras: empresasExtras.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro no login" });
  }
});

// ROTA DE RECUPERAR SENHA
app.post("/recuperar-senha", async (req, res) => {
  const { email, usuario } = req.body;

  try {
    const { rows } = await pool.query(
      "SELECT id FROM usuarios WHERE email = $1 AND cpf = $2",
      [email, usuario]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        erro: "Usuário ou e-mail não encontrados"
      });
    }

    const novaSenha = gerarSenha(10);

    // HASH DA SENHA
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await pool.query(
      "UPDATE usuarios SET senha = $1 WHERE id = $2",
      [senhaHash, rows[0].id]
    );

    await enviarEmailRecuperacao(email, novaSenha);

    res.json({ ok: true });

  } catch (err) {
    console.error("Erro recuperação:", err);

    res.status(500).json({
      erro: "Erro ao recuperar senha"
    });
  }
});

// FUNÇÃO PARA GERAR SENHA ALEATÓRIA
function gerarSenha(tamanho = 8) {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let senha = "";

  for (let i = 0; i < tamanho; i++) {
    senha += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }

  return senha;
}

async function enviarEmailRecuperacao(email, novaSenha) {
  await transporter.sendMail({
    from: "Portal Salubritá <naoresponda@salubrita.com.br>",
    to: email,
    subject: "Recuperação de senha - Portal Salubritá",
    text: `
      Sua senha foi redefinida.

      Nova senha: ${novaSenha}

      Recomendamos que você altere sua senha após acessar o sistema.

      Caso você não tenha solicitado, ignore este email.
    `
  });
}

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
        solicitar_nova_unidade,
        nome_fantasia,
        razao_social,
        cnpj,
        cnae,
        cep,
        rua,
        numero,
        bairro,
        estado,
        tipo_faturamento,
        email,
        cod_setor,
        nome_setor,
        solicitar_novo_setor,
        nome_novo_setor,
        cod_cargo,
        nome_cargo,
        solicitar_novo_cargo,
        nome_novo_cargo,
        descricao_atividade,
        rac,
        tipos_rac,
        tipo_exame,
        data_exame,
        unidades_extras,
        cnh,
        vencimento_cnh,
        lab_toxicologico,
        estado_clinica,
        cidade_clinica,
        nome_clinica,
        solicitar_credenciamento,
        estado_credenciamento,
        cidade_credenciamento,
        observacao,
        emails_extras )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,
              $24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,
              $45,$46,$47,$48,$49,$50,$51,$52,$53)
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
        f.solicitar_nova_unidade,
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
        f.solicitar_novo_setor,
        f.nome_novo_setor,
        f.cod_cargo,
        f.nome_cargo,
        f.solicitar_novo_cargo,
        f.nome_novo_cargo,
        f.descricao_atividade,
        JSON.stringify(f.rac || []),
        JSON.stringify(f.tipos_rac || []),
        f.tipo_exame,
        f.data_exame,
        JSON.stringify(f.unidades_extras || []),
        f.cnh,
        f.vencimento_cnh,
        f.lab_toxicologico,
        f.estado_clinica,
        f.cidade_clinica,
        f.nome_clinica,
        f.solicitar_credenciamento,
        f.estado_credenciamento,
        f.cidade_credenciamento,
        f.observacao,
        JSON.stringify(f.emails_extras || []),
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

// DETALHES DA SOLICITAÇÃO - NOVO CADASTRO
app.get("/solicitacoes/novo-cadastro/:id", async (req, res) => {
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
        tipos_rac,
        tipo_exame,
        data_exame,
        unidades_extras,
        unidade_destino,
        solicitar_nova_unidade,
        nome_fantasia,
        razao_social,
        cnpj,
        cnae,
        cep,
        rua,
        numero,
        bairro,
        estado,
        tipo_faturamento,
        email,
        setor_destino,
        solicitar_novo_setor,
        nome_novo_setor,
        funcao_destino,
        solicitar_nova_funcao,
        nome_nova_funcao,
        descricao_atividade,
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
        observacao,
        emails_extras
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50)
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
        JSON.stringify(f.rac || []),
        JSON.stringify(f.tipos_rac || []),
        f.tipo_exame,
        f.data_exame,
        JSON.stringify(f.unidades_extras || []),
        f.unidade_destino,
        f.solicitar_nova_unidade,
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
        f.setor_destino,
        f.solicitar_novo_setor,
        f.nome_novo_setor,
        f.funcao_destino,
        f.solicitar_nova_funcao,
        f.nome_nova_funcao,
        f.descricao_atividade,
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
        f.observacao,
        JSON.stringify(f.emails_extras || [])
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

// DETALHES DA SOLICITAÇÃO - NOVO EXAME
app.get("/solicitacoes/novo-exame/:id", async (req, res) => {
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

// LISTAR SOLICITAÇÕES (novo cadastro e exame)
app.get("/solicitacoes", async (req, res) => {
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
        motivo_reprovacao = $2,
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
      LEFT JOIN usuarios u_reavaliado ON u_reavaliado.id = s.reavaliado_por
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
        u_reavaliado.nome AS reavaliado_nome
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
    if (s.reavaliado_em) {
      historico.push({ etapa: "Reavaliado", usuario: s.reavaliado_nome, data: s.reavaliado_em });
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
        nome_novo_setor = $23,
        nome_novo_cargo = $24,
        descricao_atividade = $25,
        cnh = $26,
        vencimento_cnh = $27,
        lab_toxicologico = $28,
        estado_credenciamento = $29,
        cidade_credenciamento = $30,
        observacao = $31
      WHERE id = (
        SELECT novo_cadastro_id
        FROM solicitacoes_novo_cadastro
        WHERE id = $32
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
      f.nome_novo_setor,
      f.nome_novo_cargo,
      f.descricao_atividade,
      f.cnh,
      f.vencimento_cnh || null,
      f.lab_toxicologico,
      f.estado_credenciamento,
      f.cidade_credenciamento,
      f.observacao,

      id
    ]);

    await pool.query(`
      UPDATE solicitacoes_novo_cadastro
      SET
        status = 'PENDENTE_REAVALIACAO',
        reavaliado_por = $2,
        reavaliado_em = NOW()
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
        nome_nova_funcao = $12,
        descricao_atividade = $13,
        nome_novo_setor = $14,
        motivo_consulta = $15,
        cnh = $16,
        vencimento_cnh = $17,
        lab_toxicologico = $18,
        estado_credenciamento = $19,
        cidade_credenciamento = $20,
        observacao = $21
      WHERE id = (
        SELECT novo_exame_id
        FROM solicitacoes_novo_exame
        WHERE id = $22
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
      f.nome_nova_funcao,
      f.descricao_atividade,
      f.nome_novo_setor,
      f.motivo_consulta,
      f.cnh,
      f.vencimento_cnh || null,
      f.lab_toxicologico,
      f.estado_credenciamento,
      f.cidade_credenciamento,
      f.observacao,

      id
    ]);

    await pool.query(`
      UPDATE solicitacoes_novo_exame
      SET
        status = 'PENDENTE_REAVALIACAO',
        reavaliado_por = $2,
        reavaliado_em = NOW()
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
  const { id, nome, emails } = req.body;

  try {
    const existe = await pool.query(
      "SELECT * FROM responsavel_empresa WHERE cod_empresa = $1",
      [id]
    );

    // SE NÃO TEM EMAIL → DELETE
    if (!emails || emails.length === 0) {
      await pool.query(
        "DELETE FROM responsavel_empresa WHERE cod_empresa = $1",
        [id]
      );

      return res.sendStatus(200);
    }

    // UPDATE
    if (existe.rows.length > 0) {
      await pool.query(
        "UPDATE responsavel_empresa SET emails = $1, nome_empresa = $2 WHERE cod_empresa = $3",
        [JSON.stringify(emails), nome, id]
      );
    }
    // INSERT
    else {
      await pool.query(
        "INSERT INTO responsavel_empresa (cod_empresa, nome_empresa, emails) VALUES ($1, $2, $3)",
        [id, nome, JSON.stringify(emails)]
      );
    }

    res.sendStatus(200);

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

// ENVIO AO SOC
app.post("/soc/funcionarios/:id/enviar", async (req, res) => {
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

    const client = await soap.createClientAsync(SOC_EXPORTA_FUNCIONARIOMODELO2);

    const wsSecurity = new soap.WSSecurity(
      SOC_USUARIO,
      SOC_TOKEN,
      { passwordType: "PasswordDigest", hasTimeStamp: true }
    );

    client.setSecurity(wsSecurity);

    const dataBody = {
      Funcionario: {
        criarFuncionario: true,
        atualizarFuncionario: false,

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
          chaveProcuraFuncionario: "CPF_ATIVO"
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

// VERIFICAR FUNCIONÁRIO NO SOC POR CPF DENTRO DA EMPRESA LOGADA (EXPORTA DADOS)
app.get("/pesquisar-funcionario-soc/:cpf/:empresaUsuario", async (req, res) => {
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

    const decoded = iconv.decode(response.data, "ISO-8859-1").trim();

    // SOC NÃO ACHOU FUNCIONÁRIO
    if (!decoded || decoded.toLowerCase().includes("sem resultado")) {
      return res.json({ existe: false });
    }

    let parsed;
    try {
      parsed = JSON.parse(decoded);
    } catch (e) {
      console.error("Retorno inesperado do SOC:", decoded);
      return res.status(500).json({
        erro: "Retorno inválido do SOC",
        detalhe: decoded
      });
    }

    const registros = Array.isArray(parsed) ? parsed : [parsed];

    if (!registros.length || !registros[0]?.CPFFUNCIONARIO) {
      return res.json({ existe: false });
    }

    const funcionarios = registros.map(f => ({
      codigo_empresa: f.CODIGOEMPRESA,
      nome_empresa: f.NOMEEMPRESA,

      nome: f.NOME,
      cpf: f.CPFFUNCIONARIO,
      matricula: f.MATRICULAFUNCIONARIO,
      situacao: f.SITUACAO,

      data_nascimento: f.DATA_NASCIMENTO,
      data_admissao: f.DATA_ADMISSAO,
      data_demissao: f.DATA_DEMISSAO || null,
      data_inativacao: f.DATA_INATIVACAO || null,

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
    }));

    return res.json({
      existe: true,
      funcionarios
    });

  } catch (err) {
    console.error("Erro exporta funcionário:", err);
    res.status(500).json({
      erro: "Erro ao consultar funcionário no SOC",
      detalhe: err.message
    });
  }
});

// ROTA PARA LISTAR TODOS OS USUÁRIOS DO SISTEMA (PERFIL ACESSO)
app.get("/usuarios", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT 
        u.id,
        u.nome,
        u.cpf,
        u.cod_empresa,
        u.nome_empresa,
        (
            SELECT json_agg(ue)
            FROM usuarios_empresas ue
            WHERE ue.usuario_id = u.id
        ) AS empresas_extras
    FROM usuarios u
  `);

  res.json(rows);
});

// ROTA PARA BUSCAR AS UNIDADES DE ACESSO DO USUÁRIO (PERFIL ACESSO)
app.get("/usuarios/:id/unidades/:empresa", async (req, res) => {

  const { id, empresa } = req.params;

  const { rows } = await pool.query(`
    SELECT 
      (jsonb_array_elements(unidades)->>'cod_unidade') AS codigo,
      (jsonb_array_elements(unidades)->>'nome_unidade') AS nome
    FROM usuarios
    WHERE id = $1
    AND cod_empresa = $2

    UNION ALL

    SELECT 
      (jsonb_array_elements(unidades)->>'cod_unidade') AS codigo,
      (jsonb_array_elements(unidades)->>'nome_unidade') AS nome
    FROM usuarios_empresas
    WHERE usuario_id = $1
    AND cod_empresa = $2
  `, [id, empresa]);

  res.json(rows);
});

// ROTA PARA SALVAR AS UNIDADES DE ACESSO DO USUÁRIO (PERFIL ACESSO)
app.post("/usuarios/salvar-unidades", async (req, res) => {
  const { usuario_id, cod_empresa, unidades } = req.body;

  try {
    // VERIFICA SE É A EMPRESA PRINCIPAL
    const empresaPrincipal = await pool.query(`
      SELECT 1
      FROM usuarios
      WHERE id = $1
      AND cod_empresa = $2
    `, [usuario_id, cod_empresa]);

    if (empresaPrincipal.rowCount > 0) {

      // SALVA NA TABELA USUARIOS
      await pool.query(`
        UPDATE usuarios
        SET unidades = $1
        WHERE id = $2
        AND cod_empresa = $3
      `, [JSON.stringify(unidades), usuario_id, cod_empresa]);

    } else {

      // SALVA NA TABELA USUARIOS_EMPRESAS
      await pool.query(`
        UPDATE usuarios_empresas
        SET unidades = $1
        WHERE usuario_id = $2
        AND cod_empresa = $3
      `, [JSON.stringify(unidades), usuario_id, cod_empresa]);
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar unidades" });
  }
});

// ROTA PARA BUSCAR AS EMPRESAS DE ACESSO DO USUÁRIO (PERFIL ACESSO)
app.get("/usuarios/:id/empresas", async (req, res) => {

  const { id } = req.params;

  try {

    const { rows } = await pool.query(`

      SELECT 
        cod_empresa,
        nome_empresa,
        true AS principal
      FROM usuarios
      WHERE id = $1

      UNION ALL

      SELECT
        cod_empresa,
        nome_empresa,
        false AS principal
      FROM usuarios_empresas
      WHERE usuario_id = $1

    `, [id]);

    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar empresas do usuário" });
  }

});

// ROTA PARA SALVAR AS EMPRESAS DE ACESSO DO USUÁRIO (PERFIL ACESSO)
app.post("/usuarios/salvar-empresas", async (req, res) => {
  const { usuario_id, empresas } = req.body;

  await pool.query(`
    DELETE FROM usuarios_empresas
    WHERE usuario_id = $1
  `, [usuario_id]);

  for (const e of empresas) {
    await pool.query(`
      INSERT INTO usuarios_empresas
      (usuario_id, cod_empresa, nome_empresa, unidades)
      VALUES ($1,$2,$3,'[]')
    `, [usuario_id, e.cod_empresa, e.nome_empresa]);

  }

  res.json({ success: true });
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

// BUSCAR DADOS DO USUÁRIO PRA TELA DE PERFIL
app.get("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT id, nome, cpf, email, senha, perfil, cod_empresa, nome_empresa
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

  if (!email) {
    return res.status(400).json({ erro: "Email é obrigatório" });
  }

  try {
    // SE VEIO SENHA → ATUALIZA COM HASH
    if (senha && senha.trim() !== "") {

      const senhaHash = await bcrypt.hash(senha, 10);

      await pool.query(
        `
          UPDATE usuarios
          SET email = $1,
              senha = $2
          WHERE id = $3
        `,
        [email, senhaHash, id]
      );

    } else {
      // SE NÃO VEIO SENHA → NÃO MEXE NA SENHA
      await pool.query(
        `
          UPDATE usuarios
          SET email = $1
          WHERE id = $2
        `,
        [email, id]
      );
    }

    res.json({ sucesso: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar perfil" });
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
  const { tipoSolicitacao, destinatario, assunto, mensagem, codigo_empresa } = req.body;

  try {
    let destinoFinal = "";
    let copia = "";

    // SETOR / CARGO → buscar na tabela
    if (tipoSolicitacao === "SETOR_CARGO") {

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
      copia = "debora.fonseca@salubrita.com.br, wasidrf@outlook.com";
      //copia = "nicolly.rocha@salubrita.com.br, paulina.oliveira@salubrita.com.br, rubia.costa@salubrita.com.br";
    }

    // UNIDADE ou CREDENCIAMENTO → email fixo
    else {
      destinoFinal = destinatario;
    }

    if (!destinoFinal) {
      throw new Error("Destinatário não definido");
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

    // const copia = [
    //   "nicolly.rocha@salubrita.com.br",
    //   "paulina.oliveira@salubrita.com.br",
    //   "rubia.costa@salubrita.com.br"
    // ];

    const copia = [
      "debora.fonseca@salubrita.com.br",
      "wasidrf@outlook.com"
    ];

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

    // const copia = [
    //   "nicolly.rocha@salubrita.com.br",
    //   "paulina.oliveira@salubrita.com.br",
    //   "rubia.costa@salubrita.com.br"
    // ];

    const copia = [
      "debora.fonseca@salubrita.com.br",
      "wasidrf@outlook.com"
    ];

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
  await transporter.sendMail({
    from: "Portal Salubritá <naoresponda@salubrita.com.br>",
    to: "contratos@salubrita.com.br",
    //to: "wasidrf@outlook.com",
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

// const PORT = process.env.NODE_ENV === 'development' ? 3000 : (process.env.PORT || 3003);

// app.listen(PORT, () => {
//   console.log(`Servidor rodando na porta ${PORT}`);
// });

const PORT = process.env.NODE_ENV === 'development'
  ? 3000
  : (process.env.PORT || 3003);

const HOST = process.env.NODE_ENV === 'development'
  ? "0.0.0.0"
  : "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em ${HOST}:${PORT}`);
});