const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const nodePath = 'C:\\Users\\zhang\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';
const scriptPath = path.join(__dirname, '..', 'scripts', 'import-city-rent-pressure.js');
const csvPath = path.join(__dirname, '..', 'data', 'raw', 'city-rent-pressure-2024.csv');

test('city rent pressure importer validates csv and reports dry-run summary', () => {
  const output = execFileSync(nodePath, [scriptPath, '--csv', csvPath, '--dry-run'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });
  const summary = JSON.parse(output);

  assert.equal(summary.dryRun, true);
  assert.equal(summary.cityCount, 9);
  assert.deepEqual(summary.updatedBenchmarks, ['cityRentPressure']);
  assert.equal(summary.addedSource, 'city_rent_pressure');
  assert.equal(summary.sample['310000'].studioRent, 5600);
  assert.equal(summary.sample['440300'].typicalRentIncomeRatio, 0.29);
  assert.ok(summary.coverageNote.includes('不直接作为概率筛选比例'));
});
