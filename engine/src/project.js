const fs = require('fs-extra');
const path = require('path');
const YAML = require('yaml');

async function initProject({ language, provider, url }) {
  const configDir = path.join(process.cwd(), '.uni-orm');
  await fs.ensureDir(configDir);
  const configPath = path.join(configDir, 'config.json');
  await fs.writeJson(configPath, { language, provider, url }, { spaces: 2 });

  const schemaPath = path.join(process.cwd(), 'uniorm.schema.yaml');
  if (!(await fs.pathExists(schemaPath))) {
    const schema = { tables: [] };
    await fs.writeFile(schemaPath, YAML.stringify(schema));
  }
  return { ok: true };
}

module.exports = { initProject };
