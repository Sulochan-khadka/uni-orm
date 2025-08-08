const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

jest.setTimeout(30000);

describe('mysql to mongodb changeset flow', () => {
  let tmpDir;
  let server;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uniorm-mongo-'));
    const sampleSrc = path.join(__dirname, '..', 'engine', 'sample-data');
    await fs.copy(sampleSrc, tmpDir);
    server = spawn('node', ['engine/server.js'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, UNIORM_SAMPLE_DIR: tmpDir },
      stdio: 'ignore'
    });
    await new Promise((res) => setTimeout(res, 500));
  });

  afterAll(async () => {
    if (server) server.kill();
    await fs.remove(tmpDir);
    await fs.remove(path.join(__dirname, '..', '.uni-orm'));
  });

  test('changeset includes fields and pull dbchange is idempotent', async () => {
    const planRes = await fetch('http://localhost:6499/migrations/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: { provider: 'mysql' }, to: { provider: 'mongodb' } })
    });
    const plan = await planRes.json();
    expect(plan.from).toBe('mysql');
    expect(plan.to).toBe('mongodb');
    for (const key of ['mapping', 'idStrategy', 'decimalMode', 'indexes', 'referenceEmbedding', 'targetConnection']) {
      expect(plan).toHaveProperty(key);
    }
    const tokenRes = await fetch('http://localhost:6499/changesets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan })
    });
    const { token } = await tokenRes.json();

    for (let i = 0; i < 2; i++) {
      await new Promise((resolve, reject) => {
        const cli = spawn('node', ['bin/cli.js', 'pull', 'dbchange', token], {
          cwd: path.join(__dirname, '..'),
          env: { ...process.env, UNIORM_SAMPLE_DIR: tmpDir }
        });
        cli.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`exit code ${code}`))));
      });
    }

    const mysql = await fs.readJson(path.join(tmpDir, 'mysql.json'));
    const mongo = await fs.readJson(path.join(tmpDir, 'mongodb.json'));
    expect(mongo.data.users.length).toBe(mysql.data.users.length);
  });
});
