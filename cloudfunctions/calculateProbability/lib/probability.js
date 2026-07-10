const ASSET_CATALOG = require('../../../data/seed/catalog.json');
const DATASET_MANIFEST = require('../../../data/raw/datasets.json');
const COLLECTION_BACKLOG = require('../../../data/raw/collection-backlog.json');

const QUALITY_LEVELS = ASSET_CATALOG.qualityLevels;
const SOURCES = ASSET_CATALOG.sources;
const REGIONS = ASSET_CATALOG.regions;
const DIMENSIONS = ASSET_CATALOG.dimensions;
const BENCHMARKS = ASSET_CATALOG.benchmarks || {};

const COMMENT_TEMPLATES = [
  {
    band: 'high',
    tone: 'light',
    min: 0.02,
    text: '这条件不算离谱，街角奶茶店都可能坐着候选人。别只盯着屏幕，人海也需要刷新。'
  },
  {
    band: 'medium',
    tone: 'clear',
    min: 0.001,
    text: '不是没有，是需要你多出门几次。标准可以有，但别把世界筛到静音。'
  },
  {
    band: 'low',
    tone: 'warm',
    min: 0,
    text: '标准越精确，世界越安静。也许可以给真实的人留一点余地。'
  }
];

function getRegion(regionCode) {
  return REGIONS[regionCode] || REGIONS['000000'];
}

function getSegmentRate(dimension, value, filters = {}) {
  if (!dimension.segmentRates) {
    return null;
  }

  const segmentPriority = [
    ['gender', filters.gender],
    ['ageRange', filters.ageRange],
    ['occupation', filters.occupation]
  ];

  for (const [segmentType, segmentKey] of segmentPriority) {
    const rate = segmentKey
      && dimension.segmentRates[segmentType]
      && dimension.segmentRates[segmentType][segmentKey]
      && dimension.segmentRates[segmentType][segmentKey][value];
    if (typeof rate === 'number') {
      return {
        rate,
        segmentType,
        segmentKey
      };
    }
  }

  return null;
}

function getRate(regionCode, key, value, filters = {}) {
  const dimension = DIMENSIONS[key];
  if (!dimension || value === undefined || value === null || value === '') {
    return null;
  }

  const option = dimension.options[value];
  if (!option) {
    return {
      key,
      label: dimension.label,
      value,
      valueLabel: '暂不支持',
      rate: 1,
      quality: '模型估算',
      sourceId: 'personality_model',
      note: '该条件暂未纳入首版数据，计算时不缩小人群。'
    };
  }

  const regionRate = dimension.regionRates && dimension.regionRates[regionCode] && dimension.regionRates[regionCode][value];
  const segmentRate = getSegmentRate(dimension, value, filters);
  const source = SOURCES[dimension.sourceId];

  return {
    key,
    label: dimension.label,
    value,
    valueLabel: option.label,
    rate: segmentRate ? segmentRate.rate : (regionRate || option.defaultRate),
    quality: source.quality,
    sourceId: dimension.sourceId,
    coverage: dimension.coverage,
    segment: segmentRate ? {
      type: segmentRate.segmentType,
      value: segmentRate.segmentKey
    } : null,
    note: source.note
  };
}

function calculateConfidence(factors) {
  if (factors.some((factor) => factor.quality === '模型估算')) {
    return { level: '低', text: '包含模型估算维度，适合趣味参考。' };
  }
  if (factors.some((factor) => factor.quality === '行业报告')) {
    return { level: '中', text: '包含行业报告补充，适合趋势判断。' };
  }
  return { level: '高', text: '主要基于官方统计口径。' };
}

function pickComment(probability) {
  return COMMENT_TEMPLATES.find((template) => probability >= template.min) || COMMENT_TEMPLATES[COMMENT_TEMPLATES.length - 1];
}

function calculateProbability(filters = {}) {
  const region = getRegion(filters.regionCode);
  const factors = Object.keys(DIMENSIONS)
    .map((key) => getRate(region.code, key, filters[key], filters))
    .filter(Boolean);

  const combinedRate = factors.reduce((value, factor) => value * factor.rate, 1);
  const estimatedPeople = Math.max(0, Math.round(region.basePopulation * combinedRate));
  const probability = Number(combinedRate.toFixed(8));
  const rarestFactor = factors.slice().sort((a, b) => a.rate - b.rate)[0] || null;
  const metricIds = [`population_${region.code}`, ...factors.map((factor) => `${factor.key}_${region.code}`)];
  const sourceNotes = getSourceNotes(metricIds, factors);
  const flags = [];

  if (estimatedPeople < 50 || probability < 0.000001) {
    flags.push('estimate_unstable');
  }
  if (factors.some((factor) => factor.quality !== '官方统计')) {
    flags.push('contains_non_official_data');
  }
  if (factors.some((factor) => factor.coverage !== 'regional')) {
    flags.push('contains_estimated_or_partial_coverage');
  }

  return {
    region,
    filters,
    basePopulation: region.basePopulation,
    estimatedPeople,
    probability,
    probabilityText: `${(probability * 100).toFixed(probability < 0.001 ? 4 : 2)}%`,
    factors,
    rarestFactor,
    confidence: calculateConfidence(factors),
    comment: pickComment(probability),
    employmentInsight: getEmploymentInsight(region.code, filters),
    livingCostInsight: getLivingCostInsight(region.code, filters),
    marriageTrendInsight: getMarriageTrendInsight(),
    youthEmploymentPressureInsight: getYouthEmploymentPressureInsight(filters),
    incomeTrendInsight: getIncomeTrendInsight(),
    sourceNotes,
    flags
  };
}

function getRegionComparison(filters = {}, regionCodes = []) {
  const codes = regionCodes.length > 0
    ? regionCodes
    : Object.keys(REGIONS).filter((code) => code !== '000000');

  return codes
    .map((regionCode) => calculateProbability({ ...filters, regionCode }))
    .sort((a, b) => b.estimatedPeople - a.estimatedPeople)
    .map((result) => ({
      region: result.region,
      estimatedPeople: result.estimatedPeople,
      probability: result.probability,
      probabilityText: result.probabilityText,
      confidence: result.confidence,
      rarestFactor: result.rarestFactor
    }));
}

function getFilterOptions(regionCode = '000000') {
  const region = getRegion(regionCode);
  const dimensions = {};

  Object.keys(DIMENSIONS).forEach((key) => {
    dimensions[key] = Object.entries(DIMENSIONS[key].options).map(([value, option]) => ({
      value,
      label: option.label
    }));
  });

  return {
    region,
    regions: Object.values(REGIONS),
    dimensions
  };
}

function getDataCatalog() {
  return {
    sources: Object.values(SOURCES).map((source) => ({ ...source })),
    dimensions: Object.entries(DIMENSIONS).map(([key, dimension]) => ({
      key,
      label: dimension.label,
      sourceId: dimension.sourceId,
      quality: SOURCES[dimension.sourceId].quality,
      coverage: dimension.coverage,
      options: Object.entries(dimension.options).map(([value, option]) => ({
        value,
        label: option.label,
        defaultRate: option.defaultRate
      })),
      segmentRates: dimension.segmentRates || null
    }))
  };
}

function getCoverageSummary() {
  const catalog = getDataCatalog();
  const qualityCounts = {};

  catalog.sources.forEach((source) => {
    qualityCounts[source.quality] = qualityCounts[source.quality] || 0;
  });

  catalog.dimensions.forEach((dimension) => {
    qualityCounts[dimension.quality] = (qualityCounts[dimension.quality] || 0) + 1;
  });

  const needsRegionalData = catalog.dimensions
    .filter((dimension) => dimension.coverage !== 'regional')
    .map((dimension) => ({
      key: dimension.key,
      label: dimension.label,
      coverage: dimension.coverage,
      quality: dimension.quality
    }));

  const nextRefresh = catalog.sources
    .slice()
    .sort((a, b) => a.priority - b.priority || a.year - b.year)
    .map((source) => ({
      id: source.id,
      title: source.title,
      quality: source.quality,
      priority: source.priority,
      refreshCadence: source.refreshCadence
    }));

  return {
    totalSources: catalog.sources.length,
    totalDimensions: catalog.dimensions.length,
    qualityCounts,
    needsRegionalData,
    nextRefresh
  };
}

function getDatasetManifest() {
  return DATASET_MANIFEST.map((dataset) => ({ ...dataset }));
}

function getBenchmarkCatalog() {
  return JSON.parse(JSON.stringify(BENCHMARKS));
}

function formatCny(value) {
  return `${Math.round(value / 1000)}k`;
}

function getEmploymentInsight(regionCode, filters = {}) {
  const occupationKey = filters.occupation;
  const benchmark = BENCHMARKS.industrySalary;

  if (!occupationKey || !benchmark || !benchmark.metrics) {
    return null;
  }

  const regionMetrics = benchmark.metrics[regionCode];
  const salary = regionMetrics && regionMetrics[occupationKey];
  const occupation = DIMENSIONS.occupation && DIMENSIONS.occupation.options[occupationKey];
  const source = SOURCES[benchmark.sourceId];

  if (!salary || !occupation || !source) {
    return null;
  }

  return {
    region: getRegion(regionCode),
    occupation: {
      key: occupationKey,
      label: occupation.label
    },
    monthlySalary: salary,
    salaryText: `${formatCny(salary.p25)}-${formatCny(salary.p75)} / 月，中位数约 ${formatCny(salary.p50)} / 月`,
    quality: source.quality,
    sourceId: benchmark.sourceId,
    note: source.note
  };
}

function getLivingCostInsight(regionCode, filters = {}) {
  const benchmark = BENCHMARKS.cityRentPressure;
  if (!benchmark || !benchmark.metrics || !benchmark.metrics[regionCode]) {
    return null;
  }

  const rent = benchmark.metrics[regionCode];
  const source = SOURCES[benchmark.sourceId];
  const employmentInsight = getEmploymentInsight(regionCode, filters);
  const computedRatio = employmentInsight
    ? Number((rent.studioRent / employmentInsight.monthlySalary.p50).toFixed(2))
    : rent.typicalRentIncomeRatio;

  if (!source) {
    return null;
  }

  return {
    region: getRegion(regionCode),
    rent,
    rentPressureRatio: computedRatio,
    rentPressureText: `单间约 ${formatCny(rent.studioRent)} / 月，一居约 ${formatCny(rent.oneBedroomRent)} / 月；租金压力约 ${(computedRatio * 100).toFixed(0)}%`,
    pressureLevel: rent.pressureLevel,
    quality: source.quality,
    sourceId: benchmark.sourceId,
    note: source.note
  };
}

function getMarriageTrendInsight() {
  const benchmark = BENCHMARKS.marriageTrend;
  if (!benchmark || !Array.isArray(benchmark.metrics) || benchmark.metrics.length === 0) {
    return null;
  }

  const source = SOURCES[benchmark.sourceId];
  if (!source) {
    return null;
  }

  const metrics = benchmark.metrics.slice().sort((a, b) => a.year - b.year);
  const first = metrics[0];
  const latest = metrics[metrics.length - 1];
  const previous = metrics[metrics.length - 2] || null;
  const changeSinceFirst = Number(
    ((latest.marriageRegistrations - first.marriageRegistrations) / first.marriageRegistrations).toFixed(4)
  );
  const yearOverYearChange = previous
    ? Number(((latest.marriageRegistrations - previous.marriageRegistrations) / previous.marriageRegistrations).toFixed(4))
    : null;

  return {
    latest,
    first,
    changeSinceFirst,
    yearOverYearChange,
    trendText: `2024 年全国结婚登记约 ${(latest.marriageRegistrations / 10000).toFixed(1)} 万对，较 ${first.year} 年变化 ${(changeSinceFirst * 100).toFixed(1)}%。这不是筛掉谁，而是提醒：长期关系变少，真实相遇更值得认真对待。`,
    quality: source.quality,
    sourceId: benchmark.sourceId,
    note: source.note
  };
}

function getYouthEmploymentPressureInsight(filters = {}) {
  const benchmark = BENCHMARKS.youthUnemploymentTrend;
  if (!benchmark || !Array.isArray(benchmark.metrics) || benchmark.metrics.length === 0) {
    return null;
  }

  const source = SOURCES[benchmark.sourceId];
  if (!source) {
    return null;
  }

  const group = getUnemploymentGroup(filters.ageRange);
  const metrics = benchmark.metrics
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((item) => ({
      ...item,
      selectedRate: item[group.key]
    }));
  const latest = metrics[metrics.length - 1];
  const peak = metrics.slice().sort((a, b) => b.selectedRate - a.selectedRate)[0];
  const averageRate = Number(
    (metrics.reduce((sum, item) => sum + item.selectedRate, 0) / metrics.length).toFixed(4)
  );

  return {
    selectedGroup: group,
    latest,
    peak,
    averageRate,
    summaryText: `${group.label} 2024 年末城镇调查失业率约 ${(latest.selectedRate * 100).toFixed(1)}%，全年高点为 ${peak.month} 的 ${(peak.selectedRate * 100).toFixed(1)}%。这项只解释就业环境，不代表具体个人状态。`,
    quality: source.quality,
    sourceId: benchmark.sourceId,
    note: source.note
  };
}

function getIncomeTrendInsight() {
  const benchmark = BENCHMARKS.incomeTrend;
  if (!benchmark || !Array.isArray(benchmark.metrics) || benchmark.metrics.length === 0) {
    return null;
  }

  const source = SOURCES[benchmark.sourceId];
  if (!source) {
    return null;
  }

  const metrics = benchmark.metrics.slice().sort((a, b) => a.year - b.year);
  const first = metrics[0];
  const latest = metrics[metrics.length - 1];
  const fiveYearNominalGrowth = Number(
    ((latest.nationalDisposableIncomePerCapita - first.nationalDisposableIncomePerCapita)
      / first.nationalDisposableIncomePerCapita).toFixed(4)
  );
  const urbanMonthly = Math.round(latest.urbanDisposableIncomePerCapita / 12);
  const nationalMonthly = Math.round(latest.nationalDisposableIncomePerCapita / 12);

  return {
    latest,
    first,
    realGrowthRate: latest.realGrowthRate,
    fiveYearNominalGrowth,
    monthlyReference: {
      urbanDisposableIncomePerCapita: urbanMonthly,
      nationalDisposableIncomePerCapita: nationalMonthly
    },
    summaryText: `2024 年全国居民人均可支配收入约 ${latest.nationalDisposableIncomePerCapita.toLocaleString('zh-CN')} 元，城镇居民约 ${latest.urbanDisposableIncomePerCapita.toLocaleString('zh-CN')} 元；收入真实增长约 ${(latest.realGrowthRate * 100).toFixed(1)}%。这项用于理解生活成本背景，不判断个人收入。`,
    quality: source.quality,
    sourceId: benchmark.sourceId,
    note: source.note
  };
}

function getUnemploymentGroup(ageRange) {
  if (ageRange === '25-29') {
    return {
      key: 'age25_29ExcludingStudents',
      label: '25-29 岁'
    };
  }
  if (ageRange === '30-34' || ageRange === '35-39') {
    return {
      key: 'age30_59',
      label: '30-59 岁'
    };
  }
  return {
    key: 'age16_24ExcludingStudents',
    label: '16-24 岁'
  };
}

function getCollectionBacklog() {
  return {
    ...COLLECTION_BACKLOG,
    items: COLLECTION_BACKLOG.items.map((item) => ({ ...item }))
  };
}

function getDataCoverageAudit() {
  const backlog = getCollectionBacklog();
  const datasets = getDatasetManifest();
  const seededDimensions = new Set();

  datasets.forEach((dataset) => {
    dataset.dimensions.forEach((dimension) => seededDimensions.add(dimension));
  });

  const backlogByStatus = backlog.statusLevels.reduce((summary, status) => {
    summary[status] = backlog.items.filter((item) => item.status === status).length;
    return summary;
  }, {});

  const upcomingDimensions = Array.from(new Set(
    backlog.items
      .filter((item) => item.status !== 'blocked_by_source')
      .flatMap((item) => item.dimensions)
      .filter((dimension) => !seededDimensions.has(dimension))
  ));

  const officialPriorityItems = backlog.items
    .filter((item) => item.qualityTarget === '官方统计')
    .sort((a, b) => a.priority - b.priority)
    .map((item) => ({
      id: item.id,
      title: item.title,
      priority: item.priority,
      status: item.status,
      dimensions: item.dimensions,
      nextAction: item.nextAction
    }));

  return {
    updatedAt: backlog.updatedAt,
    seededDatasetCount: datasets.length,
    seededDimensions: Array.from(seededDimensions).sort(),
    backlogCount: backlog.items.length,
    backlogByStatus,
    upcomingDimensions,
    officialPriorityItems
  };
}

function getDataQualityDashboard() {
  const catalog = getDataCatalog();
  const audit = getDataCoverageAudit();
  const byQuality = {};
  const byCoverage = {};

  catalog.dimensions.forEach((dimension) => {
    byQuality[dimension.quality] = byQuality[dimension.quality] || [];
    byQuality[dimension.quality].push({
      key: dimension.key,
      label: dimension.label,
      coverage: dimension.coverage
    });

    byCoverage[dimension.coverage] = byCoverage[dimension.coverage] || [];
    byCoverage[dimension.coverage].push({
      key: dimension.key,
      label: dimension.label,
      quality: dimension.quality
    });
  });

  const weakestDimensions = catalog.dimensions
    .filter((dimension) => dimension.quality !== '官方统计' || dimension.coverage !== 'regional')
    .map((dimension) => ({
      key: dimension.key,
      label: dimension.label,
      quality: dimension.quality,
      coverage: dimension.coverage,
      reason: dimension.quality === '模型估算'
        ? '缺少稳定公开统计，当前仅作趣味或解释参考。'
        : '已有公开资料，但仍缺少更完整的地区/人群交叉口径。'
    }));

  return {
    generatedFrom: 'data/seed/catalog.json',
    summary: {
      totalDimensions: catalog.dimensions.length,
      totalSources: catalog.sources.length,
      totalDatasets: audit.seededDatasetCount,
      backlogCount: audit.backlogCount
    },
    byQuality,
    byCoverage,
    seededDimensions: audit.seededDimensions,
    upcomingDimensions: audit.upcomingDimensions,
    weakestDimensions
  };
}

function getSourceNotes(metricIds = [], factors = []) {
  const notesById = new Map();

  metricIds.forEach((metricId) => {
    if (metricId.startsWith('population_')) {
      notesById.set('population_census', SOURCES.population_census);
    }
    if (metricId.startsWith('salary_')) {
      notesById.set('recruitment_reports', SOURCES.recruitment_reports);
    }
    if (metricId.startsWith('personality_')) {
      notesById.set('personality_model', SOURCES.personality_model);
    }
    if (metricId.startsWith('height_') || metricId.startsWith('exercise_')) {
      notesById.set('body_lifestyle_model', SOURCES.body_lifestyle_model);
    }
    if (metricId.startsWith('homeOwnership_') || metricId.startsWith('commuteTolerance_')) {
      notesById.set('housing_reports', SOURCES.housing_reports);
    }
  });

  factors.forEach((factor) => {
    if (SOURCES[factor.sourceId]) {
      notesById.set(factor.sourceId, SOURCES[factor.sourceId]);
    }
  });

  return Array.from(notesById.values());
}

function validateSeedData() {
  const missingSources = [];
  const invalidQualityLevels = [];
  const invalidRates = [];

  Object.entries(DIMENSIONS).forEach(([key, dimension]) => {
    const source = SOURCES[dimension.sourceId];
    if (!source) {
      missingSources.push(key);
      return;
    }
    if (!QUALITY_LEVELS.includes(source.quality)) {
      invalidQualityLevels.push(key);
    }
    Object.entries(dimension.options).forEach(([value, option]) => {
      if (typeof option.defaultRate !== 'number' || option.defaultRate < 0 || option.defaultRate > 1) {
        invalidRates.push(`${key}.${value}`);
      }
    });
  });

  Object.values(SOURCES).forEach((source) => {
    if (!QUALITY_LEVELS.includes(source.quality)) {
      invalidQualityLevels.push(source.id);
    }
  });

  return {
    ok: missingSources.length === 0 && invalidQualityLevels.length === 0 && invalidRates.length === 0,
    missingSources,
    invalidQualityLevels,
    invalidRates
  };
}

module.exports = {
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
  getMarriageTrendInsight,
  getYouthEmploymentPressureInsight,
  getIncomeTrendInsight,
  getCollectionBacklog,
  getDataCoverageAudit,
  getDataQualityDashboard,
  validateSeedData,
  REGIONS,
  DIMENSIONS,
  SOURCES,
  COMMENT_TEMPLATES
};
