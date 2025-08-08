async function pull({ provider, url }) {
  return { provider, url, ir: {} };
}

async function push({ provider, url, schemaYaml }) {
  return { provider, url, applied: true };
}

module.exports = { pull, push };
