const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateProbability,
  getFilterOptions,
  getSourceNotes,
  getDataCatalog,
  validateSeedData
} = require('../cloudfunctions/calculateProbability/lib/probability');

test('seed data exposes source notes with quality levels for every metric', () => {
  const report = validateSeedData();

  assert.equal(report.ok, true);
  assert.equal(report.missingSources.length, 0);
  assert.equal(report.invalidQualityLevels.length, 0);
});

test('calculates explainable probability and factor contributions for common filters', () => {
  const result = calculateProbability({
    regionCode: '310000',
    gender: 'male',
    ageRange: '25-29',
    education: 'bachelor_plus',
    occupation: 'tech',
    salary: '20k_plus',
    smoking: 'no',
    drinking: 'light_or_no'
  });

  assert.equal(result.region.name, '上海市');
  assert.ok(result.estimatedPeople > 0);
  assert.ok(result.probability > 0);
  assert.ok(result.probability < 1);
  assert.equal(result.factors.length, 7);
  assert.equal(result.rarestFactor.key, 'salary');
  assert.match(result.comment.text, /标准|出门|世界|候选人|人海/);
  assert.ok(['高', '中', '低'].includes(result.confidence.level));
});

test('returns unstable estimate warning when filters are extremely narrow', () => {
  const result = calculateProbability({
    regionCode: '540000',
    gender: 'female',
    ageRange: '35-39',
    education: 'master_plus',
    occupation: 'finance',
    salary: '50k_plus',
    smoking: 'no',
    drinking: 'light_or_no',
    personality: 'intj_like'
  });

  assert.equal(result.flags.includes('estimate_unstable'), true);
  assert.ok(result.estimatedPeople < 50);
  assert.equal(result.comment.tone, 'warm');
});

test('missing metric dimensions are explicit and do not pretend to be official data', () => {
  const result = calculateProbability({
    regionCode: '110000',
    gender: 'male',
    personality: 'intj_like'
  });

  const personalityFactor = result.factors.find((factor) => factor.key === 'personality');

  assert.equal(personalityFactor.quality, '模型估算');
  assert.equal(result.sourceNotes.some((source) => source.quality === '模型估算'), true);
});

test('filter options are region-aware and include selectable dimensions', () => {
  const options = getFilterOptions('440000');

  assert.equal(options.region.name, '广东省');
  assert.ok(options.dimensions.ageRange.length > 0);
  assert.ok(options.dimensions.education.length > 0);
  assert.ok(options.dimensions.salary.length > 0);
});

test('source notes can be fetched by metric ids', () => {
  const notes = getSourceNotes(['population_310000', 'salary_310000']);

  assert.equal(notes.length, 2);
  assert.equal(notes[0].quality, '官方统计');
  assert.ok(notes[0].url.startsWith('https://'));
});

test('expanded catalog documents refresh cadence and source priority', () => {
  const catalog = getDataCatalog();

  assert.ok(catalog.sources.length >= 6);
  assert.ok(catalog.sources.every((source) => source.priority >= 1 && source.refreshCadence));
  assert.ok(catalog.dimensions.some((dimension) => dimension.key === 'height'));
  assert.ok(catalog.dimensions.some((dimension) => dimension.key === 'exercise'));
  assert.ok(catalog.dimensions.some((dimension) => dimension.key === 'homeOwnership'));
});

test('new lifestyle and asset dimensions participate in probability calculation', () => {
  const result = calculateProbability({
    regionCode: '440000',
    gender: 'female',
    ageRange: '25-29',
    education: 'bachelor_plus',
    height: '165_175',
    exercise: 'weekly',
    homeOwnership: 'has_home',
    commuteTolerance: 'same_city'
  });

  assert.equal(result.factors.length, 7);
  assert.equal(result.factors.some((factor) => factor.key === 'height'), true);
  assert.equal(result.factors.some((factor) => factor.quality === '模型估算'), true);
  assert.equal(result.sourceNotes.some((source) => source.id === 'housing_reports'), true);
});
