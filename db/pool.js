require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT
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
