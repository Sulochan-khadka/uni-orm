#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const prompt = inquirer.createPromptModule();
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const fetch = global.fetch;
const { DashboardManager } = require('../src/dashboard/DashboardManager');
const pkg = require('../package.json');

// Banner
console.log(
  chalk.cyan(
    `\n  _   _       _  ___  ____  __  __\n | | | |_ __ (_)/ _ \\|  _ \\|  \\/  |\n | | | | '_ \\| | | | | |_) | |\\/| |\n | |_| | | | | |_| |  _ <| |  | |\n  \\___/|_| |_|_|\\___/|_| \\_\\_|  |_|\n`
  )
);
console.log(chalk.yellow('Universal ORM for all programming languages\n'));

program
  .name('uniorm')
  .description('Universal ORM CLI')
  .version(pkg.version);

program
  .command('init')
  .description('Initialize UniORM project')
  .action(async () => {
    const { language } = await prompt([
      {
        type: 'list',
        name: 'language',
        message: 'Select your language',
        choices: [
          { name: 'TypeScript', value: 'ts' },
          { name: 'Python', value: 'py' }
        ]
      }
    ]);
    const { provider } = await prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select your database provider',
        choices: ['mysql', 'postgres', 'sqlite', 'mongodb']
      }
    ]);
    const { url } = await prompt([
      { type: 'input', name: 'url', message: 'Database connection URL' }
    ]);
    const res = await fetch('http://localhost:6499/project/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, provider, url })
    });
    const data = await res.json();
    console.log(data);
  });

program
  .command('generate')
  .description('Run code generator')
  .action(async () => {
    const { main: generate } = require('../src/codegen/generate');
    const result = generate();
    console.log('Generated clients:', result);
  });

const db = program.command('db').description('Database commands');

db
  .command('pull')
  .description('Pull database schema into uniorm.schema.yaml')
  .action(async () => {
    const configPath = path.join(process.cwd(), '.uni-orm', 'config.json');
    const { provider, url } = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const res = await fetch('http://localhost:6499/db/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, url })
    });
    const data = await res.json();
    const schemaYaml = YAML.stringify(data.ir || {});
    fs.writeFileSync(path.join(process.cwd(), 'uniorm.schema.yaml'), schemaYaml);
    console.log('Wrote uniorm.schema.yaml');
  });

db
  .command('push')
  .description('Push uniorm.schema.yaml to database')
  .option('--force', 'Allow destructive changes (drops)')
  .action(async (opts) => {
    const configPath = path.join(process.cwd(), '.uni-orm', 'config.json');
    const { provider, url } = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const schemaPath = path.join(process.cwd(), 'uniorm.schema.yaml');
    const schemaYaml = fs.readFileSync(schemaPath, 'utf8');
    const res = await fetch('http://localhost:6499/db/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, url, schemaYaml, force: opts.force })
    });
    const data = await res.json();
    console.log(data);
  });

program
  .command('dashboard')
  .description('Start dashboard server')
  .option('--port <port>', 'port number', '3000')
  .action(async (opts) => {
    const manager = new DashboardManager();
    await manager.start(opts.port);
  });

const pull = program.command('pull').description('Pull operations');
pull
  .command('dbchange <token>')
  .description('Apply database changeset by token')
  .action(async (token) => {
    const res = await fetch(`http://localhost:6499/changesets/${token}`);
    const plan = await res.json();
    await fetch('http://localhost:6499/migrations/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, plan })
    });
    console.log('Changeset applied');
  });

async function runMigrate(from, to, type) {
  const sql = new Set(['mysql', 'postgres', 'sqlite']);
  const fromSQL = sql.has(from);
  const toSQL = sql.has(to);

  const isSqlMongo =
    (fromSQL && to === 'mongodb') ||
    (toSQL && from === 'mongodb');

  if (fromSQL && toSQL) {
    const planRes = await fetch('http://localhost:6499/migrations/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: { provider: from },
        to: { provider: to },
        options: { type }
      })
    });
    const plan = await planRes.json();
    const applyRes = await fetch('http://localhost:6499/migrations/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan })
    });
    const result = await applyRes.json();
    console.log(result);
  } else if (isSqlMongo) {
    const { confirm } = await prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Do you really want to change your entire codebase from ${from} to ${to}?`,
        default: false
      }
    ]);
    if (confirm) {
      const manager = new DashboardManager();
      await manager.start(3000);
    }
  } else {
    console.log('Unsupported migration type');
  }
}

const args = process.argv.slice(2);
if (args.length >= 3 && args[1] === 'migrate') {
  let type = 'both';
  const idx = args.indexOf('--type');
  if (idx !== -1 && args[idx + 1]) {
    type = args[idx + 1];
  }
  runMigrate(args[0], args[2], type).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  program.parse();
}

