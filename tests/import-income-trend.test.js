const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const nodePath = process.execPath;
const scriptPath = path.join(__dirname, '..', 'scripts', 'import-income-trend.js');
const csvPath = path.join(__dirname, '..', 'data', 'raw', 'household-income-trend-2020-2024.csv');

test('income trend importer validates csv and reports dry-run summary', () => {
  const output = execFileSync(nodePath, [scriptPath, '--csv', csvPath, '--dry-run'], {
    encoding: 'utf8'
  });
  const summary = JSON.parse(output);

  assert.equal(summary.datasetId, 'household_income_trend_2020_2024');
  assert.equal(summary.rows, 5);
  assert.equal(summary.latestYear, 2024);
  assert.equal(summary.latestUrbanDisposableIncomePerCapita, 54188);
  assert.equal(summary.latestNationalDisposableIncomePerCapita, 41314);
  assert.equal(summary.quality, '官方统计');
  assert.ok(summary.fiveYearNominalGrowth > 0.2);
});
