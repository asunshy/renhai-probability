const fs = require('node:fs');
const path = require('node:path');

const OCCUPATION_KEYS = ['tech', 'finance', 'education', 'healthcare', 'public_service'];

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
    throw new Error(`Invalid salary amount for ${key}: ${value}`);
  }
  return amount;
}

function validateRows(rows) {
  if (rows.length < 40) {
    throw new Error(`Expected at least 40 salary benchmark rows, received ${rows.length}`);
  }

  const seen = new Set();
  rows.forEach((row) => {
    if (!/^\d{6}$/.test(row.region_code)) {
      throw new Error(`Invalid region code: ${row.region_code}`);
    }
    if (!OCCUPATION_KEYS.includes(row.occupation)) {
      throw new Error(`Invalid occupation: ${row.occupation}`);
    }

    const key = `${row.region_code}.${row.occupation}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate benchmark row: ${key}`);
    }
    seen.add(key);

    const p25 = toAmount(row.p25_monthly, `${key}.p25_monthly`);
    const p50 = toAmount(row.p50_monthly, `${key}.p50_monthly`);
    const p75 = toAmount(row.p75_monthly, `${key}.p75_monthly`);
    if (!(p25 <= p50 && p50 <= p75)) {
      throw new Error(`Invalid percentile order for ${key}`);
    }
  });
}

function ensureSource(catalog) {
  catalog.sources.industry_salary_benchmark = catalog.sources.industry_salary_benchmark || {
    id: 'industry_salary_benchmark',
    title: '重点城市行业薪资分位公开资料汇总',
    year: 2024,
    quality: '行业报告',
    priority: 2,
    refreshCadence: '每半年复核招聘平台报告、人社公开资料和城市薪酬研究',
    url: 'https://www.mohrss.gov.cn/',
    note: '用于结果页就业行情解释；不直接作为人群概率筛选比例。'
  };
}

function applyRows(catalog, rows) {
  ensureSource(catalog);

  catalog.benchmarks = catalog.benchmarks || {};
  catalog.benchmarks.industrySalary = {
    sourceId: 'industry_salary_benchmark',
    unit: 'monthly_cny',
    coverage: 'city_partial',
    metrics: {}
  };

  rows.forEach((row) => {
    catalog.benchmarks.industrySalary.metrics[row.region_code] = catalog.benchmarks.industrySalary.metrics[row.region_code] || {};
    catalog.benchmarks.industrySalary.metrics[row.region_code][row.occupation] = {
      p25: toAmount(row.p25_monthly, `${row.region_code}.${row.occupation}.p25_monthly`),
      p50: toAmount(row.p50_monthly, `${row.region_code}.${row.occupation}.p50_monthly`),
      p75: toAmount(row.p75_monthly, `${row.region_code}.${row.occupation}.p75_monthly`)
    };
  });

  return catalog;
}

function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const rows = parseCsv(fs.readFileSync(args.csv, 'utf8'));
  validateRows(rows);

  const catalog = JSON.parse(fs.readFileSync(args.catalog, 'utf8'));
  const nextCatalog = applyRows(catalog, rows);
  const summary = {
    dryRun: args.dryRun,
    rowCount: rows.length,
    updatedBenchmarks: ['industrySalary'],
    addedSource: 'industry_salary_benchmark',
    coverageNote: '行业薪资分位用于结果页就业行情解释，不直接作为概率筛选比例。',
    sample: {
      '310000.tech': nextCatalog.benchmarks.industrySalary.metrics['310000'].tech,
      '440300.tech': nextCatalog.benchmarks.industrySalary.metrics['440300'].tech
    }
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
  run
};
