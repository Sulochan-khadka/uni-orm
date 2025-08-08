#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const fetch = global.fetch;

// Display banner
console.log(
  chalk.cyan(
    `\n  _   _       _  ___  ____  __  __\n | | | |_ __ (_)/ _ \\|  _ \\|  \\/  |\n | | | | '_ \\| | | | | |_) | |\\/| |\n | |_| | | | | | |_| |  _ <| |  | |\n  \\___/|_| |_|_|\\___/|_| \\_\\_|  |_|\n`
  )
);
console.log(chalk.yellow('Universal ORM for all programming languages\n'));

program
  .name('uni-orm')
  .description('Universal ORM CLI')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize UniORM in your project')
  .option('-l, --language <language>', 'specify programming language')
  .option('-p, --provider <provider>', 'specify database provider')
  .option('-u, --url <url>', 'database connection URL')
  .action(async (options) => {
    const res = await fetch('http://localhost:6499/project/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: options.language,
        provider: options.provider,
        url: options.url
      })
    });
    const data = await res.json();
    console.log(data);
  });

program
  .command('detect')
  .description('Detect programming language and database in current project')
  .action(async () => {
    const { LanguageDetector } = require('../src/core/LanguageDetector');
    const detector = new LanguageDetector();
    const result = await detector.detectAll();
    console.log(chalk.green('Detection results:'));
    console.log(result);
  });

program
  .command('migrate')
  .description('Run database migrations')
  .option('--from-provider <provider>', 'source database provider')
  .option('--from-url <url>', 'source database URL')
  .option('--to-provider <provider>', 'target database provider')
  .option('--to-url <url>', 'target database URL')
  .option('--type <type>', 'migration type: schema, data, or both', 'both')
  .action(async (options) => {
    const planRes = await fetch('http://localhost:6499/migrations/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: { provider: options.fromProvider, url: options.fromUrl },
        to: { provider: options.toProvider, url: options.toUrl },
        options: { type: options.type }
      })
    });
    const plan = await planRes.json();
    console.log('Plan:', plan);
    const applyRes = await fetch('http://localhost:6499/migrations/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan })
    });
    const result = await applyRes.json();
    console.log('Apply:', result);
  });

program
  .command('dashboard')
  .description('Launch web dashboard for visual database management')
  .option('-p, --port <port>', 'port number', '3000')
  .action(async (options) => {
    const { DashboardManager } = require('../src/dashboard/DashboardManager');
    const dashboardManager = new DashboardManager();
    await dashboardManager.start(options.port);
  });

program
  .command('generate')
  .description('Generate ORM models and configurations')
  .option('-t, --type <type>', 'generation type: models, config, or all', 'all')
  .action(async (options) => {
    const { UniORM } = require('../src/core/UniORM');
    const uniorm = new UniORM();
    await uniorm.generate(options);
  });

program
  .command('sync')
  .description('Sync database schema with ORM models')
  .option('--provider <provider>', 'database provider')
  .option('--url <url>', 'database connection URL')
  .option('--schema <file>', 'path to schema file', 'uniorm.schema.yaml')
  .action(async (options) => {
    const fs = require('fs');
    const schemaText = fs.readFileSync(options.schema, 'utf8');
    const res = await fetch('http://localhost:6499/db/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: options.provider,
        url: options.url,
        schemaYaml: schemaText
      })
    });
    const data = await res.json();
    console.log(data);
  });

program.parse();
