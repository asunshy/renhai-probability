const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const nodePath = 'C:\\Users\\zhang\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';
const scriptPath = path.join(__dirname, '..', 'scripts', 'import-industry-salary-benchmark.js');
const csvPath = path.join(__dirname, '..', 'data', 'raw', 'industry-salary-benchmark-2024.csv');

test('industry salary benchmark importer validates csv and reports dry-run summary', () => {
  const output = execFileSync(nodePath, [scriptPath, '--csv', csvPath, '--dry-run'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });
  const summary = JSON.parse(output);

  assert.equal(summary.dryRun, true);
  assert.equal(summary.rowCount, 45);
  assert.deepEqual(summary.updatedBenchmarks, ['industrySalary']);
  assert.equal(summary.addedSource, 'industry_salary_benchmark');
  assert.equal(summary.sample['310000.tech'].p50, 25000);
  assert.equal(summary.sample['440300.tech'].p75, 37000);
  assert.ok(summary.coverageNote.includes('不直接作为概率筛选比例'));
});
