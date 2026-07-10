const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const nodePath = process.execPath;
const scriptPath = path.join(__dirname, '..', 'scripts', 'import-marriage-trend.js');
const csvPath = path.join(__dirname, '..', 'data', 'raw', 'marriage-registration-trend-2013-2024.csv');

test('marriage trend importer validates csv and reports dry-run summary', () => {
  const output = execFileSync(nodePath, [scriptPath, '--csv', csvPath, '--dry-run'], {
    encoding: 'utf8'
  });
  const summary = JSON.parse(output);

  assert.equal(summary.datasetId, 'marriage_registration_trend_2024');
  assert.equal(summary.rows, 12);
  assert.equal(summary.latestYear, 2024);
  assert.equal(summary.latestMarriageRegistrations, 6106000);
  assert.equal(summary.quality, '官方统计');
  assert.ok(summary.averageAnnualChange < 0);
});
