// src/core/ConnectionTester.js
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

function readDotEnv(cwd = process.cwd()) {
  const envPath = path.join(cwd, '.env');
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, k, vRaw] = m;
    const v = vRaw.replace(/^['"]|['"]$/g, '');
    env[k] = v;
  }
  return env;
}

// Require modules from the target project (cwd), not from the global CLI
function localRequire(cwd) {
  return createRequire(path.join(cwd, 'package.json'));
}

async function testPostgres(env, cwd) {
  const req = localRequire(cwd);
  const { Client } = req('pg');
  const c = new Client({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 5432),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });
  await c.connect();
  await c.query('SELECT 1');
  await c.end();
}

async function testMySQL(env, cwd) {
  const req = localRequire(cwd);
  const mysql = req('mysql2/promise');
  const c = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });
  await c.query('SELECT 1');
  await c.end();
}

async function testSQLite(env, cwd) {
  const req = localRequire(cwd);
  const Database = req('better-sqlite3');
  const dbFile = env.DB_FILE || './dev.sqlite';
  const db = new Database(dbFile);
  db.prepare('SELECT 1').get();
  db.close();
}

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

async function testConnection(client, cwd = process.cwd()) {
  const env = { ...readDotEnv(cwd), ...process.env };
  const c = norm(client);

  if (c === 'postgresql' || c === 'postgres' || c === 'pg') {
    await testPostgres(env, cwd);
    return `Connected to PostgreSQL ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;
  }
  if (c === 'mysql') {
    await testMySQL(env, cwd);
    return `Connected to MySQL ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;
  }
  if (c === 'sqlite' || c === 'sqlite3') {
    await testSQLite(env, cwd);
    return `Opened SQLite database file ${env.DB_FILE || './dev.sqlite'}`;
  }
  throw new Error(`Unknown client "${client}"`);
}

module.exports = { testConnection };
