function formatPeople(value) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)} 万`;
  }
  return String(value);
}

function decorateResult(result) {
  if (!result) {
    return null;
  }

  return {
    ...result,
    factors: result.factors.map((factor) => ({
      ...factor,
      rateText: `${(factor.rate * 100).toFixed(factor.rate < 0.01 ? 2 : 1)}%`
    }))
  };
}

Page({
  data: {
    result: null,
    estimatedPeopleText: '0',
    isUnstable: false
  },

  onLoad() {
    const result = decorateResult(getApp().globalData.lastResult);

    if (!result) {
      return;
    }

    this.setData({
      result,
      estimatedPeopleText: formatPeople(result.estimatedPeople),
      isUnstable: result.flags.includes('estimate_unstable')
    });
  },

  onShareAppMessage() {
    const result = this.data.result;
    const title = result
      ? `我在${result.region.name}测到约 ${this.data.estimatedPeopleText} 个可能性`
      : '来算算你的人海相遇概率';

    return {
      title,
      path: '/pages/index/index'
    };
  }
});
