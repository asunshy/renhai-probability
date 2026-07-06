const QUALITY_LEVELS = ['官方统计', '行业报告', '模型估算'];

const SOURCES = {
  population_census: {
    id: 'population_census',
    title: '第七次全国人口普查与国家统计局公开数据',
    year: 2020,
    quality: '官方统计',
    priority: 1,
    refreshCadence: '人口普查十年一次，年度人口抽样与统计年鉴补充',
    url: 'https://www.stats.gov.cn/sj/pcsj/rkpc/7rp/indexch.htm',
    note: '用于地区常住人口、性别、年龄、受教育程度等基础口径。'
  },
  stats_yearbook: {
    id: 'stats_yearbook',
    title: '中国统计年鉴',
    year: 2024,
    quality: '官方统计',
    priority: 1,
    refreshCadence: '每年跟随统计年鉴更新',
    url: 'https://www.stats.gov.cn/sj/ndsj/',
    note: '用于就业、行业、工资等宏观统计口径。'
  },
  recruitment_reports: {
    id: 'recruitment_reports',
    title: '招聘平台公开薪酬报告汇总',
    year: 2024,
    quality: '行业报告',
    priority: 2,
    refreshCadence: '每季度或半年复核一次公开报告',
    url: 'https://www.mohrss.gov.cn/',
    note: '用于补充分城市、分职业薪资区间，非逐人精确统计。'
  },
  lifestyle_reports: {
    id: 'lifestyle_reports',
    title: '公开健康与生活方式调查报告汇总',
    year: 2024,
    quality: '行业报告',
    priority: 2,
    refreshCadence: '每年复核卫健委、疾控和公开研究报告',
    url: 'https://www.nhc.gov.cn/',
    note: '用于吸烟、饮酒等生活方式估算。'
  },
  personality_model: {
    id: 'personality_model',
    title: '性格标签趣味估算模型',
    year: 2026,
    quality: '模型估算',
    priority: 3,
    refreshCadence: '随产品问卷与公开研究样本迭代',
    url: 'https://data.stats.gov.cn/',
    note: '性格没有稳定官方分布，首版仅作趣味估算，不作为严肃统计。'
  },
  housing_reports: {
    id: 'housing_reports',
    title: '住户调查、城市住房与行业研究报告汇总',
    year: 2024,
    quality: '行业报告',
    priority: 2,
    refreshCadence: '每半年复核统计年鉴、住户调查和行业研究',
    url: 'https://data.stats.gov.cn/',
    note: '用于住房、通勤容忍度等城市生活成本相关估算。'
  },
  body_lifestyle_model: {
    id: 'body_lifestyle_model',
    title: '身高、运动频率与生活习惯估算模型',
    year: 2026,
    quality: '模型估算',
    priority: 3,
    refreshCadence: '随权威体质调查与用户匿名反馈迭代',
    url: 'https://www.nhc.gov.cn/',
    note: '用于身高、运动频率等缺少地区交叉公开数据的维度。'
  }
};

const REGIONS = {
  '110000': { code: '110000', name: '北京市', basePopulation: 21893000 },
  '310000': { code: '310000', name: '上海市', basePopulation: 24870895 },
  '440000': { code: '440000', name: '广东省', basePopulation: 126012510 },
  '540000': { code: '540000', name: '西藏自治区', basePopulation: 3648100 },
  '000000': { code: '000000', name: '全国', basePopulation: 1411778724 }
};

const DIMENSIONS = {
  gender: {
    label: '性别',
    sourceId: 'population_census',
    options: {
      male: { label: '男', defaultRate: 0.512 },
      female: { label: '女', defaultRate: 0.488 }
    },
    regionRates: {
      '310000': { male: 0.517, female: 0.483 },
      '540000': { male: 0.505, female: 0.495 }
    }
  },
  ageRange: {
    label: '年龄',
    sourceId: 'population_census',
    options: {
      '20-24': { label: '20-24 岁', defaultRate: 0.071 },
      '25-29': { label: '25-29 岁', defaultRate: 0.074 },
      '30-34': { label: '30-34 岁', defaultRate: 0.081 },
      '35-39': { label: '35-39 岁', defaultRate: 0.078 }
    },
    regionRates: {
      '310000': { '25-29': 0.083, '30-34': 0.091 },
      '540000': { '35-39': 0.07 }
    }
  },
  education: {
    label: '学历',
    sourceId: 'population_census',
    options: {
      high_school_plus: { label: '高中及以上', defaultRate: 0.42 },
      college_plus: { label: '大专及以上', defaultRate: 0.22 },
      bachelor_plus: { label: '本科及以上', defaultRate: 0.115 },
      master_plus: { label: '硕士及以上', defaultRate: 0.018 }
    },
    regionRates: {
      '110000': { bachelor_plus: 0.31, master_plus: 0.075 },
      '310000': { bachelor_plus: 0.285, master_plus: 0.061 },
      '540000': { bachelor_plus: 0.082, master_plus: 0.015 }
    }
  },
  occupation: {
    label: '职业',
    sourceId: 'stats_yearbook',
    options: {
      tech: { label: '互联网/技术', defaultRate: 0.072 },
      finance: { label: '金融', defaultRate: 0.036 },
      education: { label: '教育科研', defaultRate: 0.071 },
      healthcare: { label: '医疗健康', defaultRate: 0.049 },
      public_service: { label: '公共服务/机关事业', defaultRate: 0.064 }
    },
    regionRates: {
      '310000': { tech: 0.126, finance: 0.082 },
      '440000': { tech: 0.101 },
      '540000': { finance: 0.025 }
    }
  },
  salary: {
    label: '月收入',
    sourceId: 'recruitment_reports',
    options: {
      '8k_plus': { label: '8k 以上', defaultRate: 0.31 },
      '12k_plus': { label: '12k 以上', defaultRate: 0.19 },
      '20k_plus': { label: '20k 以上', defaultRate: 0.082 },
      '50k_plus': { label: '50k 以上', defaultRate: 0.004 }
    },
    regionRates: {
      '110000': { '20k_plus': 0.141, '50k_plus': 0.011 },
      '310000': { '20k_plus': 0.052, '50k_plus': 0.014 },
      '540000': { '50k_plus': 0.006 }
    }
  },
  smoking: {
    label: '吸烟',
    sourceId: 'lifestyle_reports',
    options: {
      no: { label: '不吸烟', defaultRate: 0.735 },
      yes: { label: '接受吸烟', defaultRate: 1 }
    }
  },
  drinking: {
    label: '饮酒',
    sourceId: 'lifestyle_reports',
    options: {
      light_or_no: { label: '少喝或不喝', defaultRate: 0.68 },
      social_ok: { label: '社交饮酒可接受', defaultRate: 0.88 }
    },
    regionRates: {
      '540000': { light_or_no: 0.75 }
    }
  },
  personality: {
    label: '性格',
    sourceId: 'personality_model',
    options: {
      extrovert: { label: '外向表达型', defaultRate: 0.33 },
      introvert: { label: '内向稳定型', defaultRate: 0.31 },
      intj_like: { label: '理性规划型', defaultRate: 0.02 },
      gentle: { label: '温和共情型', defaultRate: 0.27 }
    }
  },
  height: {
    label: '身高',
    sourceId: 'body_lifestyle_model',
    options: {
      any_reasonable: { label: '别太离谱就行', defaultRate: 0.92 },
      '155_165': { label: '155-165 cm', defaultRate: 0.28 },
      '165_175': { label: '165-175 cm', defaultRate: 0.36 },
      '175_185': { label: '175-185 cm', defaultRate: 0.23 },
      '185_plus': { label: '185 cm 以上', defaultRate: 0.045 }
    }
  },
  exercise: {
    label: '运动习惯',
    sourceId: 'body_lifestyle_model',
    options: {
      not_required: { label: '不要求', defaultRate: 1 },
      weekly: { label: '每周运动', defaultRate: 0.38 },
      frequent: { label: '高频运动', defaultRate: 0.16 }
    }
  },
  homeOwnership: {
    label: '居住资产',
    sourceId: 'housing_reports',
    options: {
      not_required: { label: '不要求', defaultRate: 1 },
      has_home: { label: '有自有住房', defaultRate: 0.41 },
      no_pressure: { label: '无明显居住压力', defaultRate: 0.52 }
    },
    regionRates: {
      '310000': { has_home: 0.32 },
      '440000': { has_home: 0.36 },
      '110000': { has_home: 0.31 }
    }
  },
  commuteTolerance: {
    label: '通勤距离',
    sourceId: 'housing_reports',
    options: {
      not_required: { label: '不要求', defaultRate: 1 },
      same_city: { label: '同城生活圈', defaultRate: 0.72 },
      within_hour: { label: '一小时内可见面', defaultRate: 0.54 }
    }
  }
};

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
      options: Object.entries(dimension.options).map(([value, option]) => ({
        value,
        label: option.label,
        defaultRate: option.defaultRate
      }))
    }))
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

  Object.entries(DIMENSIONS).forEach(([key, dimension]) => {
    const source = SOURCES[dimension.sourceId];
    if (!source) {
      missingSources.push(key);
      return;
    }
    if (!QUALITY_LEVELS.includes(source.quality)) {
      invalidQualityLevels.push(key);
    }
  });

  Object.values(SOURCES).forEach((source) => {
    if (!QUALITY_LEVELS.includes(source.quality)) {
      invalidQualityLevels.push(source.id);
    }
  });

  return {
    ok: missingSources.length === 0 && invalidQualityLevels.length === 0,
    missingSources,
    invalidQualityLevels
  };
}

module.exports = {
  calculateProbability,
  getFilterOptions,
  getSourceNotes,
  getDataCatalog,
  validateSeedData,
  REGIONS,
  DIMENSIONS,
  SOURCES,
  COMMENT_TEMPLATES
};
