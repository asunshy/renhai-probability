const DEFAULT_OPTIONS = {
  regions: [
    { code: '000000', name: '全国' },
    { code: '110000', name: '北京市' },
    { code: '310000', name: '上海市' },
    { code: '440000', name: '广东省' },
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
    ]
  }
};

module.exports = {
  DEFAULT_OPTIONS
};
