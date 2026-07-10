const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const nodePath = process.execPath;
const scriptPath = path.join(__dirname, '..', 'scripts', 'import-youth-unemployment.js');
const csvPath = path.join(__dirname, '..', 'data', 'raw', 'youth-unemployment-by-age-2024.csv');

test('youth unemployment importer validates csv and reports dry-run summary', () => {
  const output = execFileSync(nodePath, [scriptPath, '--csv', csvPath, '--dry-run'], {
    encoding: 'utf8'
  });
  const summary = JSON.parse(output);

  assert.equal(summary.datasetId, 'youth_unemployment_by_age_2024');
  assert.equal(summary.rows, 12);
  assert.equal(summary.latestMonth, '2024-12');
  assert.equal(summary.latestAge16_24Rate, 0.157);
  assert.equal(summary.peakAge16_24Month, '2024-08');
  assert.equal(summary.peakAge16_24Rate, 0.188);
  assert.equal(summary.quality, '官方统计');
});
