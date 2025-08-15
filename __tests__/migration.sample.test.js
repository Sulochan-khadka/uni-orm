const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

jest.setTimeout(30000);

async function waitForServer(url, retries = 10, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* ignore */
    }
    await new Promise((res) => setTimeout(res, delay));
  }
  throw new Error(`Server not ready at ${url}`);
}

describe('mysql to postgres migration sample', () => {
  let tmpDir;
  let server;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uniorm-sample-'));
    const sampleSrc = path.join(__dirname, '..', 'engine', 'sample-data');
    await fs.copy(sampleSrc, tmpDir);
    server = spawn('node', ['engine/server.js'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, UNIORM_SAMPLE_DIR: tmpDir },
      stdio: 'ignore'
    });
    await waitForServer('http://localhost:6499/health');
  });

  afterAll(async () => {
    if (server) server.kill();
    await fs.remove(tmpDir);
  });

  test('cli migrate copies schema and data', async () => {
    await new Promise((resolve, reject) => {
      const cli = spawn('node', ['bin/cli.js', 'mysql', 'migrate', 'postgres'], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, UNIORM_SAMPLE_DIR: tmpDir }
      });
      cli.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`exit code ${code}`));
      });
    });
    const mysql = await fs.readJson(path.join(tmpDir, 'mysql.json'));
    const postgres = await fs.readJson(path.join(tmpDir, 'postgres.json'));
    expect(postgres.schema.tables.length).toBe(mysql.schema.tables.length);
    expect(postgres.data.users).toEqual(mysql.data.users);
  });
});
