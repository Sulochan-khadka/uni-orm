const fs = require('fs-extra');
const path = require('path');
const YAML = require('yaml');

/**
 * Load the current schema representation from the pseudo database.
 * The schema is stored in `.uni-orm/db.schema.yaml` relative to the
 * project root (process.cwd()).
 */
async function pull({ provider, url }) {
  const configDir = path.join(process.cwd(), '.uni-orm');
  const schemaPath = path.join(configDir, 'db.schema.yaml');

  let ir = {};
  if (await fs.pathExists(schemaPath)) {
    const text = await fs.readFile(schemaPath, 'utf8');
    ir = YAML.parse(text) || {};
  }

  return { provider, url, ir };
}

/**
 * Push a new schema representation to the pseudo database. The
 * function performs a very small diff between the existing schema and
 * the new one and records the operations in
 * `.uni-orm/migrations/<timestamp>.json`.
 *
 * Destructive operations (drops of tables or columns) are blocked by
 * default and require `force: true` to proceed.
 */
async function push({ provider, url, schemaYaml, force = false }) {
  const configDir = path.join(process.cwd(), '.uni-orm');
  const schemaPath = path.join(configDir, 'db.schema.yaml');
  await fs.ensureDir(configDir);

  const newSchema = YAML.parse(schemaYaml || '') || { tables: [] };
  let oldSchema = { tables: [] };
  if (await fs.pathExists(schemaPath)) {
    const oldText = await fs.readFile(schemaPath, 'utf8');
    oldSchema = YAML.parse(oldText) || { tables: [] };
  }

  const oldTables = oldSchema.tables || [];
  const newTables = newSchema.tables || [];

  const addedTables = [];
  const removedTables = [];
  const changedTables = [];

  // Determine table-level changes
  const tableMapOld = new Map(oldTables.map((t) => [t.name, t]));
  const tableMapNew = new Map(newTables.map((t) => [t.name, t]));

  for (const [name, table] of tableMapOld.entries()) {
    if (!tableMapNew.has(name)) {
      removedTables.push(name);
    }
  }

  for (const [name, table] of tableMapNew.entries()) {
    if (!tableMapOld.has(name)) {
      addedTables.push(name);
    } else {
      const oldTable = tableMapOld.get(name);
      const oldCols = oldTable.columns || [];
      const newCols = table.columns || [];

      const addedColumns = [];
      const removedColumns = [];

      const colMapOld = new Map(oldCols.map((c) => [c.name, c]));
      const colMapNew = new Map(newCols.map((c) => [c.name, c]));

      for (const [cname] of colMapOld.entries()) {
        if (!colMapNew.has(cname)) {
          removedColumns.push(cname);
        }
      }

      for (const [cname] of colMapNew.entries()) {
        if (!colMapOld.has(cname)) {
          addedColumns.push(cname);
        }
      }

      if (addedColumns.length || removedColumns.length) {
        changedTables.push({ name, addedColumns, removedColumns });
      }
    }
  }

  // Guard against destructive changes
  const destructiveTables = removedTables.length > 0;
  const destructiveColumns = changedTables.some((t) => t.removedColumns.length > 0);
  if ((destructiveTables || destructiveColumns) && !force) {
    throw new Error('Destructive changes detected. Use --force to apply.');
  }

  // Persist the new schema
  await fs.writeFile(schemaPath, YAML.stringify(newSchema));

  // Write migration history
  const migrationsDir = path.join(configDir, 'migrations');
  await fs.ensureDir(migrationsDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const migration = { addedTables, removedTables, changedTables };
  const migrationPath = path.join(migrationsDir, `${timestamp}.json`);
  await fs.writeFile(migrationPath, JSON.stringify(migration, null, 2));

  return { provider, url, applied: true, migration };
}

module.exports = { pull, push };
