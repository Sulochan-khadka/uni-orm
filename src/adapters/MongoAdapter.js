const { MongoClient } = require('mongodb');

function inferType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (value && value._bsontype === 'ObjectId') return 'ObjectId';
  return typeof value;
}

class MongoAdapter {
  constructor() {
    this.client = null;
    this.db = null;
    this.memory = null;
    this.validators = new Map();
  }

  async connect(url) {
    if (url === 'memory') {
      this.memory = new Map();
      this.client = { close: async () => {} };
      this.db = {
        listCollections: async () => ({ toArray: async () => Array.from(this.memory.keys()).map(name => ({ name })) }),
        collection: name => ({
          find: () => ({
            limit: () => ({ toArray: async () => this.memory.get(name) || [] })
          }),
          insertMany: async rows => {
            if (!this.memory.has(name)) this.memory.set(name, []);
            this.memory.get(name).push(...rows);
          }
        }),
        createCollection: async (name, options) => {
          if (!this.memory.has(name)) this.memory.set(name, []);
        }
      };
    } else {
      this.client = new MongoClient(url);
      await this.client.connect();
      const dbName = new URL(url).pathname.substring(1) || 'test';
      this.db = this.client.db(dbName);
    }
  }

  async exportSchema() {
    if (this.memory) {
      const tables = [];
      for (const [name, docs] of this.memory.entries()) {
        const fields = {};
        docs.slice(0, 100).forEach(doc => {
          for (const [k, v] of Object.entries(doc)) {
            if (!fields[k]) {
              fields[k] = { name: k, type: inferType(v), pk: k === '_id', nullable: v === null || v === undefined, default: undefined };
            } else if (v === null || v === undefined) {
              fields[k].nullable = true;
            }
          }
        });
        if (!fields['_id']) fields['_id'] = { name: '_id', type: 'ObjectId', pk: true, nullable: false, default: undefined };
        tables.push({ name, columns: Object.values(fields), indexes: [], fks: [] });
      }
      return { tables };
    } else {
      const cols = await this.db.listCollections().toArray();
      const tables = [];
      for (const c of cols) {
        const cursor = this.db.collection(c.name).find({}).limit(100);
        const docs = await cursor.toArray();
        const fields = {};
        for (const doc of docs) {
          for (const [k, v] of Object.entries(doc)) {
            if (!fields[k]) {
              fields[k] = { name: k, type: inferType(v), pk: k === '_id', nullable: v === null || v === undefined, default: undefined };
            } else if (v === null || v === undefined) {
              fields[k].nullable = true;
            }
          }
        }
        if (!fields['_id']) {
          fields['_id'] = { name: '_id', type: 'ObjectId', pk: true, nullable: false, default: undefined };
        }
        tables.push({ name: c.name, columns: Object.values(fields), indexes: [], fks: [] });
      }
      return { tables };
    }
  }

  async importSchema(ir) {
    for (const t of ir.tables) {
      const options = {};
      if (t.validator) options.validator = t.validator;
      if (this.memory) {
        this.memory.set(t.name, []);
        if (t.validator) this.validators.set(t.name, t.validator);
      } else {
        await this.db.createCollection(t.name, options);
      }
    }
  }

  async *exportData(table) {
    if (this.memory) {
      const data = this.memory.get(table) || [];
      if (data.length) yield data;
    } else {
      const cursor = this.db.collection(table).find({});
      let batch = [];
      while (await cursor.hasNext()) {
        batch.push(await cursor.next());
        if (batch.length >= 100) {
          yield batch;
          batch = [];
        }
      }
      if (batch.length) yield batch;
    }
  }

  async importData(table, rows) {
    if (!rows || rows.length === 0) return;
    if (this.memory) {
      if (!this.memory.has(table)) this.memory.set(table, []);
      const validator = this.validators.get(table);
      for (const row of rows) {
        if (validator && validator.$jsonSchema && Array.isArray(validator.$jsonSchema.required)) {
          for (const req of validator.$jsonSchema.required) {
            if (row[req] === undefined) {
              throw new Error(`Missing required field ${req}`);
            }
          }
        }
        this.memory.get(table).push(row);
      }
    } else {
      await this.db.collection(table).insertMany(rows);
    }
  }

  generateDDL() {
    throw new Error('DDL generation not supported for MongoDB');
  }
}

module.exports = { MongoAdapter };
