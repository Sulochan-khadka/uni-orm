#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const { UniORM } = require('../src/core/UniORM');
const { LanguageDetector } = require('../src/core/LanguageDetector');
const { MigrationManager } = require('../src/core/MigrationManager');
const { DashboardManager } = require('../src/dashboard/DashboardManager');

// Display banner
console.log(
  chalk.cyan(
    figlet.textSync('UniORM', { horizontalLayout: 'full' })
  )
);
console.log(chalk.yellow('Universal ORM for all programming languages\n'));

// Support syntax: "uni-orm <from> migrate <to>"
const cliArgs = process.argv.slice(2);
if (
  cliArgs.length === 3 &&
  !cliArgs[0].startsWith('-') &&
  cliArgs[1] === 'migrate'
) {
  const migrationManager = new MigrationManager();
  migrationManager
    .migrate({ from: cliArgs[0], to: cliArgs[2] })
    .catch(err => console.error(chalk.red(err.message)));
  return;
}

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
    const uniorm = new UniORM();
    await uniorm.initialize(options);
  });

program
  .command('detect')
  .description('Detect programming language and database in current project')
  .action(async () => {
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
    const migrationManager = new MigrationManager();
    await migrationManager.migrate(options);
  });

program
  .command('dashboard')
  .description('Launch web dashboard for visual database management')
  .option('-p, --port <port>', 'port number', '3000')
  .action(async (options) => {
    const dashboardManager = new DashboardManager();
    await dashboardManager.start(options.port);
  });

program
  .command('generate')
  .description('Generate ORM models and configurations')
  .option('-t, --type <type>', 'generation type: models, config, or all', 'all')
  .action(async (options) => {
    const uniorm = new UniORM();
    await uniorm.generate(options);
  });

program
  .command('sync')
  .description('Sync database schema with ORM models')
  .option('--force', 'force sync (destructive)')
  .action(async (options) => {
    const uniorm = new UniORM();
    await uniorm.sync(options);
  });

// Pull commands
const pull = program.command('pull').description('Apply saved changes');
pull
  .command('dbchange <id>')
  .description('Apply a cross-database change generated from the dashboard')
  .action(async (id) => {
    const migrationManager = new MigrationManager();
    await migrationManager.pullDbChange(id);
  });

program.parse();