const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const nodePath = 'C:\\Users\\zhang\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';
const scriptPath = path.join(__dirname, '..', 'scripts', 'import-region-housing-commute.js');
const csvPath = path.join(__dirname, '..', 'data', 'raw', 'region-housing-commute-2024.csv');

test('region housing commute importer validates csv and reports dry-run summary', () => {
  const output = execFileSync(nodePath, [scriptPath, '--csv', csvPath, '--dry-run'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });
  const summary = JSON.parse(output);

  assert.equal(summary.dryRun, true);
  assert.equal(summary.regionCount, 10);
  assert.deepEqual(summary.updatedDimensions, ['homeOwnership', 'commuteTolerance']);
  assert.equal(summary.sampleRates['310000'].homeOwnership.has_home, 0.32);
  assert.equal(summary.sampleRates['440000'].commuteTolerance.within_hour, 0.58);
  assert.ok(summary.coverageNote.includes('行业报告'));
});
