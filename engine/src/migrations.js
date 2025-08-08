const fs = require('fs-extra');
const path = require('path');

function sampleDir() {
  return process.env.UNIORM_SAMPLE_DIR || path.join(__dirname, '..', 'sample-data');
}

async function loadSample(provider) {
  const file = path.join(sampleDir(), `${provider}.json`);
  return fs.readJson(file);
}

async function saveSample(provider, data) {
  const file = path.join(sampleDir(), `${provider}.json`);
  await fs.writeJson(file, data, { spaces: 2 });
}

async function plan({ from, to }) {
  const fromDb = await loadSample(from.provider);
  const toDb = await loadSample(to.provider);

  const ops = [];
  const tablesToCopy = [];
  const toTableMap = new Map((toDb.schema.tables || []).map((t) => [t.name, t]));

  for (const table of fromDb.schema.tables || []) {
    tablesToCopy.push(table.name);
    const target = toTableMap.get(table.name);
    if (!target) {
      ops.push({ type: 'create_table', table: table.name });
      for (const col of table.columns || []) {
        ops.push({ type: 'add_column', table: table.name, column: col });
      }
      for (const idx of table.indexes || []) {
        ops.push({ type: 'create_index', table: table.name, index: idx });
      }
      for (const fk of table.fks || []) {
        ops.push({ type: 'add_fk', table: table.name, fk });
      }
    } else {
      const targetCols = new Set((target.columns || []).map((c) => c.name));
      for (const col of table.columns || []) {
        if (!targetCols.has(col.name)) {
          ops.push({ type: 'add_column', table: table.name, column: col });
        }
      }
      const targetIdxs = new Set((target.indexes || []).map((i) => i.name));
      for (const idx of table.indexes || []) {
        if (!targetIdxs.has(idx.name)) {
          ops.push({ type: 'create_index', table: table.name, index: idx });
        }
      }
      const targetFks = new Set((target.fks || []).map((f) => f.name));
      for (const fk of table.fks || []) {
        if (!targetFks.has(fk.name)) {
          ops.push({ type: 'add_fk', table: table.name, fk });
        }
      }
    }
  }

  return { ops, tables: tablesToCopy, from: from.provider, to: to.provider };
}

async function applyPlan({ plan, batchSize = 10000 }) {
  const fromDb = await loadSample(plan.from);
  const toDb = await loadSample(plan.to);

  const newSchema = JSON.parse(JSON.stringify(toDb.schema));
  const newData = JSON.parse(JSON.stringify(toDb.data));

  for (const op of plan.ops) {
    switch (op.type) {
      case 'create_table': {
        newSchema.tables.push({ name: op.table, columns: [], indexes: [], fks: [] });
        break;
      }
      case 'add_column': {
        const tbl = newSchema.tables.find((t) => t.name === op.table);
        if (tbl) {
          tbl.columns = tbl.columns || [];
          tbl.columns.push(op.column);
        }
        break;
      }
      case 'create_index': {
        const tbl = newSchema.tables.find((t) => t.name === op.table);
        if (tbl) {
          tbl.indexes = tbl.indexes || [];
          tbl.indexes.push(op.index);
        }
        break;
      }
      case 'add_fk': {
        const tbl = newSchema.tables.find((t) => t.name === op.table);
        if (tbl) {
          tbl.fks = tbl.fks || [];
          tbl.fks.push(op.fk);
        }
        break;
      }
    }
  }

  const fromData = fromDb.data || {};
  for (const table of plan.tables || []) {
    const rows = fromData[table] || [];
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      newData[table] = newData[table] || [];
      newData[table].push(...batch);
    }
  }

  await saveSample(plan.to, { schema: newSchema, data: newData });
  return { applied: true };
}

module.exports = { plan, applyPlan };
