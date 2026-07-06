const SOURCES = {
  population_census: {
    id: 'population_census',
    title: '第七次全国人口普查与国家统计局公开数据',
    year: 2020,
    quality: '官方统计',
    url: 'https://www.stats.gov.cn/sj/pcsj/rkpc/7rp/indexch.htm',
    note: '用于地区常住人口、性别、年龄、受教育程度等基础口径。'
  },
  stats_yearbook: {
    id: 'stats_yearbook',
    title: '中国统计年鉴',
    year: 2024,
    quality: '官方统计',
    url: 'https://www.stats.gov.cn/sj/ndsj/',
    note: '用于就业、行业、工资等宏观统计口径。'
  },
  recruitment_reports: {
    id: 'recruitment_reports',
    title: '招聘平台公开薪酬报告汇总',
    year: 2024,
    quality: '行业报告',
    url: 'https://www.mohrss.gov.cn/',
    note: '用于补充分城市、分职业薪资区间，非逐人精确统计。'
  },
  lifestyle_reports: {
    id: 'lifestyle_reports',
    title: '公开健康与生活方式调查报告汇总',
    year: 2024,
    quality: '行业报告',
    url: 'https://www.nhc.gov.cn/',
    note: '用于吸烟、饮酒等生活方式估算。'
  },
  personality_model: {
    id: 'personality_model',
    title: '性格标签趣味估算模型',
    year: 2026,
    quality: '模型估算',
    url: 'https://data.stats.gov.cn/',
    note: '性格没有稳定官方分布，首版仅作趣味估算，不作为严肃统计。'
  }
};

exports.main = async (event = {}) => {
  const metricIds = event.metricIds || [];
  const notes = new Map();

  metricIds.forEach((metricId) => {
    if (metricId.startsWith('population_')) {
      notes.set('population_census', SOURCES.population_census);
    }
    if (metricId.startsWith('salary_')) {
      notes.set('recruitment_reports', SOURCES.recruitment_reports);
    }
    if (metricId.startsWith('personality_')) {
      notes.set('personality_model', SOURCES.personality_model);
    }
  });

  return Array.from(notes.values());
};
