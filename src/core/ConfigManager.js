const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');

class ConfigManager {
  constructor() {
    this.configPath = path.join(process.cwd(), 'uni-orm.config.js');
    this.schemaPath = path.join(process.cwd(), 'uni-orm.schema.yaml');
  }

  async generate(language, database) {
    const config = this.generateConfig(language, database);
    const schema = this.generateSchema(database);
    
    await fs.outputFile(this.configPath, config);
    await fs.outputFile(this.schemaPath, schema);
  }

  generateConfig(language, database) {
    const templates = {
      javascript: this.generateJavaScriptConfig(database),
      typescript: this.generateTypeScriptConfig(database),
      python: this.generatePythonConfig(database),
      go: this.generateGoConfig(database)
    };

    return templates[language] || templates.javascript;
  }

  generateJavaScriptConfig(database) {
    return `// UniORM Configuration
module.exports = {
  language: 'javascript',
  database: '${database}',
  
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || ${this.getDefaultPort(database)},
    database: process.env.DB_NAME || 'myapp',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ${database === 'sqlite' ? 'filename: process.env.DB_FILE || \'./database.sqlite\',' : ''}
  },
  
  orm: {
    type: '${this.getORMType(database, 'javascript')}',
    models: './models',
    migrations: './migrations',
    seeders: './seeders'
  },
  
  features: {
    autoMigrations: true,
    logging: process.env.NODE_ENV !== 'production',
    cache: ${database === 'redis' ? 'true' : 'false'},
    transactions: ${this.supportsTransactions(database)}
  }
};`;
  }

  generateTypeScriptConfig(database) {
    return `// UniORM Configuration
import { Config } from 'uni-orm';

const config: Config = {
  language: 'typescript',
  database: '${database}',
  
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '${this.getDefaultPort(database)}'),
    database: process.env.DB_NAME || 'myapp',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ${database === 'sqlite' ? 'filename: process.env.DB_FILE || \'./database.sqlite\',' : ''}
  },
  
  orm: {
    type: '${this.getORMType(database, 'typescript')}',
    models: './models',
    migrations: './migrations',
    seeders: './seeders'
  },
  
  features: {
    autoMigrations: true,
    logging: process.env.NODE_ENV !== 'production',
    cache: ${database === 'redis' ? 'true' : 'false'},
    transactions: ${this.supportsTransactions(database)}
  }
};

export default config;`;
  }

  generatePythonConfig(database) {
    return `# UniORM Configuration
import os

config = {
    'language': 'python',
    'database': '${database}',
    
    'connection': {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', '${this.getDefaultPort(database)}')),
        'database': os.getenv('DB_NAME', 'myapp'),
        'username': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', ''),
        ${database === 'sqlite' ? "'filename': os.getenv('DB_FILE', './database.sqlite')," : ''}
    },
    
    'orm': {
        'type': '${this.getORMType(database, 'python')}',
        'models': './models',
        'migrations': './migrations',
        'seeders': './seeders'
    },
    
    'features': {
        'auto_migrations': True,
        'logging': os.getenv('ENVIRONMENT') != 'production',
        'cache': ${database === 'redis' ? 'True' : 'False'},
        'transactions': ${this.supportsTransactions(database) ? 'True' : 'False'}
    }
}`;
  }

  generateGoConfig(database) {
    return `// UniORM Configuration
package main

import (
    "os"
    "strconv"
)

type Config struct {
    Language   string     \`json:"language"\`
    Database   string     \`json:"database"\`
    Connection Connection \`json:"connection"\`
    ORM        ORM        \`json:"orm"\`
    Features   Features   \`json:"features"\`
}

type Connection struct {
    Host     string \`json:"host"\`
    Port     int    \`json:"port"\`
    Database string \`json:"database"\`
    Username string \`json:"username"\`
    Password string \`json:"password"\`
    ${database === 'sqlite' ? 'Filename string `json:"filename"`' : ''}
}

type ORM struct {
    Type       string \`json:"type"\`
    Models     string \`json:"models"\`
    Migrations string \`json:"migrations"\`
    Seeders    string \`json:"seeders"\`
}

type Features struct {
    AutoMigrations bool \`json:"auto_migrations"\`
    Logging        bool \`json:"logging"\`
    Cache          bool \`json:"cache"\`
    Transactions   bool \`json:"transactions"\`
}

func GetConfig() Config {
    port, _ := strconv.Atoi(getEnv("DB_PORT", "${this.getDefaultPort(database)}"))
    
    return Config{
        Language: "go",
        Database: "${database}",
        Connection: Connection{
            Host:     getEnv("DB_HOST", "localhost"),
            Port:     port,
            Database: getEnv("DB_NAME", "myapp"),
            Username: getEnv("DB_USER", "root"),
            Password: getEnv("DB_PASSWORD", ""),
            ${database === 'sqlite' ? 'Filename: getEnv("DB_FILE", "./database.sqlite"),' : ''}
        },
        ORM: ORM{
            Type:       "${this.getORMType(database, 'go')}",
            Models:     "./models",
            Migrations: "./migrations",
            Seeders:    "./seeders",
        },
        Features: Features{
            AutoMigrations: true,
            Logging:        getEnv("ENVIRONMENT", "development") != "production",
            Cache:          ${database === 'redis' ? 'true' : 'false'},
            Transactions:   ${this.supportsTransactions(database)},
        },
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}`;
  }

  generateSchema(database) {
    const schema = {
      version: '1.0.0',
      database: database,
      tables: [
        {
          name: 'users',
          columns: [
            {
              name: 'id',
              type: 'integer',
              primary: true,
              autoIncrement: true
            },
            {
              name: 'name',
              type: 'string',
              length: 255,
              nullable: false
            },
            {
              name: 'email',
              type: 'string',
              length: 255,
              unique: true,
              nullable: false
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP'
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP'
            }
          ],
          indexes: [
            {
              name: 'idx_users_email',
              columns: ['email'],
              unique: true
            }
          ]
        }
      ]
    };

    return yaml.stringify(schema);
  }

  getDefaultPort(database) {
    const ports = {
      postgresql: 5432,
      mysql: 3306,
      mongodb: 27017,
      redis: 6379,
      sqlite: 0,
      couchdb: 5984,
      cassandra: 9042
    };
    return ports[database] || 5432;
  }

  getORMType(database, language) {
    const ormMap = {
      javascript: {
        postgresql: 'prisma',
        mysql: 'prisma',
        sqlite: 'prisma',
        mongodb: 'mongoose'
      },
      typescript: {
        postgresql: 'typeorm',
        mysql: 'typeorm',
        sqlite: 'typeorm',
        mongodb: 'typegoose'
      },
      python: {
        postgresql: 'sqlalchemy',
        mysql: 'sqlalchemy',
        sqlite: 'sqlalchemy',
        mongodb: 'mongoengine'
      },
      go: {
        postgresql: 'gorm',
        mysql: 'gorm',
        sqlite: 'gorm',
        mongodb: 'mongo-go-driver'
      }
    };

    return ormMap[language]?.[database] || 'generic';
  }

  supportsTransactions(database) {
    const transactionSupport = {
      postgresql: true,
      mysql: true,
      sqlite: true,
      mongodb: false,
      redis: false,
      couchdb: false,
      cassandra: false
    };
    return transactionSupport[database] || false;
  }

  async load() {
    try {
      if (await fs.pathExists(this.configPath)) {
        delete require.cache[require.resolve(this.configPath)];
        return require(this.configPath);
      }
      throw new Error('Configuration file not found');
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  async loadSchema() {
    try {
      if (await fs.pathExists(this.schemaPath)) {
        const content = await fs.readFile(this.schemaPath, 'utf8');
        return yaml.parse(content);
      }
      throw new Error('Schema file not found');
    } catch (error) {
      throw new Error(`Failed to load schema: ${error.message}`);
    }
  }
}

module.exports = { ConfigManager };