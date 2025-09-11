#!/usr/bin/env node

const { Command } = require('commander'); // use named import style for v9+
const chalk = require('chalk');
const figlet = require('figlet');

const program = new Command();

// Banner
console.log(
  chalk.cyan(figlet.textSync('UniORM', { horizontalLayout: 'full' }))
);
console.log(chalk.yellow('Universal ORM for all programming languages\n'));

program.name('uni-orm').description('Universal ORM CLI').version('1.0.0');

// init
program
  .command('init')
  .description('Initialize UniORM in the current project')
  .option('--language <language>', 'Project language')
  .option('--database <database>', 'Target database')
  .action(async (options) => {
    // Lazy import so dashboard deps don’t load on --help/init
    const { UniORM } = require('../src/core/UniORM');
    const uniorm = new UniORM();
    await uniorm.initialize(options);
  });

// detect
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

// migrate (keeps stub for later milestones)
program
  .command('migrate')
  .description('Run database migrations')
  .option('-f, --from <database>', 'source database')
  .option('-t, --to <database>', 'target database')
  .option('--type <type>', 'migration type: schema, data, or both', 'both')
  .action(async (options) => {
    const { MigrationManager } = require('../src/core/MigrationManager');
    const mm = new MigrationManager();
    await mm.migrate(options);
  });

// dashboard (only load DashboardManager when invoked)
program
  .command('dashboard')
  .description('Launch web dashboard (WIP)')
  .option('-p, --port <port>', 'port number', '3000')
  .action(async (options) => {
    const { DashboardManager } = require('../src/dashboard/DashboardManager');
    const dm = new DashboardManager();
    await dm.start(options.port);
  });

// generate
program
  .command('generate')
  .description('Generate ORM models and configurations')
  .option('-t, --type <type>', 'generation type: models, config, or all', 'all')
  .action(async (options) => {
    const { UniORM } = require('../src/core/UniORM');
    const uniorm = new UniORM();
    await uniorm.generate(options);
  });

// sync
program
  .command('sync')
  .description('Sync database schema with ORM models')
  .option('--force', 'force sync (destructive)')
  .action(async (options) => {
    const { UniORM } = require('../src/core/UniORM');
    const uniorm = new UniORM();
    await uniorm.sync(options);
  });

program.parse(process.argv);
