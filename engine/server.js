const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const { initProject } = require('./src/project');
const { validateSchema } = require('./src/schema');
const { pull, push } = require('./src/db');
const { plan, applyPlan } = require('./src/migrations');
const { saveChangeset, loadChangeset } = require('./src/changesets');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/version', (req, res) => {
  res.json({ version: '0.1.0' });
});

app.post('/project/init', async (req, res) => {
  try {
    const { language, provider, url } = req.body;
    await initProject({ language, provider, url });
    res.json({ status: 'initialized' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/schema/validate', (req, res) => {
  const { schemaText } = req.body;
  const result = validateSchema(schemaText || '');
  res.json(result);
});

app.post('/db/pull', async (req, res) => {
  try {
    const result = await pull(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/db/push', async (req, res) => {
  try {
    const result = await push(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/migrations/plan', async (req, res) => {
  try {
    const result = await plan(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/migrations/apply', async (req, res) => {
  try {
    const result = await applyPlan(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/changesets', async (req, res) => {
  try {
    const token = await saveChangeset(req.body.plan || req.body);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/changesets/:token', async (req, res) => {
  try {
    const plan = await loadChangeset(req.params.token);
    res.json(plan);
  } catch (err) {
    res.status(404).json({ error: 'not found' });
  }
});

// Load schema and set up CRUD routes
function setupCrudRoutes() {
  try {
    const schemaPath = path.join(__dirname, '..', 'uniorm.schema.yaml');
    const text = fs.readFileSync(schemaPath, 'utf8');
    const schema = YAML.parse(text);
    const models = schema.models || {};
    Object.keys(models).forEach((name) => {
      const route = name.charAt(0).toLowerCase() + name.slice(1) + 's';
      const store = [];
      let nextId = 1;
      app.get(`/${route}`, (req, res) => {
        res.json(store);
      });
      app.get(`/${route}/:id`, (req, res) => {
        const id = Number(req.params.id);
        const item = store.find((x) => x.id === id);
        if (!item) return res.status(404).json({ error: 'not found' });
        res.json(item);
      });
      app.post(`/${route}`, (req, res) => {
        const item = { ...req.body, id: nextId++ };
        store.push(item);
        res.json(item);
      });
      app.put(`/${route}/:id`, (req, res) => {
        const id = Number(req.params.id);
        const idx = store.findIndex((x) => x.id === id);
        if (idx === -1) return res.status(404).json({ error: 'not found' });
        store[idx] = { ...store[idx], ...req.body };
        res.json(store[idx]);
      });
      app.delete(`/${route}/:id`, (req, res) => {
        const id = Number(req.params.id);
        const idx = store.findIndex((x) => x.id === id);
        if (idx === -1) return res.status(404).json({ error: 'not found' });
        const [removed] = store.splice(idx, 1);
        res.json(removed);
      });
    });
  } catch (e) {
    console.error('Failed to set up CRUD routes:', e);
  }
}

setupCrudRoutes();

const PORT = 6499;
app.listen(PORT, () => {
  console.log(`Engine server listening on port ${PORT}`);
});

module.exports = app;
