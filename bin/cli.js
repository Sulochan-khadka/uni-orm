#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');

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
  .option('-d, --database <database>', 'specify database type')
  .action(async (options) => {
    const { UniORM } = require('../src/core/UniORM');
    const uniorm = new UniORM();
    await uniorm.initialize(options);
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
  .option('-f, --from <database>', 'source database')
  .option('-t, --to <database>', 'target database')
  .option('--type <type>', 'migration type: schema, data, or both', 'both')
  .action(async (options) => {
    const { MigrationManager } = require('../src/core/MigrationManager');
    const migrationManager = new MigrationManager();
    await migrationManager.migrate(options);
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
  .option('--force', 'force sync (destructive)')
  .action(async (options) => {
    const { UniORM } = require('../src/core/UniORM');
    const uniorm = new UniORM();
    await uniorm.sync(options);
  });

program.parse();
