const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../config/database");

// LISTAR TODOS OS USUÁRIOS (PERFIL ACESSO)
router.get("/usuarios", async (req, res) => {
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
            ) AS empresas_extras,
            ativo
        FROM usuarios u
    `);

    res.json(rows);
});

// BUSCAR AS EMPRESAS DE ACESSO DO USUÁRIO (PERFIL ACESSO)
router.get("/usuarios/:id/empresas", async (req, res) => {
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

// SALVAR AS EMPRESAS DE ACESSO DO USUÁRIO (PERFIL ACESSO)
router.post("/usuarios/salvar-empresas", async (req, res) => {
    const { usuario_id, empresas, alterado_por } = req.body;

    try {
        await pool.query(`DELETE FROM usuarios_empresas WHERE usuario_id = $1`, [usuario_id]);

        for (const e of empresas) {
            await pool.query(`
                INSERT INTO usuarios_empresas (usuario_id, cod_empresa, nome_empresa, unidades)
                VALUES ($1, $2, $3, '[]')
            `, [usuario_id, e.cod_empresa, e.nome_empresa]);
        }

        // SUBSTITUI O LOG — deleta o anterior e insere o novo
        await pool.query(`
            DELETE FROM log_perfil_acesso
            WHERE tipo = 'empresas' AND item_id = $1
        `, [usuario_id]);

        await pool.query(`
            INSERT INTO log_perfil_acesso (tipo, item_id, alterado_por)
            VALUES ('empresas', $1, $2)
        `, [usuario_id, alterado_por]);

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao salvar empresas" });
    }
});

// BUSCAR AS UNIDADES DE ACESSO DO USUÁRIO (PERFIL ACESSO)
router.get("/usuarios/:id/unidades/:empresa", async (req, res) => {
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

// SALVAR AS UNIDADES DE ACESSO DO USUÁRIO (PERFIL ACESSO)
router.post("/usuarios/salvar-unidades", async (req, res) => {
    const { usuario_id, cod_empresa, nome_empresa, unidades, alterado_por } = req.body;

    try {
        const empresaPrincipal = await pool.query(`
            SELECT 1 FROM usuarios WHERE id = $1 AND cod_empresa = $2
        `, [usuario_id, cod_empresa]);

        if (empresaPrincipal.rowCount > 0) {
            await pool.query(`
                UPDATE usuarios SET unidades = $1 WHERE id = $2 AND cod_empresa = $3
            `, [JSON.stringify(unidades), usuario_id, cod_empresa]);
        } else {
            await pool.query(`
                UPDATE usuarios_empresas SET unidades = $1 WHERE usuario_id = $2 AND cod_empresa = $3
            `, [JSON.stringify(unidades), usuario_id, cod_empresa]);
        }

        // SUBSTITUI O LOG — deleta o anterior e insere o novo
        await pool.query(`
            DELETE FROM log_perfil_acesso
            WHERE tipo = 'unidades' AND item_id = $1 AND cod_empresa = $2
        `, [usuario_id, cod_empresa]);

        await pool.query(`
            INSERT INTO log_perfil_acesso (tipo, item_id, cod_empresa, alterado_por)
            VALUES ('unidades', $1, $2, $3)
        `, [usuario_id, cod_empresa, alterado_por]);

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao salvar unidades" });
    }
});

// BUSCAR O LOG DE UM USUÁRIO (empresas ou unidades)
router.get("/usuarios/:id/log", async (req, res) => {
    const { id } = req.params;
    const { tipo, cod_empresa } = req.query;

    try {
        let query = `
            SELECT alterado_por, data_alteracao
            FROM log_perfil_acesso
            WHERE item_id = $1 AND tipo = $2
        `;
        const params = [id, tipo];

        if (tipo === "unidades" && cod_empresa) {
            query += ` AND cod_empresa = $3`;
            params.push(cod_empresa);
        }

        query += ` ORDER BY data_alteracao DESC LIMIT 1`;

        const result = await pool.query(query, params);

        res.json(result.rows[0] || null);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao buscar log" });
    }
});

// BUSCAR DADOS DO USUÁRIO (TELA DE PERFIL)
router.get("/usuarios/:id", async (req, res) => {
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
router.put("/usuarios/:id", async (req, res) => {
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

module.exports = router;