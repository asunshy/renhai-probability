const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const nodePath = 'C:\\Users\\zhang\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';
const scriptPath = path.join(__dirname, '..', 'scripts', 'import-region-labor-salary.js');
const csvPath = path.join(__dirname, '..', 'data', 'raw', 'region-labor-salary-2024.csv');

test('region labor salary importer validates csv and reports dry-run summary', () => {
  const output = execFileSync(nodePath, [scriptPath, '--csv', csvPath, '--dry-run'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });
  const summary = JSON.parse(output);

  assert.equal(summary.dryRun, true);
  assert.equal(summary.regionCount, 10);
  assert.deepEqual(summary.updatedDimensions, ['occupation', 'salary']);
  assert.equal(summary.sampleRates['310000'].occupation.tech, 0.126);
  assert.equal(summary.sampleRates['440000'].salary['20k_plus'], 0.118);
  assert.ok(summary.coverageNote.includes('行业报告'));
});
