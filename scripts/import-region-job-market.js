const fs = require('node:fs');
const path = require('node:path');

const JOB_MARKET_KEYS = ['many_openings', 'active_market', 'moderate_competition'];

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

function toRate(value, key) {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error(`Invalid rate for ${key}: ${value}`);
  }
  return rate;
}

function validateRows(rows) {
  if (rows.length < 10) {
    throw new Error(`Expected at least 10 job market rows, received ${rows.length}`);
  }

  const seen = new Set();
  rows.forEach((row) => {
    if (!/^\d{6}$/.test(row.code)) {
      throw new Error(`Invalid region code: ${row.code}`);
    }
    if (seen.has(row.code)) {
      throw new Error(`Duplicate region code: ${row.code}`);
    }
    seen.add(row.code);

    JOB_MARKET_KEYS.forEach((key) => toRate(row[`${key}_rate`], `${row.code}.${key}_rate`));
  });
}

function ensureDimension(catalog) {
  catalog.dimensions.jobMarket = catalog.dimensions.jobMarket || {
    label: '就业行情',
    sourceId: 'recruitment_reports',
    coverage: 'regional_partial',
    options: {
      many_openings: {
        label: '岗位机会较多',
        defaultRate: 0.38
      },
      active_market: {
        label: '市场比较活跃',
        defaultRate: 0.35
      },
      moderate_competition: {
        label: '竞争压力适中',
        defaultRate: 0.45
      }
    },
    regionRates: {}
  };

  catalog.dimensions.jobMarket.regionRates = catalog.dimensions.jobMarket.regionRates || {};
}

function applyRows(catalog, rows) {
  ensureDimension(catalog);

  rows.forEach((row) => {
    catalog.dimensions.jobMarket.regionRates[row.code] = JOB_MARKET_KEYS.reduce((rates, key) => {
      rates[key] = toRate(row[`${key}_rate`], `${row.code}.${key}_rate`);
      return rates;
    }, {});
  });

  catalog.dimensions.jobMarket.coverage = 'regional_partial';

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
    regionCount: rows.length,
    updatedDimensions: ['jobMarket'],
    coverageNote: '就业行情地区比例来自招聘平台公开报告与城市就业研究摘要，按行业报告等级使用。',
    sampleRates: {
      '310000': nextCatalog.dimensions.jobMarket.regionRates['310000'],
      '440000': nextCatalog.dimensions.jobMarket.regionRates['440000']
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
