const ASSET_CATALOG = require('../../../data/seed/catalog.json');
const DATASET_MANIFEST = require('../../../data/raw/datasets.json');

const QUALITY_LEVELS = ASSET_CATALOG.qualityLevels;
const SOURCES = ASSET_CATALOG.sources;
const REGIONS = ASSET_CATALOG.regions;
const DIMENSIONS = ASSET_CATALOG.dimensions;

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

function getRate(regionCode, key, value) {
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
  const source = SOURCES[dimension.sourceId];

  return {
    key,
    label: dimension.label,
    value,
    valueLabel: option.label,
    rate: regionRate || option.defaultRate,
    quality: source.quality,
    sourceId: dimension.sourceId,
    coverage: dimension.coverage,
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
    .map((key) => getRate(region.code, key, filters[key]))
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
      }))
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
  validateSeedData,
  REGIONS,
  DIMENSIONS,
  SOURCES,
  COMMENT_TEMPLATES
};
