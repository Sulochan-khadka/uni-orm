async function plan({ from, to, options }) {
  return { ops: [] };
}

async function applyPlan({ plan }) {
  return { applied: true };
}

module.exports = { plan, applyPlan };
