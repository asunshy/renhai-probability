const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.join(__dirname, '..', 'data', 'raw', 'source-candidates.json');

test('source candidates are traceable and ready for import planning', () => {
  const payload = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

  assert.equal(payload.collectedAt, '2026-07-07');
  assert.ok(payload.sources.length >= 8);
  assert.ok(payload.metrics.length >= 12);

  payload.sources.forEach((source) => {
    assert.match(source.url, /^https:\/\//);
    assert.ok(['官方统计', '行业报告', '模型估算'].includes(source.quality));
    assert.ok(source.refreshCadence);
    assert.ok(source.nextAction);
  });

  payload.metrics.forEach((metric) => {
    assert.ok(payload.sources.some((source) => source.id === metric.sourceId));
    assert.ok(metric.dimension);
    assert.ok(metric.importPriority >= 1 && metric.importPriority <= 4);
  });

  assert.ok(payload.metrics.some((metric) => metric.dimension === 'rentIncomeRatio'));
  assert.ok(payload.metrics.some((metric) => metric.dimension === 'youthInflow'));
  assert.ok(payload.metrics.some((metric) => metric.dimension === 'overtimeIntensity'));
  assert.ok(payload.metrics.some((metric) => metric.dimension === 'relationshipIntent'));
});
