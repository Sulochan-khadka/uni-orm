const fs = require('fs-extra');
const path = require('path');

class LanguageDetector {
  constructor() {
    this.languagePatterns = {
      javascript: [
        'package.json',
        'node_modules',
        '*.js',
        '*.mjs'
      ],
      typescript: [
        'tsconfig.json',
        '*.ts',
        '*.tsx'
      ],
      python: [
        'requirements.txt',
        'setup.py',
        'pyproject.toml',
        '*.py',
        '__pycache__'
      ],
      go: [
        'go.mod',
        'go.sum',
        '*.go'
      ],
      java: [
        'pom.xml',
        'build.gradle',
        'src/main/java',
        '*.java',
        '*.jar'
      ],
      csharp: [
        '*.csproj',
        '*.sln',
        '*.cs'
      ],
      php: [
        'composer.json',
        '*.php'
      ],
      ruby: [
        'Gemfile',
        '*.rb',
        'Rakefile'
      ]
    };

    this.databasePatterns = {
      postgresql: [
        'DATABASE_URL=postgres',
        'pg_dump',
        'psql'
      ],
      mysql: [
        'DATABASE_URL=mysql',
        'mysqldump',
        'mysql'
      ],
      sqlite: [
        '*.sqlite',
        '*.sqlite3',
        '*.db'
      ],
      mongodb: [
        'mongod',
        'mongo',
        'DATABASE_URL=mongodb'
      ],
      redis: [
        'redis-server',
        'redis-cli',
        'DATABASE_URL=redis'
      ]
    };
  }

  async detectLanguage() {
    const detectedLanguages = [];
    const projectRoot = process.cwd();

    for (const [language, patterns] of Object.entries(this.languagePatterns)) {
      for (const pattern of patterns) {
        if (await this.checkPattern(projectRoot, pattern)) {
          detectedLanguages.push(language);
          break;
        }
      }
    }

    return detectedLanguages;
  }

  async detectDatabase() {
    const detectedDatabases = [];
    const projectRoot = process.cwd();

    // Check environment files
    const envFiles = ['.env', '.env.local', '.env.development'];
    for (const envFile of envFiles) {
      const envPath = path.join(projectRoot, envFile);
      if (await fs.pathExists(envPath)) {
        const content = await fs.readFile(envPath, 'utf8');
        for (const [database, patterns] of Object.entries(this.databasePatterns)) {
          for (const pattern of patterns) {
            if (content.includes(pattern)) {
              detectedDatabases.push(database);
              break;
            }
          }
        }
      }
    }

    // Check for database files
    for (const [database, patterns] of Object.entries(this.databasePatterns)) {
      for (const pattern of patterns) {
        if (await this.checkPattern(projectRoot, pattern)) {
          detectedDatabases.push(database);
          break;
        }
      }
    }

    return [...new Set(detectedDatabases)];
  }

  async checkPattern(projectRoot, pattern) {
    if (pattern.startsWith('*')) {
      // Glob pattern
      const files = await fs.readdir(projectRoot);
      const extension = pattern.slice(1);
      return files.some(file => file.endsWith(extension));
    } else {
      // Direct file/directory check
      return await fs.pathExists(path.join(projectRoot, pattern));
    }
  }

  async detectAll() {
    const languages = await this.detectLanguage();
    const databases = await this.detectDatabase();
    
    return {
      languages,
      databases,
      recommendation: this.getRecommendation(languages, databases)
    };
  }

  getRecommendation(languages, databases) {
    const recommendations = [];
    
    if (languages.includes('javascript') || languages.includes('typescript')) {
      recommendations.push('Consider using Prisma or TypeORM');
    }
    
    if (languages.includes('python')) {
      recommendations.push('Consider using SQLAlchemy or Django ORM');
    }
    
    if (languages.includes('go')) {
      recommendations.push('Consider using GORM or Ent');
    }
    
    if (databases.includes('postgresql')) {
      recommendations.push('PostgreSQL detected - excellent choice for complex queries');
    }
    
    if (databases.includes('mongodb')) {
      recommendations.push('MongoDB detected - great for document-based data');
    }
    
    return recommendations;
  }
}

module.exports = { LanguageDetector };