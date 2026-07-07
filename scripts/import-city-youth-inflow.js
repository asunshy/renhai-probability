const fs = require('node:fs');
const path = require('node:path');

const YOUTH_KEYS = ['youth_active', 'youth_highly_active', 'talent_density'];

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

function toPopulation(value, key) {
  const population = Number(value);
  if (!Number.isInteger(population) || population <= 0) {
    throw new Error(`Invalid population for ${key}: ${value}`);
  }
  return population;
}

function validateRows(rows) {
  if (rows.length < 10) {
    throw new Error(`Expected at least 10 city youth rows, received ${rows.length}`);
  }

  const seen = new Set();
  rows.forEach((row) => {
    if (!/^\d{6}$/.test(row.code)) {
      throw new Error(`Invalid city code: ${row.code}`);
    }
    if (!row.name) {
      throw new Error(`Missing city name for ${row.code}`);
    }
    if (seen.has(row.code)) {
      throw new Error(`Duplicate city code: ${row.code}`);
    }
    seen.add(row.code);

    toPopulation(row.base_population, `${row.code}.base_population`);
    YOUTH_KEYS.forEach((key) => toRate(row[`${key}_rate`], `${row.code}.${key}_rate`));
  });
}

function ensureSource(catalog) {
  catalog.sources.city_youth_reports = catalog.sources.city_youth_reports || {
    id: 'city_youth_reports',
    title: '重点城市统计公报与青年人口活跃度公开资料汇总',
    year: 2024,
    quality: '行业报告',
    priority: 2,
    refreshCadence: '每半年复核重点城市统计公报、人才报告和公开研究',
    url: 'https://data.stats.gov.cn/',
    note: '用于重点城市青年人口活跃、人才密度等趋势估算；城市常住人口采用公开统计口径，活跃比例按行业报告和模型估算融合。'
  };
}

function ensureDimension(catalog) {
  catalog.dimensions.youthInflow = catalog.dimensions.youthInflow || {
    label: '青年活跃度',
    sourceId: 'city_youth_reports',
    coverage: 'city_partial',
    options: {
      youth_active: {
        label: '青年活跃城市',
        defaultRate: 0.62
      },
      youth_highly_active: {
        label: '青年高度活跃',
        defaultRate: 0.42
      },
      talent_density: {
        label: '人才密度较高',
        defaultRate: 0.36
      }
    },
    regionRates: {}
  };

  catalog.dimensions.youthInflow.sourceId = 'city_youth_reports';
  catalog.dimensions.youthInflow.coverage = 'city_partial';
  catalog.dimensions.youthInflow.regionRates = catalog.dimensions.youthInflow.regionRates || {};
}

function applyRows(catalog, rows) {
  ensureSource(catalog);
  ensureDimension(catalog);

  rows.forEach((row) => {
    catalog.regions[row.code] = {
      code: row.code,
      name: row.name,
      basePopulation: toPopulation(row.base_population, `${row.code}.base_population`)
    };

    catalog.dimensions.youthInflow.regionRates[row.code] = YOUTH_KEYS.reduce((rates, key) => {
      rates[key] = toRate(row[`${key}_rate`], `${row.code}.${key}_rate`);
      return rates;
    }, {});
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
    updatedDimensions: ['youthInflow'],
    addedSource: 'city_youth_reports',
    coverageNote: '重点城市青年活跃比例按行业报告和模型估算融合，城市常住人口采用公开统计口径。',
    sampleRates: {
      '310000': nextCatalog.dimensions.youthInflow.regionRates['310000'],
      '440300': nextCatalog.dimensions.youthInflow.regionRates['440300']
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
