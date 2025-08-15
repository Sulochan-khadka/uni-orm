const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts });
    p.on('error', reject);
    p.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function runDocker(cmdArgs) {
  try {
    await run('docker', ['compose', '-f', 'docker-compose.e2e.yml', ...cmdArgs]);
  } catch (err) {
    console.warn('docker compose not available, skipping:', err.message);
  }
}

async function main() {
  const root = path.join(__dirname, '..');
  process.chdir(root);

  await fs.remove(path.join(root, '.uni-orm'));
  await fs.remove(path.join(root, 'generated'));

  await runDocker(['up', '-d']);

  const server = spawn('node', ['engine/server.js'], { cwd: root, stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 1000));

  try {
    await fetch('http://localhost:6499/project/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'ts', provider: 'mysql', url: 'mysql://root:password@localhost:3306/test' })
    });

    await run('node', ['bin/cli.js', 'db', 'push', '--force'], { cwd: root });
    await run('node', ['bin/cli.js', 'generate'], { cwd: root });

    await run('npx', ['ts-node', '--compiler-options', '{"module":"CommonJS"}', '--transpile-only', 'examples/node-ts/example.ts'], { cwd: root });
    await run('python', ['examples/py/example.py'], { cwd: root });

    await run('node', ['bin/cli.js', 'postgres', 'migrate', 'mysql'], { cwd: root });

    const planRes = await fetch('http://localhost:6499/migrations/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: { provider: 'mysql' }, to: { provider: 'mongodb' } })
    });
    const plan = await planRes.json();
    const tokenRes = await fetch('http://localhost:6499/changesets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan })
    });
    const { token } = await tokenRes.json();

    await run('node', ['bin/cli.js', 'pull', 'dbchange', token], { cwd: root });

    console.log('E2E flow completed');
  } finally {
    server.kill();
    await runDocker(['down']);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
