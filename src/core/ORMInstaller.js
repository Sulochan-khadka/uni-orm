const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const execAsync = promisify(exec);

class ORMInstaller {
  constructor() {
    this.installCommands = {
      javascript: {
        postgresql: {
          packages: ['prisma', '@prisma/client', 'pg', '@types/pg'],
          devPackages: ['prisma'],
          commands: ['npx prisma init']
        },
        mysql: {
          packages: ['prisma', '@prisma/client', 'mysql2'],
          devPackages: ['prisma'],
          commands: ['npx prisma init']
        },
        sqlite: {
          packages: ['prisma', '@prisma/client', 'sqlite3'],
          devPackages: ['prisma'],
          commands: ['npx prisma init']
        },
        mongodb: {
          packages: ['mongoose', '@types/mongoose'],
          devPackages: [],
          commands: []
        }
      },
      typescript: {
        postgresql: {
          packages: ['typeorm', 'pg', '@types/pg', 'reflect-metadata'],
          devPackages: ['@types/node', 'typescript', 'ts-node'],
          commands: ['npx typeorm init --name . --database postgres --express']
        },
        mysql: {
          packages: ['typeorm', 'mysql2', 'reflect-metadata'],
          devPackages: ['@types/node', 'typescript', 'ts-node'],
          commands: ['npx typeorm init --name . --database mysql --express']
        },
        sqlite: {
          packages: ['typeorm', 'sqlite3', 'reflect-metadata'],
          devPackages: ['@types/node', 'typescript', 'ts-node'],
          commands: ['npx typeorm init --name . --database sqlite --express']
        },
        mongodb: {
          packages: ['typeorm', 'mongodb', 'reflect-metadata'],
          devPackages: ['@types/node', 'typescript', 'ts-node'],
          commands: ['npx typeorm init --name . --database mongodb --express']
        }
      },
      python: {
        postgresql: {
          packages: ['sqlalchemy', 'psycopg2-binary', 'alembic'],
          devPackages: [],
          commands: ['alembic init alembic']
        },
        mysql: {
          packages: ['sqlalchemy', 'pymysql', 'alembic'],
          devPackages: [],
          commands: ['alembic init alembic']
        },
        sqlite: {
          packages: ['sqlalchemy', 'alembic'],
          devPackages: [],
          commands: ['alembic init alembic']
        },
        mongodb: {
          packages: ['mongoengine', 'pymongo'],
          devPackages: [],
          commands: []
        }
      },
      go: {
        postgresql: {
          packages: ['gorm.io/gorm', 'gorm.io/driver/postgres'],
          devPackages: [],
          commands: ['go mod tidy']
        },
        mysql: {
          packages: ['gorm.io/gorm', 'gorm.io/driver/mysql'],
          devPackages: [],
          commands: ['go mod tidy']
        },
        sqlite: {
          packages: ['gorm.io/gorm', 'gorm.io/driver/sqlite'],
          devPackages: [],
          commands: ['go mod tidy']
        },
        mongodb: {
          packages: ['go.mongodb.org/mongo-driver/mongo'],
          devPackages: [],
          commands: ['go mod tidy']
        }
      }
    };
  }

  async install(language, database) {
    const config = this.installCommands[language]?.[database];
    if (!config) {
      throw new Error(`Unsupported combination: ${language} with ${database}`);
    }

    console.log(chalk.blue(`Installing ${language} ORM for ${database}...`));

    try {
      await this.installPackages(language, config);
      await this.runCommands(config.commands);
      await this.createORMFiles(language, database);
      
      console.log(chalk.green('ORM installation completed successfully!'));
    } catch (error) {
      throw new Error(`Installation failed: ${error.message}`);
    }
  }

  async installPackages(language, config) {
    const packageManager = await this.detectPackageManager(language);
    
    if (language === 'javascript' || language === 'typescript') {
      // Install regular packages
      if (config.packages.length > 0) {
        const installCmd = `${packageManager} ${packageManager === 'npm' ? 'install' : 'add'} ${config.packages.join(' ')}`;
        await execAsync(installCmd);
      }
      
      // Install dev packages
      if (config.devPackages.length > 0) {
        const devFlag = packageManager === 'npm' ? '--save-dev' : '--dev';
        const devCmd = `${packageManager} ${packageManager === 'npm' ? 'install' : 'add'} ${devFlag} ${config.devPackages.join(' ')}`;
        await execAsync(devCmd);
      }
    } else if (language === 'python') {
      // Install Python packages
      if (config.packages.length > 0) {
        const installCmd = `pip install ${config.packages.join(' ')}`;
        await execAsync(installCmd);
      }
    } else if (language === 'go') {
      // Install Go packages
      for (const pkg of config.packages) {
        const installCmd = `go get ${pkg}`;
        await execAsync(installCmd);
      }
    }
  }

  async detectPackageManager(language) {
    if (language !== 'javascript' && language !== 'typescript') {
      return null;
    }

    const managers = ['yarn', 'pnpm', 'npm'];
    
    for (const manager of managers) {
      try {
        await execAsync(`${manager} --version`);
        
        // Check for lock files
        const lockFiles = {
          yarn: 'yarn.lock',
          pnpm: 'pnpm-lock.yaml',
          npm: 'package-lock.json'
        };
        
        if (await fs.pathExists(lockFiles[manager])) {
          return manager;
        }
      } catch (error) {
        continue;
      }
    }
    
    return 'npm'; // Default fallback
  }

  async runCommands(commands) {
    for (const command of commands) {
      try {
        await execAsync(command);
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Command failed: ${command}`));
      }
    }
  }

  async createORMFiles(language, database) {
    const templates = {
      javascript: {
        'orm/index.js': this.generateJavaScriptORMFile(database),
        'orm/connection.js': this.generateJavaScriptConnectionFile(database)
      },
      typescript: {
        'orm/index.ts': this.generateTypeScriptORMFile(database),
        'orm/connection.ts': this.generateTypeScriptConnectionFile(database)
      },
      python: {
        'orm/__init__.py': this.generatePythonORMFile(database),
        'orm/connection.py': this.generatePythonConnectionFile(database)
      },
      go: {
        'orm/orm.go': this.generateGoORMFile(database),
        'orm/connection.go': this.generateGoConnectionFile(database)
      }
    };

    const files = templates[language];
    if (files) {
      await fs.ensureDir(path.join(process.cwd(), 'orm'));
      
      for (const [filepath, content] of Object.entries(files)) {
        await fs.outputFile(path.join(process.cwd(), filepath), content);
      }
    }
  }

  generateJavaScriptORMFile(database) {
    return `// UniORM JavaScript Implementation
const { PrismaClient } = require('@prisma/client');

class UniORM {
  constructor() {
    this.client = new PrismaClient();
  }

  async connect() {
    await this.client.$connect();
  }

  async disconnect() {
    await this.client.$disconnect();
  }

  async findMany(model, options = {}) {
    return await this.client[model].findMany(options);
  }

  async findOne(model, options = {}) {
    return await this.client[model].findFirst(options);
  }

  async create(model, data) {
    return await this.client[model].create({ data });
  }

  async update(model, where, data) {
    return await this.client[model].update({ where, data });
  }

  async delete(model, where) {
    return await this.client[model].delete({ where });
  }
}

module.exports = { UniORM };`;
  }

  generateJavaScriptConnectionFile(database) {
    return `// Database connection configuration
const { UniORM } = require('./index');

const orm = new UniORM();

module.exports = orm;`;
  }

  generateTypeScriptORMFile(database) {
    return `// UniORM TypeScript Implementation
import { PrismaClient } from '@prisma/client';

export class UniORM {
  private client: PrismaClient;

  constructor() {
    this.client = new PrismaClient();
  }

  async connect(): Promise<void> {
    await this.client.$connect();
  }

  async disconnect(): Promise<void> {
    await this.client.$disconnect();
  }

  async findMany(model: string, options: any = {}): Promise<any[]> {
    return await (this.client as any)[model].findMany(options);
  }

  async findOne(model: string, options: any = {}): Promise<any> {
    return await (this.client as any)[model].findFirst(options);
  }

  async create(model: string, data: any): Promise<any> {
    return await (this.client as any)[model].create({ data });
  }

  async update(model: string, where: any, data: any): Promise<any> {
    return await (this.client as any)[model].update({ where, data });
  }

  async delete(model: string, where: any): Promise<any> {
    return await (this.client as any)[model].delete({ where });
  }
}`;
  }

  generateTypeScriptConnectionFile(database) {
    return `// Database connection configuration
import { UniORM } from './index';

const orm = new UniORM();

export default orm;`;
  }

  generatePythonORMFile(database) {
    return `# UniORM Python Implementation
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

class UniORM:
    def __init__(self, database_url):
        self.engine = create_engine(database_url)
        self.metadata = MetaData()
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.Base = declarative_base()

    def connect(self):
        return self.engine.connect()

    def create_session(self):
        return self.SessionLocal()

    def find_many(self, model, **kwargs):
        session = self.create_session()
        try:
            return session.query(model).filter_by(**kwargs).all()
        finally:
            session.close()

    def find_one(self, model, **kwargs):
        session = self.create_session()
        try:
            return session.query(model).filter_by(**kwargs).first()
        finally:
            session.close()

    def create(self, model, **kwargs):
        session = self.create_session()
        try:
            instance = model(**kwargs)
            session.add(instance)
            session.commit()
            return instance
        finally:
            session.close()

    def update(self, model, filter_by, **kwargs):
        session = self.create_session()
        try:
            instance = session.query(model).filter_by(**filter_by).first()
            if instance:
                for key, value in kwargs.items():
                    setattr(instance, key, value)
                session.commit()
            return instance
        finally:
            session.close()

    def delete(self, model, **kwargs):
        session = self.create_session()
        try:
            instance = session.query(model).filter_by(**kwargs).first()
            if instance:
                session.delete(instance)
                session.commit()
            return instance
        finally:
            session.close()`;
  }

  generatePythonConnectionFile(database) {
    return `# Database connection configuration
from .orm import UniORM
import os

database_url = os.getenv('DATABASE_URL', 'sqlite:///./database.db')
orm = UniORM(database_url)`;
  }

  generateGoORMFile(database) {
    return `// UniORM Go Implementation
package orm

import (
    "gorm.io/gorm"
    "gorm.io/driver/postgres"
)

type UniORM struct {
    DB *gorm.DB
}

func NewUniORM(dsn string) (*UniORM, error) {
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        return nil, err
    }

    return &UniORM{
        DB: db,
    }, nil
}

func (orm *UniORM) FindMany(model interface{}, conditions ...interface{}) error {
    return orm.DB.Where(conditions[0], conditions[1:]...).Find(model).Error
}

func (orm *UniORM) FindOne(model interface{}, conditions ...interface{}) error {
    return orm.DB.Where(conditions[0], conditions[1:]...).First(model).Error
}

func (orm *UniORM) Create(model interface{}) error {
    return orm.DB.Create(model).Error
}

func (orm *UniORM) Update(model interface{}, conditions ...interface{}) error {
    return orm.DB.Where(conditions[0], conditions[1:]...).Updates(model).Error
}

func (orm *UniORM) Delete(model interface{}, conditions ...interface{}) error {
    return orm.DB.Where(conditions[0], conditions[1:]...).Delete(model).Error
}`;
  }

  generateGoConnectionFile(database) {
    return `// Database connection configuration
package orm

import (
    "os"
)

func GetDSN() string {
    return os.Getenv("DATABASE_URL")
}

func Connect() (*UniORM, error) {
    dsn := GetDSN()
    return NewUniORM(dsn)
}`;
  }
}

module.exports = { ORMInstaller };