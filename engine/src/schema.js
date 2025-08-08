const YAML = require('yaml');

function validateSchema(schemaText) {
  try {
    YAML.parse(schemaText);
    return { valid: true, errors: [] };
  } catch (err) {
    return { valid: false, errors: [err.message] };
  }
}

module.exports = { validateSchema };
