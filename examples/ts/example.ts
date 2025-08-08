import { createClient } from '@uniorm/client';

async function main() {
  const client = createClient({ baseUrl: 'http://localhost:6499' });
  const created = await client.user.create({ name: 'Alice' });
  console.log('Created user', created);
  const users = await client.user.findMany();
  console.log('All users', users);
  const found = await client.user.findUnique(created.id);
  console.log('Found user', found);
  const updated = await client.user.update(created.id, { name: 'Alice Updated' });
  console.log('Updated user', updated);
  await client.user.delete(created.id);
  console.log('Deleted user');
}

main();
