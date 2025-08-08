const fs = require('fs-extra');
const path = require('path');

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomToken() {
  const length = 12 + Math.floor(Math.random() * 5); // 12-16
  let token = '';
  for (let i = 0; i < length; i++) {
    token += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return token;
}

async function saveChangeset(plan) {
  const token = randomToken();
  const dir = path.join(process.cwd(), '.uni-orm', 'changesets');
  await fs.ensureDir(dir);
  await fs.writeJson(path.join(dir, `${token}.json`), plan, { spaces: 2 });
  return token;
}

async function loadChangeset(token) {
  const file = path.join(process.cwd(), '.uni-orm', 'changesets', `${token}.json`);
  return fs.readJson(file);
}

module.exports = { saveChangeset, loadChangeset };
