const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../../db/pool");
const { enviarEmailRecuperacao } = require("../services/email");

// ROTA DE LOGIN DE USUÁRIO
router.post("/login", async (req, res) => {
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
        unidades,
        ativo
      FROM usuarios
      WHERE cpf = $1
      `,
      [usuario]
    );

    if (!result.rows.length) {
      return res.status(401).json({ erro: "Usuário ou senha inválidos" });
    }

    const user = result.rows[0];

    if (user.ativo === 0) {
      return res.status(403).json({ erro: "Cadastro inativo" });
    }

    let senhaValida = false;

    if (user.senha.startsWith("$2b$")) {
      senhaValida = await bcrypt.compare(senha, user.senha);
    } else {
      senhaValida = senha === user.senha;

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

// ROTA DE CADASTRO DE USUÁRIO
router.post("/cadastro", async (req, res) => {
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

// RECUPERAR A SENHA DE LOGIN
router.post("/recuperar-senha", async (req, res) => {
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

module.exports = router;