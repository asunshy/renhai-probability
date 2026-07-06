const fs = require('node:fs');
const path = require('node:path');

const OCCUPATION_KEYS = ['tech', 'finance', 'education', 'healthcare', 'public_service'];
const SALARY_KEYS = ['8k_plus', '12k_plus', '20k_plus', '50k_plus'];

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
    throw new Error(`Expected at least 10 labor salary rows, received ${rows.length}`);
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

    OCCUPATION_KEYS.forEach((key) => toRate(row[`${key}_rate`], `${row.code}.${key}_rate`));
    SALARY_KEYS.forEach((key) => toRate(row[`salary_${key}`], `${row.code}.salary_${key}`));
  });
}

function applyRows(catalog, rows) {
  rows.forEach((row) => {
    catalog.dimensions.occupation.regionRates[row.code] = OCCUPATION_KEYS.reduce((rates, key) => {
      rates[key] = toRate(row[`${key}_rate`], `${row.code}.${key}_rate`);
      return rates;
    }, {});

    catalog.dimensions.salary.regionRates[row.code] = SALARY_KEYS.reduce((rates, key) => {
      rates[key] = toRate(row[`salary_${key}`], `${row.code}.salary_${key}`);
      return rates;
    }, {});
  });

  catalog.dimensions.occupation.coverage = 'regional_partial';
  catalog.dimensions.salary.coverage = 'regional_partial';

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
    updatedDimensions: ['occupation', 'salary'],
    coverageNote: '职业/薪资地区比例来自行业报告与公开薪酬资料汇总，按行业报告等级使用。',
    sampleRates: {
      '310000': {
        occupation: nextCatalog.dimensions.occupation.regionRates['310000'],
        salary: nextCatalog.dimensions.salary.regionRates['310000']
      },
      '440000': {
        occupation: nextCatalog.dimensions.occupation.regionRates['440000'],
        salary: nextCatalog.dimensions.salary.regionRates['440000']
      }
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
