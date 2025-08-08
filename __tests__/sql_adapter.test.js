const { SQLAdapter } = require('../src/adapters/SQLAdapter');

describe('SQLAdapter', () => {
  let adapter;

  beforeAll(async () => {
    adapter = new SQLAdapter();
    await adapter.connect(':memory:');
  });

  afterAll(() => {
    if (adapter.db) adapter.db.close();
  });

  test('round-trip schema and data', async () => {
    const schema = {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', pk: true, nullable: false, default: null },
            { name: 'name', type: 'TEXT', pk: false, nullable: false, default: null }
          ],
          indexes: [],
          fks: []
        }
      ]
    };

    await adapter.importSchema(schema);
    const exported = await adapter.exportSchema();
    expect(exported).toEqual(schema);

    await adapter.importData('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]);

    const rows = [];
    for await (const batch of adapter.exportData('users')) {
      rows.push(...batch);
    }
    expect(rows).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]);
  });
});
