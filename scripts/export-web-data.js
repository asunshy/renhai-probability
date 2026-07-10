const fs = require('node:fs');
const path = require('node:path');

const {
  calculateProbability,
  getFilterOptions,
  getDataCatalog,
  getCoverageSummary,
  getRegionComparison,
  getDatasetManifest,
  getBenchmarkCatalog,
  getCollectionBacklog,
  getDataCoverageAudit,
  getDataQualityDashboard
} = require('../cloudfunctions/calculateProbability/lib/probability');

const outputDir = path.join(__dirname, '..', 'web-preview', 'data');
const outputPath = path.join(outputDir, 'seed.json');

fs.mkdirSync(outputDir, { recursive: true });

const scenarios = [
  {
    id: 'shanghai-tech',
    title: '上海技术青年样例',
    filters: {
      regionCode: '310000',
      gender: 'male',
      ageRange: '25-29',
      education: 'bachelor_plus',
      occupation: 'tech',
      salary: '20k_plus',
      smoking: 'no',
      drinking: 'light_or_no'
    }
  },
  {
    id: 'guangdong-balanced',
    title: '广东生活圈样例',
    filters: {
      regionCode: '440000',
      gender: 'female',
      ageRange: '25-29',
      education: 'bachelor_plus',
      height: '165_175',
      exercise: 'weekly',
      homeOwnership: 'has_home',
      commuteTolerance: 'same_city'
    }
  }
];

const payload = {
  generatedAt: new Date().toISOString(),
  options: getFilterOptions('000000'),
  catalog: getDataCatalog(),
  coverage: getCoverageSummary(),
  datasets: getDatasetManifest(),
  benchmarks: getBenchmarkCatalog(),
  backlog: getCollectionBacklog(),
  coverageAudit: getDataCoverageAudit(),
  qualityDashboard: getDataQualityDashboard(),
  comparison: getRegionComparison({
    gender: 'female',
    ageRange: '25-29',
    education: 'bachelor_plus'
  }).slice(0, 10),
  scenarios: scenarios.map((scenario) => ({
    ...scenario,
    result: calculateProbability(scenario.filters)
  }))
};

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.log(`Exported web preview data to ${outputPath}`);
