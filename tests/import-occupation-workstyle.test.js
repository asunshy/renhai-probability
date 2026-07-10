const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const nodePath = 'C:\\Users\\zhang\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';
const scriptPath = path.join(__dirname, '..', 'scripts', 'import-occupation-workstyle.js');
const csvPath = path.join(__dirname, '..', 'data', 'raw', 'occupation-workstyle-2024.csv');

test('occupation workstyle importer validates csv and reports dry-run summary', () => {
  const output = execFileSync(nodePath, [scriptPath, '--csv', csvPath, '--dry-run'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });
  const summary = JSON.parse(output);

  assert.equal(summary.dryRun, true);
  assert.equal(summary.occupationCount, 5);
  assert.deepEqual(summary.updatedDimensions, ['workStyle']);
  assert.equal(summary.addedSource, 'workstyle_reports');
  assert.equal(summary.sampleRates.tech.remote_friendly, 0.58);
  assert.equal(summary.sampleRates.education.stable_schedule, 0.68);
  assert.ok(summary.coverageNote.includes('职业大类'));
});
