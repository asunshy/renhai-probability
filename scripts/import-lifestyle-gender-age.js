const fs = require('node:fs');
const path = require('node:path');

const VALID_SEGMENTS = {
  gender: ['male', 'female'],
  ageRange: ['20-24', '25-29', '30-34', '35-39']
};

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
  if (rows.length < 6) {
    throw new Error(`Expected at least 6 lifestyle segment rows, received ${rows.length}`);
  }

  const seen = new Set();
  rows.forEach((row) => {
    const validKeys = VALID_SEGMENTS[row.segment_type];
    if (!validKeys || !validKeys.includes(row.segment_key)) {
      throw new Error(`Invalid segment: ${row.segment_type}.${row.segment_key}`);
    }

    const segmentId = `${row.segment_type}.${row.segment_key}`;
    if (seen.has(segmentId)) {
      throw new Error(`Duplicate segment: ${segmentId}`);
    }
    seen.add(segmentId);

    toRate(row.smoking_no_rate, `${segmentId}.smoking_no_rate`);
    toRate(row.drinking_light_or_no_rate, `${segmentId}.drinking_light_or_no_rate`);
    toRate(row.drinking_social_ok_rate, `${segmentId}.drinking_social_ok_rate`);
  });
}

function ensureSource(catalog) {
  catalog.sources.lifestyle_segment_reports = catalog.sources.lifestyle_segment_reports || {
    id: 'lifestyle_segment_reports',
    title: '健康生活方式公开调查分性别与年龄估算',
    year: 2024,
    quality: '行业报告',
    priority: 2,
    refreshCadence: '每年复核卫健委、疾控、控烟和健康生活方式公开报告',
    url: 'https://www.chinacdc.cn/',
    note: '用于吸烟、饮酒在性别和年龄段上的条件修正；不是个体行为判断。'
  };
}

function ensureSegmentRates(catalog) {
  catalog.dimensions.smoking.sourceId = 'lifestyle_segment_reports';
  catalog.dimensions.smoking.coverage = 'segment_partial';
  catalog.dimensions.smoking.segmentRates = catalog.dimensions.smoking.segmentRates || {};

  catalog.dimensions.drinking.sourceId = 'lifestyle_segment_reports';
  catalog.dimensions.drinking.coverage = 'segment_partial';
  catalog.dimensions.drinking.segmentRates = catalog.dimensions.drinking.segmentRates || {};
}

function setSegmentRate(dimension, segmentType, segmentKey, optionKey, rate) {
  dimension.segmentRates[segmentType] = dimension.segmentRates[segmentType] || {};
  dimension.segmentRates[segmentType][segmentKey] = dimension.segmentRates[segmentType][segmentKey] || {};
  dimension.segmentRates[segmentType][segmentKey][optionKey] = rate;
}

function applyRows(catalog, rows) {
  ensureSource(catalog);
  ensureSegmentRates(catalog);

  rows.forEach((row) => {
    setSegmentRate(
      catalog.dimensions.smoking,
      row.segment_type,
      row.segment_key,
      'no',
      toRate(row.smoking_no_rate, `${row.segment_type}.${row.segment_key}.smoking_no_rate`)
    );
    setSegmentRate(catalog.dimensions.smoking, row.segment_type, row.segment_key, 'yes', 1);
    setSegmentRate(
      catalog.dimensions.drinking,
      row.segment_type,
      row.segment_key,
      'light_or_no',
      toRate(row.drinking_light_or_no_rate, `${row.segment_type}.${row.segment_key}.drinking_light_or_no_rate`)
    );
    setSegmentRate(
      catalog.dimensions.drinking,
      row.segment_type,
      row.segment_key,
      'social_ok',
      toRate(row.drinking_social_ok_rate, `${row.segment_type}.${row.segment_key}.drinking_social_ok_rate`)
    );
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
    segmentCount: rows.length,
    updatedDimensions: ['smoking', 'drinking'],
    addedSource: 'lifestyle_segment_reports',
    coverageNote: '吸烟和饮酒按性别/年龄段做条件修正；无对应条件时回退默认比例。',
    sampleRates: {
      maleSmokingNo: nextCatalog.dimensions.smoking.segmentRates.gender.male.no,
      femaleSmokingNo: nextCatalog.dimensions.smoking.segmentRates.gender.female.no,
      age2529LightDrinking: nextCatalog.dimensions.drinking.segmentRates.ageRange['25-29'].light_or_no
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
