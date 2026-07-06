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

function toNumber(value, key) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid number for ${key}: ${value}`);
  }
  return number;
}

function validateRows(rows) {
  if (rows.length < 31) {
    throw new Error(`Expected at least 31 provincial rows, received ${rows.length}`);
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
    toNumber(row.population, `${row.code}.population`);
    [
      'male_rate',
      'female_rate',
      'age_20_24_rate',
      'age_25_29_rate',
      'age_30_34_rate',
      'age_35_39_rate',
      'bachelor_plus_rate',
      'master_plus_rate'
    ].forEach((key) => {
      const rate = toNumber(row[key], `${row.code}.${key}`);
      if (rate < 0 || rate > 1) {
        throw new Error(`Rate out of range for ${row.code}.${key}: ${rate}`);
      }
    });
  });
}

function applyRows(catalog, rows) {
  rows.forEach((row) => {
    catalog.regions[row.code] = {
      code: row.code,
      name: row.name,
      basePopulation: toNumber(row.population, `${row.code}.population`)
    };

    catalog.dimensions.gender.regionRates[row.code] = {
      male: toNumber(row.male_rate, `${row.code}.male_rate`),
      female: toNumber(row.female_rate, `${row.code}.female_rate`)
    };

    catalog.dimensions.ageRange.regionRates[row.code] = {
      '20-24': toNumber(row.age_20_24_rate, `${row.code}.age_20_24_rate`),
      '25-29': toNumber(row.age_25_29_rate, `${row.code}.age_25_29_rate`),
      '30-34': toNumber(row.age_30_34_rate, `${row.code}.age_30_34_rate`),
      '35-39': toNumber(row.age_35_39_rate, `${row.code}.age_35_39_rate`)
    };

    catalog.dimensions.education.regionRates[row.code] = {
      ...(catalog.dimensions.education.regionRates[row.code] || {}),
      bachelor_plus: toNumber(row.bachelor_plus_rate, `${row.code}.bachelor_plus_rate`),
      master_plus: toNumber(row.master_plus_rate, `${row.code}.master_plus_rate`)
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
    regionCount: rows.length,
    updatedDimensions: ['gender', 'ageRange', 'education'],
    sampleRegions: {
      '320000': nextCatalog.regions['320000'],
      '370000': nextCatalog.regions['370000']
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
