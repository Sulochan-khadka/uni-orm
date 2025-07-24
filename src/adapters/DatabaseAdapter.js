const fs = require('fs-extra');
const path = require('path');

class DatabaseAdapter {
  constructor(databaseType) {
    this.databaseType = databaseType;
    this.connection = null;
  }

  async connect() {
    // Database-specific connection logic
    switch (this.databaseType) {
      case 'postgresql':
        return await this.connectPostgreSQL();
      case 'mysql':
        return await this.connectMySQL();
      case 'sqlite':
        return await this.connectSQLite();
      case 'mongodb':
        return await this.connectMongoDB();
      case 'redis':
        return await this.connectRedis();
      default:
        throw new Error(`Unsupported database type: ${this.databaseType}`);
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.close();
    }
  }

  async exportSchema() {
    switch (this.databaseType) {
      case 'postgresql':
        return await this.exportPostgreSQLSchema();
      case 'mysql':
        return await this.exportMySQLSchema();
      case 'sqlite':
        return await this.exportSQLiteSchema();
      case 'mongodb':
        return await this.exportMongoDBSchema();
      case 'redis':
        return await this.exportRedisSchema();
      default:
        throw new Error(`Schema export not supported for: ${this.databaseType}`);
    }
  }

  async importSchema(schema) {
    switch (this.databaseType) {
      case 'postgresql':
        return await this.importPostgreSQLSchema(schema);
      case 'mysql':
        return await this.importMySQLSchema(schema);
      case 'sqlite':
        return await this.importSQLiteSchema(schema);
      case 'mongodb':
        return await this.importMongoDBSchema(schema);
      case 'redis':
        return await this.importRedisSchema(schema);
      default:
        throw new Error(`Schema import not supported for: ${this.databaseType}`);
    }
  }

  async exportData() {
    switch (this.databaseType) {
      case 'postgresql':
        return await this.exportPostgreSQLData();
      case 'mysql':
        return await this.exportMySQLData();
      case 'sqlite':
        return await this.exportSQLiteData();
      case 'mongodb':
        return await this.exportMongoDBData();
      case 'redis':
        return await this.exportRedisData();
      default:
        throw new Error(`Data export not supported for: ${this.databaseType}`);
    }
  }

  async importData(data) {
    switch (this.databaseType) {
      case 'postgresql':
        return await this.importPostgreSQLData(data);
      case 'mysql':
        return await this.importMySQLData(data);
      case 'sqlite':
        return await this.importSQLiteData(data);
      case 'mongodb':
        return await this.importMongoDBData(data);
      case 'redis':
        return await this.importRedisData(data);
      default:
        throw new Error(`Data import not supported for: ${this.databaseType}`);
    }
  }

  // PostgreSQL methods
  async connectPostgreSQL() {
    const { Client } = require('pg');
    this.connection = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    });
    await this.connection.connect();
  }

  async exportPostgreSQLSchema() {
    const query = `
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name, c.ordinal_position
    `;
    
    const result = await this.connection.query(query);
    return this.formatSchemaData(result.rows);
  }

  async importPostgreSQLSchema(schema) {
    for (const table of schema.tables) {
      const createTableSQL = this.generateCreateTableSQL(table, 'postgresql');
      await this.connection.query(createTableSQL);
    }
  }

  async exportPostgreSQLData() {
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const tablesResult = await this.connection.query(tablesQuery);
    const data = {};
    
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      const dataQuery = `SELECT * FROM ${tableName}`;
      const dataResult = await this.connection.query(dataQuery);
      data[tableName] = dataResult.rows;
    }
    
    return data;
  }

  async importPostgreSQLData(data) {
    for (const [tableName, rows] of Object.entries(data)) {
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const insertSQL = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
        
        for (const row of rows) {
          const values = columns.map(col => row[col]);
          await this.connection.query(insertSQL, values);
        }
      }
    }
  }

  // MySQL methods
  async connectMySQL() {
    const mysql = require('mysql2/promise');
    this.connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'mysql',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
  }

  async exportMySQLSchema() {
    const [rows] = await this.connection.execute(`
      SELECT 
        t.TABLE_NAME as table_name,
        c.COLUMN_NAME as column_name,
        c.DATA_TYPE as data_type,
        c.IS_NULLABLE as is_nullable,
        c.COLUMN_DEFAULT as column_default,
        c.CHARACTER_MAXIMUM_LENGTH as character_maximum_length
      FROM information_schema.TABLES t
      JOIN information_schema.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
      WHERE t.TABLE_SCHEMA = DATABASE()
      ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
    `);
    
    return this.formatSchemaData(rows);
  }

  async importMySQLSchema(schema) {
    for (const table of schema.tables) {
      const createTableSQL = this.generateCreateTableSQL(table, 'mysql');
      await this.connection.execute(createTableSQL);
    }
  }

  async exportMySQLData() {
    const [tables] = await this.connection.execute(`
      SELECT TABLE_NAME as table_name
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `);
    
    const data = {};
    
    for (const table of tables) {
      const tableName = table.table_name;
      const [rows] = await this.connection.execute(`SELECT * FROM ${tableName}`);
      data[tableName] = rows;
    }
    
    return data;
  }

  async importMySQLData(data) {
    for (const [tableName, rows] of Object.entries(data)) {
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const insertSQL = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
        
        for (const row of rows) {
          const values = columns.map(col => row[col]);
          await this.connection.execute(insertSQL, values);
        }
      }
    }
  }

  // SQLite methods
  async connectSQLite() {
    const sqlite3 = require('sqlite3').verbose();
    return new Promise((resolve, reject) => {
      this.connection = new sqlite3.Database(process.env.DB_FILE || './database.sqlite', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async exportSQLiteSchema() {
    return new Promise((resolve, reject) => {
      this.connection.all(`
        SELECT 
          m.name as table_name,
          p.name as column_name,
          p.type as data_type,
          p.pk as primary_key,
          p.dflt_value as column_default
        FROM sqlite_master m
        JOIN pragma_table_info(m.name) p
        WHERE m.type = 'table'
        ORDER BY m.name, p.cid
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(this.formatSchemaData(rows));
      });
    });
  }

  async importSQLiteSchema(schema) {
    for (const table of schema.tables) {
      const createTableSQL = this.generateCreateTableSQL(table, 'sqlite');
      await new Promise((resolve, reject) => {
        this.connection.run(createTableSQL, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  async exportSQLiteData() {
    const tables = await new Promise((resolve, reject) => {
      this.connection.all(`
        SELECT name as table_name 
        FROM sqlite_master 
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const data = {};
    
    for (const table of tables) {
      const tableName = table.table_name;
      const rows = await new Promise((resolve, reject) => {
        this.connection.all(`SELECT * FROM ${tableName}`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      data[tableName] = rows;
    }
    
    return data;
  }

  async importSQLiteData(data) {
    for (const [tableName, rows] of Object.entries(data)) {
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const insertSQL = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
        
        for (const row of rows) {
          const values = columns.map(col => row[col]);
          await new Promise((resolve, reject) => {
            this.connection.run(insertSQL, values, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      }
    }
  }

  // MongoDB methods
  async connectMongoDB() {
    const { MongoClient } = require('mongodb');
    const url = process.env.MONGODB_URL || 'mongodb://localhost:27017';
    const client = new MongoClient(url);
    await client.connect();
    this.connection = client.db(process.env.DB_NAME || 'test');
  }

  async exportMongoDBSchema() {
    const collections = await this.connection.listCollections().toArray();
    const schema = { tables: [] };
    
    for (const collection of collections) {
      const sample = await this.connection.collection(collection.name).findOne();
      if (sample) {
        const columns = Object.keys(sample).map(key => ({
          name: key,
          type: typeof sample[key],
          nullable: true
        }));
        
        schema.tables.push({
          name: collection.name,
          columns
        });
      }
    }
    
    return schema;
  }

  async importMongoDBSchema(schema) {
    // MongoDB is schema-less, so we just ensure collections exist
    for (const table of schema.tables) {
      await this.connection.createCollection(table.name);
    }
  }

  async exportMongoDBData() {
    const collections = await this.connection.listCollections().toArray();
    const data = {};
    
    for (const collection of collections) {
      const documents = await this.connection.collection(collection.name).find().toArray();
      data[collection.name] = documents;
    }
    
    return data;
  }

  async importMongoDBData(data) {
    for (const [collectionName, documents] of Object.entries(data)) {
      if (documents.length > 0) {
        await this.connection.collection(collectionName).insertMany(documents);
      }
    }
  }

  // Redis methods
  async connectRedis() {
    const redis = require('redis');
    this.connection = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });
    await this.connection.connect();
  }

  async exportRedisSchema() {
    // Redis doesn't have a traditional schema
    return {
      type: 'key-value',
      description: 'Redis key-value store'
    };
  }

  async importRedisSchema(schema) {
    // No schema to import for Redis
    return;
  }

  async exportRedisData() {
    const keys = await this.connection.keys('*');
    const data = {};
    
    for (const key of keys) {
      const type = await this.connection.type(key);
      let value;
      
      switch (type) {
        case 'string':
          value = await this.connection.get(key);
          break;
        case 'hash':
          value = await this.connection.hgetall(key);
          break;
        case 'list':
          value = await this.connection.lrange(key, 0, -1);
          break;
        case 'set':
          value = await this.connection.smembers(key);
          break;
        case 'zset':
          value = await this.connection.zrange(key, 0, -1, 'WITHSCORES');
          break;
        default:
          value = null;
      }
      
      data[key] = { type, value };
    }
    
    return data;
  }

  async importRedisData(data) {
    for (const [key, { type, value }] of Object.entries(data)) {
      switch (type) {
        case 'string':
          await this.connection.set(key, value);
          break;
        case 'hash':
          await this.connection.hset(key, value);
          break;
        case 'list':
          await this.connection.lpush(key, ...value);
          break;
        case 'set':
          await this.connection.sadd(key, ...value);
          break;
        case 'zset':
          const pairs = [];
          for (let i = 0; i < value.length; i += 2) {
            pairs.push(value[i + 1], value[i]);
          }
          await this.connection.zadd(key, ...pairs);
          break;
      }
    }
  }

  // Utility methods
  formatSchemaData(rows) {
    const tables = {};
    
    for (const row of rows) {
      const tableName = row.table_name;
      if (!tables[tableName]) {
        tables[tableName] = {
          name: tableName,
          columns: []
        };
      }
      
      tables[tableName].columns.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default,
        maxLength: row.character_maximum_length
      });
    }
    
    return {
      tables: Object.values(tables)
    };
  }

  generateCreateTableSQL(table, databaseType) {
    const columns = table.columns.map(col => {
      let sql = `${col.name} ${this.mapDataType(col.type, databaseType)}`;
      
      if (col.maxLength) {
        sql += `(${col.maxLength})`;
      }
      
      if (!col.nullable) {
        sql += ' NOT NULL';
      }
      
      if (col.default) {
        sql += ` DEFAULT ${col.default}`;
      }
      
      return sql;
    }).join(',\n  ');
    
    return `CREATE TABLE IF NOT EXISTS ${table.name} (\n  ${columns}\n)`;
  }

  mapDataType(type, targetDatabase) {
    const typeMap = {
      postgresql: {
        'varchar': 'VARCHAR',
        'text': 'TEXT',
        'integer': 'INTEGER',
        'bigint': 'BIGINT',
        'decimal': 'DECIMAL',
        'boolean': 'BOOLEAN',
        'timestamp': 'TIMESTAMP',
        'date': 'DATE'
      },
      mysql: {
        'varchar': 'VARCHAR',
        'text': 'TEXT',
        'integer': 'INT',
        'bigint': 'BIGINT',
        'decimal': 'DECIMAL',
        'boolean': 'BOOLEAN',
        'timestamp': 'TIMESTAMP',
        'date': 'DATE'
      },
      sqlite: {
        'varchar': 'TEXT',
        'text': 'TEXT',
        'integer': 'INTEGER',
        'bigint': 'INTEGER',
        'decimal': 'REAL',
        'boolean': 'INTEGER',
        'timestamp': 'TEXT',
        'date': 'TEXT'
      }
    };
    
    return typeMap[targetDatabase]?.[type.toLowerCase()] || 'TEXT';
  }
}

module.exports = { DatabaseAdapter };