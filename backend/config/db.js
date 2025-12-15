require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const caPath = path.join(__dirname, "..", "certs", "prod-ca-2021.crt");
const ca =
  fs.existsSync(caPath) && fs.statSync(caPath).isFile()
    ? fs.readFileSync(caPath, "utf8")
    : null;

// Create a new pool with SSL enabled (required for Supabase)
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
  ssl: ca
    ? {
        ca,
        rejectUnauthorized: true,
      }
    : {
        // Fallback to allow connection if CA file is missing
        rejectUnauthorized: false,
      },
});

module.exports = pool;
