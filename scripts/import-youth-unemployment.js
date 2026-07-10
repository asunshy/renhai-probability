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

function toRate(value, key) {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error(`Invalid rate for ${key}: ${value}`);
  }
  return rate;
}

function toHours(value, key) {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 80) {
    throw new Error(`Invalid weekly hours for ${key}: ${value}`);
  }
  return hours;
}

function validateRows(rows) {
  if (rows.length !== 12) {
    throw new Error(`Expected 12 monthly rows, received ${rows.length}`);
  }

  const seen = new Set();
  rows.forEach((row) => {
    if (!/^2024-(0[1-9]|1[0-2])$/.test(row.month)) {
      throw new Error(`Invalid month: ${row.month}`);
    }
    if (seen.has(row.month)) {
      throw new Error(`Duplicate month: ${row.month}`);
    }
    seen.add(row.month);

    const urban = toRate(row.urban_surveyed_unemployment_rate, `${row.month}.urban`);
    const age16_24 = toRate(row.age16_24_excluding_students_rate, `${row.month}.age16_24`);
    const age25_29 = toRate(row.age25_29_excluding_students_rate, `${row.month}.age25_29`);
    const age30_59 = toRate(row.age30_59_rate, `${row.month}.age30_59`);
    toHours(row.weekly_working_hours, `${row.month}.weekly_working_hours`);
    if (age16_24 < age25_29 || age25_29 < age30_59 || age30_59 < urban * 0.6) {
      throw new Error(`Unexpected age unemployment ordering for ${row.month}`);
    }
    if (!row.source_note) {
      throw new Error(`Missing source note for ${row.month}`);
    }
  });
}

function ensureSource(catalog) {
  catalog.sources.nbs_age_unemployment = {
    id: 'nbs_age_unemployment',
    title: '国家统计局分年龄组城镇调查失业率',
    year: 2024,
    quality: '官方统计',
    priority: 1,
    refreshCadence: '按月复核国家统计局和国家数据公开指标',
    url: 'https://data.stats.gov.cn/',
    note: '用于解释年轻人就业压力；16-24 岁和 25-29 岁指标均为不包含在校生口径，不作为个人就业状态判断。'
  };
}

function applyRows(catalog, rows) {
  ensureSource(catalog);

  catalog.benchmarks = catalog.benchmarks || {};
  catalog.benchmarks.youthUnemploymentTrend = {
    sourceId: 'nbs_age_unemployment',
    unit: 'rate',
    coverage: 'national_monthly',
    metrics: rows.map((row) => ({
      month: row.month,
      urbanSurveyedUnemployment: toRate(row.urban_surveyed_unemployment_rate, `${row.month}.urban`),
      age16_24ExcludingStudents: toRate(row.age16_24_excluding_students_rate, `${row.month}.age16_24`),
      age25_29ExcludingStudents: toRate(row.age25_29_excluding_students_rate, `${row.month}.age25_29`),
      age30_59: toRate(row.age30_59_rate, `${row.month}.age30_59`),
      weeklyWorkingHours: toHours(row.weekly_working_hours, `${row.month}.weekly_working_hours`),
      sourceNote: row.source_note
    }))
  };

  return catalog;
}

function summarize(rows) {
  const latest = rows[rows.length - 1];
  const peak = rows
    .slice()
    .sort((a, b) => Number(b.age16_24_excluding_students_rate) - Number(a.age16_24_excluding_students_rate))[0];

  return {
    datasetId: 'youth_unemployment_by_age_2024',
    rows: rows.length,
    latestMonth: latest.month,
    latestAge16_24Rate: toRate(latest.age16_24_excluding_students_rate, `${latest.month}.age16_24`),
    peakAge16_24Month: peak.month,
    peakAge16_24Rate: toRate(peak.age16_24_excluding_students_rate, `${peak.month}.age16_24`),
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
    updatedBenchmarks: ['youthUnemploymentTrend'],
    addedSource: 'nbs_age_unemployment'
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
