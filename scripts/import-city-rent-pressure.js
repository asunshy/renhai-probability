const fs = require('node:fs');
const path = require('node:path');

const PRESSURE_LEVELS = ['low', 'medium', 'high'];

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
    throw new Error(`Invalid rent amount for ${key}: ${value}`);
  }
  return amount;
}

function toRate(value, key) {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1) {
    throw new Error(`Invalid rent-income ratio for ${key}: ${value}`);
  }
  return rate;
}

function validateRows(rows) {
  if (rows.length < 9) {
    throw new Error(`Expected at least 9 rent pressure rows, received ${rows.length}`);
  }

  const seen = new Set();
  rows.forEach((row) => {
    if (!/^\d{6}$/.test(row.region_code)) {
      throw new Error(`Invalid region code: ${row.region_code}`);
    }
    if (!row.region_name) {
      throw new Error(`Missing region name for ${row.region_code}`);
    }
    if (seen.has(row.region_code)) {
      throw new Error(`Duplicate region code: ${row.region_code}`);
    }
    seen.add(row.region_code);

    const studio = toAmount(row.studio_rent_monthly, `${row.region_code}.studio_rent_monthly`);
    const oneBedroom = toAmount(row.one_bedroom_rent_monthly, `${row.region_code}.one_bedroom_rent_monthly`);
    if (studio > oneBedroom) {
      throw new Error(`Studio rent exceeds one-bedroom rent for ${row.region_code}`);
    }
    toRate(row.typical_rent_income_ratio, `${row.region_code}.typical_rent_income_ratio`);
    if (!PRESSURE_LEVELS.includes(row.pressure_level)) {
      throw new Error(`Invalid pressure level for ${row.region_code}: ${row.pressure_level}`);
    }
  });
}

function ensureSource(catalog) {
  catalog.sources.city_rent_pressure = catalog.sources.city_rent_pressure || {
    id: 'city_rent_pressure',
    title: '重点城市租金压力公开资料汇总',
    year: 2024,
    quality: '行业报告',
    priority: 2,
    refreshCadence: '每半年复核公开租赁报告、城市生活成本研究和统计资料',
    url: 'https://data.stats.gov.cn/',
    note: '用于结果页城市生活成本解释；租金为公开报告估算，不作为个人资产判断。'
  };
}

function applyRows(catalog, rows) {
  ensureSource(catalog);

  catalog.benchmarks = catalog.benchmarks || {};
  catalog.benchmarks.cityRentPressure = {
    sourceId: 'city_rent_pressure',
    unit: 'monthly_cny',
    coverage: 'city_partial',
    metrics: {}
  };

  rows.forEach((row) => {
    catalog.benchmarks.cityRentPressure.metrics[row.region_code] = {
      studioRent: toAmount(row.studio_rent_monthly, `${row.region_code}.studio_rent_monthly`),
      oneBedroomRent: toAmount(row.one_bedroom_rent_monthly, `${row.region_code}.one_bedroom_rent_monthly`),
      typicalRentIncomeRatio: toRate(row.typical_rent_income_ratio, `${row.region_code}.typical_rent_income_ratio`),
      pressureLevel: row.pressure_level
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
    cityCount: rows.length,
    updatedBenchmarks: ['cityRentPressure'],
    addedSource: 'city_rent_pressure',
    coverageNote: '租金压力用于城市生活成本解释，不直接作为概率筛选比例。',
    sample: {
      '310000': nextCatalog.benchmarks.cityRentPressure.metrics['310000'],
      '440300': nextCatalog.benchmarks.cityRentPressure.metrics['440300']
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
