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

function toInteger(value, key, required = true) {
  if (!value && !required) {
    return null;
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`Invalid positive integer for ${key}: ${value}`);
  }
  return number;
}

function validateRows(rows) {
  if (rows.length < 10) {
    throw new Error(`Expected at least 10 marriage trend rows, received ${rows.length}`);
  }

  let previousYear = 0;
  rows.forEach((row) => {
    const year = Number(row.year);
    if (!Number.isInteger(year) || year < 2000 || year <= previousYear) {
      throw new Error(`Invalid or unsorted year: ${row.year}`);
    }
    previousYear = year;

    toInteger(row.marriage_registrations, `${year}.marriage_registrations`);
    toInteger(row.first_marriage_people, `${year}.first_marriage_people`);
    toInteger(row.divorce_registrations, `${year}.divorce_registrations`, false);
    if (!row.source_note) {
      throw new Error(`Missing source note for ${year}`);
    }
  });
}

function ensureSource(catalog) {
  catalog.sources.civil_affairs_marriage_stats = {
    id: 'civil_affairs_marriage_stats',
    title: '民政事业发展统计公报婚姻登记数据',
    year: 2024,
    quality: '官方统计',
    priority: 1,
    refreshCadence: '年度复核民政部统计公报和中国统计年鉴婚姻登记表',
    url: 'https://www.mca.gov.cn/',
    note: '用于解释结婚登记趋势和长期关系背景；只使用公开年度汇总数据，不涉及个人婚恋状态。'
  };
}

function applyRows(catalog, rows) {
  ensureSource(catalog);

  catalog.benchmarks = catalog.benchmarks || {};
  catalog.benchmarks.marriageTrend = {
    sourceId: 'civil_affairs_marriage_stats',
    unit: 'people_or_couples',
    coverage: 'national_annual',
    metrics: rows.map((row) => ({
      year: Number(row.year),
      marriageRegistrations: toInteger(row.marriage_registrations, `${row.year}.marriage_registrations`),
      firstMarriagePeople: toInteger(row.first_marriage_people, `${row.year}.first_marriage_people`),
      divorceRegistrations: toInteger(row.divorce_registrations, `${row.year}.divorce_registrations`, false),
      sourceNote: row.source_note
    }))
  };

  return catalog;
}

function summarize(rows) {
  const latest = rows[rows.length - 1];
  const first = rows[0];
  const latestMarriageRegistrations = toInteger(
    latest.marriage_registrations,
    `${latest.year}.marriage_registrations`
  );
  const firstMarriageRegistrations = toInteger(
    first.marriage_registrations,
    `${first.year}.marriage_registrations`
  );
  const averageAnnualChange = Number(
    ((latestMarriageRegistrations - firstMarriageRegistrations) / (rows.length - 1)).toFixed(0)
  );

  return {
    datasetId: 'marriage_registration_trend_2024',
    rows: rows.length,
    latestYear: Number(latest.year),
    latestMarriageRegistrations,
    quality: '官方统计',
    averageAnnualChange
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
    updatedBenchmarks: ['marriageTrend'],
    addedSource: 'civil_affairs_marriage_stats'
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
