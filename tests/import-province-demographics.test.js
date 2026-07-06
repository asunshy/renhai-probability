const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const nodePath = 'C:\\Users\\zhang\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';
const scriptPath = path.join(__dirname, '..', 'scripts', 'import-province-demographics.js');
const csvPath = path.join(__dirname, '..', 'data', 'raw', 'province-demographics-2020.csv');

test('province demographics importer validates csv and reports dry-run summary', () => {
  const output = execFileSync(nodePath, [scriptPath, '--csv', csvPath, '--dry-run'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });
  const summary = JSON.parse(output);

  assert.equal(summary.dryRun, true);
  assert.equal(summary.regionCount, 31);
  assert.equal(summary.updatedDimensions.includes('gender'), true);
  assert.equal(summary.updatedDimensions.includes('education'), true);
  assert.equal(summary.updatedDimensions.includes('ageRange'), true);
  assert.equal(summary.sampleRegions['320000'].name, '江苏省');
  assert.equal(summary.sampleRegions['370000'].basePopulation, 101527453);
});
