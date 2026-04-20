const express = require("express");
const router = express.Router();
const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const iconv = require("iconv-lite");

const socUrlExportaDados = process.env.SOC_URL_EXPORTA_DADOS;

const EXPORTA_EMPRESAS = {
  empresa: "412429",
  codigo: "211215",
  chave: process.env.SOC_CHAVE_EMPRESAS,
  tipoSaida: "xml"
};

const EXPORTA_UNIDADES = {
  codigo: "211234",
  chave: process.env.SOC_CHAVE_UNIDADES,
  tipoSaida: "xml"
};

const EXPORTA_SETORES = {
  codigo: "211373",
  chave: process.env.SOC_CHAVE_SETORES,
  tipoSaida: "xml"
};

const EXPORTA_CARGOS = {
  codigo: "211242",
  chave: process.env.SOC_CHAVE_CARGOS,
  tipoSaida: "xml"
};

const EXPORTA_HIERARQUIA = {
  codigo: "212432",
  chave: process.env.SOC_CHAVE_HIERARQUIA,
  tipoSaida: "xml"
};

const EXPORTA_PRESTADORES = {
  empresa: "412429",
  codigo: "211713",
  chave: process.env.SOC_CHAVE_PRESTADORES,
  tipoSaida: "xml",
  codigoPrestador: ""
};

const EXPORTA_DETALHES_PRESTADOR = {
  empresa: "412429",
  codigo: "211707",
  chave: process.env.SOC_CHAVE_DETALHES_PRESTADOR,
  tipoSaida: "json"
}

const EXPORTA_FUNCIONARIOS = {
  empresa: "412429",
  codigo: "211477",
  chave: process.env.SOC_CHAVE_FUNCIONARIOS,
  tipoSaida: "json"
};

const parser = new XMLParser({
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false
});

// EXPORTA DADOS - TODAS AS EMPRESAS
router.get("/empresas", async (req, res) => {
  try {
    const parametro = JSON.stringify(EXPORTA_EMPRESAS);

    const response = await axios.get(socUrlExportaDados, {
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

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro empresas" });
  }
});

// EXPORTA DADOS - UNIDADES DE UMA EMPRESA
router.get("/unidades/:empresa", async (req, res) => {
  try {
    const parametro = JSON.stringify({
      empresa: req.params.empresa,
      ...EXPORTA_UNIDADES
    });

    const response = await axios.get(socUrlExportaDados, {
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

// EXPORTA DADOS - SETORES DE UMA EMPRESA
router.get("/setores/:empresa", async (req, res) => {
  try {
    const parametro = JSON.stringify({
      empresa: req.params.empresa,
      ...EXPORTA_SETORES
    });

    const response = await axios.get(socUrlExportaDados, {
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

// EXPORTA DADOS - CARGOS DE UMA EMPRESA
router.get("/cargos/:empresa", async (req, res) => {
  try {
    const parametro = JSON.stringify({
      empresa: req.params.empresa,
      ...EXPORTA_CARGOS
    });

    const response = await axios.get(socUrlExportaDados, {
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

// EXPORTA DADOS - HIERARQUIA - SETORES DE UMA UNIDADE
router.get("/hierarquia/:empresa/:unidade", async (req, res) => {
  try {
    const { empresa, unidade } = req.params;

    const parametro = JSON.stringify({
      ...EXPORTA_HIERARQUIA,
      empresa,
      empresaTrabalho: empresa
    });

    const response = await axios.get(socUrlExportaDados, {
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

    const setores = Array.from(setoresMap.values())
      .sort((a, b) => a.nomeSetor.localeCompare(b.nomeSetor, 'pt-BR'));

    res.json(setores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar hierarquia" });
  }
});

// EXPORTA DADOS - HIERARQUIA - CARGOS DE UM SETOR
router.get("/hierarquia/:empresa/:unidade/:setor", async (req, res) => {
  try {
    const { empresa, unidade, setor } = req.params;

    const parametro = JSON.stringify({
      ...EXPORTA_HIERARQUIA,
      empresa,
      empresaTrabalho: empresa
    });

    const response = await axios.get(socUrlExportaDados, {
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

// RETORNA PRESTADORES PREFERENCIAIS JÁ COM DETALHES
router.get("/prestadores/:empresa/detalhes", async (req, res) => {
  try {
    // 1. Busca lista base
    const parametro = JSON.stringify({
      empresa: req.params.empresa,
      ...EXPORTA_PRESTADORES,
      codigoDaEmpresa: req.params.empresa,
      empresaTrabalho: req.params.empresa
    });

    const response = await axios.get(socUrlExportaDados, {
      params: { parametro },
      responseType: "arraybuffer"
    });

    let xml = iconv.decode(response.data, "ISO-8859-1");
    xml = xml.replace(/&(?!(amp|lt|gt|quot|apos);)/g, "&amp;");

    const json = parser.parse(xml);

    const registros = json?.root?.record
      ? Array.isArray(json.root.record) ? json.root.record : [json.root.record]
      : [];

    const prestadoresAtivos = registros.filter(p =>
      p.statusPrestador === "Ativo" &&
      p.nomePrestador?.trim().toUpperCase() !== "REAVALIADO"
    );

    // 2. Busca detalhes em paralelo — no backend o limite do SOC pode ser diferente,
    //    mas mantemos lotes de 5 por segurança
    const LOTE = 5;
    const detalhes = [];

    for (let i = 0; i < prestadoresAtivos.length; i += LOTE) {
      const lote = prestadoresAtivos.slice(i, i + LOTE);

      const resultados = await Promise.all(lote.map(async (p) => {
        try {
          const parametroDetalhe = JSON.stringify({
            ...EXPORTA_DETALHES_PRESTADOR,
            codigoPrestador: p.codigoPrestador
          });

          const payload = new URLSearchParams({ parametro: parametroDetalhe });

          const socResponse = await axios.post(socUrlExportaDados, payload, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            responseType: "arraybuffer"
          });

          const decoded = iconv.decode(socResponse.data, "ISO-8859-1");
          if (!decoded.trim().startsWith("[") && !decoded.trim().startsWith("{")) return null;

          const data = JSON.parse(decoded);
          const lista = Array.isArray(data) ? data : [];
          const prestador = lista.find(d => String(d.codigoPrestador) === String(p.codigoPrestador));

          if (!prestador || prestador.nivelClassificacao?.toUpperCase() !== "PREFERENCIAL") return null;

          return {
            codigo: p.codigoPrestador,
            nome: prestador.nomePrestador || prestador.nome || "",
            cidade: prestador.cidade || "",
            estado: prestador.estado || "",
            nivelClassificacao: prestador.nivelClassificacao || ""
          };
        } catch {
          return null;
        }
      }));

      detalhes.push(...resultados.filter(Boolean));
    }

    res.json(detalhes);

  } catch (err) {
    console.error("Erro ao buscar detalhes dos prestadores:", err);
    res.status(500).json({ erro: "Erro ao buscar detalhes dos prestadores" });
  }
});

// BUSCAR UM CADASTRO NO SOC PELO CPF
router.get("/buscar-cadastro/:cpf/:empresaUsuario", async (req, res) => {
  try {
    const cpf = req.params.cpf.replace(/\D/g, "");
    const empresaUsuario = String(req.params.empresaUsuario);

    const parametro = JSON.stringify({
      ...EXPORTA_FUNCIONARIOS,
      empresaTrabalho: empresaUsuario, // EMPRESA LOGADA
      cpf
    });

    const response = await axios.get(socUrlExportaDados, {
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

module.exports = router;