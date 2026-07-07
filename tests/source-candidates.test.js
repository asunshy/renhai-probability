const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.join(__dirname, '..', 'data', 'raw', 'source-candidates.json');
const backlogPath = path.join(__dirname, '..', 'data', 'raw', 'collection-backlog.json');
const catalogPath = path.join(__dirname, '..', 'data', 'seed', 'catalog.json');

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

test('collection backlog references known public source candidates', () => {
  const candidates = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const backlog = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const knownSourceIds = new Set([
    ...candidates.sources.map((source) => source.id),
    ...Object.keys(catalog.sources)
  ]);

  assert.equal(backlog.policy.includes('personal profiles'), true);
  assert.ok(backlog.items.length >= 6);

  backlog.items.forEach((item) => {
    assert.ok(backlog.statusLevels.includes(item.status));
    assert.ok(item.sourceCandidates.length > 0);
    item.sourceCandidates.forEach((sourceId) => {
      assert.equal(knownSourceIds.has(sourceId), true, `${item.id} references unknown source ${sourceId}`);
    });
  });
});
