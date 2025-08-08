const fs = require('fs');
const initSqlJs = require('sql.js');

class SQLAdapter {
  constructor() {
    this.db = null;
    this.SQL = null;
  }

  async connect(url = ':memory:') {
    this.SQL = await initSqlJs();
    if (url === ':memory:') {
      this.db = new this.SQL.Database();
    } else if (fs.existsSync(url)) {
      const filebuffer = fs.readFileSync(url);
      this.db = new this.SQL.Database(filebuffer);
    } else {
      this.db = new this.SQL.Database();
    }
  }

  async exportSchema() {
    const res = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const tables = res[0] ? res[0].values.map(v => v[0]) : [];
    const result = [];
    for (const name of tables) {
      const info = this.db.exec(`PRAGMA table_info(${name})`)[0];
      const columns = info.values.map(row => ({
        name: row[1],
        type: row[2],
        pk: row[5] === 1,
        nullable: row[3] === 0,
        default: row[4] === null ? null : row[4]
      }));
      result.push({ name, columns, indexes: [], fks: [] });
    }
    return { tables: result };
  }

  async importSchema(ir) {
    const ddl = this.generateDDL(ir);
    this.db.run(ddl);
  }

  async *exportData(table) {
    const stmt = this.db.prepare(`SELECT * FROM ${table}`);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    if (rows.length) yield rows;
  }

  async importData(table, rows) {
    if (!rows || rows.length === 0) return;
    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => '?').join(',');
    const stmt = this.db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`);
    this.db.run('BEGIN TRANSACTION');
    for (const row of rows) {
      stmt.run(cols.map(c => row[c]));
    }
    stmt.free();
    this.db.run('COMMIT');
  }

  generateDDL(ir) {
    return ir.tables
      .map(t => {
        const cols = t.columns.map(c => {
          let def = `${c.name} ${c.type}`;
          if (c.pk) def += ' PRIMARY KEY';
          if (!c.nullable) def += ' NOT NULL';
          if (c.default !== null && c.default !== undefined) def += ` DEFAULT ${c.default}`;
          return def;
        });
        return `CREATE TABLE ${t.name} (${cols.join(', ')});`;
      })
      .join('\n');
  }
}

module.exports = { SQLAdapter };
