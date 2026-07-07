const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('web preview uses readable Chinese copy and exposes result guidance', () => {
  const html = fs.readFileSync(path.join(root, 'web-preview', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'web-preview', 'app.js'), 'utf8');
  const seed = JSON.parse(fs.readFileSync(path.join(root, 'web-preview', 'data', 'seed.json'), 'utf8'));
  const text = `${html}\n${app}`;

  assert.match(html, /人海相遇概率/);
  assert.match(html, /公开数据/);
  assert.match(html, /放宽建议/);
  assert.match(html, /分享摘要/);
  assert.match(app, /就业行情/);
  assert.match(app, /可以先放宽/);
  assert.match(app, /适合截图分享/);
  assert.equal(Boolean(seed.options.dimensions.jobMarket), true);
  assert.equal(seed.datasets.some((dataset) => dataset.id === 'region_job_market_2024'), true);

  ['浜', '锛', '绾', '鐨', '鍦', '妯', '閿', '閻', '濡'].forEach((fragment) => {
    assert.equal(text.includes(fragment), false, `unexpected mojibake fragment: ${fragment}`);
  });
});
