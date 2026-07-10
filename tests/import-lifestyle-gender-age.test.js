const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const nodePath = 'C:\\Users\\zhang\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';
const scriptPath = path.join(__dirname, '..', 'scripts', 'import-lifestyle-gender-age.js');
const csvPath = path.join(__dirname, '..', 'data', 'raw', 'lifestyle-gender-age-2024.csv');

test('lifestyle gender age importer validates csv and reports dry-run summary', () => {
  const output = execFileSync(nodePath, [scriptPath, '--csv', csvPath, '--dry-run'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });
  const summary = JSON.parse(output);

  assert.equal(summary.dryRun, true);
  assert.equal(summary.segmentCount, 6);
  assert.deepEqual(summary.updatedDimensions, ['smoking', 'drinking']);
  assert.equal(summary.addedSource, 'lifestyle_segment_reports');
  assert.equal(summary.sampleRates.maleSmokingNo, 0.495);
  assert.equal(summary.sampleRates.femaleSmokingNo, 0.979);
  assert.ok(summary.coverageNote.includes('条件修正'));
});
