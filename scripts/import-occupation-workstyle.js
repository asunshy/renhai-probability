const fs = require('node:fs');
const path = require('node:path');

const OCCUPATION_KEYS = ['tech', 'finance', 'education', 'healthcare', 'public_service'];
const WORK_STYLE_KEYS = ['low_overtime', 'remote_friendly', 'stable_schedule'];

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
    throw new Error(`Invalid work style rate for ${key}: ${value}`);
  }
  return rate;
}

function validateRows(rows) {
  if (rows.length !== OCCUPATION_KEYS.length) {
    throw new Error(`Expected ${OCCUPATION_KEYS.length} work style rows, received ${rows.length}`);
  }

  const seen = new Set();
  rows.forEach((row) => {
    if (!OCCUPATION_KEYS.includes(row.occupation)) {
      throw new Error(`Invalid occupation: ${row.occupation}`);
    }
    if (seen.has(row.occupation)) {
      throw new Error(`Duplicate occupation: ${row.occupation}`);
    }
    seen.add(row.occupation);

    WORK_STYLE_KEYS.forEach((key) => {
      toRate(row[`${key}_rate`], `${row.occupation}.${key}_rate`);
    });
  });
}

function ensureSource(catalog) {
  catalog.sources.workstyle_reports = catalog.sources.workstyle_reports || {
    id: 'workstyle_reports',
    title: '职业工作节奏与远程办公公开报告汇总',
    year: 2024,
    quality: '行业报告',
    priority: 2,
    refreshCadence: '每半年复核招聘平台、职场研究和公开行业报告',
    url: 'https://www.mohrss.gov.cn/',
    note: '用于加班强度、远程办公和稳定作息估算；不采集职位详情或个人简历。'
  };
}

function ensureDimension(catalog) {
  catalog.dimensions.workStyle = catalog.dimensions.workStyle || {
    label: '工作节奏',
    sourceId: 'workstyle_reports',
    coverage: 'occupation_partial',
    options: {
      low_overtime: {
        label: '低加班强度',
        defaultRate: 0.45
      },
      remote_friendly: {
        label: '远程办公友好',
        defaultRate: 0.28
      },
      stable_schedule: {
        label: '作息较稳定',
        defaultRate: 0.52
      }
    },
    segmentRates: {
      occupation: {}
    }
  };

  catalog.dimensions.workStyle.sourceId = 'workstyle_reports';
  catalog.dimensions.workStyle.coverage = 'occupation_partial';
  catalog.dimensions.workStyle.segmentRates = catalog.dimensions.workStyle.segmentRates || {};
  catalog.dimensions.workStyle.segmentRates.occupation = catalog.dimensions.workStyle.segmentRates.occupation || {};
}

function applyRows(catalog, rows) {
  ensureSource(catalog);
  ensureDimension(catalog);

  rows.forEach((row) => {
    catalog.dimensions.workStyle.segmentRates.occupation[row.occupation] = WORK_STYLE_KEYS.reduce((rates, key) => {
      rates[key] = toRate(row[`${key}_rate`], `${row.occupation}.${key}_rate`);
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
    occupationCount: rows.length,
    updatedDimensions: ['workStyle'],
    addedSource: 'workstyle_reports',
    coverageNote: '工作节奏按职业大类做条件修正；无职业条件时回退默认比例。',
    sampleRates: {
      tech: nextCatalog.dimensions.workStyle.segmentRates.occupation.tech,
      education: nextCatalog.dimensions.workStyle.segmentRates.occupation.education
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
