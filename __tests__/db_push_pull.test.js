const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const YAML = require('yaml');

const { push, pull } = require('../engine/src/db');

describe('db push/pull', () => {
  let cwd;
  let tmp;

  beforeEach(async () => {
    cwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uni-orm-'));
    process.chdir(tmp);
  });

  afterEach(async () => {
    process.chdir(cwd);
    await fs.remove(tmp);
  });

  test('push updates and pull reflects schema', async () => {
    const schema1 = YAML.stringify({
      tables: [{ name: 'users', columns: [{ name: 'id' }, { name: 'name' }] }]
    });
    await push({ provider: 'sqlite', url: 'file:mem', schemaYaml: schema1 });
    let result = await pull({ provider: 'sqlite', url: 'file:mem' });
    expect(result.ir.tables[0].name).toBe('users');

    const schema2 = YAML.stringify({
      tables: [
        { name: 'users', columns: [{ name: 'id' }, { name: 'name' }, { name: 'email' }] }
      ]
    });
    await push({ provider: 'sqlite', url: 'file:mem', schemaYaml: schema2 });
    result = await pull({ provider: 'sqlite', url: 'file:mem' });
    const columnNames = result.ir.tables[0].columns.map(c => c.name);
    expect(columnNames).toContain('email');

    const schema3 = YAML.stringify({
      tables: [{ name: 'users', columns: [{ name: 'id' }] }]
    });
    await expect(
      push({ provider: 'sqlite', url: 'file:mem', schemaYaml: schema3 })
    ).rejects.toThrow();
    await push({ provider: 'sqlite', url: 'file:mem', schemaYaml: schema3, force: true });
  });

  test('migration history files are created', async () => {
    const schema1 = YAML.stringify({ tables: [] });
    await push({ provider: 'sqlite', url: 'file', schemaYaml: schema1 });
    const schema2 = YAML.stringify({ tables: [{ name: 't', columns: [] }] });
    await push({ provider: 'sqlite', url: 'file', schemaYaml: schema2 });
    const migrationsDir = path.join(process.cwd(), '.uni-orm', 'migrations');
    const files = await fs.readdir(migrationsDir);
    expect(files.length).toBeGreaterThan(0);
  });
});
