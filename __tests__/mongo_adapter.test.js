const { MongoAdapter } = require('../src/adapters/MongoAdapter');

describe('MongoAdapter', () => {
  let adapter;

  beforeAll(async () => {
    adapter = new MongoAdapter();
    await adapter.connect('memory');
  });

  afterAll(async () => {});

  test('round-trip schema and data with validator', async () => {
    const schema = {
      tables: [
        {
          name: 'users',
          columns: [
            { name: '_id', type: 'ObjectId', pk: true, nullable: false, default: undefined },
            { name: 'name', type: 'string', pk: false, nullable: false, default: undefined }
          ],
          indexes: [],
          fks: [],
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['name'],
              properties: { name: { bsonType: 'string' } }
            }
          }
        }
      ]
    };

    await adapter.importSchema(schema);
    await expect(adapter.importData('users', [{}])).rejects.toThrow();
    await adapter.importData('users', [{ name: 'Alice' }]);

    const exported = await adapter.exportSchema();
    const table = exported.tables.find(t => t.name === 'users');
    const names = table.columns.map(c => c.name);
    expect(names).toContain('name');

    const rows = [];
    for await (const batch of adapter.exportData('users')) {
      rows.push(...batch);
    }
    expect(rows[0].name).toBe('Alice');
  });
});
