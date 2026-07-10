const labels = {
  gender: '性别',
  ageRange: '年龄',
  education: '学历',
  occupation: '职业',
  salary: '月收入',
  smoking: '吸烟',
  drinking: '饮酒',
  personality: '性格',
  height: '身高',
  exercise: '运动习惯',
  homeOwnership: '居住资产',
  commuteTolerance: '通勤距离',
  jobMarket: '就业行情',
  youthInflow: '青年活跃度',
  workStyle: '工作节奏'
};

const defaultFilters = {
  regionCode: '440300',
  gender: 'male',
  ageRange: '25-29',
  education: 'bachelor_plus',
  occupation: 'tech',
  salary: '20k_plus',
  jobMarket: 'active_market',
  youthInflow: 'talent_density',
  workStyle: 'remote_friendly',
  smoking: 'no',
  drinking: 'light_or_no'
};

let seed;

function formatPeople(value) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)} 万`;
  }
  return String(value);
}

function getSegmentRate(dimension, value, filters) {
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
      return { rate, segmentType, segmentKey };
    }
  }

  return null;
}

function getRate(regionCode, key, value, filters) {
  const dimension = seed.catalog.dimensions.find((item) => item.key === key);
  const source = seed.catalog.sources.find((item) => item.id === dimension.sourceId);
  const option = dimension.options.find((item) => item.value === value);
  const segmentRate = getSegmentRate(dimension, value, filters);

  if (!option) {
    return null;
  }

  return {
    key,
    label: dimension.label,
    valueLabel: option.label,
    rate: segmentRate ? segmentRate.rate : option.defaultRate,
    quality: source.quality,
    sourceId: source.id,
    segment: segmentRate ? {
      type: segmentRate.segmentType,
      value: segmentRate.segmentKey
    } : null
  };
}

function calculateInBrowser(filters) {
  const region = seed.options.regions.find((item) => item.code === filters.regionCode) || seed.options.regions[0];
  const factors = Object.keys(labels)
    .map((key) => filters[key] ? getRate(region.code, key, filters[key], filters) : null)
    .filter(Boolean);
  const probability = factors.reduce((value, factor) => value * factor.rate, 1);
  const estimatedPeople = Math.round(region.basePopulation * probability);
  const rarestFactor = factors.slice().sort((a, b) => a.rate - b.rate)[0] || null;
  const confidence = factors.some((factor) => factor.quality === '模型估算')
    ? { level: '低', text: '包含模型估算维度，适合趣味参考。' }
    : factors.some((factor) => factor.quality === '行业报告')
      ? { level: '中', text: '包含行业报告补充，适合趋势判断。' }
      : { level: '高', text: '主要基于官方统计口径。' };
  const comment = probability >= 0.02
    ? '这条件不算离谱，街角奶茶店都可能坐着候选人。别只盯着屏幕，人海也需要刷新。'
    : probability >= 0.001
      ? '不是没有，是需要你多出门几次。标准可以有，但别把世界筛到静音。'
      : '标准越精确，世界越安静。也许可以给真实的人留一点余地。';

  return {
    region,
    factors,
    estimatedPeople,
    probability,
    probabilityText: `${(probability * 100).toFixed(probability < 0.001 ? 4 : 2)}%`,
    rarestFactor,
    confidence,
    comment,
    employmentInsight: getEmploymentInsight(region.code, filters),
    livingCostInsight: getLivingCostInsight(region.code, filters),
    marriageTrendInsight: getMarriageTrendInsight(),
    youthEmploymentPressureInsight: getYouthEmploymentPressureInsight(filters),
    incomeTrendInsight: getIncomeTrendInsight()
  };
}

function formatCny(value) {
  return `${Math.round(value / 1000)}k`;
}

function getEmploymentInsight(regionCode, filters) {
  if (!filters.occupation || !seed.benchmarks.industrySalary) {
    return null;
  }

  const benchmark = seed.benchmarks.industrySalary;
  const salary = benchmark.metrics[regionCode] && benchmark.metrics[regionCode][filters.occupation];
  const occupation = seed.options.dimensions.occupation.find((item) => item.value === filters.occupation);
  const source = seed.catalog.sources.find((item) => item.id === benchmark.sourceId);

  if (!salary || !occupation || !source) {
    return null;
  }

  return {
    occupationLabel: occupation.label,
    monthlySalary: salary,
    salaryText: `${formatCny(salary.p25)}-${formatCny(salary.p75)} / 月，中位数约 ${formatCny(salary.p50)} / 月`,
    quality: source.quality,
    note: source.note
  };
}

function getLivingCostInsight(regionCode, filters) {
  if (!seed.benchmarks.cityRentPressure) {
    return null;
  }

  const benchmark = seed.benchmarks.cityRentPressure;
  const rent = benchmark.metrics[regionCode];
  const source = seed.catalog.sources.find((item) => item.id === benchmark.sourceId);

  if (!rent || !source) {
    return null;
  }

  const employmentInsight = getEmploymentInsight(regionCode, filters);
  const ratio = employmentInsight
    ? Number((rent.studioRent / employmentInsight.monthlySalary.p50).toFixed(2))
    : rent.typicalRentIncomeRatio;

  return {
    rentPressureText: `单间约 ${formatCny(rent.studioRent)} / 月，一居约 ${formatCny(rent.oneBedroomRent)} / 月；租金压力约 ${(ratio * 100).toFixed(0)}%`,
    quality: source.quality,
    note: source.note
  };
}

function getMarriageTrendInsight() {
  if (!seed.benchmarks.marriageTrend || !seed.benchmarks.marriageTrend.metrics.length) {
    return null;
  }

  const benchmark = seed.benchmarks.marriageTrend;
  const metrics = benchmark.metrics.slice().sort((a, b) => a.year - b.year);
  const first = metrics[0];
  const latest = metrics[metrics.length - 1];
  const previous = metrics[metrics.length - 2] || null;
  const source = seed.catalog.sources.find((item) => item.id === benchmark.sourceId);

  if (!source) {
    return null;
  }

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
    note: source.note
  };
}

function getYouthEmploymentPressureInsight(filters) {
  if (!seed.benchmarks.youthUnemploymentTrend || !seed.benchmarks.youthUnemploymentTrend.metrics.length) {
    return null;
  }

  const benchmark = seed.benchmarks.youthUnemploymentTrend;
  const source = seed.catalog.sources.find((item) => item.id === benchmark.sourceId);
  const group = getUnemploymentGroup(filters.ageRange);

  if (!source) {
    return null;
  }

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
    note: source.note
  };
}

function getIncomeTrendInsight() {
  if (!seed.benchmarks.incomeTrend || !seed.benchmarks.incomeTrend.metrics.length) {
    return null;
  }

  const benchmark = seed.benchmarks.incomeTrend;
  const source = seed.catalog.sources.find((item) => item.id === benchmark.sourceId);

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

  return {
    latest,
    first,
    realGrowthRate: latest.realGrowthRate,
    fiveYearNominalGrowth,
    summaryText: `2024 年全国居民人均可支配收入约 ${latest.nationalDisposableIncomePerCapita.toLocaleString('zh-CN')} 元，城镇居民约 ${latest.urbanDisposableIncomePerCapita.toLocaleString('zh-CN')} 元；收入真实增长约 ${(latest.realGrowthRate * 100).toFixed(1)}%。这项用于理解生活成本背景，不判断个人收入。`,
    quality: source.quality,
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

function renderMarriageTrendInsight(insight) {
  const panel = document.querySelector('#relationshipPanel');
  const quality = document.querySelector('#relationshipQuality');
  const summary = document.querySelector('#relationshipSummary');

  if (!insight) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  quality.textContent = insight.quality;
  summary.textContent = `${insight.trendText}${insight.note}`;
}

function renderYouthEmploymentPressureInsight(insight) {
  const panel = document.querySelector('#youthEmploymentPanel');
  const quality = document.querySelector('#youthEmploymentQuality');
  const summary = document.querySelector('#youthEmploymentSummary');

  if (!insight) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  quality.textContent = insight.quality;
  summary.textContent = `${insight.summaryText}${insight.note}`;
}

function renderIncomeTrendInsight(insight) {
  const panel = document.querySelector('#incomePanel');
  const quality = document.querySelector('#incomeQuality');
  const summary = document.querySelector('#incomeSummary');

  if (!insight) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  quality.textContent = insight.quality;
  summary.textContent = `${insight.summaryText}${insight.note}`;
}

function buildRelaxAdvice(result) {
  if (!result.rarestFactor) {
    return '可以先选择几个核心条件，再看哪一项最影响结果。';
  }
  return `可以先放宽「${result.rarestFactor.label}」这一项：当前「${result.rarestFactor.valueLabel}」只覆盖约 ${(result.rarestFactor.rate * 100).toFixed(result.rarestFactor.rate < 0.01 ? 2 : 1)}% 的人群，稍微松一点，人海会明显热闹。`;
}

function buildShareSummary(result) {
  return `${result.region.name} · 约 ${formatPeople(result.estimatedPeople)} 人 · ${result.probabilityText}。适合截图分享，但别拿它替真实的人下结论。`;
}

function makeOption(value, label, selectedValue) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  option.selected = value === selectedValue;
  return option;
}

function renderFilters() {
  const form = document.querySelector('#filters');
  const regionSelect = form.querySelector('[name="regionCode"]');

  seed.options.regions.forEach((region) => {
    regionSelect.appendChild(makeOption(region.code, region.name, defaultFilters.regionCode));
  });

  Object.entries(labels).forEach(([key, label]) => {
    const field = document.createElement('label');
    const title = document.createElement('span');
    const select = document.createElement('select');

    title.textContent = label;
    select.name = key;
    select.appendChild(makeOption('', '不限', defaultFilters[key]));
    (seed.options.dimensions[key] || []).forEach((item) => {
      select.appendChild(makeOption(item.value, item.label, defaultFilters[key]));
    });

    field.append(title, select);
    form.appendChild(field);
  });
}

function collectFilters() {
  const data = new FormData(document.querySelector('#filters'));
  const filters = {};

  data.forEach((value, key) => {
    if (value) {
      filters[key] = value;
    }
  });

  return filters;
}

function renderResult(result) {
  document.querySelector('#regionName').textContent = result.region.name;
  document.querySelector('#confidence').textContent = `可信度：${result.confidence.level}`;
  document.querySelector('#people').textContent = `约 ${formatPeople(result.estimatedPeople)} 人`;
  document.querySelector('#probability').textContent = `约占目标区域常住人口 ${result.probabilityText}`;
  document.querySelector('#comment').textContent = result.comment;
  document.querySelector('#relaxAdvice').textContent = buildRelaxAdvice(result);
  document.querySelector('#shareSummary').textContent = buildShareSummary(result);
  document.querySelector('#rarest').textContent = result.rarestFactor
    ? `最稀缺：${result.rarestFactor.label} · ${result.rarestFactor.valueLabel}`
    : '最稀缺：暂无';

  const meterDeg = Math.max(5, Math.min(360, result.probability * 3600));
  document.querySelector('.meter-ring').style.setProperty('--meter', `${meterDeg}deg`);
  document.querySelector('#meterValue').textContent = result.probabilityText;
  renderEmploymentInsight(result.employmentInsight);
  renderLivingCostInsight(result.livingCostInsight);
  renderMarriageTrendInsight(result.marriageTrendInsight);
  renderYouthEmploymentPressureInsight(result.youthEmploymentPressureInsight);
  renderIncomeTrendInsight(result.incomeTrendInsight);

  const factors = document.querySelector('#factors');
  factors.replaceChildren();
  result.factors.forEach((factor) => {
    const row = document.createElement('div');
    const meta = document.createElement('div');
    const name = document.createElement('span');
    const quality = document.createElement('span');
    const bar = document.createElement('div');
    const fill = document.createElement('i');

    row.className = 'factor-row';
    meta.className = 'factor-meta';
    name.textContent = `${factor.label}：${factor.valueLabel}`;
    quality.className = 'quality';
    quality.textContent = `${(factor.rate * 100).toFixed(factor.rate < 0.01 ? 2 : 1)}% · ${factor.quality}`;
    bar.className = 'bar';
    fill.style.width = `${Math.max(4, Math.min(100, factor.rate * 100))}%`;

    meta.append(name, quality);
    bar.appendChild(fill);
    row.append(meta, bar);
    factors.appendChild(row);
  });
}

function renderLivingCostInsight(insight) {
  const panel = document.querySelector('#livingPanel');
  const quality = document.querySelector('#livingQuality');
  const summary = document.querySelector('#livingSummary');

  if (!insight) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  quality.textContent = insight.quality;
  summary.textContent = `${insight.rentPressureText}。${insight.note}`;
}

function renderEmploymentInsight(insight) {
  const panel = document.querySelector('#employmentPanel');
  const quality = document.querySelector('#employmentQuality');
  const summary = document.querySelector('#employmentSummary');

  if (!insight) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  quality.textContent = insight.quality;
  summary.textContent = `${insight.occupationLabel}：${insight.salaryText}。${insight.note}`;
}

function renderCatalog() {
  const catalog = document.querySelector('#catalog');
  const coverage = document.querySelector('#coverage');
  const qualityDashboard = document.querySelector('#qualityDashboard');
  const datasets = document.querySelector('#datasets');
  const backlog = document.querySelector('#backlog');
  catalog.replaceChildren();
  coverage.replaceChildren();
  qualityDashboard.replaceChildren();
  datasets.replaceChildren();
  backlog.replaceChildren();

  [
    ['数据源', seed.coverage.totalSources],
    ['维度', seed.coverage.totalDimensions],
    ['待补交叉', seed.coverage.needsRegionalData.length]
  ].forEach(([label, value]) => {
    const card = document.createElement('div');
    const strong = document.createElement('strong');
    const span = document.createElement('span');

    card.className = 'coverage-card';
    strong.textContent = value;
    span.textContent = label;
    card.append(strong, span);
    coverage.appendChild(card);
  });

  const gapBox = document.createElement('div');
  gapBox.className = 'gap-box';
  gapBox.textContent = `下一批优先补：${seed.coverage.needsRegionalData
    .slice(0, 4)
    .map((item) => item.label)
    .join('、')} 的地区交叉数据。`;
  coverage.after(gapBox);

  const qualityOrder = ['官方统计', '行业报告', '模型估算'];
  const totalDimensions = seed.qualityDashboard.summary.totalDimensions;
  qualityOrder.forEach((quality) => {
    const dimensions = seed.qualityDashboard.byQuality[quality] || [];
    const item = document.createElement('article');
    const title = document.createElement('div');
    const count = document.createElement('strong');
    const meter = document.createElement('div');
    const fill = document.createElement('i');
    const note = document.createElement('p');

    item.className = 'quality-item';
    title.className = 'quality-title';
    meter.className = 'quality-meter';
    note.className = 'catalog-note';

    title.textContent = quality;
    count.textContent = `${dimensions.length} 个维度`;
    fill.style.width = `${Math.round((dimensions.length / totalDimensions) * 100)}%`;
    note.textContent = dimensions.slice(0, 4).map((dimension) => dimension.label).join('、') || '暂无';

    meter.appendChild(fill);
    item.append(title, count, meter, note);
    qualityDashboard.appendChild(item);
  });

  const weakList = document.createElement('div');
  weakList.className = 'quality-gap-list';
  seed.qualityDashboard.weakestDimensions.slice(0, 5).forEach((dimension) => {
    const row = document.createElement('div');
    const name = document.createElement('span');
    const reason = document.createElement('small');

    name.textContent = `${dimension.label}：${dimension.quality}`;
    reason.textContent = dimension.reason;
    row.append(name, reason);
    weakList.appendChild(row);
  });
  qualityDashboard.appendChild(weakList);

  seed.catalog.sources.slice(0, 7).forEach((source) => {
    const item = document.createElement('article');
    const title = document.createElement('div');
    const name = document.createElement('span');
    const badge = document.createElement('span');
    const note = document.createElement('p');

    item.className = 'catalog-item';
    title.className = 'catalog-title';
    name.textContent = source.title;
    badge.className = 'badge';
    badge.textContent = source.quality;
    note.className = 'catalog-note';
    note.textContent = `${source.refreshCadence}。${source.note}`;

    title.append(name, badge);
    item.append(title, note);
    catalog.appendChild(item);
  });

  seed.datasets.forEach((dataset) => {
    const item = document.createElement('article');
    const title = document.createElement('div');
    const meta = document.createElement('div');
    const command = document.createElement('div');

    item.className = 'dataset-item';
    title.className = 'dataset-title';
    meta.className = 'dataset-meta';
    command.className = 'dataset-command';

    title.textContent = dataset.title;
    meta.textContent = `${dataset.quality} · ${dataset.coverage} · ${dataset.dimensions.join(' / ')}`;
    command.textContent = dataset.importCommand;

    item.append(title, meta, command);
    datasets.appendChild(item);
  });

  seed.backlog.items
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5)
    .forEach((task) => {
      const item = document.createElement('article');
      const title = document.createElement('div');
      const meta = document.createElement('div');
      const action = document.createElement('p');

      item.className = 'backlog-item';
      title.className = 'dataset-title';
      meta.className = 'dataset-meta';
      action.className = 'catalog-note';

      title.textContent = task.title;
      meta.textContent = `${task.qualityTarget} · P${task.priority} · ${task.status} · ${task.dimensions.join(' / ')}`;
      action.textContent = task.nextAction;

      item.append(title, meta, action);
      backlog.appendChild(item);
    });
}

function renderRegionComparison() {
  const list = document.querySelector('#regionComparison');
  const maxPeople = Math.max(...seed.comparison.map((item) => item.estimatedPeople));

  list.replaceChildren();
  seed.comparison.forEach((item) => {
    const row = document.createElement('div');
    const name = document.createElement('div');
    const bar = document.createElement('div');
    const fill = document.createElement('i');
    const count = document.createElement('div');

    row.className = 'region-row';
    name.className = 'region-name';
    bar.className = 'region-bar';
    count.className = 'region-count';

    name.textContent = item.region.name;
    fill.style.width = `${Math.max(3, (item.estimatedPeople / maxPeople) * 100)}%`;
    count.textContent = `约 ${formatPeople(item.estimatedPeople)} 人`;

    bar.appendChild(fill);
    row.append(name, bar, count);
    list.appendChild(row);
  });
}

function resetFilters() {
  document.querySelector('#filters').reset();
  Object.entries(defaultFilters).forEach(([key, value]) => {
    const input = document.querySelector(`[name="${key}"]`);
    if (input) {
      input.value = value;
    }
  });
  renderResult(calculateInBrowser(defaultFilters));
}

fetch('./data/seed.json')
  .then((response) => response.json())
  .then((payload) => {
    seed = payload;
    renderFilters();
    renderCatalog();
    renderRegionComparison();
    renderResult(calculateInBrowser(defaultFilters));

    document.querySelector('#calculate').addEventListener('click', () => {
      renderResult(calculateInBrowser(collectFilters()));
    });
    document.querySelector('#reset').addEventListener('click', resetFilters);
  });
