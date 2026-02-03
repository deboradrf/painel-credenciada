/*const { Pool } = require("pg");

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "cadastro_funcionarios",
    password: "salubrita",
    port: 5432
});

// DEBUG
pool.on("connect", () => {
    console.log("🟢 Conectado ao PostgreSQL");
});

pool.on("error", (err) => {
    console.error("🔴 Erro inesperado no PostgreSQL", err);
    process.exit(1);
});

module.exports = pool;*/

const { Pool } = require("pg");

const pool = new Pool({
    user: "adm_salubrita",
    host: "localhost",
    database: "painel_salubrita",
    password: "salub@2026",
    port: 5432
});

// DEBUG
pool.on("connect", () => {
    console.log("🟢 Conectado ao PostgreSQL");
});

pool.on("error", (err) => {
    console.error("🔴 Erro inesperado no PostgreSQL", err);
    process.exit(1);
});

module.exports = pool;
