const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('web preview uses readable Chinese copy and exposes job market filters', () => {
  const html = fs.readFileSync(path.join(root, 'web-preview', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'web-preview', 'app.js'), 'utf8');
  const seed = JSON.parse(fs.readFileSync(path.join(root, 'web-preview', 'data', 'seed.json'), 'utf8'));
  const text = `${html}\n${app}`;

  assert.match(html, /人海相遇概率/);
  assert.match(html, /公开数据/);
  assert.match(app, /就业行情/);
  assert.equal(Boolean(seed.options.dimensions.jobMarket), true);
  assert.equal(seed.datasets.some((dataset) => dataset.id === 'region_job_market_2024'), true);

  ['浜', '锛', '绾', '鐨', '鍦', '妯'].forEach((fragment) => {
    assert.equal(text.includes(fragment), false, `unexpected mojibake fragment: ${fragment}`);
  });
});
