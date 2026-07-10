const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const args = {
    catalog: path.join(__dirname, '..', 'data', 'seed', 'catalog.json'),
    dryRun: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--csv') {
      args.csv = argv[index + 1];
      index += 1;
    } else if (arg === '--catalog') {
      args.catalog = argv[index + 1];
      index += 1;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    }
  }

  if (!args.csv) {
    throw new Error('Missing required --csv path');
  }

  return args;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(',');

  return lines.map((line) => {
    const values = line.split(',');
    return headers.reduce((row, header, index) => {
      row[header] = values[index];
      return row;
    }, {});
  });
}

function toAmount(value, key) {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`Invalid income amount for ${key}: ${value}`);
  }
  return amount;
}

function toRate(value, key) {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < -0.2 || rate > 0.5) {
    throw new Error(`Invalid growth rate for ${key}: ${value}`);
  }
  return rate;
}

function validateRows(rows) {
  if (rows.length < 5) {
    throw new Error(`Expected at least 5 income trend rows, received ${rows.length}`);
  }

  let previousYear = 0;
  rows.forEach((row) => {
    const year = Number(row.year);
    if (!Number.isInteger(year) || year <= previousYear) {
      throw new Error(`Invalid or unsorted year: ${row.year}`);
    }
    previousYear = year;

    const national = toAmount(row.national_disposable_income_per_capita, `${year}.national`);
    const urban = toAmount(row.urban_disposable_income_per_capita, `${year}.urban`);
    const rural = toAmount(row.rural_disposable_income_per_capita, `${year}.rural`);
    if (!(urban > national && national > rural)) {
      throw new Error(`Unexpected income ordering for ${year}`);
    }
    toRate(row.nominal_growth_rate, `${year}.nominal_growth_rate`);
    toRate(row.real_growth_rate, `${year}.real_growth_rate`);
    if (!row.source_note) {
      throw new Error(`Missing source note for ${year}`);
    }
  });
}

function ensureSource(catalog) {
  catalog.sources.nbs_household_income = {
    id: 'nbs_household_income',
    title: '国家统计局居民人均可支配收入年度数据',
    year: 2024,
    quality: '官方统计',
    priority: 1,
    refreshCadence: '年度复核国家统计局统计公报和国家数据住户收入指标',
    url: 'https://data.stats.gov.cn/',
    note: '用于解释收入环境和城市生活压力；只使用年度汇总口径，不作为个人收入判断。'
  };
}

function applyRows(catalog, rows) {
  ensureSource(catalog);

  catalog.benchmarks = catalog.benchmarks || {};
  catalog.benchmarks.incomeTrend = {
    sourceId: 'nbs_household_income',
    unit: 'cny_per_capita_year',
    coverage: 'national_annual',
    metrics: rows.map((row) => ({
      year: Number(row.year),
      nationalDisposableIncomePerCapita: toAmount(
        row.national_disposable_income_per_capita,
        `${row.year}.national`
      ),
      urbanDisposableIncomePerCapita: toAmount(row.urban_disposable_income_per_capita, `${row.year}.urban`),
      ruralDisposableIncomePerCapita: toAmount(row.rural_disposable_income_per_capita, `${row.year}.rural`),
      nominalGrowthRate: toRate(row.nominal_growth_rate, `${row.year}.nominal_growth_rate`),
      realGrowthRate: toRate(row.real_growth_rate, `${row.year}.real_growth_rate`),
      sourceNote: row.source_note
    }))
  };

  return catalog;
}

function summarize(rows) {
  const first = rows[0];
  const latest = rows[rows.length - 1];
  const firstNational = toAmount(first.national_disposable_income_per_capita, `${first.year}.national`);
  const latestNational = toAmount(latest.national_disposable_income_per_capita, `${latest.year}.national`);

  return {
    datasetId: 'household_income_trend_2020_2024',
    rows: rows.length,
    latestYear: Number(latest.year),
    latestUrbanDisposableIncomePerCapita: toAmount(latest.urban_disposable_income_per_capita, `${latest.year}.urban`),
    latestNationalDisposableIncomePerCapita: latestNational,
    fiveYearNominalGrowth: Number(((latestNational - firstNational) / firstNational).toFixed(4)),
    quality: '官方统计'
  };
}

function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const rows = parseCsv(fs.readFileSync(args.csv, 'utf8'));
  validateRows(rows);

  const catalog = JSON.parse(fs.readFileSync(args.catalog, 'utf8'));
  const nextCatalog = applyRows(catalog, rows);
  const summary = {
    dryRun: args.dryRun,
    ...summarize(rows),
    updatedBenchmarks: ['incomeTrend'],
    addedSource: 'nbs_household_income'
  };

  if (!args.dryRun) {
    fs.writeFileSync(args.catalog, `${JSON.stringify(nextCatalog, null, 2)}\n`, 'utf8');
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (require.main === module) {
  run();
}

module.exports = {
  parseCsv,
  validateRows,
  applyRows,
  summarize,
  run
};
