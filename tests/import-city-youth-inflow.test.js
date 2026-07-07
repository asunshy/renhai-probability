const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const nodePath = 'C:\\Users\\zhang\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';
const scriptPath = path.join(__dirname, '..', 'scripts', 'import-city-youth-inflow.js');
const csvPath = path.join(__dirname, '..', 'data', 'raw', 'city-youth-inflow-2024.csv');

test('city youth inflow importer validates csv and reports dry-run summary', () => {
  const output = execFileSync(nodePath, [scriptPath, '--csv', csvPath, '--dry-run'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });
  const summary = JSON.parse(output);

  assert.equal(summary.dryRun, true);
  assert.equal(summary.cityCount, 10);
  assert.deepEqual(summary.updatedDimensions, ['youthInflow']);
  assert.equal(summary.addedSource, 'city_youth_reports');
  assert.equal(summary.sampleRates['310000'].youth_highly_active, 0.6);
  assert.equal(summary.sampleRates['440300'].talent_density, 0.68);
  assert.ok(summary.coverageNote.includes('行业报告'));
});
