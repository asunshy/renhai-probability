const { DEFAULT_OPTIONS } = require('../../utils/options');
const { calculateProbability, getFilterOptions } = require('../../utils/api');

const FIELD_CONFIG = [
  { key: 'gender', label: '性别' },
  { key: 'ageRange', label: '年龄' },
  { key: 'education', label: '学历' },
  { key: 'occupation', label: '职业' },
  { key: 'salary', label: '月收入' },
  { key: 'smoking', label: '吸烟' },
  { key: 'drinking', label: '饮酒' },
  { key: 'personality', label: '性格' },
  { key: 'height', label: '身高' },
  { key: 'exercise', label: '运动习惯' },
  { key: 'homeOwnership', label: '居住资产' },
  { key: 'commuteTolerance', label: '通勤距离' },
  { key: 'youthInflow', label: '青年活跃度' }
];

function makeInitialSelected() {
  const selected = {
    regionIndex: 0,
    regionCode: DEFAULT_OPTIONS.regions[0].code,
    regionName: DEFAULT_OPTIONS.regions[0].name
  };

  FIELD_CONFIG.forEach((field) => {
    selected[`${field.key}Index`] = 0;
    selected[field.key] = '';
  });

  return selected;
}

Page({
  data: {
    loading: false,
    options: DEFAULT_OPTIONS,
    regionNames: DEFAULT_OPTIONS.regions.map((region) => region.name),
    selected: makeInitialSelected(),
    fields: []
  },

  onLoad() {
    this.refreshFields();
    this.loadCloudOptions();
  },

  loadCloudOptions() {
    getFilterOptions(this.data.selected.regionCode)
      .then((cloudOptions) => {
        const dimensions = {};
        Object.keys(DEFAULT_OPTIONS.dimensions).forEach((key) => {
          dimensions[key] = [
            { value: '', label: '不限' },
            ...(cloudOptions.dimensions[key] || [])
          ];
        });

        this.setData({
          options: {
            regions: cloudOptions.regions,
            dimensions
          },
          regionNames: cloudOptions.regions.map((region) => region.name)
        });
        this.refreshFields();
      })
      .catch(() => {
        this.refreshFields();
      });
  },

  refreshFields() {
    const fields = FIELD_CONFIG.map((field) => {
      const list = this.data.options.dimensions[field.key] || [];
      const indexKey = `${field.key}Index`;
      const current = list[this.data.selected[indexKey]] || list[0] || { label: '不限' };

      return {
        ...field,
        indexKey,
        currentIndex: this.data.selected[indexKey],
        labels: list.map((item) => item.label),
        currentLabel: current.label
      };
    });

    this.setData({ fields });
  },

  onRegionChange(event) {
    const regionIndex = Number(event.detail.value);
    const region = this.data.options.regions[regionIndex];

    this.setData({
      selected: {
        ...this.data.selected,
        regionIndex,
        regionCode: region.code,
        regionName: region.name
      }
    });
    this.loadCloudOptions();
  },

  onFieldChange(event) {
    const key = event.currentTarget.dataset.key;
    const index = Number(event.detail.value);
    const option = this.data.options.dimensions[key][index];

    this.setData({
      selected: {
        ...this.data.selected,
        [`${key}Index`]: index,
        [key]: option.value
      }
    });
    this.refreshFields();
  },

  onReset() {
    this.setData({
      selected: makeInitialSelected()
    });
    this.refreshFields();
  },

  onCalculate() {
    const filters = {
      regionCode: this.data.selected.regionCode
    };

    FIELD_CONFIG.forEach((field) => {
      if (this.data.selected[field.key]) {
        filters[field.key] = this.data.selected[field.key];
      }
    });

    this.setData({ loading: true });
    calculateProbability(filters)
      .then((result) => {
        const app = getApp();
        app.globalData.lastFilters = filters;
        app.globalData.lastResult = result;
        wx.navigateTo({ url: '/pages/result/result' });
      })
      .catch(() => {
        wx.showToast({
          title: '云函数未部署',
          icon: 'none'
        });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  }
});
