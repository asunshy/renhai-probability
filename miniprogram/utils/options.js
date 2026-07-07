const DEFAULT_OPTIONS = {
  regions: [
    { code: '000000', name: '全国' },
    { code: '110000', name: '北京市' },
    { code: '120000', name: '天津市' },
    { code: '310000', name: '上海市' },
    { code: '440100', name: '广州市' },
    { code: '440300', name: '深圳市' },
    { code: '440000', name: '广东省' },
    { code: '330100', name: '杭州市' },
    { code: '320100', name: '南京市' },
    { code: '510100', name: '成都市' },
    { code: '610100', name: '西安市' },
    { code: '420100', name: '武汉市' },
    { code: '540000', name: '西藏自治区' }
  ],
  dimensions: {
    gender: [
      { value: '', label: '不限' },
      { value: 'male', label: '男' },
      { value: 'female', label: '女' }
    ],
    ageRange: [
      { value: '', label: '不限' },
      { value: '20-24', label: '20-24 岁' },
      { value: '25-29', label: '25-29 岁' },
      { value: '30-34', label: '30-34 岁' },
      { value: '35-39', label: '35-39 岁' }
    ],
    education: [
      { value: '', label: '不限' },
      { value: 'high_school_plus', label: '高中及以上' },
      { value: 'college_plus', label: '大专及以上' },
      { value: 'bachelor_plus', label: '本科及以上' },
      { value: 'master_plus', label: '硕士及以上' }
    ],
    occupation: [
      { value: '', label: '不限' },
      { value: 'tech', label: '互联网/技术' },
      { value: 'finance', label: '金融' },
      { value: 'education', label: '教育科研' },
      { value: 'healthcare', label: '医疗健康' },
      { value: 'public_service', label: '公共服务/机关事业' }
    ],
    salary: [
      { value: '', label: '不限' },
      { value: '8k_plus', label: '8k 以上' },
      { value: '12k_plus', label: '12k 以上' },
      { value: '20k_plus', label: '20k 以上' },
      { value: '50k_plus', label: '50k 以上' }
    ],
    smoking: [
      { value: '', label: '不限' },
      { value: 'no', label: '不吸烟' },
      { value: 'yes', label: '接受吸烟' }
    ],
    drinking: [
      { value: '', label: '不限' },
      { value: 'light_or_no', label: '少喝或不喝' },
      { value: 'social_ok', label: '社交饮酒可接受' }
    ],
    personality: [
      { value: '', label: '不限' },
      { value: 'extrovert', label: '外向表达型' },
      { value: 'introvert', label: '内向稳定型' },
      { value: 'intj_like', label: '理性规划型' },
      { value: 'gentle', label: '温和共情型' }
    ],
    height: [
      { value: '', label: '不限' },
      { value: 'any_reasonable', label: '别太离谱就行' },
      { value: '155_165', label: '155-165 cm' },
      { value: '165_175', label: '165-175 cm' },
      { value: '175_185', label: '175-185 cm' },
      { value: '185_plus', label: '185 cm 以上' }
    ],
    exercise: [
      { value: '', label: '不限' },
      { value: 'weekly', label: '每周运动' },
      { value: 'frequent', label: '高频运动' }
    ],
    homeOwnership: [
      { value: '', label: '不限' },
      { value: 'has_home', label: '有自有住房' },
      { value: 'no_pressure', label: '无明显居住压力' }
    ],
    commuteTolerance: [
      { value: '', label: '不限' },
      { value: 'same_city', label: '同城生活圈' },
      { value: 'within_hour', label: '一小时内可见面' }
    ],
    youthInflow: [
      { value: '', label: '不限' },
      { value: 'youth_active', label: '青年活跃城市' },
      { value: 'youth_highly_active', label: '青年高度活跃' },
      { value: 'talent_density', label: '人才密度较高' }
    ]
  }
};

module.exports = {
  DEFAULT_OPTIONS
};
