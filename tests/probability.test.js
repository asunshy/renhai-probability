const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  calculateProbability,
  getFilterOptions,
  getSourceNotes,
  getDataCatalog,
  getCoverageSummary,
  getRegionComparison,
  getDatasetManifest,
  getBenchmarkCatalog,
  getEmploymentInsight,
  getLivingCostInsight,
  getCollectionBacklog,
  getDataCoverageAudit,
  validateSeedData,
  REGIONS,
  DIMENSIONS,
  SOURCES
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
    salary: '50k_plus',
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
  assert.ok(catalog.dimensions.some((dimension) => dimension.key === 'jobMarket'));
  assert.ok(catalog.dimensions.some((dimension) => dimension.key === 'youthInflow'));
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

test('job market dimension participates in probability calculation with traceable source', () => {
  const result = calculateProbability({
    regionCode: '310000',
    gender: 'female',
    ageRange: '25-29',
    education: 'bachelor_plus',
    jobMarket: 'active_market'
  });

  const jobMarketFactor = result.factors.find((factor) => factor.key === 'jobMarket');

  assert.equal(jobMarketFactor.rate, 0.44);
  assert.equal(jobMarketFactor.quality, '行业报告');
  assert.equal(result.sourceNotes.some((source) => source.id === 'recruitment_reports'), true);
});

test('city youth inflow dimension supports city-level probability estimates', () => {
  const result = calculateProbability({
    regionCode: '440300',
    gender: 'male',
    ageRange: '25-29',
    education: 'bachelor_plus',
    occupation: 'tech',
    youthInflow: 'talent_density'
  });

  const youthFactor = result.factors.find((factor) => factor.key === 'youthInflow');

  assert.equal(result.region.name, '深圳市');
  assert.equal(result.basePopulation, 17560061);
  assert.equal(youthFactor.rate, 0.68);
  assert.equal(youthFactor.quality, '行业报告');
  assert.equal(result.sourceNotes.some((source) => source.id === 'city_youth_reports'), true);
  assert.equal(result.flags.includes('contains_non_official_data'), true);
});

test('employment insight explains selected occupation without changing probability factors', () => {
  const result = calculateProbability({
    regionCode: '440300',
    gender: 'male',
    ageRange: '25-29',
    education: 'bachelor_plus',
    occupation: 'tech',
    salary: '20k_plus'
  });

  assert.equal(result.employmentInsight.occupation.label, '互联网/技术');
  assert.equal(result.employmentInsight.monthlySalary.p50, 24500);
  assert.match(result.employmentInsight.salaryText, /中位数约 25k/);
  assert.equal(result.employmentInsight.quality, '行业报告');
  assert.equal(result.factors.some((factor) => factor.key === 'employmentInsight'), false);
});

test('lifestyle segment rates adjust smoking and drinking by selected gender and age', () => {
  const maleResult = calculateProbability({
    regionCode: '310000',
    gender: 'male',
    smoking: 'no',
    drinking: 'light_or_no'
  });
  const femaleResult = calculateProbability({
    regionCode: '310000',
    gender: 'female',
    smoking: 'no',
    drinking: 'light_or_no'
  });
  const ageResult = calculateProbability({
    regionCode: '310000',
    ageRange: '35-39',
    smoking: 'no',
    drinking: 'light_or_no'
  });

  const maleSmoking = maleResult.factors.find((factor) => factor.key === 'smoking');
  const femaleSmoking = femaleResult.factors.find((factor) => factor.key === 'smoking');
  const ageDrinking = ageResult.factors.find((factor) => factor.key === 'drinking');

  assert.equal(maleSmoking.rate, 0.495);
  assert.equal(maleSmoking.segment.type, 'gender');
  assert.equal(femaleSmoking.rate, 0.979);
  assert.equal(ageDrinking.rate, 0.62);
  assert.equal(ageDrinking.segment.type, 'ageRange');
  assert.equal(maleResult.sourceNotes.some((source) => source.id === 'lifestyle_segment_reports'), true);
});

test('benchmark catalog exposes industry salary data for preview surfaces', () => {
  const benchmarks = getBenchmarkCatalog();
  const insight = getEmploymentInsight('310000', { occupation: 'finance' });

  assert.equal(benchmarks.industrySalary.metrics['310000'].tech.p50, 25000);
  assert.equal(benchmarks.cityRentPressure.metrics['310000'].studioRent, 5600);
  assert.equal(insight.monthlySalary.p75, 36000);
  assert.equal(insight.sourceId, 'industry_salary_benchmark');
});

test('living cost insight explains rent pressure without changing probability factors', () => {
  const result = calculateProbability({
    regionCode: '440300',
    gender: 'male',
    ageRange: '25-29',
    occupation: 'tech'
  });
  const insight = getLivingCostInsight('440300', { occupation: 'tech' });

  assert.equal(result.livingCostInsight.rent.studioRent, 5000);
  assert.equal(result.livingCostInsight.rentPressureRatio, 0.2);
  assert.match(result.livingCostInsight.rentPressureText, /租金压力约 20%/);
  assert.equal(insight.sourceId, 'city_rent_pressure');
  assert.equal(result.factors.some((factor) => factor.key === 'livingCostInsight'), false);
});

test('catalog data is maintained as a standalone data asset', () => {
  const assetPath = path.join(__dirname, '..', 'data', 'seed', 'catalog.json');
  const asset = JSON.parse(fs.readFileSync(assetPath, 'utf8'));
  const catalog = getDataCatalog();

  assert.ok(asset.sources.population_census);
  assert.ok(asset.dimensions.gender);
  assert.equal(catalog.sources.length, Object.keys(asset.sources).length);
  assert.equal(catalog.dimensions.length, Object.keys(asset.dimensions).length);
});

test('coverage summary exposes quality mix and dimensions needing better data', () => {
  const summary = getCoverageSummary();

  assert.ok(summary.totalDimensions >= 13);
  assert.ok(summary.qualityCounts['官方统计'] >= 3);
  assert.ok(summary.qualityCounts['模型估算'] >= 3);
  assert.ok(summary.needsRegionalData.some((item) => item.key === 'height'));
  assert.ok(summary.nextRefresh.length >= 3);
});

test('probability module exports the standalone catalog as the single source of truth', () => {
  const assetPath = path.join(__dirname, '..', 'data', 'seed', 'catalog.json');
  const asset = JSON.parse(fs.readFileSync(assetPath, 'utf8'));

  assert.equal(Object.keys(SOURCES).length, Object.keys(asset.sources).length);
  assert.equal(Object.keys(REGIONS).length, Object.keys(asset.regions).length);
  assert.equal(Object.keys(DIMENSIONS).length, Object.keys(asset.dimensions).length);
  assert.ok(SOURCES.national_data);
  assert.ok(SOURCES.mohrss_salary);
});

test('region catalog covers mainland provincial-level regions', () => {
  const provinceCodes = Object.keys(REGIONS).filter((code) => code !== '000000');

  assert.ok(provinceCodes.length >= 31);
  assert.equal(REGIONS['320000'].name, '江苏省');
  assert.equal(REGIONS['370000'].basePopulation, 101527453);
  assert.equal(REGIONS['650000'].name, '新疆维吾尔自治区');
});

test('region comparison ranks regions for the same filters', () => {
  const comparison = getRegionComparison({
    gender: 'female',
    ageRange: '25-29',
    education: 'bachelor_plus'
  }, ['310000', '110000', '440000', '320000']);

  assert.equal(comparison.length, 4);
  assert.equal(comparison[0].region.code, '440000');
  assert.ok(comparison[0].estimatedPeople > comparison[1].estimatedPeople);
  assert.ok(comparison.every((item) => item.probabilityText.endsWith('%')));
});

test('dataset manifest lists raw import datasets with traceable commands', () => {
  const manifest = getDatasetManifest();

  assert.equal(manifest.length, 8);
  assert.equal(manifest[0].id, 'province_demographics_2020');
  assert.ok(manifest.every((dataset) => dataset.rawPath.startsWith('data/raw/')));
  assert.ok(manifest.every((dataset) => dataset.importCommand.startsWith('npm run import:')));
  assert.ok(manifest.some((dataset) => dataset.dimensions.includes('salary')));
  assert.ok(manifest.some((dataset) => dataset.dimensions.includes('commuteTolerance')));
  assert.ok(manifest.some((dataset) => dataset.dimensions.includes('jobMarket')));
  assert.ok(manifest.some((dataset) => dataset.dimensions.includes('youthInflow')));
  assert.ok(manifest.some((dataset) => dataset.dimensions.includes('employmentInsight')));
  assert.ok(manifest.some((dataset) => dataset.id === 'lifestyle_gender_age_2024'));
  assert.ok(manifest.some((dataset) => dataset.dimensions.includes('livingCostInsight')));
});

test('collection backlog tracks next public data acquisition work', () => {
  const backlog = getCollectionBacklog();

  assert.equal(backlog.updatedAt, '2026-07-07');
  assert.ok(backlog.items.length >= 6);
  assert.ok(backlog.statusLevels.includes('researching'));

  backlog.items.forEach((item) => {
    assert.ok(item.id);
    assert.ok(item.title);
    assert.ok(item.priority >= 1 && item.priority <= 4);
    assert.ok(backlog.statusLevels.includes(item.status));
    assert.ok(['官方统计', '行业报告', '模型估算'].includes(item.qualityTarget));
    assert.ok(item.sourceCandidates.length > 0);
    assert.ok(item.dimensions.length > 0);
    assert.ok(item.nextAction);
  });

  assert.ok(backlog.items.some((item) => item.dimensions.includes('youthInflow')));
  assert.ok(backlog.items.some((item) => item.dimensions.includes('rentIncomeRatio')));
  assert.ok(backlog.items.some((item) => item.dimensions.includes('relationshipIntent')));
});

test('data coverage audit separates seeded dimensions from upcoming dimensions', () => {
  const audit = getDataCoverageAudit();

  assert.equal(audit.seededDatasetCount, 8);
  assert.ok(audit.seededDimensions.includes('gender'));
  assert.ok(audit.seededDimensions.includes('salary'));
  assert.ok(audit.seededDimensions.includes('youthInflow'));
  assert.ok(audit.seededDimensions.includes('employmentInsight'));
  assert.ok(audit.seededDimensions.includes('smoking'));
  assert.ok(audit.seededDimensions.includes('drinking'));
  assert.ok(audit.seededDimensions.includes('livingCostInsight'));
  assert.equal(audit.upcomingDimensions.includes('youthInflow'), false);
  assert.equal(audit.upcomingDimensions.includes('employmentInsight'), false);
  assert.equal(audit.upcomingDimensions.includes('smoking'), false);
  assert.equal(audit.upcomingDimensions.includes('drinking'), false);
  assert.equal(audit.upcomingDimensions.includes('rentIncomeRatio'), false);
  assert.equal(audit.upcomingDimensions.includes('livingCostInsight'), false);
  assert.ok(audit.backlogByStatus.seeded >= 1);
  assert.ok(audit.backlogByStatus.researching >= 1);
});
