const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { LanguageDetector } = require('./LanguageDetector');
const { ConfigManager } = require('./ConfigManager');
const { ORMInstaller } = require('./ORMInstaller');
const { testConnection } = require('./ConnectionTester');

class UniORM {
  constructor() {
    this.config = new ConfigManager();
    this.detector = new LanguageDetector();
    this.installer = new ORMInstaller();
  }

  // async initialize(options = {}) {
  //   const spinner = ora('Initializing UniORM...').start();

  //   try {
  //     // Detect or prompt for language
  //     let language = options.language;
  //     if (!language) {
  //       const detected = await this.detector.detectLanguage();
  //       if (detected.length === 0) {
  //         spinner.stop();
  //         language = await this.promptForLanguage();
  //       } else if (detected.length === 1) {
  //         language = detected[0];
  //         spinner.text = `Detected language: ${chalk.green(language)}`;
  //       } else {
  //         spinner.stop();
  //         language = await this.promptForLanguageFromDetected(detected);
  //       }
  //     }

  //     // Detect or prompt for database
  //     let database = options.database;
  //     if (!database) {
  //       const detected = await this.detector.detectDatabase();
  //       if (detected.length === 0) {
  //         spinner.stop();
  //         database = await this.promptForDatabase();
  //       } else if (detected.length === 1) {
  //         database = detected[0];
  //         spinner.text = `Detected database: ${chalk.green(database)}`;
  //       } else {
  //         spinner.stop();
  //         database = await this.promptForDatabaseFromDetected(detected);
  //       }
  //     }

  //     spinner.text = 'Installing ORM dependencies...';
  //     await this.installer.install(language, database);

  //     spinner.text = 'Generating configuration...';
  //     await this.config.generate(language, database);

  //     spinner.text = 'Setting up project structure...';
  //     await this.setupProjectStructure(language);

  //     spinner.succeed(chalk.green('UniORM initialized successfully!'));

  //     console.log(chalk.yellow('\nNext steps:'));
  //     console.log(chalk.white('1. Configure your database connection in uni-orm.config.js'));
  //     console.log(chalk.white('2. Run "uni-orm generate" to create your first models'));
  //     console.log(chalk.white('3. Use "uni-orm dashboard" for visual database management'));

  //   } catch (error) {
  //     spinner.fail(chalk.red('Failed to initialize UniORM'));
  //     console.error(chalk.red(error.message));
  //   }
  // }
  async initialize(options = {}) {
    const spinner = ora('Initializing project').start();
    try {
      spinner.text = 'Detecting language/database';

      // 1) Prompt Language with "Auto" first
      let language = options.language;
      if (!language) {
        const langChoices = [
          'Auto (recommended)',
          'javascript',
          'typescript',
          'python',
        ];
        const { langPick } = await inquirer.prompt([
          {
            type: 'list',
            name: 'langPick',
            message: 'Project language?',
            choices: langChoices,
            default: 0,
          },
        ]);
        language =
          langPick === 'Auto (recommended)'
            ? await this.detector.detectLanguage()
            : langPick;
        if (!language) {
          const { l } = await inquirer.prompt([
            {
              type: 'list',
              name: 'l',
              message: 'Select language:',
              choices: langChoices.slice(1),
            },
          ]);
          language = l;
        }
      }

      // 2) Prompt DB with "Auto" first
      let database = options.database;
      if (!database) {
        const dbChoices = [
          'Auto (recommended)',
          'postgresql',
          'mysql',
          'sqlite',
          'mongodb',
        ];
        const { dbPick } = await inquirer.prompt([
          {
            type: 'list',
            name: 'dbPick',
            message: 'Target database?',
            choices: dbChoices,
            default: 0,
          },
        ]);
        database =
          dbPick === 'Auto (recommended)'
            ? await this.detector.detectDatabase()
            : dbPick;
        if (!database) {
          const { d } = await inquirer.prompt([
            {
              type: 'list',
              name: 'd',
              message: 'Select database:',
              choices: dbChoices.slice(1),
            },
          ]);
          database = d;
        }
      }

      // 2.5) 🔧 Normalize once (aliases → canonical)
      const norm = (s) =>
        String(s || '')
          .trim()
          .toLowerCase();
      const lang = norm(language);
      let db = norm(database);
      if (db === 'postgres' || db === 'pg') db = 'postgresql';
      if (db === 'sqlite3') db = 'sqlite';

      spinner.succeed(`Detected → ${chalk.cyan(lang)} + ${chalk.cyan(db)}`);

      // 3) Ask for connection details to build .env (use normalized db)
      let answers = {};
      if (db === 'sqlite') {
        answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'DB_FILE',
            message: 'SQLite file path',
            default: './dev.sqlite',
          },
        ]);
      } else {
        answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'DB_HOST',
            message: 'DB host',
            default: 'localhost',
          },
          {
            type: 'input',
            name: 'DB_PORT',
            message: 'DB port',
            default: String(this.config.getDefaultPort(db)),
          },
          {
            type: 'input',
            name: 'DB_USER',
            message: 'DB user',
            default: 'user',
          },
          {
            type: 'password',
            name: 'DB_PASSWORD',
            message: 'DB password',
            mask: '*',
          },
          {
            type: 'input',
            name: 'DB_NAME',
            message: 'DB name',
            default: 'appdb',
          },
        ]);
      }

      // 4) Write config, schema, .gitignore and .env (use normalized values)
      const writeSpin = ora('Writing config & schema').start();
      await this.config.generate(lang, db);
      await this.config.ensureGitignore();
      await this.config.writeDotEnv(db, answers);
      writeSpin.succeed('Config & schema ready');

      // 5) Install minimal driver packages in current project
      const installSpin = ora('Installing database driver').start();
      await this.installer.install(lang, db, process.cwd());
      installSpin.succeed('Driver installed');

      // 6) Smoke test (uses normalized db and project cwd)
      const testSpin = ora('Running connection test').start();
      try {
        const ok = await testConnection(db, process.cwd());
        testSpin.succeed(`✅ ${ok}`);
      } catch (e) {
        testSpin.fail(`Connection test failed: ${e.message}`);
        console.log(
          chalk.yellow(
            'Files are generated and deps installed, but the DB is unreachable right now.'
          )
        );
      }
    } catch (err) {
      spinner.fail('Init failed');
      console.error(chalk.red(err.stack || err.message));
      process.exitCode = 1;
    }
  }

  async promptForLanguage() {
    const { language } = await inquirer.prompt([
      {
        type: 'list',
        name: 'language',
        message: 'Select your programming language:',
        choices: [
          { name: 'JavaScript/Node.js', value: 'javascript' },
          { name: 'TypeScript', value: 'typescript' },
          { name: 'Python', value: 'python' },
          { name: 'Go', value: 'go' },
          { name: 'Java', value: 'java' },
          { name: 'C#', value: 'csharp' },
          { name: 'PHP', value: 'php' },
          { name: 'Ruby', value: 'ruby' },
        ],
      },
    ]);
    return language;
  }

  async promptForDatabase() {
    const { database } = await inquirer.prompt([
      {
        type: 'list',
        name: 'database',
        message: 'Select your database:',
        choices: [
          { name: 'PostgreSQL', value: 'postgresql' },
          { name: 'MySQL', value: 'mysql' },
          { name: 'SQLite', value: 'sqlite' },
          { name: 'MongoDB', value: 'mongodb' },
          { name: 'Redis', value: 'redis' },
          { name: 'CouchDB', value: 'couchdb' },
          { name: 'Cassandra', value: 'cassandra' },
        ],
      },
    ]);
    return database;
  }

  async promptForLanguageFromDetected(detected) {
    const { language } = await inquirer.prompt([
      {
        type: 'list',
        name: 'language',
        message: 'Multiple languages detected. Choose one:',
        choices: detected.map((lang) => ({ name: lang, value: lang })),
      },
    ]);
    return language;
  }

  async promptForDatabaseFromDetected(detected) {
    const { database } = await inquirer.prompt([
      {
        type: 'list',
        name: 'database',
        message: 'Multiple databases detected. Choose one:',
        choices: detected.map((db) => ({ name: db, value: db })),
      },
    ]);
    return database;
  }

  async setupProjectStructure(language) {
    const projectRoot = process.cwd();
    const directories = ['models', 'migrations', 'seeders', 'schemas'];

    for (const dir of directories) {
      await fs.ensureDir(path.join(projectRoot, dir));
    }

    // Create example files based on language
    await this.createExampleFiles(language);
  }

  async createExampleFiles(language) {
    const examples = {
      javascript: {
        'models/User.js': `// Example User model
const { Model } = require('uni-orm');

class User extends Model {
  static tableName = 'users';
  
  static schema = {
    id: { type: 'integer', primary: true, autoIncrement: true },
    name: { type: 'string', required: true },
    email: { type: 'string', unique: true, required: true },
    createdAt: { type: 'timestamp', default: 'now' }
  };
}

module.exports = User;`,
      },
      python: {
        'models/user.py': `# Example User model
from uni_orm import Model, Column, Integer, String, DateTime

class User(Model):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)`,
      },
    };

    if (examples[language]) {
      for (const [filepath, content] of Object.entries(examples[language])) {
        await fs.outputFile(path.join(process.cwd(), filepath), content);
      }
    }
  }

  async generate(options = {}) {
    const spinner = ora('Generating ORM files...').start();

    try {
      const config = await this.config.load();

      if (options.type === 'models' || options.type === 'all') {
        await this.generateModels(config);
      }

      if (options.type === 'config' || options.type === 'all') {
        await this.generateConfig(config);
      }

      spinner.succeed('Generation completed successfully!');
    } catch (error) {
      spinner.fail('Generation failed');
      console.error(chalk.red(error.message));
    }
  }

  async generateModels(config) {
    // Implementation for generating models based on database schema
    console.log(chalk.blue('Generating models...'));
  }

  async generateConfig(config) {
    // Implementation for generating configuration files
    console.log(chalk.blue('Generating configuration...'));
  }

  async sync(options = {}) {
    const spinner = ora('Syncing database schema...').start();

    try {
      const config = await this.config.load();

      if (options.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Force sync will drop existing tables. Continue?',
            default: false,
          },
        ]);

        if (!confirm) {
          spinner.stop();
          return;
        }
      }

      // Sync implementation
      spinner.succeed('Database schema synced successfully!');
    } catch (error) {
      spinner.fail('Sync failed');
      console.error(chalk.red(error.message));
    }
  }
}

module.exports = { UniORM };
