# UniORM - Universal ORM for All Programming Languages

UniORM is a revolutionary universal ORM that works across all programming languages and databases. It provides a unified interface for database operations, intelligent language detection, seamless database migrations, and a beautiful web dashboard for visual schema management.

## Features

### Core Features

- **Universal Language Support**: Works with JavaScript, TypeScript, Python, Go, Java, C#, PHP, and Ruby
- **Multi-Database Support**: PostgreSQL, MySQL, SQLite, MongoDB, Redis, CouchDB, and Cassandra
- **Intelligent Detection**: Automatically detects your programming language and database
- **Cross-Platform CLI**: Works on Windows, macOS, and Linux
- **Visual Schema Designer**: Web-based dashboard for no-code database design
- **Smart Migrations**: Handles both same-type and cross-type database migrations
- **ORM Abstraction**: Unified API that works with language-specific ORMs

### Advanced Features

- **Auto-Installation**: Automatically installs the appropriate ORM for your language/database combination
- **Schema Generation**: Generate models and configurations from existing databases
- **Migration Management**: Version-controlled database migrations with rollback support
- **Visual Migration**: No-code interface for complex database transformations
- **Real-time Sync**: Keep your database schema in sync with your models

## Installation Guide

Install UniORM globally using npm:

```bash
npm install -g uni-orm
```

## Quick Start

1. **Initialize UniORM in your project:**

```bash
uni-orm init
```

2. **Let UniORM detect your setup or choose manually:**

   - Language detection (JavaScript, Python, Go, etc.)
   - Database detection (PostgreSQL, MySQL, MongoDB, etc.)
   - Automatic ORM installation (Prisma, SQLAlchemy, GORM, etc.)

3. **Launch the visual dashboard:**

```bash
uni-orm dashboard
```

4. **Generate models and migrations:**

```bash
uni-orm generate
```

## Commands

### Initialization

```bash
# Initialize with auto-detection
uni-orm init

# Initialize with specific language and database
uni-orm init --language python --database postgresql
```

### Detection

```bash
# Detect current project setup
uni-orm detect
```

### Migrations

```bash
# Same-type migration (MySQL to PostgreSQL)
uni-orm migrate --from mysql --to postgresql

# Cross-type migration (SQL to NoSQL)
uni-orm migrate --from postgresql --to mongodb

# Data-only migration
uni-orm migrate --from mysql --to postgresql --type data
```

### Dashboard

```bash
# Launch dashboard on default port (3000)
uni-orm dashboard

# Launch on custom port
uni-orm dashboard --port 8080
```

### Schema Management

```bash
# Generate models and configurations
uni-orm generate

# Sync database with models
uni-orm sync

# Force sync (destructive)
uni-orm sync --force
```

## Language Support

UniORM supports the following programming languages with their respective ORMs:

| Language   | Supported ORMs                      |
| ---------- | ----------------------------------- |
| JavaScript | Prisma, Sequelize, Mongoose         |
| TypeScript | TypeORM, Prisma, Typegoose          |
| Python     | SQLAlchemy, Django ORM, MongoEngine |
| Go         | GORM, Ent, Mongo Driver             |
| Java       | Hibernate, JPA, Spring Data         |
| C#         | Entity Framework, Dapper            |
| PHP        | Eloquent, Doctrine, Propel          |
| Ruby       | ActiveRecord, Sequel, Mongoid       |

## Database Support

### SQL Databases

- **PostgreSQL**: Full support with advanced features
- **MySQL**: Complete compatibility with all versions
- **SQLite**: Perfect for development and small applications

### NoSQL Databases

- **MongoDB**: Document-based operations with aggregation
- **Redis**: Key-value store with advanced data structures
- **CouchDB**: Document database with HTTP API
- **Cassandra**: Wide-column store for big data

## Migration Types

### Same-Type Migrations

Migrations between similar database types (SQL to SQL, NoSQL to NoSQL) are handled automatically:

```bash
# SQL to SQL migration
uni-orm migrate --from mysql --to postgresql

# NoSQL to NoSQL migration
uni-orm migrate --from mongodb --to couchdb
```

### Cross-Type Migrations

For migrations between different database types (SQL to NoSQL or vice versa), UniORM provides a visual dashboard:

```bash
# This will launch the dashboard for visual migration
uni-orm migrate --from postgresql --to mongodb
```

The dashboard provides:

- Visual schema mapping
- No-code table creation
- Relationship designer
- Data transformation tools
- Migration preview and validation

## Configuration

UniORM automatically generates configuration files for your language:

### JavaScript/Node.js

```javascript
// uni-orm.config.js
module.exports = {
  language: 'javascript',
  database: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'myapp',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },
  orm: {
    type: 'prisma',
    models: './models',
    migrations: './migrations',
  },
};
```

### Python

```python
# uni-orm.config.py
config = {
    'language': 'python',
    'database': 'postgresql',
    'connection': {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', '5432')),
        'database': os.getenv('DB_NAME', 'myapp'),
        'username': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', ''),
    },
    'orm': {
        'type': 'sqlalchemy',
        'models': './models',
        'migrations': './migrations',
    }
}
```

## Dashboard Features

The UniORM dashboard provides a comprehensive visual interface for database management:

### Schema Designer

- **Visual Table Builder**: Create tables with drag-and-drop interface
- **Relationship Designer**: Define foreign keys and relationships visually
- **Column Editor**: Configure data types, constraints, and indexes
- **Schema Validation**: Real-time validation of your database design

### Migration Tools

- **Visual Migration**: Transform data between different database types
- **Migration History**: Track all database changes with version control
- **Rollback Support**: Safely revert problematic migrations
- **Preview Mode**: See migration effects before applying

### Data Management

- **Data Browser**: View and edit database records
- **Import/Export**: Bulk data operations with CSV/JSON support
- **Seed Management**: Create and manage database seeders
- **Backup Tools**: Export database schemas and data

## Project Structure

UniORM creates a clean, organized project structure:

```
your-project/
├── models/                 # Database models
│   ├── User.js
│   └── Post.js
├── migrations/            # Database migrations
│   ├── 001-create-users.sql
│   └── 002-create-posts.sql
├── seeders/              # Database seeders
│   └── users.js
├── schemas/              # Schema definitions
│   └── schema.yaml
├── orm/                  # ORM configuration
│   ├── index.js
│   └── connection.js
├── uni-orm.config.js     # UniORM configuration
└── uni-orm.schema.yaml   # Schema definition
```

## Examples

### Creating a User Model (JavaScript)

```javascript
// models/User.js
const { Model } = require('uni-orm');

class User extends Model {
  static tableName = 'users';

  static schema = {
    id: { type: 'integer', primary: true, autoIncrement: true },
    name: { type: 'string', required: true },
    email: { type: 'string', unique: true, required: true },
    createdAt: { type: 'timestamp', default: 'now' },
  };
}

module.exports = User;
```

### Creating a User Model (Python)

```python
# models/user.py
from uni_orm import Model, Column, Integer, String, DateTime

class User(Model):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### Database Operations

```javascript
// Using the universal API
const { UniORM } = require('uni-orm');
const orm = new UniORM();

// Create a user
const user = await orm.create('users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// Find users
const users = await orm.findMany('users', {
  where: { active: true },
});

// Update user
await orm.update(
  'users',
  { id: 1 },
  {
    name: 'Jane Doe',
  }
);
```

## Contributing

We welcome contributions to UniORM! Please read our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

### Development Setup

1. Clone the repository:

```bash
git clone https://github.com/uniorm/uniorm.git
cd uniorm
```

2. Install dependencies:

```bash
npm install
```

3. Run tests:

```bash
npm test
```

4. Start development server:

```bash
npm run dev
```

## License

UniORM is released under the MIT License. See [LICENSE](LICENSE) for details.

## Support

- 📚 [Documentation](https://docs.uniorm.dev)
- 💬 [Discord Community](https://discord.gg/uniorm)
- 🐛 [Issue Tracker](https://github.com/uniorm/uniorm/issues)
- 📧 [Email Support](mailto:support@uniorm.dev)

## Roadmap

- [ ] **GUI Desktop App**: Electron-based desktop application
- [ ] **Cloud Sync**: Sync schemas across team members
- [ ] **Advanced Analytics**: Database performance insights
- [ ] **Multi-tenant Support**: Database per tenant management
- [ ] **GraphQL Integration**: Auto-generate GraphQL APIs
- [ ] **Real-time Collaboration**: Live schema editing with team members
- [ ] **Advanced Migrations**: AI-powered migration suggestions
- [ ] **Database Optimization**: Automatic query optimization recommendations

---

**UniORM** - _One ORM to rule them all_ 🚀
